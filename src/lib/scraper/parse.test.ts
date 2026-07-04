import { describe, expect, it } from "vitest";
import { parsePrice, detectSoldOut } from "@/lib/scraper/parse";

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
