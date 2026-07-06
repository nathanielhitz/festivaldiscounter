import { describe, expect, it } from "vitest";
import {
  targetForSlug,
  isCuratedTarget,
  pickDailyBatch,
  PRICE_SCRAPE_CONFIG,
} from "@/lib/scraper/config";

describe("targetForSlug", () => {
  it("geeft de curated entry terug voor een geconfigureerd festival", () => {
    const target = targetForSlug("awakenings-summer-festival");
    expect(target.strategy).toBe("css");
    expect(target.soldOutKeywords).toContain("uitverkocht");
  });

  it("geeft de veilige jsonld-default voor een onbekend festival", () => {
    const target = targetForSlug("dance-valley");
    expect(target).toEqual({
      festivalSlug: "dance-valley",
      strategy: "jsonld",
      soldOutKeywords: [], // geen keyword-matching op ongeverifieerde sites
    });
  });

  it("levert een priceUrl-override voor curated JS-widget-festivals", () => {
    const lowlands = targetForSlug("lowlands");
    expect(lowlands.priceUrl).toBe("https://lowlands.nl/tickets/ticketinformatie/");
    // De default-target heeft géén priceUrl.
    expect(targetForSlug("dance-valley").priceUrl).toBeUndefined();
  });
});

describe("isCuratedTarget", () => {
  it("herkent curated en niet-curated slugs", () => {
    for (const t of PRICE_SCRAPE_CONFIG) expect(isCuratedTarget(t.festivalSlug)).toBe(true);
    expect(isCuratedTarget("dance-valley")).toBe(false);
  });
});

describe("pickDailyBatch", () => {
  const items = ["a", "b", "c", "d", "e"];
  const DAY = 86_400_000;

  it("verdeelt de items in batches van de gevraagde grootte", () => {
    const { batch, batchCount } = pickDailyBatch(items, 2, 0);
    expect(batchCount).toBe(3);
    expect(batch).toEqual(["a", "b"]);
  });

  it("roteert per dag en dekt over batchCount dagen alle items", () => {
    const seen = new Set<string>();
    for (let day = 0; day < 3; day++) {
      for (const item of pickDailyBatch(items, 2, day * DAY).batch) seen.add(item);
    }
    expect(seen).toEqual(new Set(items));
  });

  it("wrapt na de laatste batch terug naar de eerste", () => {
    expect(pickDailyBatch(items, 2, 3 * DAY).batch).toEqual(["a", "b"]);
  });

  it("kiest binnen dezelfde dag steeds dezelfde batch", () => {
    const morning = pickDailyBatch(items, 2, DAY + 5 * 3_600_000).batch;
    const evening = pickDailyBatch(items, 2, DAY + 23 * 3_600_000).batch;
    expect(morning).toEqual(evening);
  });

  it("geeft alles in één batch als er minder items dan de batchgrootte zijn", () => {
    const { batch, batchCount } = pickDailyBatch(["a", "b"], 8, 7 * DAY);
    expect(batchCount).toBe(1);
    expect(batch).toEqual(["a", "b"]);
  });

  it("is veilig bij lege input en ongeldige batchgrootte", () => {
    expect(pickDailyBatch([], 8, 0)).toEqual({ batch: [], batchIndex: 0, batchCount: 0 });
    expect(pickDailyBatch(items, 0, 0).batch).toEqual([]);
  });
});
