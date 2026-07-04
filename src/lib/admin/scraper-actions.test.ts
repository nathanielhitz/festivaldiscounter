import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidatePublicFestivalPages: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const q = vi.hoisted(() => ({
  getPriceCheckById: vi.fn(),
  updateOfferPriceAvailability: vi.fn(),
  updatePriceCheckStatus: vi.fn(),
  getOfferSuggestionById: vi.fn(),
  insertTicketOfferFromSuggestion: vi.fn(),
  updateOfferSuggestionStatus: vi.fn(),
}));
vi.mock("@/lib/admin/scraper-queries", () => q);

import {
  approvePriceCheck,
  rejectPriceCheck,
  approveOfferSuggestion,
  rejectOfferSuggestion,
} from "@/lib/admin/scraper-actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(undefined);
});

describe("approvePriceCheck", () => {
  it("schrijft de gescrapete waarden naar de offer en markeert approved", async () => {
    q.getPriceCheckById.mockResolvedValue({
      id: "pc1", ticket_offer_id: "off1", status: "pending",
      scraped_price: 94, scraped_availability: "available",
    });
    await approvePriceCheck("pc1");
    expect(q.updateOfferPriceAvailability).toHaveBeenCalledWith("off1", {
      price_from: 94, availability: "available",
    });
    expect(q.updatePriceCheckStatus).toHaveBeenCalledWith("pc1", "approved");
  });

  it("doet niets als de check niet meer pending is", async () => {
    q.getPriceCheckById.mockResolvedValue({ id: "pc1", status: "approved" });
    await approvePriceCheck("pc1");
    expect(q.updateOfferPriceAvailability).not.toHaveBeenCalled();
  });

  it("weigert zonder geldige sessie", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(approvePriceCheck("pc1")).rejects.toThrow();
    expect(q.getPriceCheckById).not.toHaveBeenCalled();
  });
});

describe("rejectPriceCheck", () => {
  it("markeert rejected en raakt de offer niet aan", async () => {
    await rejectPriceCheck("pc1");
    expect(q.updatePriceCheckStatus).toHaveBeenCalledWith("pc1", "rejected");
    expect(q.updateOfferPriceAvailability).not.toHaveBeenCalled();
  });

  it("weigert zonder geldige sessie", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(rejectPriceCheck("pc1")).rejects.toThrow();
    expect(q.updatePriceCheckStatus).not.toHaveBeenCalled();
  });
});

describe("approveOfferSuggestion", () => {
  it("maakt een nieuwe offer aan en markeert approved", async () => {
    q.getOfferSuggestionById.mockResolvedValue({
      id: "s1", festival_id: "f1", provider: "ticketswap",
      detected_url: "https://ts/x", affiliate_url: "https://ts/x?aff=1", status: "pending",
    });
    await approveOfferSuggestion("s1");
    expect(q.insertTicketOfferFromSuggestion).toHaveBeenCalledWith({
      festival_id: "f1", provider: "ticketswap",
      url: "https://ts/x", affiliate_url: "https://ts/x?aff=1",
    });
    expect(q.updateOfferSuggestionStatus).toHaveBeenCalledWith("s1", "approved");
  });

  it("doet niets als de suggestie niet meer pending is", async () => {
    q.getOfferSuggestionById.mockResolvedValue({ id: "s1", status: "rejected" });
    await approveOfferSuggestion("s1");
    expect(q.insertTicketOfferFromSuggestion).not.toHaveBeenCalled();
  });

  it("weigert zonder geldige sessie", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(approveOfferSuggestion("s1")).rejects.toThrow();
    expect(q.getOfferSuggestionById).not.toHaveBeenCalled();
  });
});

describe("rejectOfferSuggestion", () => {
  it("markeert rejected en maakt geen offer aan", async () => {
    await rejectOfferSuggestion("s1");
    expect(q.updateOfferSuggestionStatus).toHaveBeenCalledWith("s1", "rejected");
    expect(q.insertTicketOfferFromSuggestion).not.toHaveBeenCalled();
  });
});
