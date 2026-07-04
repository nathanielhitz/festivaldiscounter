import * as cheerio from "cheerio";

// Leest de prijs uit het eerste element dat `selector` matcht. Verwacht NL-notatie
// (bv. "€ 89,00", "vanaf 79,50"). Geeft null als er niets bruikbaars staat.
export function parsePrice(html: string, selector: string): number | null {
  const $ = cheerio.load(html);
  const text = $(selector).first().text();
  if (!text) return null;
  const match = text.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// True als een van de keywords (case-insensitive) in de pagina-tekst voorkomt.
export function detectSoldOut(html: string, keywords: string[]): boolean {
  const $ = cheerio.load(html);
  const text = ($("body").text() || html).toLowerCase();
  return keywords.some((k) => text.includes(k.toLowerCase()));
}
