import { describe, expect, it } from "vitest";
import { formatDateRange, formatPrice, formatCheckedDate, minPrice, PROVIDER_LABELS } from "@/lib/format";

describe("formatDateRange", () => {
  it("toont één datum bij een eendaags festival", () => {
    expect(formatDateRange("2026-06-19", "2026-06-19")).toBe("19 juni 2026");
  });
  it("verkort binnen dezelfde maand", () => {
    expect(formatDateRange("2026-08-21", "2026-08-23")).toBe("21–23 augustus 2026");
  });
  it("toont beide maanden bij maandoverschrijding", () => {
    expect(formatDateRange("2026-08-28", "2026-09-01")).toBe("28 augustus – 1 september 2026");
  });
});

describe("formatPrice", () => {
  it("laat hele bedragen zonder decimalen zien", () => {
    expect(formatPrice(240)).toBe("€ 240");
  });
  it("toont centen met komma", () => {
    expect(formatPrice(59.5)).toBe("€ 59,50");
  });
});

describe("formatCheckedDate", () => {
  it("formatteert een ISO-timestamp als Nederlandse datum", () => {
    expect(formatCheckedDate("2026-07-02T09:00:00Z")).toBe("2 juli 2026");
  });
});

describe("minPrice", () => {
  it("kiest de laagste prijs en negeert uitverkochte en prijsloze offers", () => {
    expect(
      minPrice([
        { price_from: 260, availability: "limited" },
        { price_from: 240, availability: "available" },
        { price_from: 100, availability: "sold_out" },
        { price_from: null, availability: "available" },
      ])
    ).toBe(240);
  });
  it("geeft null zonder bruikbare prijzen", () => {
    expect(minPrice([{ price_from: null, availability: "available" }])).toBeNull();
  });
});

describe("PROVIDER_LABELS", () => {
  it("kent alle vier de aanbieders", () => {
    expect(PROVIDER_LABELS.official).toBe("Officiële verkoop");
    expect(PROVIDER_LABELS.ticketswap).toBe("TicketSwap");
    expect(PROVIDER_LABELS.gigsberg).toBe("Gigsberg");
    expect(PROVIDER_LABELS.ticombo).toBe("Ticombo");
  });
});
