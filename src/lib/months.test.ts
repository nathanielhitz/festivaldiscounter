import { describe, expect, it } from "vitest";
import { monthSlug, parseMonthSlug, monthLabel, monthsWithFestivals } from "@/lib/months";

describe("monthSlug", () => {
  it("maakt een slug van een ISO-datum", () => {
    expect(monthSlug("2026-07-10")).toBe("juli-2026");
  });
});

describe("parseMonthSlug", () => {
  it("parseert een geldige slug", () => {
    expect(parseMonthSlug("juli-2026")).toEqual({ year: 2026, month: 6 });
  });
  it("geeft null bij onzin", () => {
    expect(parseMonthSlug("foo-bar")).toBeNull();
    expect(parseMonthSlug("juli")).toBeNull();
  });
});

describe("monthLabel", () => {
  it("maakt een leesbaar label", () => {
    expect(monthLabel("juli-2026")).toBe("juli 2026");
  });
});

describe("monthsWithFestivals", () => {
  it("geeft unieke, gesorteerde maandslugs op basis van startdata", () => {
    expect(
      monthsWithFestivals([
        { start_date: "2026-08-21" },
        { start_date: "2026-06-26" },
        { start_date: "2026-08-28" },
      ])
    ).toEqual(["juni-2026", "augustus-2026"]);
  });
});
