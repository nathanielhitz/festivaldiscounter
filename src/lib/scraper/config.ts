// Curated set voor capaciteit A (prijs-scraper). Elke entry koppelt een festival-slug
// aan een strategie om prijs/beschikbaarheid uit de kale server-HTML te halen + de
// sold-out-signaalwoorden. De cron zoekt bij elke slug de `official`-offer op en
// ververst die (via de review-wachtrij; nooit automatisch live).
//
// Twee strategieën (de meeste festivalsites renderen hun prijs client-side in een
// JS-widget en zijn dus NIET scrapebaar met cheerio — daarom is deze set klein):
//   - "jsonld": lees een schema.org Offer uit een <script type="application/ld+json">.
//     Robuust en zonder site-specifieke selector. Voorkeur waar beschikbaar.
//   - "css":    lees de prijs uit een CSS-selector (of laat `priceSelector` weg voor
//     een puur sold-out-signaal op basis van `soldOutKeywords`).
export interface PriceScrapeTarget {
  festivalSlug: string;
  strategy: "jsonld" | "css";
  priceSelector?: string; // vereist bij strategy "css" als je een prijs wilt
  soldOutKeywords: string[];
}

// Geverifieerd tegen de live sites (2026-07-04). Bijna alle grote festivals gebruiken
// JS-gerenderde ticketwidgets (iframe/CM.com/TicketSwap-embed) → niets in de kale HTML;
// die staan hier bewust NIET in. Bospop heeft nette schema.org JSON-LD; Awakenings toont
// alleen een sold-out-status (geen prijs in de HTML).
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
];
