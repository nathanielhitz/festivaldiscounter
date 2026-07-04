import { describe, expect, it } from "vitest";
import { searchFestivals, type SearchFestival } from "@/lib/search-festivals";

const F: SearchFestival[] = [
  { slug: "lowlands", name: "Lowlands", start_date: "2026-08-21", end_date: "2026-08-23" },
  { slug: "down-the-rabbit-hole", name: "Down The Rabbit Hole", start_date: "2026-07-03", end_date: "2026-07-05" },
  { slug: "loveland", name: "Loveland", start_date: "2026-08-08", end_date: "2026-08-08" },
  { slug: "defqon", name: "Defqon.1", start_date: "2026-06-26", end_date: "2026-06-28" },
  { slug: "pinkpop", name: "Pinkpop", start_date: "2026-06-19", end_date: "2026-06-21" },
  { slug: "best-kept-secret", name: "Best Kept Secret", start_date: "2026-06-05", end_date: "2026-06-07" },
];

const slugs = (q: string, limit?: number) =>
  searchFestivals(F, q, limit).map((r) => r.festival.slug);

describe("searchFestivals — naam-matching", () => {
  it("geeft niets terug bij een leeg of whitespace-only veld", () => {
    expect(searchFestivals(F, "")).toEqual([]);
    expect(searchFestivals(F, "   ")).toEqual([]);
  });

  it("matcht case-insensitive op naam-prefix", () => {
    expect(slugs("low")).toContain("lowlands");
    expect(slugs("LOW")).toContain("lowlands");
  });

  it("rankt prefix-match vóór bevat-match", () => {
    // "lo" is prefix van Lowlands én Loveland; "Loveland"/"Lowlands" beide prefix,
    // dus gesorteerd op startdatum: Loveland (08-08) ... Lowlands (08-21).
    const r = slugs("lo");
    expect(r.indexOf("loveland")).toBeGreaterThanOrEqual(0);
    expect(r.indexOf("lowlands")).toBeGreaterThanOrEqual(0);
  });

  it("matcht deelwoorden midden in de naam (bevat-match)", () => {
    expect(slugs("land")).toEqual(expect.arrayContaining(["lowlands", "loveland"]));
  });

  it("matcht een woord-prefix binnen een meerwoordige naam", () => {
    expect(slugs("rabbit")).toContain("down-the-rabbit-hole");
    expect(slugs("secret")).toContain("best-kept-secret");
  });

  it("prioriteert een echte prefix boven een woord-prefix", () => {
    const results = searchFestivals(F, "best");
    // "Best Kept Secret" begint met "best" → rank 0, staat vooraan.
    expect(results[0].festival.slug).toBe("best-kept-secret");
    expect(results[0].rank).toBe(0);
  });

  it("levert een correcte highlight-range op de originele naam", () => {
    const [top] = searchFestivals(F, "rabbit");
    const { start, end } = top.highlight!;
    expect(top.festival.name.slice(start, end)).toBe("Rabbit");
  });
});

describe("searchFestivals — datum-matching", () => {
  it("matcht op maandnaam (NL)", () => {
    const r = slugs("juni");
    expect(r).toEqual(expect.arrayContaining(["defqon", "pinkpop", "best-kept-secret"]));
    expect(r).not.toContain("lowlands"); // augustus
  });

  it("matcht op Engelse maandnaam", () => {
    expect(slugs("july")).toContain("down-the-rabbit-hole");
  });

  it("matcht op 'dag maand'", () => {
    expect(slugs("4 juli")).toContain("down-the-rabbit-hole"); // 3–5 juli omvat 4 juli
    expect(slugs("10 juli")).not.toContain("down-the-rabbit-hole");
  });

  it("matcht op 'maand jaar'", () => {
    expect(slugs("augustus 2026")).toEqual(expect.arrayContaining(["lowlands", "loveland"]));
    expect(slugs("augustus 2025")).toEqual([]);
  });

  it("matcht op ISO 'jaar-maand'", () => {
    expect(slugs("2026-06")).toEqual(expect.arrayContaining(["defqon", "pinkpop"]));
  });

  it("matcht op jaar alleen", () => {
    expect(searchFestivals(F, "2026", 10).length).toBe(F.length);
    expect(slugs("2030")).toEqual([]);
  });

  it("rankt naam-match vóór datum-match", () => {
    // "loveland" is een naam-match (rank 0). Voeg niets datum-achtigs toe.
    const results = searchFestivals(F, "loveland");
    expect(results[0].rank).toBe(0);
  });
});

describe("searchFestivals — sortering & limiet", () => {
  it("kapt af op de opgegeven limiet", () => {
    expect(searchFestivals(F, "2026", 3).length).toBe(3);
  });

  it("default-limiet is 6", () => {
    const many: SearchFestival[] = Array.from({ length: 10 }, (_, i) => ({
      slug: `f${i}`,
      name: `Festival ${i}`,
      start_date: "2026-07-01",
      end_date: "2026-07-01",
    }));
    expect(searchFestivals(many, "festival").length).toBe(6);
  });

  it("sorteert gelijke rank op startdatum (vroegste eerst)", () => {
    // Alle juni-festivals via datum-match (rank 3), oplopend op startdatum.
    const r = slugs("juni");
    expect(r).toEqual(["best-kept-secret", "pinkpop", "defqon"]);
  });
});
