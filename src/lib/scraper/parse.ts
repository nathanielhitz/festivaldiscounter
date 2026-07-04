import * as cheerio from "cheerio";
import type { Availability } from "../types";

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

// --- JSON-LD (schema.org) prijs/beschikbaarheid ----------------------------
// Veel festivalsites renderen hun prijs client-side (JS-widget) → niet zichtbaar
// voor cheerio. Sites met nette schema.org structured data zetten de prijs wél in
// een <script type="application/ld+json">-blok; dat lezen we hier gericht uit.

export interface JsonLdOffer {
  price: number | null;
  availability: Availability | null;
}

// schema.org availability-URL/-waarde → ons enum.
const SCHEMA_AVAILABILITY: Record<string, Availability> = {
  instock: "available",
  onlineonly: "available",
  limitedavailability: "limited",
  soldout: "sold_out",
  outofstock: "sold_out",
};

function toOffer(o: Record<string, unknown>): JsonLdOffer {
  const rawPrice = o.price ?? o.lowPrice;
  let price: number | null = null;
  if (rawPrice != null && rawPrice !== "") {
    const n = Number(String(rawPrice).replace(",", "."));
    price = Number.isFinite(n) && n >= 0 ? n : null;
  }
  let availability: Availability | null = null;
  if (typeof o.availability === "string") {
    const key = o.availability.replace(/^https?:\/\/schema\.org\//i, "").toLowerCase();
    availability = SCHEMA_AVAILABILITY[key] ?? null;
  }
  return { price, availability };
}

function extractOffer(offers: unknown): JsonLdOffer | null {
  if (Array.isArray(offers)) {
    for (const o of offers) {
      const r = extractOffer(o);
      if (r && (r.price !== null || r.availability !== null)) return r;
    }
    return null;
  }
  if (offers && typeof offers === "object") return toOffer(offers as Record<string, unknown>);
  return null;
}

function findOffer(node: unknown): JsonLdOffer | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findOffer(item);
      if (r) return r;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj["@graph"]) {
      const r = findOffer(obj["@graph"]);
      if (r) return r;
    }
    if (obj.offers) {
      const r = extractOffer(obj.offers);
      if (r && (r.price !== null || r.availability !== null)) return r;
    }
    // Het knooppunt kán zelf een Offer zijn.
    if (typeof obj["@type"] === "string" && /offer/i.test(obj["@type"]) && (obj.price != null || obj.lowPrice != null)) {
      return toOffer(obj);
    }
    for (const v of Object.values(obj)) {
      const r = findOffer(v);
      if (r) return r;
    }
  }
  return null;
}

// Zoekt in alle ld+json-blokken naar een schema.org Offer met prijs/beschikbaarheid.
export function parseOfferFromJsonLd(html: string): JsonLdOffer {
  const $ = cheerio.load(html);
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(el).text();
    if (!raw.trim()) continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue; // kapot JSON-blok: overslaan, geen crash
    }
    const offer = findOffer(json);
    if (offer && (offer.price !== null || offer.availability !== null)) return offer;
  }
  return { price: null, availability: null };
}
