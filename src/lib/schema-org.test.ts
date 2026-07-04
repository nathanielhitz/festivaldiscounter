import { describe, expect, it } from "vitest";
import {
  buildEventSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/schema-org";
import type { Festival, TicketOffer } from "@/lib/types";

const festival = {
  name: "Lowlands", slug: "lowlands", description: "Drie dagen muziek.", city: "Biddinghuizen",
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
    expect(s.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
    expect(s.url).toBe("https://festivaldiscounter.nl/festivals/lowlands");
    expect(s.offers).toHaveLength(1); // prijsloze offer weggelaten
    expect(s.offers![0].url).toBe("https://festivaldiscounter.nl/uit/abc");
    expect(s.offers![0].availability).toBe("https://schema.org/InStock");
  });

  it("markeert afgelaste festivals en laat lege offers weg", () => {
    const s = buildEventSchema({ ...festival, status: "cancelled" }, [], "https://x.nl");
    expect(s.eventStatus).toBe("https://schema.org/EventCancelled");
    expect(s).not.toHaveProperty("offers");
  });

  it("mapt limited naar LimitedAvailability", () => {
    const s = buildEventSchema(
      festival,
      [{ id: "abc", price_from: 260, currency: "EUR", availability: "limited" }] as TicketOffer[],
      "https://x.nl"
    );
    expect(s.offers![0].availability).toBe("https://schema.org/LimitedAvailability");
  });

  it("mapt sold_out naar SoldOut", () => {
    const s = buildEventSchema(
      festival,
      [{ id: "abc", price_from: 260, currency: "EUR", availability: "sold_out" }] as TicketOffer[],
      "https://x.nl"
    );
    expect(s.offers![0].availability).toBe("https://schema.org/SoldOut");
  });

  it("laat availability weg bij unknown, ook met prijs", () => {
    const s = buildEventSchema(
      festival,
      [{ id: "abc", price_from: 260, currency: "EUR", availability: "unknown" }] as TicketOffer[],
      "https://x.nl"
    );
    expect(s.offers).toHaveLength(1);
    expect(s.offers![0]).not.toHaveProperty("availability");
  });

  it("rondt de offer-prijs af op centen", () => {
    const s = buildEventSchema(
      festival,
      [{ id: "abc", price_from: 240.567, currency: "EUR", availability: "available" }] as TicketOffer[],
      "https://x.nl"
    );
    expect(s.offers![0].price).toBe(240.57);
  });

  it("zet de line-up om naar performer-entries (komma-gescheiden)", () => {
    const s = buildEventSchema(
      { ...festival, lineup: "Armin van Buuren, Oliver Heldens , Maddix" },
      [],
      "https://x.nl"
    );
    expect(s.performer).toEqual([
      { "@type": "PerformingGroup", name: "Armin van Buuren" },
      { "@type": "PerformingGroup", name: "Oliver Heldens" },
      { "@type": "PerformingGroup", name: "Maddix" },
    ]);
  });

  it("splitst de line-up ook op nieuwe regels en negeert lege stukken", () => {
    const s = buildEventSchema(
      { ...festival, lineup: "Angerfist\nNosferatu,  \n Tha Playah" },
      [],
      "https://x.nl"
    );
    expect(s.performer?.map((p) => p.name)).toEqual(["Angerfist", "Nosferatu", "Tha Playah"]);
  });

  it("laat performer weg zonder line-up", () => {
    const s = buildEventSchema({ ...festival, lineup: null }, [], "https://x.nl");
    expect(s).not.toHaveProperty("performer");
  });
});

describe("buildOrganizationSchema", () => {
  it("bouwt een Organization met naam, url en logo", () => {
    const s = buildOrganizationSchema("https://festivaldiscounter.nl");
    expect(s["@type"]).toBe("Organization");
    expect(s.url).toBe("https://festivaldiscounter.nl");
    expect(s.logo).toContain("https://festivaldiscounter.nl");
    expect(s.name).toBeTruthy();
  });
});

describe("buildWebSiteSchema", () => {
  it("bouwt een WebSite met naam en url", () => {
    const s = buildWebSiteSchema("https://festivaldiscounter.nl");
    expect(s["@type"]).toBe("WebSite");
    expect(s.url).toBe("https://festivaldiscounter.nl");
    expect(s.name).toBeTruthy();
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
