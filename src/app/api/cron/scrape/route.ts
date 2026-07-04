import { NextResponse } from "next/server";
import { PRICE_SCRAPE_CONFIG } from "@/lib/scraper/config";
import { parsePrice, detectSoldOut } from "@/lib/scraper/parse";
import {
  ticketswapCandidateUrl,
  ticketswapAffiliate,
  matchesFestival,
} from "@/lib/scraper/marketplaces";
import {
  getOfficialOfferForSlug,
  getFestivalsForMarketplaceCheck,
  supersedeAutoPriceChecks,
  insertPriceCheck,
  insertOfferSuggestion,
} from "@/lib/admin/scraper-queries";

export const dynamic = "force-dynamic";
// LET OP: Vercel Hobby cap = 60s, Pro = tot 300s. Houd de curated set + MAX_MARKETPLACE
// klein genoeg dat een run binnen de limiet van je plan blijft (zie de sleep/timing hieronder).
export const maxDuration = 300;

const UA = "FestivalDiscounter-PriceCheck/1.0 (+https://festivaldiscounter.nl)";
const REQUEST_DELAY_MS = 1000;   // netjes richting de doelsites
const MAX_MARKETPLACE = 15;      // max festivals per run voor capaciteit B (tijdsbudget)
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
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Capaciteit A: prijs + beschikbaarheid van de official sites (curated set).
async function runPriceScrape(): Promise<number> {
  let count = 0;
  for (const cfg of PRICE_SCRAPE_CONFIG) {
    const target = await getOfficialOfferForSlug(cfg.festivalSlug).catch(() => null);
    if (!target) continue;
    try {
      const html = await fetchHtml(target.url);
      const price = parsePrice(html, cfg.priceSelector);
      const soldOut = detectSoldOut(html, cfg.soldOutKeywords);
      await supersedeAutoPriceChecks(target.offerId);
      if (price === null && !soldOut) {
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "failed",
          scraped_price: null, scraped_availability: null,
          failure_reason: `Prijs-selector '${cfg.priceSelector}' leverde niets op`,
        });
      } else {
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "pending",
          scraped_price: price,
          scraped_availability: soldOut ? "sold_out" : "available",
          failure_reason: null,
        });
        count++;
      }
    } catch (e) {
      await supersedeAutoPriceChecks(target.offerId).catch(() => {});
      await insertPriceCheck({
        ticket_offer_id: target.offerId, status: "failed",
        scraped_price: null, scraped_availability: null,
        failure_reason: e instanceof Error ? e.message : "onbekende fout",
      }).catch(() => {});
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return count;
}

// Capaciteit B: detecteer festivals op TicketSwap → affiliate-suggestie.
// Retourneert het aantal nieuwe suggesties + hoeveel festivals door de cap zijn overgeslagen.
async function runMarketplaceDetection(): Promise<{ suggested: number; skipped: number }> {
  let suggested = 0;
  const affiliateId = process.env.TICKETSWAP_AFFILIATE_ID || null;
  const all = await getFestivalsForMarketplaceCheck().catch(() => []);
  const batch = sample(all, MAX_MARKETPLACE);
  const skipped = all.length - batch.length;
  for (const f of batch) {
    try {
      const url = ticketswapCandidateUrl(f.slug);
      const html = await fetchHtml(url); // gooit bij 404/timeout → "niet gevonden"
      if (!matchesFestival(html, f.name)) continue;
      await insertOfferSuggestion({
        festival_id: f.id, provider: "ticketswap",
        detected_url: url, affiliate_url: ticketswapAffiliate(url, affiliateId),
      });
      suggested++;
    } catch {
      // niet gevonden / netwerkfout: geen ruis in de wachtrij.
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return { suggested, skipped };
}

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const priceChecks = await runPriceScrape();
  const { suggested, skipped } = await runMarketplaceDetection();
  // `skipped` > 0 betekent dat niet alle kandidaten deze run zijn gecheckt (cap);
  // ze komen door de willekeurige sampling op volgende dagen aan de beurt.
  return NextResponse.json({ ok: true, priceChecks, suggestions: suggested, marketplaceSkipped: skipped });
}
