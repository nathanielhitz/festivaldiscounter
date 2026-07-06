import { NextResponse } from "next/server";
import { targetForSlug, isCuratedTarget, pickDailyBatch } from "@/lib/scraper/config";
import { parsePrice, detectSoldOut, parseOfferFromJsonLd } from "@/lib/scraper/parse";
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
  insertOfferSuggestion,
} from "@/lib/admin/scraper-queries";

export const dynamic = "force-dynamic";
// Vercel Hobby-plan: harde limiet van 60s per functie. De onderstaande limieten
// (fetch-timeout, request-delay, MAX_MARKETPLACE) houden de worst-case run daaronder.
// Op Pro kan dit naar 300 en mag MAX_MARKETPLACE weer omhoog.
export const maxDuration = 60;

const UA = "FestivalDiscounter-PriceCheck/1.0 (+https://festivaldiscounter.nl)";
const FETCH_TIMEOUT_MS = 8000;   // per request; korter dan de 60s-functielimiet
const REQUEST_DELAY_MS = 1000;   // netjes richting de doelsites
const MAX_MARKETPLACE = 4;       // max festivals per run voor capaciteit B (tijdsbudget Hobby)
const MAX_PRICE_SCRAPE = 8;      // max festivals per run voor capaciteit A (dag-rotatie)
const PRICE_DEADLINE_MS = 40_000; // hard tijdsbudget voor A, zodat B + respons in de 60s passen
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

// Capaciteit A: prijs + beschikbaarheid van de official sites. Alle gepubliceerde,
// komende festivals doen mee (default: JSON-LD); de curated config levert alleen
// nog uitzonderingen (css-strategie/keywords). Dag-rotatie in batches van
// MAX_PRICE_SCRAPE houdt de run binnen het Hobby-tijdsbudget.
interface PriceScrapeResult {
  queued: number;          // nieuwe pending review-rijen
  unchanged: number;       // signaal gevonden, maar gelijk aan de huidige offer-waarden
  deadlineSkipped: number; // batch-items die door het tijdsbudget niet meer aan bod kwamen
  batch: string;           // bv. "2/5" — welke rotatiebatch dit was
}

async function runPriceScrape(): Promise<PriceScrapeResult> {
  const candidates = (await getPriceScrapeCandidates().catch(() => [])).sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );
  const { batch, batchIndex, batchCount } = pickDailyBatch(candidates, MAX_PRICE_SCRAPE, Date.now());
  const result: PriceScrapeResult = {
    queued: 0,
    unchanged: 0,
    deadlineSkipped: 0,
    batch: batchCount === 0 ? "0/0" : `${batchIndex + 1}/${batchCount}`,
  };
  const started = Date.now();

  for (let i = 0; i < batch.length; i++) {
    if (Date.now() - started > PRICE_DEADLINE_MS) {
      result.deadlineSkipped = batch.length - i;
      break;
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
        // Bij auto-targets is "geen JSON-LD" de verwachte uitkomst (JS-widgets):
        // stil overslaan, geen ruis in de wachtrij. Bij curated targets is het
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
        await supersedeAutoPriceChecks(target.offerId);
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "pending",
          scraped_price: price,
          scraped_availability: availability,
          failure_reason: null,
        });
        result.queued++;
      }
    } catch (e) {
      // Netwerkfout/HTTP-fout: alleen bij curated targets een failed-rij; bij
      // auto-targets is een blokkerende of trage site verwacht → stil overslaan.
      if (curated) {
        await supersedeAutoPriceChecks(target.offerId).catch(() => {});
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "failed",
          scraped_price: null, scraped_availability: null,
          failure_reason: e instanceof Error ? e.message : "onbekende fout",
        }).catch(() => {});
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return result;
}

// Capaciteit B: detecteer festivals op TicketSwap → affiliate-suggestie.
// Retourneert het aantal nieuwe suggesties + hoeveel festivals door de cap zijn overgeslagen.
async function runMarketplaceDetection(): Promise<{ suggested: number; skipped: number }> {
  let suggested = 0;
  const affiliateId = process.env.TICKETSWAP_AFFILIATE_ID || null;
  // Zonder affiliate-ID heeft een TicketSwap-suggestie geen affiliate-link én is
  // detectie momenteel toch niet werkbaar (WAAP-botbescherming blokkeert de fetch,
  // event-URL bevat een niet-afleidbare hash). Sla capaciteit B dan volledig over —
  // scheelt zinloze requests en houdt de run ruim binnen de Hobby-limiet.
  if (!affiliateId) return { suggested: 0, skipped: 0 };
  const all = await getFestivalsForMarketplaceCheck().catch(() => []);
  const batch = sample(all, MAX_MARKETPLACE);
  const skipped = all.length - batch.length;
  for (const f of batch) {
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
  const price = await runPriceScrape();
  const { suggested, skipped } = await runMarketplaceDetection();
  // `marketplaceSkipped` > 0 betekent dat niet alle kandidaten deze run zijn gecheckt
  // (cap); ze komen door de willekeurige sampling op volgende dagen aan de beurt.
  // Capaciteit A roteert deterministisch per dag (`priceBatch` = batch x van y).
  return NextResponse.json({
    ok: true,
    priceChecks: price.queued,
    priceUnchanged: price.unchanged,
    priceDeadlineSkipped: price.deadlineSkipped,
    priceBatch: price.batch,
    suggestions: suggested,
    marketplaceSkipped: skipped,
  });
}
