import { describe, expect, it } from "vitest";
import { evaluateAutoApprove, AUTO_APPROVE_MAX_DELTA } from "@/lib/scraper/auto-approve";

describe("evaluateAutoApprove", () => {
  it("keurt een kleine prijswijziging binnen de drempel automatisch goed", () => {
    const d = evaluateAutoApprove({ currentPrice: 100, scrapedPrice: 110, scrapedAvailability: "available" });
    expect(d.autoApprove).toBe(true);
  });

  it("keurt exact op de drempel nog goed (inclusief grens)", () => {
    const d = evaluateAutoApprove({
      currentPrice: 100,
      scrapedPrice: 100 * (1 + AUTO_APPROVE_MAX_DELTA),
      scrapedAvailability: "available",
    });
    expect(d.autoApprove).toBe(true);
  });

  it("keurt een grote prijssprong (>30%) niet automatisch goed", () => {
    const d = evaluateAutoApprove({ currentPrice: 100, scrapedPrice: 145, scrapedAvailability: "available" });
    expect(d.autoApprove).toBe(false);
    expect(d.reason).toMatch(/45%/);
  });

  it("keurt een sold-out-signaal nooit automatisch goed, ook niet bij gelijke prijs", () => {
    const d = evaluateAutoApprove({ currentPrice: 100, scrapedPrice: 100, scrapedAvailability: "sold_out" });
    expect(d.autoApprove).toBe(false);
  });

  it("keurt een zuiver beschikbaarheidssignaal zonder prijs niet automatisch goed", () => {
    const d = evaluateAutoApprove({ currentPrice: 100, scrapedPrice: null, scrapedAvailability: "limited" });
    expect(d.autoApprove).toBe(false);
  });

  it("keurt de allereerste prijsmeting (geen bestaande prijs) niet automatisch goed", () => {
    const d = evaluateAutoApprove({ currentPrice: null, scrapedPrice: 79, scrapedAvailability: "available" });
    expect(d.autoApprove).toBe(false);
  });

  it("keurt niets automatisch goed als de huidige prijs € 0 is", () => {
    const d = evaluateAutoApprove({ currentPrice: 0, scrapedPrice: 10, scrapedAvailability: "available" });
    expect(d.autoApprove).toBe(false);
  });

  it("werkt symmetrisch voor prijsdalingen", () => {
    const up = evaluateAutoApprove({ currentPrice: 100, scrapedPrice: 120, scrapedAvailability: "available" });
    const down = evaluateAutoApprove({ currentPrice: 100, scrapedPrice: 80, scrapedAvailability: "available" });
    expect(up.autoApprove).toBe(true);
    expect(down.autoApprove).toBe(true);
  });
});
