import type { Availability } from "../types";

// Render-fallback voor festivalsites die hun prijs/beschikbaarheid client-side
// in een JS-widget tonen (iframe/CM.com/TicketSwap-embed) en dus niets opleveren
// via een kale fetch + JSON-LD (zie parse.ts). Firecrawl rendert de pagina en
// laat een LLM de prijs + beschikbaarheid eruit halen volgens een vast schema.
// Kost credits (5/scrape bij JSON-extractie) — daarom alleen ingezet als
// stap 1 (JSON-LD) niets vond, en begrensd via FIRECRAWL_MAX_PER_RUN.
// Volledig optioneel: zonder FIRECRAWL_API_KEY blijft deze fase uit (net als
// capaciteit B zonder TICKETSWAP_AFFILIATE_ID).

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    price_eur: {
      type: ["number", "null"],
      description:
        "De laagste ticketprijs op deze pagina in euro's, als kaal getal (bv. 79.5). Null als er geen prijs zichtbaar is.",
    },
    availability: {
      type: "string",
      enum: ["available", "limited", "sold_out", "unknown"],
      description: "Beschikbaarheid van tickets volgens de pagina.",
    },
  },
  required: ["price_eur", "availability"],
};

const AVAILABILITY_VALUES = new Set<Availability>(["available", "limited", "sold_out"]);

export interface RenderedOffer {
  price: number | null;
  availability: Availability | null;
}

// Haalt prijs + beschikbaarheid op via een gerenderde (JS-uitgevoerde) versie van
// de pagina. Gooit bij een HTTP/netwerkfout; geeft null terug als Firecrawl wel
// antwoordt maar niets bruikbaars vond (geen prijs én geen herkenbare status).
export async function fetchOfferViaRender(
  url: string,
  opts: { apiKey: string; timeoutMs: number }
): Promise<RenderedOffer | null> {
  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: [
        {
          type: "json",
          schema: EXTRACT_SCHEMA,
          prompt:
            "Vind de laagste ticketprijs (in euro's) en de beschikbaarheid van tickets voor dit festival op deze pagina.",
        },
      ],
      only_main_content: false,
      timeout: opts.timeoutMs,
    }),
    // Ruime marge boven Firecrawl's eigen render-timeout voor netwerklatentie.
    signal: AbortSignal.timeout(opts.timeoutMs + 5000),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);
  const body = (await res.json()) as { data?: { json?: Record<string, unknown> } };
  const json = body.data?.json;
  if (!json) return null;

  const rawPrice = json.price_eur;
  const price =
    typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : null;

  const rawAvailability = json.availability;
  const availability =
    typeof rawAvailability === "string" && AVAILABILITY_VALUES.has(rawAvailability as Availability)
      ? (rawAvailability as Availability)
      : null;

  if (price === null && availability === null) return null;
  return { price, availability };
}
