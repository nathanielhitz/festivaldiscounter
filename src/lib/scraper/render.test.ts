import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOfferViaRender } from "@/lib/scraper/render";

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOfferViaRender", () => {
  it("leest prijs + beschikbaarheid uit een geldige Firecrawl-respons", async () => {
    mockFetch(200, { data: { json: { price_eur: 79.5, availability: "limited" } } });
    const result = await fetchOfferViaRender("https://example.com", { apiKey: "x", timeoutMs: 1000 });
    expect(result).toEqual({ price: 79.5, availability: "limited" });
  });

  it("geeft null terug als er geen json-data in de respons zit", async () => {
    mockFetch(200, { data: {} });
    const result = await fetchOfferViaRender("https://example.com", { apiKey: "x", timeoutMs: 1000 });
    expect(result).toBeNull();
  });

  it("geeft null terug als prijs en beschikbaarheid allebei onbruikbaar zijn", async () => {
    mockFetch(200, { data: { json: { price_eur: null, availability: "unknown" } } });
    const result = await fetchOfferViaRender("https://example.com", { apiKey: "x", timeoutMs: 1000 });
    expect(result).toBeNull();
  });

  it("negeert een negatieve of niet-numerieke prijs", async () => {
    mockFetch(200, { data: { json: { price_eur: -5, availability: "available" } } });
    const result = await fetchOfferViaRender("https://example.com", { apiKey: "x", timeoutMs: 1000 });
    expect(result).toEqual({ price: null, availability: "available" });
  });

  it("negeert een onherkenbare availability-waarde", async () => {
    mockFetch(200, { data: { json: { price_eur: 50, availability: "onbekend-veld" } } });
    const result = await fetchOfferViaRender("https://example.com", { apiKey: "x", timeoutMs: 1000 });
    expect(result).toEqual({ price: 50, availability: null });
  });

  it("gooit een fout bij een niet-ok HTTP-status", async () => {
    mockFetch(402, {});
    await expect(
      fetchOfferViaRender("https://example.com", { apiKey: "x", timeoutMs: 1000 })
    ).rejects.toThrow("Firecrawl HTTP 402");
  });

  it("stuurt de API-key, url en schema correct mee", async () => {
    mockFetch(200, { data: { json: { price_eur: 10, availability: "available" } } });
    await fetchOfferViaRender("https://example.com/tickets", { apiKey: "fc-secret", timeoutMs: 15000 });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("https://api.firecrawl.dev/v2/scrape");
    expect(call[1].headers.authorization).toBe("Bearer fc-secret");
    const parsedBody = JSON.parse(call[1].body);
    expect(parsedBody.url).toBe("https://example.com/tickets");
    expect(parsedBody.timeout).toBe(15000);
    expect(parsedBody.formats[0].type).toBe("json");
  });
});
