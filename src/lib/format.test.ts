import { describe, expect, it } from "vitest";
import { formatDateRange, formatPrice, formatCheckedDate, minPrice, cheapestOffer, PROVIDER_LABELS } from "@/lib/format";

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
  it("toont beide maanden bij jaarovergang", () => {
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 december – 2 januari 2027");
  });
});

describe("formatPrice", () => {
  it("laat hele bedragen zonder decimalen zien", () => {
    expect(formatPrice(240)).toBe("€ 240");
  });
  it("toont centen met komma", () => {
    expect(formatPrice(59.5)).toBe("€ 59,50");
  });
  it("rondt eerst af op centen", () => {
    expect(formatPrice(59.999)).toBe("€ 60");
  });
  it("gebruikt een punt als duizendtalscheiding", () => {
    expect(formatPrice(1234)).toBe("€ 1.234");
  });
});

describe("formatCheckedDate", () => {
  it("formatteert een ISO-timestamp als Nederlandse datum", () => {
    expect(formatCheckedDate("2026-07-02T09:00:00Z")).toBe("2 juli 2026");
  });
  it("formatteert in Nederlandse tijdzone: laat op de avond UTC is het hier al morgen", () => {
    expect(formatCheckedDate("2026-07-02T23:30:00Z")).toBe("3 juli 2026");
  });
  it("verwerkt timestamps met expliciete offset", () => {
    expect(formatCheckedDate("2026-07-02T09:00:00+02:00")).toBe("2 juli 2026");
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
  it("geeft null bij een lege lijst", () => {
    expect(minPrice([])).toBeNull();
  });
});

describe("cheapestOffer", () => {
  it("geeft de goedkoopste bruikbare offer terug", () => {
    const goedkoopste = { price_from: 240, availability: "available" as const, provider: "ticketswap" };
    expect(
      cheapestOffer([
        { price_from: 260, availability: "limited" as const, provider: "official" },
        goedkoopste,
        { price_from: 100, availability: "sold_out" as const, provider: "gigsberg" },
        { price_from: null, availability: "available" as const, provider: "ticombo" },
      ])
    ).toBe(goedkoopste);
  });
  it("geeft null zonder bruikbare offers", () => {
    expect(
      cheapestOffer([
        { price_from: 100, availability: "sold_out" as const },
        { price_from: null, availability: "available" as const },
      ])
    ).toBeNull();
  });
  it("geeft null bij een lege lijst", () => {
    expect(cheapestOffer([])).toBeNull();
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
