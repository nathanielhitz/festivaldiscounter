import { beforeEach, describe, expect, it, vi } from "vitest";

const getOfferById = vi.fn();
const logClick = vi.fn();
vi.mock("@/lib/queries", () => ({
  getOfferById: (...a: unknown[]) => getOfferById(...a),
  logClick: (...a: unknown[]) => logClick(...a),
}));

import { GET } from "./route";

function makeRequest(referer?: string) {
  return new Request("http://localhost:3000/uit/x", {
    headers: referer ? { referer } : {},
  });
}

const params = (offerId: string) => ({ params: Promise.resolve({ offerId }) });

beforeEach(() => {
  vi.clearAllMocks();
  // de echte logClick is async en geeft altijd een Promise terug
  logClick.mockResolvedValue(undefined);
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
});

describe("GET /uit/[offerId]", () => {
  it("stuurt door naar affiliate_url als die er is", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: "https://aff.nl/t" });
    const res = await GET(makeRequest(), params("1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://aff.nl/t");
  });

  it("valt terug op de gewone url zonder affiliate_url", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    const res = await GET(makeRequest(), params("1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://a.nl/t");
  });

  it("logt de klik met referer", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    await GET(makeRequest("http://localhost:3000/festivals/lowlands"), params("1"));
    expect(logClick).toHaveBeenCalledWith("1", "http://localhost:3000/festivals/lowlands");
  });

  it("logt de klik met null zonder referer-header", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    await GET(makeRequest(), params("1"));
    expect(logClick).toHaveBeenCalledWith("1", null);
  });

  it("redirect blijft werken als het loggen faalt", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    logClick.mockRejectedValue(new Error("db down"));
    const res = await GET(makeRequest(), params("1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://a.nl/t");
  });

  it("stuurt naar de homepage bij een ongeldige doel-url en logt geen klik", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "", affiliate_url: null });
    const res = await GET(makeRequest(), params("1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(logClick).not.toHaveBeenCalled();
  });

  it("zet Cache-Control: no-store op de redirect", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    const res = await GET(makeRequest(), params("1"));
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("stuurt onbekende ids naar de homepage", async () => {
    getOfferById.mockResolvedValue(null);
    const res = await GET(makeRequest(), params("bestaat-niet"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("stuurt naar de homepage als de databasequery faalt", async () => {
    getOfferById.mockRejectedValue(new Error("db down"));
    const res = await GET(makeRequest(), params("1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });
});
