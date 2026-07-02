import { describe, expect, it } from "vitest";
import { monthSlug, parseMonthSlug, monthLabel, monthsWithFestivals, todayAmsterdam } from "@/lib/months";

describe("monthSlug", () => {
  it("maakt een slug van een ISO-datum", () => {
    expect(monthSlug("2026-07-10")).toBe("juli-2026");
  });
  it("werkt op de maandgrenzen januari en december", () => {
    expect(monthSlug("2026-01-15")).toBe("januari-2026");
    expect(monthSlug("2026-12-31")).toBe("december-2026");
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
  it("geeft null bij een jaar buiten 2020–2100", () => {
    expect(parseMonthSlug("juli-9999")).toBeNull();
    expect(parseMonthSlug("juli-2019")).toBeNull();
  });
  it("is hoofdlettergevoelig", () => {
    expect(parseMonthSlug("Juli-2026")).toBeNull();
  });
  it("round-tript met monthSlug", () => {
    expect(parseMonthSlug(monthSlug("2026-01-15"))).toEqual({ year: 2026, month: 0 });
  });
});

describe("monthLabel", () => {
  it("maakt een leesbaar label", () => {
    expect(monthLabel("juli-2026")).toBe("juli 2026");
  });
});

describe("todayAmsterdam", () => {
  it("geeft een ISO-datum (YYYY-MM-DD)", () => {
    expect(todayAmsterdam()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("komt overeen met een onafhankelijke berekening in Europe/Amsterdam", () => {
    // Onafhankelijke tweede berekening: losse datumdelen via formatToParts.
    const parts = new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const expected = `${get("year")}-${get("month")}-${get("day")}`;
    expect(todayAmsterdam()).toBe(expected);
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
  it("sorteert correct over een jaargrens heen", () => {
    expect(
      monthsWithFestivals([{ start_date: "2027-01-05" }, { start_date: "2026-12-12" }])
    ).toEqual(["december-2026", "januari-2027"]);
  });
});
