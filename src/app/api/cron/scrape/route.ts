import { NextResponse } from "next/server";
import { targetForSlug, isCuratedTarget, pickDailyBatch } from "@/lib/scraper/config";
import { parsePrice, detectSoldOut, parseOfferFromJsonLd } from "@/lib/scraper/parse";
import { fetchOfferViaRender } from "@/lib/scraper/render";
import { evaluateAutoApprove } from "@/lib/scraper/auto-approve";
import { revalidatePublicFestivalPages } from "@/lib/admin/revalidate";
import type { Availability } from "@/lib/types";
import {
  ticketswapCandidateUrl,
  ticketswapAffiliate,
  matchesFestival,
} from "@/lib/scraper/marketplaces";
import {
  getPriceScrapeCandidates,
  getFestivalsForMarketplaceCheck,
  supersedeAutoPriceChecks,
  insertPriceCheck,
  applyAutoApprovedPriceCheck,
  insertOfferSuggestion,
  type PriceScrapeCandidate,
} from "@/lib/admin/scraper-queries";

export const dynamic = "force-dynamic";
// Vercel Hobby-plan: harde limiet van 60s per functie. GLOBAL_DEADLINE_MS is één
// gedeeld tijdsbudget over alle drie de fases (prijs-scrape, render-fallback,
// marktplaats-detectie) — elke fase checkt 'm vóór elk item en stopt zodra hij
// verstreken is. Dat begrenst de worst-case run tot ~GLOBAL_DEADLINE_MS + de
// langste losse timeout (het render-fallback-request), ruim onder de 60s.
// Op Pro kan maxDuration + GLOBAL_DEADLINE_MS omhoog voor meer dekking per run.
export const maxDuration = 60;

const UA = "FestivalDiscounter-PriceCheck/1.0 (+https://festivaldiscounter.nl)";
const FETCH_TIMEOUT_MS = 8000;    // per kale fetch; korter dan de 60s-functielimiet
const RENDER_TIMEOUT_MS = 15000;  // per Firecrawl-call: rendert JS, duurt langer
const REQUEST_DELAY_MS = 1000;    // netjes richting de doelsites
const MAX_MARKETPLACE = 4;        // max festivals per run voor capaciteit B
const MAX_PRICE_SCRAPE = 8;       // max festivals per run voor capaciteit A (dag-rotatie)
const GLOBAL_DEADLINE_MS = 40_000; // gedeeld tijdsbudget over alle fases
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Render-fallback (Firecrawl) kost credits (5/scrape bij JSON-extractie) — daarom
// een aparte, kleine cap, instelbaar zonder deploy. Zonder FIRECRAWL_API_KEY blijft
// deze fase volledig uit (net als capaciteit B zonder TICKETSWAP_AFFILIATE_ID).
const MAX_RENDER_FALLBACK = Number(process.env.FIRECRAWL_MAX_PER_RUN) || 3;

// Noodrem: op "false" zetten dwingt alles naar de handmatige wachtrij, ook als
// het al goedgekeurde patroon (kleine prijswijziging) zich voordoet. Handig om
// auto-approve tijdelijk te pauzeren zonder een deploy.
const AUTO_APPROVE_ENABLED = process.env.SCRAPER_AUTO_APPROVE !== "false";

// Kies willekeurig maximaal `n` items, zodat over meerdere dagen alle festivals
// aan de beurt komen zonder dat we een "checked"-status hoeven bij te houden.
function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Past een gevonden prijs/beschikbaarheid toe: automatisch bij een laag-risico
// wijziging (zie evaluateAutoApprove), anders naar de handmatige wachtrij.
// Ruimt altijd eerst de vorige, nog niet-beoordeelde auto-rij op.
async function applyOrQueue(
  target: PriceScrapeCandidate,
  price: number | null,
  availability: Availability
): Promise<"applied" | "queued"> {
  await supersedeAutoPriceChecks(target.offerId);
  if (AUTO_APPROVE_ENABLED) {
    const decision = evaluateAutoApprove({
      currentPrice: target.currentPrice,
      scrapedPrice: price,
      scrapedAvailability: availability,
    });
    if (decision.autoApprove) {
      await applyAutoApprovedPriceCheck({
        ticket_offer_id: target.offerId,
        scraped_price: price,
        scraped_availability: availability,
      });
      return "applied";
    }
  }
  await insertPriceCheck({
    ticket_offer_id: target.offerId, status: "pending",
    scraped_price: price, scraped_availability: availability, failure_reason: null,
  });
  return "queued";
}

interface PriceScrapeResult {
  queued: number;          // nieuwe pending review-rijen
  autoApplied: number;     // laag-risico wijzigingen automatisch toegepast
  unchanged: number;       // signaal gevonden, maar gelijk aan de huidige offer-waarden
  deadlineSkipped: number; // batch-items die door het tijdsbudget niet meer aan bod kwamen
  batch: string;           // bv. "2/5" — welke rotatiebatch dit was
  renderAttempted: number; // hoeveel JS-widget-sites via Firecrawl geprobeerd zijn
  renderSucceeded: number; // waarvan Firecrawl een bruikbaar signaal teruggaf
}

// Capaciteit A: prijs + beschikbaarheid van de official sites. Alle gepubliceerde,
// komende festivals doen mee (default: JSON-LD); de curated config levert alleen
// nog uitzonderingen (css-strategie/keywords). Dag-rotatie in batches van
// MAX_PRICE_SCRAPE houdt de run binnen het tijdsbudget.
//
// Twee stappen per batch: (1) een kale fetch + JSON-LD-poging (gratis, snel);
// (2) voor auto-targets zonder signaal in stap 1 — vermoedelijk een JS-widget —
// een render-fallback via Firecrawl (kost credits, dus begrensd).
async function runPriceScrape(deadlineAt: number): Promise<PriceScrapeResult> {
  const candidates = (await getPriceScrapeCandidates().catch(() => [])).sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );
  const { batch, batchIndex, batchCount } = pickDailyBatch(candidates, MAX_PRICE_SCRAPE, Date.now());
  const result: PriceScrapeResult = {
    queued: 0,
    autoApplied: 0,
    unchanged: 0,
    deadlineSkipped: 0,
    batch: batchCount === 0 ? "0/0" : `${batchIndex + 1}/${batchCount}`,
    renderAttempted: 0,
    renderSucceeded: 0,
  };
  const renderCandidates: PriceScrapeCandidate[] = [];

  // --- Stap 1: kale fetch + JSON-LD -----------------------------------------
  for (let i = 0; i < batch.length; i++) {
    if (Date.now() > deadlineAt) {
      result.deadlineSkipped += batch.length - i;
      return result;
    }
    const target = batch[i];
    const cfg = targetForSlug(target.slug);
    const curated = isCuratedTarget(target.slug);
    try {
      const html = await fetchHtml(target.url);

      // Prijs + (bij JSON-LD) beschikbaarheid volgens de gekozen strategie.
      const jsonld = cfg.strategy === "jsonld" ? parseOfferFromJsonLd(html) : null;
      const price = jsonld
        ? jsonld.price
        : cfg.priceSelector
          ? parsePrice(html, cfg.priceSelector)
          : null;

      // Sold-out: keyword-signaal (alleen bij curated targets met keywords)
      // óf een expliciete JSON-LD sold_out.
      const soldOut =
        (cfg.soldOutKeywords.length > 0 && detectSoldOut(html, cfg.soldOutKeywords)) ||
        jsonld?.availability === "sold_out";

      // Beschikbaarheid: sold-out wint, anders JSON-LD-waarde, anders "available".
      const availability: Availability = soldOut
        ? "sold_out"
        : (jsonld?.availability ?? "available");

      const hasSignal = price !== null || soldOut || jsonld?.availability != null;

      if (!hasSignal) {
        // Bij auto-targets is "geen JSON-LD" de verwachte uitkomst (JS-widgets) —
        // probeer 'm zo meteen via de render-fallback. Bij curated targets is het
        // een echte fout — die site had het eerder wél.
        if (curated) {
          await supersedeAutoPriceChecks(target.offerId);
          await insertPriceCheck({
            ticket_offer_id: target.offerId, status: "failed",
            scraped_price: null, scraped_availability: null,
            failure_reason:
              cfg.strategy === "jsonld"
                ? "Geen schema.org Offer in de HTML gevonden"
                : `Prijs-selector '${cfg.priceSelector ?? "(geen)"}' leverde niets op`,
          });
        } else {
          renderCandidates.push(target);
        }
      } else if (
        availability === target.currentAvailability &&
        (price === null || price === target.currentPrice)
      ) {
        // Zelfde waarden als de live offer: niets te reviewen. Ruim wel eventuele
        // verouderde wachtrij-rijen op (bv. als de admin de prijs al handmatig zette).
        await supersedeAutoPriceChecks(target.offerId);
        result.unchanged++;
      } else {
        const outcome = await applyOrQueue(target, price, availability);
        if (outcome === "applied") result.autoApplied++;
        else result.queued++;
      }
    } catch (e) {
      // Netwerkfout/HTTP-fout: alleen bij curated targets een failed-rij; bij
      // auto-targets proberen we het via de render-fallback (mogelijk een
      // bot-check die Firecrawl wél doorkomt).
      if (curated) {
        await supersedeAutoPriceChecks(target.offerId).catch(() => {});
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "failed",
          scraped_price: null, scraped_availability: null,
          failure_reason: e instanceof Error ? e.message : "onbekende fout",
        }).catch(() => {});
      } else {
        renderCandidates.push(target);
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }

  // --- Stap 2: render-fallback (Firecrawl) voor JS-widget-sites -------------
  const apiKey = process.env.FIRECRAWL_API_KEY || null;
  if (apiKey && renderCandidates.length > 0) {
    for (const target of renderCandidates.slice(0, MAX_RENDER_FALLBACK)) {
      if (Date.now() > deadlineAt) break;
      result.renderAttempted++;
      try {
        const rendered = await fetchOfferViaRender(target.url, { apiKey, timeoutMs: RENDER_TIMEOUT_MS });
        if (!rendered) continue; // Firecrawl vond ook niets bruikbaars: stil overslaan
        result.renderSucceeded++;
        const availability: Availability = rendered.availability ?? "available";
        if (
          availability === target.currentAvailability &&
          (rendered.price === null || rendered.price === target.currentPrice)
        ) {
          await supersedeAutoPriceChecks(target.offerId);
          result.unchanged++;
        } else {
          const outcome = await applyOrQueue(target, rendered.price, availability);
          if (outcome === "applied") result.autoApplied++;
          else result.queued++;
        }
      } catch {
        // Firecrawl-fout (rate limit, timeout, credits op): stil overslaan, geen
        // ruis in de wachtrij — komt de volgende run vanzelf weer aan de beurt.
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return result;
}

// Capaciteit B: detecteer festivals op TicketSwap → affiliate-suggestie.
// Retourneert het aantal nieuwe suggesties + hoeveel festivals niet aan bod kwamen.
async function runMarketplaceDetection(
  deadlineAt: number
): Promise<{ suggested: number; skipped: number }> {
  let suggested = 0;
  const affiliateId = process.env.TICKETSWAP_AFFILIATE_ID || null;
  // Zonder affiliate-ID heeft een TicketSwap-suggestie geen affiliate-link én is
  // detectie momenteel toch niet werkbaar (WAAP-botbescherming blokkeert de fetch,
  // event-URL bevat een niet-afleidbare hash). Sla capaciteit B dan volledig over —
  // scheelt zinloze requests en houdt de run ruim binnen de Hobby-limiet.
  if (!affiliateId) return { suggested: 0, skipped: 0 };
  const all = await getFestivalsForMarketplaceCheck().catch(() => []);
  const batch = sample(all, MAX_MARKETPLACE);
  let skipped = all.length - batch.length;
  for (let i = 0; i < batch.length; i++) {
    if (Date.now() > deadlineAt) {
      skipped += batch.length - i;
      break;
    }
    const f = batch[i];
    try {
      const url = ticketswapCandidateUrl(f.slug);
      const html = await fetchHtml(url); // gooit bij 404/timeout → "niet gevonden"
      if (matchesFestival(html, f.name)) {
        await insertOfferSuggestion({
          festival_id: f.id, provider: "ticketswap",
          detected_url: url, affiliate_url: ticketswapAffiliate(url, affiliateId),
        });
        suggested++;
      }
    } catch {
      // niet gevonden / netwerkfout: geen ruis in de wachtrij.
    } finally {
      // altijd wachten tussen requests (ook bij een naam-mismatch of fout),
      // zodat we netjes blijven richting de doelsites.
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return { suggested, skipped };
}

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const deadlineAt = Date.now() + GLOBAL_DEADLINE_MS;
  const price = await runPriceScrape(deadlineAt);
  // Auto-toegepaste wijzigingen raken live festivaldata (buiten de admin-flow om) —
  // dezelfde revalidatie die approvePriceCheck in /admin/scrapers ook doet.
  if (price.autoApplied > 0) revalidatePublicFestivalPages();
  const { suggested, skipped } = await runMarketplaceDetection(deadlineAt);
  // `marketplaceSkipped` > 0 betekent dat niet alle kandidaten deze run zijn gecheckt
  // (gedeeld tijdsbudget of cap); ze komen op een volgende run aan de beurt.
  // Capaciteit A roteert deterministisch per dag (`priceBatch` = batch x van y).
  return NextResponse.json({
    ok: true,
    priceChecks: price.queued,
    priceAutoApplied: price.autoApplied,
    priceUnchanged: price.unchanged,
    priceDeadlineSkipped: price.deadlineSkipped,
    priceBatch: price.batch,
    renderAttempted: price.renderAttempted,
    renderSucceeded: price.renderSucceeded,
    suggestions: suggested,
    marketplaceSkipped: skipped,
  });
}
