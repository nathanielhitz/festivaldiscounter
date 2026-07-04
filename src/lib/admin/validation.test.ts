import { describe, expect, it } from "vitest";
import { parseFestivalForm, parseOfferForm, isValidSlug } from "@/lib/admin/validation";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const geldigFestival = {
  slug: "lowlands",
  name: "Lowlands",
  description: "Een festival.",
  city: "Biddinghuizen",
  province: "Flevoland",
  start_date: "2026-08-21",
  end_date: "2026-08-23",
  status: "tickets_live",
  genres: "rock, techno",
};

describe("isValidSlug", () => {
  it("accepteert kleine letters, cijfers en koppeltekens", () => {
    expect(isValidSlug("lowlands-2026")).toBe(true);
  });
  it("weigert hoofdletters, spaties en randkoppeltekens", () => {
    expect(isValidSlug("Lowlands")).toBe(false);
    expect(isValidSlug("low lands")).toBe(false);
    expect(isValidSlug("-low")).toBe(false);
  });
});

describe("parseFestivalForm", () => {
  it("parseert een geldig festival, genres als array", () => {
    const r = parseFestivalForm(fd(geldigFestival));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.genres).toEqual(["rock", "techno"]);
      expect(r.data.country).toBe("NL");
      expect(r.data.venue).toBeNull();
    }
  });

  it("weigert een ongeldige slug", () => {
    const r = parseFestivalForm(fd({ ...geldigFestival, slug: "Fout Slug" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.slug).toBeTruthy();
  });

  it("weigert einddatum vóór startdatum", () => {
    const r = parseFestivalForm(fd({ ...geldigFestival, end_date: "2026-08-20" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.end_date).toBeTruthy();
  });

  it("weigert een ongeldige website-URL", () => {
    const r = parseFestivalForm(fd({ ...geldigFestival, website_url: "geen-url" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.website_url).toBeTruthy();
  });
});

describe("parseOfferForm", () => {
  const geldigeOffer = {
    festival_id: "11111111-1111-1111-1111-111111111111",
    provider: "ticketswap",
    url: "https://ticketswap.nl/event/x",
    availability: "available",
    price_from: "79,50",
  };

  it("parseert een geldige offer en normaliseert de prijs", () => {
    const r = parseOfferForm(fd(geldigeOffer));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.price_from).toBe(79.5);
      expect(r.data.currency).toBe("EUR");
    }
  });

  it("laat een lege prijs toe (null)", () => {
    const r = parseOfferForm(fd({ ...geldigeOffer, price_from: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.price_from).toBeNull();
  });

  it("weigert een ongeldige aanbieder en een ongeldige URL", () => {
    expect(parseOfferForm(fd({ ...geldigeOffer, provider: "onzin" })).ok).toBe(false);
    expect(parseOfferForm(fd({ ...geldigeOffer, url: "ftp://x" })).ok).toBe(false);
  });
});
