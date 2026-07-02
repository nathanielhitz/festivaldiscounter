import { describe, expect, it } from "vitest";
import { buildEventSchema, buildFaqSchema, buildBreadcrumbSchema } from "@/lib/schema-org";
import type { Festival, TicketOffer } from "@/lib/types";

const festival = {
  name: "Lowlands", description: "Drie dagen muziek.", city: "Biddinghuizen",
  venue: "Walibi", province: "Flevoland", country: "NL",
  start_date: "2026-08-21", end_date: "2026-08-23", status: "tickets_live",
  image_url: null,
} as Festival;

const offers = [
  { id: "abc", price_from: 240, currency: "EUR", availability: "available" },
  { id: "def", price_from: null, currency: "EUR", availability: "unknown" },
] as TicketOffer[];

describe("buildEventSchema", () => {
  it("bouwt een Festival-event met offers via /uit/", () => {
    const s = buildEventSchema(festival, offers, "https://festivaldiscounter.nl");
    expect(s["@type"]).toBe("Festival");
    expect(s.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(s.offers).toHaveLength(1); // prijsloze offer weggelaten
    expect(s.offers[0].url).toBe("https://festivaldiscounter.nl/uit/abc");
  });
  it("markeert afgelaste festivals", () => {
    const s = buildEventSchema({ ...festival, status: "cancelled" }, [], "https://x.nl");
    expect(s.eventStatus).toBe("https://schema.org/EventCancelled");
  });
});

describe("buildFaqSchema", () => {
  it("bouwt een FAQPage", () => {
    const s = buildFaqSchema([{ question: "V?", answer: "A." }]);
    expect(s["@type"]).toBe("FAQPage");
    expect(s.mainEntity[0].acceptedAnswer.text).toBe("A.");
  });
});

describe("buildBreadcrumbSchema", () => {
  it("nummert de kruimels vanaf 1", () => {
    const s = buildBreadcrumbSchema("https://x.nl", [
      { name: "Festivals", path: "/festivals" },
      { name: "Lowlands", path: "/festivals/lowlands" },
    ]);
    expect(s.itemListElement[1].position).toBe(2);
    expect(s.itemListElement[1].item).toBe("https://x.nl/festivals/lowlands");
  });
});
