// Curated set voor capaciteit A (prijs-scraper). Elke entry koppelt een festival-slug
// aan de CSS-selector waarin de prijs staat + de sold-out-signaalwoorden op die site.
// De cron zoekt bij elke slug de `official`-offer op en ververst die (via review).
//
// Selectors zijn per-site en worden in Task 6 tegen de live sites bepaald/geverifieerd.
export interface PriceScrapeTarget {
  festivalSlug: string;
  priceSelector: string;
  soldOutKeywords: string[];
}

export const PRICE_SCRAPE_CONFIG: PriceScrapeTarget[] = [
  // Ingevuld in Task 6 na inspectie van de live sites, bv.:
  // { festivalSlug: "lowlands", priceSelector: ".ticket__price", soldOutKeywords: ["uitverkocht", "sold out"] },
];
