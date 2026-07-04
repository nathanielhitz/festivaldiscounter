import { describe, expect, it } from "vitest";
import { parsePrice, detectSoldOut, parseOfferFromJsonLd } from "@/lib/scraper/parse";

describe("parsePrice", () => {
  it("leest een NL-genoteerde prijs uit het geselecteerde element", () => {
    const html = `<div><span class="price">€ 89,00</span></div>`;
    expect(parsePrice(html, ".price")).toBe(89);
  });

  it("normaliseert decimalen met een komma", () => {
    const html = `<p class="p">vanaf 79,50</p>`;
    expect(parsePrice(html, ".p")).toBe(79.5);
  });

  it("geeft null als de selector niets vindt", () => {
    const html = `<div>geen prijs hier</div>`;
    expect(parsePrice(html, ".price")).toBeNull();
  });

  it("geeft null als het element geen getal bevat", () => {
    const html = `<span class="price">Prijs volgt</span>`;
    expect(parsePrice(html, ".price")).toBeNull();
  });

  it("pakt het eerste element bij meerdere treffers", () => {
    const html = `<span class="price">45,00</span><span class="price">99,00</span>`;
    expect(parsePrice(html, ".price")).toBe(45);
  });
});

describe("detectSoldOut", () => {
  it("is waar als een sold-out-keyword in de pagina staat (case-insensitive)", () => {
    const html = `<body><button>UITVERKOCHT</button></body>`;
    expect(detectSoldOut(html, ["uitverkocht", "sold out"])).toBe(true);
  });

  it("is onwaar als geen enkel keyword voorkomt", () => {
    const html = `<body><button>Koop tickets</button></body>`;
    expect(detectSoldOut(html, ["uitverkocht", "sold out"])).toBe(false);
  });
});

describe("parseOfferFromJsonLd", () => {
  it("leest prijs + beschikbaarheid uit een schema.org Offer (Bospop-vorm)", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicEvent",
      name: "Bospop",
      offers: {
        "@type": "Offer",
        price: "117.50",
        priceCurrency: "EUR",
        availability: "https://schema.org/LimitedAvailability",
      },
    })}</script></head><body>Bospop</body></html>`;
    expect(parseOfferFromJsonLd(html)).toEqual({ price: 117.5, availability: "limited" });
  });

  it("vindt de Offer binnen een @graph-wrapper", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "x" },
        { "@type": "Event", offers: { "@type": "Offer", price: 89, availability: "https://schema.org/InStock" } },
      ],
    })}</script>`;
    expect(parseOfferFromJsonLd(html)).toEqual({ price: 89, availability: "available" });
  });

  it("pakt uit een array van offers de eerste met bruikbare data", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Event",
      offers: [
        { "@type": "Offer", price: "45,00", availability: "https://schema.org/SoldOut" },
        { "@type": "Offer", price: "99,00" },
      ],
    })}</script>`;
    expect(parseOfferFromJsonLd(html)).toEqual({ price: 45, availability: "sold_out" });
  });

  it("ondersteunt AggregateOffer met lowPrice", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Event",
      offers: { "@type": "AggregateOffer", lowPrice: "75.00", priceCurrency: "EUR" },
    })}</script>`;
    expect(parseOfferFromJsonLd(html)).toEqual({ price: 75, availability: null });
  });

  it("geeft null/null als er geen ld+json is", () => {
    expect(parseOfferFromJsonLd("<html><body>geen data</body></html>")).toEqual({
      price: null,
      availability: null,
    });
  });

  it("slaat een kapot ld+json-blok over zonder te crashen", () => {
    const html = `<script type="application/ld+json">{ kapot json ]</script>`;
    expect(parseOfferFromJsonLd(html)).toEqual({ price: null, availability: null });
  });
});
