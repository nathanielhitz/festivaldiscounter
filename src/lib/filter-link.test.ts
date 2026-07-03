import { describe, expect, it } from "vitest";
import { buildFilterHref } from "@/lib/filter-link";

describe("buildFilterHref", () => {
  it("geeft de kale /festivals terug zonder actieve filters", () => {
    expect(buildFilterHref({}, {})).toBe("/festivals");
  });

  it("zet een nieuwe filterwaarde in de querystring", () => {
    expect(buildFilterHref({}, { maand: "juli-2026" })).toBe("/festivals?maand=juli-2026");
  });

  it("behoudt bestaande filters en voegt de patch toe", () => {
    expect(
      buildFilterHref({ maand: "juli-2026", genre: "techno" }, { provincie: "Utrecht" })
    ).toBe("/festivals?maand=juli-2026&genre=techno&provincie=Utrecht");
  });

  it("overschrijft een bestaande waarde met de patch", () => {
    expect(buildFilterHref({ maand: "juli-2026" }, { maand: "augustus-2026" })).toBe(
      "/festivals?maand=augustus-2026"
    );
  });

  it("verwijdert een filter als de patch-waarde undefined is", () => {
    expect(buildFilterHref({ maand: "juli-2026", genre: "techno" }, { maand: undefined })).toBe(
      "/festivals?genre=techno"
    );
  });

  it("laat de zoekterm q ongemoeid als die niet in de patch zit", () => {
    expect(buildFilterHref({ q: "lowlands" }, { genre: "rock" })).toBe(
      "/festivals?q=lowlands&genre=rock"
    );
  });

  it("laat een lege string wegvallen net als undefined", () => {
    expect(buildFilterHref({ maand: "juli-2026" }, { maand: "" })).toBe("/festivals");
  });
});
