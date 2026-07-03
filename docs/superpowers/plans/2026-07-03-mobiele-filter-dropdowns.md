# Mobiele filter-dropdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de drie mobiele pill-grid filtergroepen (Maand, Genre, Provincie) op `/festivals` door compacte, native `<details>`-gebaseerde dropdowns met accordion-gedrag, checkmarks en tap-buiten-sluit-gedrag, zonder de bestaande desktop-weergave te wijzigen.

**Architecture:** Eén nieuwe pure functie (`buildFilterHref`) vervangt de inline URL-bouw-closure en wordt door zowel de nieuwe mobiele dropdowns als de bestaande desktop-pills gebruikt. `FilterDropdown` is een Server Component (native `<details name>` regelt accordion-exclusiviteit gratis via de browser). Eén klein Client Component (`DetailsOutsideCloser`) voegt alleen "sluit bij tap buiten het menu" toe; het bevat geen zichtbare UI.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4 (bestaande tokens), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-mobiele-filter-dropdowns-design.md` — lees deze eerst.

---

## Bestandsstructuur

```
src/
├── lib/
│   ├── filter-link.ts          (nieuw) — buildFilterHref, pure functie
│   └── filter-link.test.ts     (nieuw) — Vitest-tests
├── components/
│   ├── FilterDropdown.tsx      (nieuw) — Server Component, herbruikbaar per categorie
│   └── DetailsOutsideCloser.tsx (nieuw) — enige Client Component, geen UI
└── app/festivals/
    └── page.tsx                (wijzig) — gebruikt buildFilterHref, mobiel/desktop-splitsing
```

---

### Taak 1: `buildFilterHref` — pure URL-bouwfunctie (TDD)

**Files:**
- Create: `src/lib/filter-link.ts`
- Test: `src/lib/filter-link.test.ts`

- [ ] **Stap 1: Schrijf de falende tests in `src/lib/filter-link.test.ts`**

```ts
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
```

- [ ] **Stap 2: Run de tests — verwacht FAIL**

Run: `npm test -- filter-link.test.ts`
Expected: FAIL met "Cannot find module '@/lib/filter-link'" (of gelijksoortig — de module bestaat nog niet).

- [ ] **Stap 3: Implementeer `src/lib/filter-link.ts`**

```ts
export interface FestivalFilterState {
  q?: string;
  maand?: string;
  genre?: string;
  provincie?: string;
}

// Bouwt de href voor /festivals met bestaande filters + een patch samengevoegd.
// Lege/undefined waarden vallen weg uit de querystring; blijft er niets over,
// dan is het resultaat de kale /festivals-URL.
export function buildFilterHref(
  current: FestivalFilterState,
  patch: Partial<FestivalFilterState>
): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/festivals?${qs}` : "/festivals";
}
```

- [ ] **Stap 4: Run de tests — verwacht PASS**

Run: `npm test -- filter-link.test.ts`
Expected: alle 7 tests groen.

- [ ] **Stap 5: Run de volledige suite ter controle**

Run: `npm test`
Expected: alle bestaande tests blijven groen, plus de 7 nieuwe (totaal hoger dan de huidige 54).

- [ ] **Stap 6: Commit**

```bash
git add src/lib/filter-link.ts src/lib/filter-link.test.ts
git commit -m "feat: buildFilterHref pure functie voor festivalfilters (TDD)"
```

---

### Taak 2: `FilterDropdown` component

**Files:**
- Create: `src/components/FilterDropdown.tsx`

- [ ] **Stap 1: Maak `src/components/FilterDropdown.tsx`**

Server Component (geen `"use client"`). Native `<details name={groupName}>` regelt de
accordion-exclusiviteit; de chevron is een kleine inline SVG (geen icon-library, zelfde
aanpak als `MobileNav.tsx`).

```tsx
import Link from "next/link";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  groupName: string;
  label: string;
  options: FilterOption[];
  selectedValue: string | undefined;
  selectedLabel: string;
  buildHref: (value: string | undefined) => string;
}

export default function FilterDropdown({
  groupName,
  label,
  options,
  selectedValue,
  selectedLabel,
  buildHref,
}: FilterDropdownProps) {
  const allOptions: FilterOption[] = [{ value: "", label: "Alle" }, ...options];

  return (
    <details
      name={groupName}
      className="group rounded-xl border border-line bg-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-bold uppercase tracking-wider text-mut">{label}</span>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {selectedLabel}
          <svg
            aria-hidden
            viewBox="0 0 12 8"
            className="h-2.5 w-3 fill-none stroke-current stroke-2 transition-transform group-open:rotate-180"
          >
            <path d="M1 1.5L6 6.5L11 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <ul className="border-t border-line">
        {allOptions.map((opt) => {
          const value = opt.value || undefined;
          const isSelected = value === selectedValue;
          return (
            <li key={opt.value || "alle"}>
              <Link
                href={buildHref(value)}
                aria-current={isSelected ? "true" : undefined}
                className="flex items-center justify-between px-4 py-3 text-sm text-ink hover:bg-ground/40"
              >
                {opt.label}
                {isSelected && <span aria-hidden>✓</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
```

- [ ] **Stap 2: Verifieer**

Run: `npm run typecheck && npm run lint`
Expected: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/components/FilterDropdown.tsx
git commit -m "feat: FilterDropdown component (native details, herbruikbaar per filtercategorie)"
```

---

### Taak 3: `DetailsOutsideCloser` component

**Files:**
- Create: `src/components/DetailsOutsideCloser.tsx`

- [ ] **Stap 1: Maak `src/components/DetailsOutsideCloser.tsx`**

Het enige Client Component in deze feature. Rendert geen zichtbare UI; sluit alle open
`<details>`-elementen met de opgegeven `name` zodra er buiten geklikt/getikt wordt.

```tsx
"use client";

import { useEffect } from "react";

export default function DetailsOutsideCloser({ groupName }: { groupName: string }) {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(`details[name="${groupName}"][open]`)
        .forEach((d) => {
          if (!d.contains(e.target as Node)) d.open = false;
        });
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [groupName]);

  return null;
}
```

- [ ] **Stap 2: Verifieer**

Run: `npm run typecheck && npm run lint`
Expected: geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add src/components/DetailsOutsideCloser.tsx
git commit -m "feat: DetailsOutsideCloser — sluit filterdropdown bij tap buiten het menu"
```

---

### Taak 4: Integratie in `src/app/festivals/page.tsx`

**Files:**
- Modify: `src/app/festivals/page.tsx`

Vervangt de inline `filterLink`-closure door `buildFilterHref`, en splitst de filterbalk
in een mobiele dropdown-versie (`lg:hidden`) en de ongewijzigde desktop-pills
(`hidden lg:flex`).

- [ ] **Stap 1: Vervang de volledige inhoud van `src/app/festivals/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import FestivalCard from "@/components/FestivalCard";
import FilterDropdown from "@/components/FilterDropdown";
import DetailsOutsideCloser from "@/components/DetailsOutsideCloser";
import { getUpcomingFestivals } from "@/lib/queries";
import { monthLabel, monthSlug, monthsWithFestivals } from "@/lib/months";
import { buildFilterHref, type FestivalFilterState } from "@/lib/filter-link";

// Deze route is dynamisch (searchParams is een Dynamic API in Next 15), dus
// route-level ISR via `export const revalidate` werkt hier niet. In plaats
// daarvan cachen we de data-fetch zelf in de Data Cache (max 1 uur oud,
// dezelfde versheid als de ISR-pagina's). Let op: todayAmsterdam() draait
// bínnen getUpcomingFestivals, dus "vandaag" bevriest maximaal een uur mee.
const getCachedUpcomingFestivals = unstable_cache(
  () => getUpcomingFestivals(),
  ["festivals-overzicht"],
  { revalidate: 3600 }
);

export const metadata: Metadata = {
  title: "Alle festivals in Nederland (2026)",
  description:
    "Overzicht van alle grote Nederlandse festivals met data, locaties en de laagste ticketprijzen. Filter op maand, genre of provincie.",
  alternates: { canonical: "/festivals" },
};

type Search = FestivalFilterState;

export default async function FestivalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q, maand, genre, provincie } = await searchParams;
  const alle = await getCachedUpcomingFestivals();

  const term = q?.toLowerCase().trim();
  const festivals = alle.filter((f) => {
    if (term && ![f.name, f.city, ...f.genres].some((v) => v.toLowerCase().includes(term))) return false;
    if (maand && monthSlug(f.start_date) !== maand) return false;
    if (genre && !f.genres.includes(genre)) return false;
    if (provincie && f.province !== provincie) return false;
    return true;
  });

  const maanden = monthsWithFestivals(alle);
  const genres = [...new Set(alle.flatMap((f) => f.genres))].sort();
  const provincies = [...new Set(alle.map((f) => f.province))].sort();

  const current: Search = { q, maand, genre, provincie };
  const filterLink = (patch: Partial<Search>) => buildFilterHref(current, patch);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Alle festivals</h1>
      {festivals.length > 0 && (
        <p className="mt-2 text-mut">
          {festivals.length} {festivals.length === 1 ? "festival" : "festivals"} gevonden
          {term ? ` voor “${q}”` : ""}.
        </p>
      )}

      {/* Mobiel: compacte dropdowns met native accordion-gedrag. */}
      <div className="mt-6 flex flex-col gap-2 lg:hidden">
        <FilterDropdown
          groupName="festival-filters"
          label="Maand"
          options={maanden.map((m) => ({ value: m, label: monthLabel(m) ?? m }))}
          selectedValue={maand}
          selectedLabel={maand ? monthLabel(maand) ?? maand : "Alle"}
          buildHref={(v) => filterLink({ maand: v })}
        />
        <FilterDropdown
          groupName="festival-filters"
          label="Genre"
          options={genres.map((g) => ({ value: g, label: g }))}
          selectedValue={genre}
          selectedLabel={genre ?? "Alle"}
          buildHref={(v) => filterLink({ genre: v })}
        />
        <FilterDropdown
          groupName="festival-filters"
          label="Provincie"
          options={provincies.map((p) => ({ value: p, label: p }))}
          selectedValue={provincie}
          selectedLabel={provincie ?? "Alle"}
          buildHref={(v) => filterLink({ provincie: v })}
        />
        <DetailsOutsideCloser groupName="festival-filters" />
      </div>

      {/* Desktop/tablet: ongewijzigde pill-rijen. */}
      <div className="mt-6 hidden flex-col gap-3 text-sm lg:flex">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Maand</span>
          <Link
            href={filterLink({ maand: undefined })}
            aria-current={!maand ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              !maand ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
            }`}
          >
            Alle
          </Link>
          {maanden.map((m) => (
            <Link
              key={m}
              href={filterLink({ maand: m })}
              aria-current={maand === m ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                maand === m ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
              }`}
            >
              {monthLabel(m)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Genre</span>
          <Link
            href={filterLink({ genre: undefined })}
            aria-current={!genre ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              !genre ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
            }`}
          >
            Alle
          </Link>
          {genres.map((g) => (
            <Link
              key={g}
              href={filterLink({ genre: g })}
              aria-current={genre === g ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                genre === g ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
              }`}
            >
              {g}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Provincie</span>
          <Link
            href={filterLink({ provincie: undefined })}
            aria-current={!provincie ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              !provincie ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
            }`}
          >
            Alle
          </Link>
          {provincies.map((p) => (
            <Link
              key={p}
              href={filterLink({ provincie: p })}
              aria-current={provincie === p ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                provincie === p ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>

      {festivals.length === 0 ? (
        <p className="mt-8 text-mut">
          Geen festivals gevonden{term ? ` voor “${q}”` : ""}.{" "}
          <Link href="/festivals" className="text-accent underline">Wis de filters</Link>.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Stap 2: Verifieer statisch**

Run: `npm run typecheck && npm run lint && npm test`
Expected: geen fouten; volledige testsuite groen.

- [ ] **Stap 3: Build**

Run: `npm run build`
Expected: groen; `/festivals` blijft gemarkeerd als dynamisch (ƒ) zoals voorheen — deze
wijziging verandert niets aan het cache-gedrag van de route.

- [ ] **Stap 4: Visuele verificatie op 375px (mobiel)**

Run: `npm run start -- -p 3040` (in een aparte terminal/achtergrondproces), open
`http://localhost:3040/festivals` in een 375px-breed venster (of gebruik Playwright/
DevTools device-emulatie). Controleer:
- Drie compacte rijen ("Maand", "Genre", "Provincie") in plaats van de pill-grids.
- Tik op "Maand" → paneel klapt open met de maandopties en een ✓ bij "Alle".
- Tik daarna op "Genre" → het Maand-paneel klapt automatisch dicht (accordion-gedrag).
- Kies een maand → navigatie vindt plaats, het paneel staat na het laden weer dicht, en
  "Maand" toont nu de gekozen maand in plaats van "Alle".
- Open een paneel, tik ergens anders op de pagina (buiten het paneel) → paneel sluit.

Stop de server na verificatie (`Ctrl+C` of `pkill -f "next start.*3040"`).

- [ ] **Stap 5: Visuele verificatie op 1440px (desktop)**

Zelfde server, venster op 1440px breed. Controleer: de filterbalk toont nog steeds de
ongewijzigde pill-rijen (geen dropdowns zichtbaar), functioneel identiek aan vóór deze
wijziging.

- [ ] **Stap 6: Commit**

```bash
git add src/app/festivals/page.tsx
git commit -m "feat: mobiele filter-dropdowns op /festivals (native details, accordion)"
```

---

## Self-review (uitgevoerd tijdens het schrijven van dit plan)

**Spec-dekking:** alle onderdelen uit de spec zijn vertegenwoordigd — `buildFilterHref`
(Taak 1), `FilterDropdown` als Server Component met native accordion (Taak 2),
`DetailsOutsideCloser` als enige Client Component (Taak 3), mobiel/desktop-splitsing en
hergebruik van dezelfde URL-bouwfunctie door beide varianten (Taak 4). Geen inline-SVG-
afwijking: de chevron in Taak 2 is een kleine handgeschreven SVG, geen icon-library.

**Type-consistentie:** `FestivalFilterState` (Taak 1) wordt in Taak 4 hergebruikt als
`Search`-type (`type Search = FestivalFilterState`), zodat er geen tweede, licht
afwijkende definitie ontstaat. `FilterDropdown`'s `buildHref`-prop-signatuur
(`(value: string | undefined) => string`) komt exact overeen met hoe Taak 4 hem aanroept
(`(v) => filterLink({ maand: v })`, waarbij `filterLink` zelf `buildFilterHref` aanroept).

**Geen placeholders:** elke stap bevat volledige, uitvoerbare code en exacte commando's.
