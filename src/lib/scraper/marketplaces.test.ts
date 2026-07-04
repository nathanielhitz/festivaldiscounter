import { describe, expect, it } from "vitest";
import {
  ticketswapCandidateUrl,
  ticketswapAffiliate,
  matchesFestival,
} from "@/lib/scraper/marketplaces";

describe("ticketswapCandidateUrl", () => {
  it("bouwt een event-URL uit de festival-slug", () => {
    expect(ticketswapCandidateUrl("lowlands")).toBe(
      "https://www.ticketswap.com/event/lowlands"
    );
  });
});

describe("ticketswapAffiliate", () => {
  it("voegt het affiliate-ID als query-param toe", () => {
    expect(
      ticketswapAffiliate("https://www.ticketswap.com/event/lowlands", "aff123")
    ).toBe("https://www.ticketswap.com/event/lowlands?aff=aff123");
  });

  it("geeft null zonder affiliate-ID (nog geen goedkeuring)", () => {
    expect(
      ticketswapAffiliate("https://www.ticketswap.com/event/lowlands", null)
    ).toBeNull();
  });
});

describe("matchesFestival", () => {
  it("is waar als de festivalnaam in de pagina voorkomt (case-insensitive)", () => {
    const html = `<title>Lowlands 2026 tickets — TicketSwap</title>`;
    expect(matchesFestival(html, "Lowlands")).toBe(true);
  });

  it("is onwaar als de naam ontbreekt (voorkomt een verkeerde match)", () => {
    const html = `<title>Pinkpop 2026 tickets — TicketSwap</title>`;
    expect(matchesFestival(html, "Lowlands")).toBe(false);
  });

  it("is onwaar bij een lege naam", () => {
    expect(matchesFestival("<title>x</title>", "")).toBe(false);
  });
});
