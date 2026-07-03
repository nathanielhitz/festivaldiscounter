import { describe, expect, it } from "vitest";
import { buildFaq } from "@/lib/faq";
import type { Festival, TicketOffer } from "@/lib/types";

const festival = {
  name: "Lowlands", city: "Biddinghuizen", venue: "Evenemententerrein Walibi Holland",
  province: "Flevoland", start_date: "2026-08-21", end_date: "2026-08-23",
  status: "tickets_live",
} as Festival;

const offers = [
  { provider: "ticketswap", price_from: 240, availability: "available" },
  { provider: "official", price_from: 260, availability: "limited" },
] as TicketOffer[];

describe("buildFaq", () => {
  it("bouwt vragen over datum, locatie, prijs en status", () => {
    const faq = buildFaq(festival, offers);
    expect(faq.map((f) => f.question)).toEqual([
      "Wanneer is Lowlands 2026?",
      "Waar is Lowlands?",
      "Wat kost een ticket voor Lowlands?",
      "Is Lowlands uitverkocht?",
    ]);
    expect(faq[0].answer).toContain("21–23 augustus 2026");
    expect(faq[1].answer).toContain("Biddinghuizen");
    expect(faq[2].answer).toContain("€ 240");
    expect(faq[2].answer).toContain("TicketSwap");
    expect(faq[3].answer).toContain("niet uitverkocht");
    expect(faq[3].answer).toContain("op deze pagina");
    expect(faq[3].answer).not.toContain("hierboven");
  });

  it("noemt geen venue in het locatie-antwoord als die ontbreekt", () => {
    const faq = buildFaq({ ...festival, venue: null }, offers);
    expect(faq[1].answer).toBe("Lowlands vindt plaats in Biddinghuizen (Flevoland).");
  });

  it("laat de prijsvraag weg zonder bruikbare prijs", () => {
    const faq = buildFaq(festival, []);
    expect(faq.map((f) => f.question)).not.toContain("Wat kost een ticket voor Lowlands?");
  });

  it("meldt uitverkocht bij status sold_out", () => {
    const faq = buildFaq({ ...festival, status: "sold_out" }, offers);
    expect(faq.at(-1)!.question).toBe("Is Lowlands uitverkocht?");
    expect(faq.at(-1)!.answer).toContain("officieel uitverkocht");
  });

  it("vervangt de uitverkocht-vraag bij status cancelled en onderdrukt de prijsvraag", () => {
    const faq = buildFaq({ ...festival, status: "cancelled" }, offers);
    const vragen = faq.map((f) => f.question);
    expect(vragen).not.toContain("Is Lowlands uitverkocht?");
    expect(vragen).not.toContain("Wat kost een ticket voor Lowlands?");
    expect(faq.at(-1)!.question).toBe("Gaat Lowlands nog door?");
    expect(faq.at(-1)!.answer).toContain("afgelast");
    expect(faq.at(-1)!.answer).toContain("terugbetaling");
  });

  it("laat de uitverkocht-vraag en prijsvraag helemaal weg bij status past", () => {
    const faq = buildFaq({ ...festival, status: "past" }, offers);
    const vragen = faq.map((f) => f.question);
    expect(vragen).not.toContain("Is Lowlands uitverkocht?");
    expect(vragen).not.toContain("Gaat Lowlands nog door?");
    expect(vragen).not.toContain("Wat kost een ticket voor Lowlands?");
  });

  it("meldt bij status announced dat de officiële verkoop nog niet is gestart", () => {
    const faq = buildFaq({ ...festival, status: "announced" }, offers);
    expect(faq.at(-1)!.question).toBe("Is Lowlands uitverkocht?");
    expect(faq.at(-1)!.answer).toBe(
      "Nee, de officiële kaartverkoop voor Lowlands is nog niet gestart."
    );
    expect(faq.at(-1)!.answer).not.toContain("aanbieders");
  });
});
