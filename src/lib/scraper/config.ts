// Configuratie voor capaciteit A (prijs-scraper). De cron probeert bij ÁLLE
// gepubliceerde, komende festivals met een `official`-offer een schema.org Offer
// uit de JSON-LD van de offer-URL te lezen (via de review-wachtrij; nooit
// automatisch live). Deze curated set is alleen nog de uitzonderingenlijst:
// festivals die een andere strategie of sold-out-keywords nodig hebben.
//
// Twee strategieën (de meeste festivalsites renderen hun prijs client-side in een
// JS-widget en zijn dus NIET scrapebaar met cheerio — die leveren simpelweg niets
// op en worden stil overgeslagen):
//   - "jsonld": lees een schema.org Offer uit een <script type="application/ld+json">.
//     Robuust en zonder site-specifieke selector. Dit is de default voor elk
//     festival dat níét in deze lijst staat (met lege soldOutKeywords, want
//     keyword-matching op willekeurige sites geeft valse sold-out-signalen).
//   - "css":    lees de prijs uit een CSS-selector (of laat `priceSelector` weg voor
//     een puur sold-out-signaal op basis van `soldOutKeywords`).
export interface PriceScrapeTarget {
  festivalSlug: string;
  strategy: "jsonld" | "css";
  priceSelector?: string; // vereist bij strategy "css" als je een prijs wilt
  soldOutKeywords: string[];
  // Optioneel: de URL die de scraper ophaalt voor de prijs, als die afwijkt van
  // de publieke "Bekijk tickets"-link (offer.url). Veel festivalsites tonen de
  // prijs pas op een diepere ticket-detailpagina; hiermee laat je de scraper
  // dáár kijken ZONDER de bezoeker naar die pagina te sturen. Leeg = offer.url.
  priceUrl?: string;
}

// Geverifieerd tegen de live sites. Bijna alle grote festivals gebruiken
// JS-gerenderde ticketwidgets (iframe/CM.com/TicketSwap-embed) → niets in de kale HTML.
// Voor die sites zetten we een `priceUrl` naar de diepere pagina waar de prijs wél
// staat; de render-fallback (Firecrawl) haalt 'm daar via LLM-extractie op. Sites
// zonder werkende priceUrl (bot-blokkade/DNS-fout/puur SPA) staan hier bewust niet in
// en wachten op de affiliate-feed-route.
export const PRICE_SCRAPE_CONFIG: PriceScrapeTarget[] = [
  {
    festivalSlug: "bospop",
    strategy: "jsonld",
    soldOutKeywords: ["uitverkocht", "sold out", "niet meer beschikbaar"],
  },
  {
    festivalSlug: "awakenings-summer-festival",
    strategy: "css", // geen prijs in de HTML; puur sold-out-detectie
    soldOutKeywords: ["sold out", "uitverkocht"],
  },
  // priceUrl-overrides (2026-07-06, geverifieerd: prijs is op deze pagina te vinden;
  // extractie via Firecrawl-LLM omdat er geen JSON-LD is). strategy blijft "jsonld"
  // → probeert eerst gratis JSON-LD, valt anders terug op Firecrawl.
  {
    festivalSlug: "lowlands",
    strategy: "jsonld",
    priceUrl: "https://lowlands.nl/tickets/ticketinformatie/",
    soldOutKeywords: [],
  },
  {
    festivalSlug: "north-sea-jazz",
    strategy: "jsonld",
    priceUrl: "https://www.northseajazz.com/nl/tickets",
    soldOutKeywords: [],
  },
  {
    festivalSlug: "huntenpop",
    strategy: "jsonld",
    priceUrl: "https://www.huntenpop.nl/tickets/",
    soldOutKeywords: [],
  },
  {
    festivalSlug: "zwarte-cross",
    strategy: "jsonld",
    priceUrl: "https://www.zwartecross.nl/tickets/",
    soldOutKeywords: [],
  },
];

const CURATED_BY_SLUG = new Map(PRICE_SCRAPE_CONFIG.map((t) => [t.festivalSlug, t]));

// Curated entry indien aanwezig, anders de veilige default: alleen JSON-LD,
// geen keyword-matching (te foutgevoelig op onbekende sites).
export function targetForSlug(slug: string): PriceScrapeTarget {
  return (
    CURATED_BY_SLUG.get(slug) ?? { festivalSlug: slug, strategy: "jsonld", soldOutKeywords: [] }
  );
}

// Curated targets zijn handmatig geverifieerd: daar is "niets gevonden" een echte
// fout (failed-rij in de wachtrij). Bij auto-targets is het de verwachte uitkomst.
export function isCuratedTarget(slug: string): boolean {
  return CURATED_BY_SLUG.has(slug);
}

// Deterministische dag-rotatie: verdeel de kandidaten in batches van `size` en
// kies de batch op basis van de UTC-dag. Zo komt elk festival elke `batchCount`
// dagen aan de beurt zonder dat we een "checked"-status hoeven bij te houden,
// en blijft één cron-run altijd binnen het tijdsbudget (Vercel Hobby: 60s).
export function pickDailyBatch<T>(
  items: T[],
  size: number,
  nowMs: number
): { batch: T[]; batchIndex: number; batchCount: number } {
  if (items.length === 0 || size < 1) return { batch: [], batchIndex: 0, batchCount: 0 };
  const batchCount = Math.ceil(items.length / size);
  const batchIndex = Math.floor(nowMs / 86_400_000) % batchCount;
  return {
    batch: items.slice(batchIndex * size, (batchIndex + 1) * size),
    batchIndex,
    batchCount,
  };
}
