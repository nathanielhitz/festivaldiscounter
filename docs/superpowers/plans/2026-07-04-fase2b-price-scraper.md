# Fase 2b — Prijs-scraper & review-wachtrij Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een dagelijkse Vercel Cron die (A) prijs + beschikbaarheid scrapet van de eigen festivalsites van een curated set festivals, en (B) detecteert of festivals op TicketSwap staan en een affiliate-aanbieder vóórstelt — beide via een verplichte review-wachtrij in `/admin/scrapers` zodat niets automatisch live gaat.

**Architecture:** Twee capaciteiten die dezelfde cron-route (`/api/cron/scrape`, beschermd met `CRON_SECRET`) en dezelfde admin-reviewpagina delen. Capaciteit A schrijft `price_checks`-rijen (prijsupdate van een bestaande offer); capaciteit B schrijft `offer_suggestions`-rijen (voorgestelde nieuwe marktplaats-offer). Pure parse-/match-/URL-logica zit in `src/lib/scraper/*` (unit-getest); alle DB-lezingen/-schrijvingen in `src/lib/admin/scraper-queries.ts`; de server actions in `src/lib/admin/scraper-actions.ts` orkestreren + roepen `requireAdmin()` en `revalidate` aan. Goedkeuren werkt door naar `ticket_offers`; de publieke site verandert nooit automatisch.

**Tech Stack:** Next.js 15 (App Router, Route Handlers, server actions), TypeScript strict, Supabase (@supabase/supabase-js, service-role), `cheerio` (nieuwe dep, server-side HTML-parsen), Vitest, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-07-04-fase2b-price-scraper-design.md`

**Werkwijze:** bouwen op branch `fase-1`; per taak committen. ff-merge naar `main` = Vercel-productiedeploy (pas na akkoord van de eigenaar). Volgt de patronen van fase 2a (`docs/superpowers/plans/2026-07-04-fase2a-admin-dashboard.md`).

---

## File Structure

**Nieuw — scraper-kern (`src/lib/scraper/`), pure/testbare logica:**
- `parse.ts` — `parsePrice(html, selector)`, `detectSoldOut(html, keywords)` (cheerio, pure).
- `parse.test.ts` — unit tests.
- `marketplaces.ts` — `ticketswapCandidateUrl(slug)`, `ticketswapAffiliate(url, id)`, `matchesFestival(html, name)` (pure).
- `marketplaces.test.ts` — unit tests.
- `config.ts` — `PRICE_SCRAPE_CONFIG` (curated set: slug + selector + sold-out-keywords).

**Nieuw — admin-logica (`src/lib/admin/`):**
- `scraper-queries.ts` — `server-only`: alle reads/writes voor `price_checks` + `offer_suggestions` + de scrape-targets.
- `scraper-actions.ts` — `"use server"`: `approvePriceCheck`, `rejectPriceCheck`, `approveOfferSuggestion`, `rejectOfferSuggestion`.
- `scraper-actions.test.ts` — unit tests (queries + session gemockt).

**Nieuw — cron + UI:**
- `src/app/api/cron/scrape/route.ts` — de dagelijkse cron-route (beide capaciteiten).
- `src/app/admin/(dashboard)/scrapers/page.tsx` — reviewpagina met drie secties.
- `src/components/admin/ReviewButtons.tsx` — client: goedkeur/afwijs-knoppen (generiek).

**Gewijzigd:**
- `src/lib/types.ts` — `ReviewStatus`, `PriceCheck`, `OfferSuggestion` toevoegen.
- `src/app/admin/(dashboard)/layout.tsx` — nav-link "Scrapers" toevoegen.
- `.env.local.example` — `CRON_SECRET`, `TICKETSWAP_AFFILIATE_ID`.
- `package.json` — `cheerio` als dependency.
- `vercel.json` — nieuw: cron-schema.
- Supabase (SQL) — nieuwe enum + twee tabellen (eenmalige migratie).

**Kleur-tokens** (bestaand, hergebruiken): `border-line`, `bg-panel`, `text-mut`, `text-accent`, `bg-accent`, `text-ground`, `text-warn`, class `display` voor koppen.

---

## Task 1: DB-migratie + env-vars + cheerio installeren

**Files:**
- Create: `supabase/migrations/2026-07-04-scraper.sql`
- Modify: `.env.local.example`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Schrijf de migratie-SQL**

Create `supabase/migrations/2026-07-04-scraper.sql`:

```sql
-- Fase 2b: prijs-scraper (price_checks) + marktplaats-detectie (offer_suggestions).
-- Beide zijn append-only review-wachtrijen; de publieke site verandert pas na
-- handmatige goedkeuring in /admin/scrapers.

create type review_status as enum ('pending', 'approved', 'rejected', 'failed');

-- Capaciteit A: prijsupdate van een BESTAANDE offer.
create table price_checks (
  id uuid primary key default gen_random_uuid(),
  ticket_offer_id uuid not null references ticket_offers(id) on delete cascade,
  status review_status not null default 'pending',
  scraped_price numeric(8,2),
  scraped_availability ticket_availability,
  failure_reason text,
  checked_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index price_checks_offer_idx on price_checks (ticket_offer_id);
create index price_checks_status_idx on price_checks (status);

-- Capaciteit B: voorgestelde NIEUWE marktplaats-aanbieder.
create table offer_suggestions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals(id) on delete cascade,
  provider ticket_provider not null,
  detected_url text not null,
  affiliate_url text,
  status review_status not null default 'pending',
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint offer_suggestions_festival_provider_key unique (festival_id, provider)
);

create index offer_suggestions_status_idx on offer_suggestions (status);

-- RLS aan, géén policies: alleen de service-role (server-side) leest/schrijft,
-- net als de andere tabellen in 0001_init.sql.
alter table price_checks enable row level security;
alter table offer_suggestions enable row level security;
```

- [ ] **Step 2: Voer de migratie uit in Supabase**

Open de Supabase SQL Editor (project `vmcsecjnenmmxtrkqxrb`), plak de inhoud van het bestand en run.
Expected: "Success. No rows returned". Controleer daarna dat de tabellen bestaan: `select count(*) from price_checks;` en `select count(*) from offer_suggestions;` geven beide `0`.

- [ ] **Step 3: Installeer cheerio**

Run: `npm install cheerio`
Expected: `cheerio` verschijnt in `package.json` onder `dependencies`. Als er een peer-dependency-conflict optreedt (zoals eerder bij `@vercel/analytics`), gebruik dan `npm install cheerio --legacy-peer-deps`.

- [ ] **Step 4: Voeg de env-vars toe aan het voorbeeld**

Modify `.env.local.example` — voeg onderaan toe:

```bash
# Fase 2b — prijs-scraper & marktplaats-detectie.
# CRON_SECRET: willekeurige lange string; Vercel stuurt 'm als "Authorization: Bearer <secret>"
# naar /api/cron/scrape (genereer bv. met: openssl rand -base64 32). Ook in Vercel zetten.
CRON_SECRET=
# TICKETSWAP_AFFILIATE_ID: jouw TicketSwap-affiliate-ID (optioneel; leeg = suggesties
# krijgen alleen de kale detected_url, geen affiliate-wrapping).
TICKETSWAP_AFFILIATE_ID=
```

- [ ] **Step 5: Zet de vars lokaal in `.env.local`**

Voeg `CRON_SECRET=<openssl rand -base64 32>` toe aan `.env.local` (buiten git). `TICKETSWAP_AFFILIATE_ID` mag leeg blijven tot de affiliate-goedkeuring binnen is.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/2026-07-04-scraper.sql .env.local.example package.json package-lock.json
git commit -m "chore(scraper): DB-migratie (price_checks + offer_suggestions), env-vars, cheerio"
```

---

## Task 2: Parse-helpers (TDD)

**Files:**
- Create: `src/lib/scraper/parse.ts`
- Test: `src/lib/scraper/parse.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Create `src/lib/scraper/parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePrice, detectSoldOut } from "@/lib/scraper/parse";

describe("parsePrice", () => {
  it("leest een NL-genoteerde prijs uit het geselecteerde element", () => {
    const html = `<div><span class="price">€ 89,00</span></div>`;
    expect(parsePrice(html, ".price")).toBe(89);
  });

  it("normaliseert decimalen met een komma", () => {
    const html = `<p class="p">vanaf 79,50</p>`;
    expect(parsePrice(html, ".p")).toBe(79.5);
  });

  it("geeft null als de selector niets vindt", () => {
    const html = `<div>geen prijs hier</div>`;
    expect(parsePrice(html, ".price")).toBeNull();
  });

  it("geeft null als het element geen getal bevat", () => {
    const html = `<span class="price">Prijs volgt</span>`;
    expect(parsePrice(html, ".price")).toBeNull();
  });

  it("pakt het eerste element bij meerdere treffers", () => {
    const html = `<span class="price">45,00</span><span class="price">99,00</span>`;
    expect(parsePrice(html, ".price")).toBe(45);
  });
});

describe("detectSoldOut", () => {
  it("is waar als een sold-out-keyword in de pagina staat (case-insensitive)", () => {
    const html = `<body><button>UITVERKOCHT</button></body>`;
    expect(detectSoldOut(html, ["uitverkocht", "sold out"])).toBe(true);
  });

  it("is onwaar als geen enkel keyword voorkomt", () => {
    const html = `<body><button>Koop tickets</button></body>`;
    expect(detectSoldOut(html, ["uitverkocht", "sold out"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test om falen te bevestigen**

Run: `npx vitest run src/lib/scraper/parse.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/scraper/parse'".

- [ ] **Step 3: Implementeer `parse.ts`**

Create `src/lib/scraper/parse.ts`:

```ts
import * as cheerio from "cheerio";

// Leest de prijs uit het eerste element dat `selector` matcht. Verwacht NL-notatie
// (bv. "€ 89,00", "vanaf 79,50"). Geeft null als er niets bruikbaars staat.
export function parsePrice(html: string, selector: string): number | null {
  const $ = cheerio.load(html);
  const text = $(selector).first().text();
  if (!text) return null;
  const match = text.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// True als een van de keywords (case-insensitive) in de pagina-tekst voorkomt.
export function detectSoldOut(html: string, keywords: string[]): boolean {
  const $ = cheerio.load(html);
  const text = ($("body").text() || html).toLowerCase();
  return keywords.some((k) => text.includes(k.toLowerCase()));
}
```

- [ ] **Step 4: Run test om te bevestigen dat hij slaagt**

Run: `npx vitest run src/lib/scraper/parse.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper/parse.ts src/lib/scraper/parse.test.ts
git commit -m "feat(scraper): prijs-extractie + sold-out-detectie (TDD)"
```

---

## Task 3: Marketplace-helpers (TDD) + scrape-config

**Files:**
- Create: `src/lib/scraper/marketplaces.ts`
- Create: `src/lib/scraper/config.ts`
- Test: `src/lib/scraper/marketplaces.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Create `src/lib/scraper/marketplaces.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ticketswapCandidateUrl,
  ticketswapAffiliate,
  matchesFestival,
} from "@/lib/scraper/marketplaces";

describe("ticketswapCandidateUrl", () => {
  it("bouwt een event-URL uit de festival-slug", () => {
    expect(ticketswapCandidateUrl("lowlands")).toBe(
      "https://www.ticketswap.com/event/lowlands"
    );
  });
});

describe("ticketswapAffiliate", () => {
  it("voegt het affiliate-ID als query-param toe", () => {
    expect(
      ticketswapAffiliate("https://www.ticketswap.com/event/lowlands", "aff123")
    ).toBe("https://www.ticketswap.com/event/lowlands?aff=aff123");
  });

  it("geeft null zonder affiliate-ID (nog geen goedkeuring)", () => {
    expect(
      ticketswapAffiliate("https://www.ticketswap.com/event/lowlands", null)
    ).toBeNull();
  });
});

describe("matchesFestival", () => {
  it("is waar als de festivalnaam in de pagina voorkomt (case-insensitive)", () => {
    const html = `<title>Lowlands 2026 tickets — TicketSwap</title>`;
    expect(matchesFestival(html, "Lowlands")).toBe(true);
  });

  it("is onwaar als de naam ontbreekt (voorkomt een verkeerde match)", () => {
    const html = `<title>Pinkpop 2026 tickets — TicketSwap</title>`;
    expect(matchesFestival(html, "Lowlands")).toBe(false);
  });

  it("is onwaar bij een lege naam", () => {
    expect(matchesFestival("<title>x</title>", "")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test om falen te bevestigen**

Run: `npx vitest run src/lib/scraper/marketplaces.test.ts`
Expected: FAIL — kan `@/lib/scraper/marketplaces` niet resolven.

- [ ] **Step 3: Implementeer `marketplaces.ts`**

Create `src/lib/scraper/marketplaces.ts`:

```ts
// Marktplaats-detectie (capaciteit B). We raken alleen crawlbare event-overzichts-
// pagina's aan (per robots.txt toegestaan) en scrapen GEEN prijs/listing-data —
// enkel: bestaat er een pagina voor dit festival? Zo ja, stel een affiliate-doorlink voor.

// Best-effort kandidaat-URL uit de festival-slug. Het exacte TicketSwap-URL-scheme
// wordt in Task 6 tegen de live site geverifieerd en hier zo nodig bijgesteld.
export function ticketswapCandidateUrl(slug: string): string {
  return `https://www.ticketswap.com/event/${slug}`;
}

// Wrapt de gevonden URL met het affiliate-ID. Zonder ID (goedkeuring nog niet
// binnen) geven we null terug: de suggestie krijgt dan alleen de kale detected_url.
export function ticketswapAffiliate(url: string, affiliateId: string | null): string | null {
  if (!affiliateId) return null;
  const u = new URL(url);
  u.searchParams.set("aff", affiliateId);
  return u.toString();
}

// Simpele naam-match als bevestiging dat de pagina echt over dit festival gaat.
// Review-gated, dus een grove check volstaat; de admin bevestigt handmatig.
export function matchesFestival(html: string, festivalName: string): boolean {
  const needle = festivalName.trim().toLowerCase();
  if (!needle) return false;
  return html.toLowerCase().includes(needle);
}
```

- [ ] **Step 4: Schrijf de scrape-config**

Create `src/lib/scraper/config.ts`:

```ts
// Curated set voor capaciteit A (prijs-scraper). Elke entry koppelt een festival-slug
// aan de CSS-selector waarin de prijs staat + de sold-out-signaalwoorden op die site.
// De cron zoekt bij elke slug de `official`-offer op en ververst die (via review).
//
// Selectors zijn per-site en worden in Task 6 tegen de live sites bepaald/geverifieerd.
export interface PriceScrapeTarget {
  festivalSlug: string;
  priceSelector: string;
  soldOutKeywords: string[];
}

export const PRICE_SCRAPE_CONFIG: PriceScrapeTarget[] = [
  // Ingevuld in Task 6 na inspectie van de live sites, bv.:
  // { festivalSlug: "lowlands", priceSelector: ".ticket__price", soldOutKeywords: ["uitverkocht", "sold out"] },
];
```

- [ ] **Step 5: Run test om te bevestigen dat hij slaagt**

Run: `npx vitest run src/lib/scraper/marketplaces.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/scraper/marketplaces.ts src/lib/scraper/marketplaces.test.ts src/lib/scraper/config.ts
git commit -m "feat(scraper): marktplaats-detectie-helpers + curated scrape-config (TDD)"
```

---

## Task 4: Types + scraper-queries (reads & writes)

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/admin/scraper-queries.ts`

- [ ] **Step 1: Breid `types.ts` uit**

Modify `src/lib/types.ts` — voeg onderaan toe (na de bestaande interfaces):

```ts
export type ReviewStatus = "pending" | "approved" | "rejected" | "failed";

export interface PriceCheck {
  id: string;
  ticket_offer_id: string;
  status: ReviewStatus;
  scraped_price: number | null;
  scraped_availability: Availability | null;
  failure_reason: string | null;
  checked_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface OfferSuggestion {
  id: string;
  festival_id: string;
  provider: Provider;
  detected_url: string;
  affiliate_url: string | null;
  status: ReviewStatus;
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}
```

- [ ] **Step 2: Implementeer `scraper-queries.ts`**

Create `src/lib/admin/scraper-queries.ts`:

```ts
import "server-only";
import { supabase } from "../supabase";
import type { Availability, PriceCheck, Provider } from "../types";

// --- Reads voor de reviewpagina --------------------------------------------

export interface PendingPriceCheck {
  id: string;
  scraped_price: number | null;
  scraped_availability: Availability | null;
  checked_at: string;
  ticket_offers: {
    provider: Provider;
    url: string;
    price_from: number | null;
    availability: Availability;
    festivals: { id: string; name: string; slug: string } | null;
  } | null;
}

export interface PendingOfferSuggestion {
  id: string;
  provider: Provider;
  detected_url: string;
  affiliate_url: string | null;
  detected_at: string;
  festivals: { id: string; name: string; slug: string } | null;
}

export interface FailedPriceCheck {
  id: string;
  failure_reason: string | null;
  checked_at: string;
  ticket_offers: { url: string; festivals: { name: string } | null } | null;
}

export async function getPendingPriceChecks(): Promise<PendingPriceCheck[]> {
  const { data, error } = await supabase
    .from("price_checks")
    .select(
      "id, scraped_price, scraped_availability, checked_at, ticket_offers(provider, url, price_from, availability, festivals(id, name, slug))"
    )
    .eq("status", "pending")
    .order("checked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PendingPriceCheck[];
}

export async function getPendingOfferSuggestions(): Promise<PendingOfferSuggestion[]> {
  const { data, error } = await supabase
    .from("offer_suggestions")
    .select("id, provider, detected_url, affiliate_url, detected_at, festivals(id, name, slug)")
    .eq("status", "pending")
    .order("detected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PendingOfferSuggestion[];
}

export async function getFailedPriceChecks(): Promise<FailedPriceCheck[]> {
  const { data, error } = await supabase
    .from("price_checks")
    .select("id, failure_reason, checked_at, ticket_offers(url, festivals(name))")
    .eq("status", "failed")
    .order("checked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FailedPriceCheck[];
}

// --- Reads/writes voor de cron ---------------------------------------------

// Zoekt de `official`-offer + festivalnaam bij een slug (capaciteit A).
export async function getOfficialOfferForSlug(
  slug: string
): Promise<{ offerId: string; url: string; festivalName: string } | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select("name, ticket_offers(id, url, provider)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const offers = (data.ticket_offers ?? []) as { id: string; url: string; provider: Provider }[];
  const official = offers.find((o) => o.provider === "official");
  if (!official) return null;
  return { offerId: official.id, url: official.url, festivalName: data.name as string };
}

export interface MarketplaceCandidate {
  id: string;
  name: string;
  slug: string;
}

// Gepubliceerde festivals zonder ticketswap-offer én zonder bestaande suggestie
// voor ticketswap (elke status) — die willen we (opnieuw) checken (capaciteit B).
export async function getFestivalsForMarketplaceCheck(): Promise<MarketplaceCandidate[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("id, name, slug, ticket_offers(provider), offer_suggestions(provider)")
    .eq("published", true);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    ticket_offers: { provider: Provider }[];
    offer_suggestions: { provider: Provider }[];
  }[];
  return rows
    .filter(
      (f) =>
        !f.ticket_offers.some((o) => o.provider === "ticketswap") &&
        !f.offer_suggestions.some((s) => s.provider === "ticketswap")
    )
    .map((f) => ({ id: f.id, name: f.name, slug: f.slug }));
}

// Vervang de vorige, nog niet-beoordeelde auto-rijen voor deze offer, zodat de
// wachtrij niet volloopt met één rij per dag.
export async function supersedeAutoPriceChecks(offerId: string): Promise<void> {
  const { error } = await supabase
    .from("price_checks")
    .delete()
    .eq("ticket_offer_id", offerId)
    .in("status", ["pending", "failed"]);
  if (error) throw error;
}

export async function insertPriceCheck(row: {
  ticket_offer_id: string;
  status: "pending" | "failed";
  scraped_price: number | null;
  scraped_availability: Availability | null;
  failure_reason: string | null;
}): Promise<void> {
  const { error } = await supabase.from("price_checks").insert(row);
  if (error) throw error;
}

export async function insertOfferSuggestion(row: {
  festival_id: string;
  provider: Provider;
  detected_url: string;
  affiliate_url: string | null;
}): Promise<void> {
  // Negeer duplicaten (unieke festival+provider): dubbele detectie is geen fout.
  const { error } = await supabase.from("offer_suggestions").insert(row);
  if (error && error.code !== "23505") throw error;
}

// --- Writes voor de review-acties ------------------------------------------

export async function getPriceCheckById(id: string): Promise<PriceCheck | null> {
  const { data, error } = await supabase
    .from("price_checks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PriceCheck | null) ?? null;
}

export async function updateOfferPriceAvailability(
  offerId: string,
  values: { price_from: number | null; availability: Availability }
): Promise<void> {
  const { error } = await supabase
    .from("ticket_offers")
    .update({ ...values, last_checked_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) throw error;
}

export async function updatePriceCheckStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  const { error } = await supabase
    .from("price_checks")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
    .eq("id", id);
  if (error) throw error;
}

export async function getOfferSuggestionById(id: string) {
  const { data, error } = await supabase
    .from("offer_suggestions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as import("../types").OfferSuggestion | null;
}

export async function insertTicketOfferFromSuggestion(row: {
  festival_id: string;
  provider: Provider;
  url: string;
  affiliate_url: string | null;
}): Promise<void> {
  const { error } = await supabase.from("ticket_offers").insert({
    ...row,
    currency: "EUR",
    price_from: null,
    availability: "unknown",
    last_checked_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateOfferSuggestionStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  const { error } = await supabase
    .from("offer_suggestions")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/admin/scraper-queries.ts
git commit -m "feat(scraper): types + scraper-queries (reviewlijsten, cron-targets, writes)"
```

---

## Task 5: Review-acties (TDD)

**Files:**
- Create: `src/lib/admin/scraper-actions.ts`
- Test: `src/lib/admin/scraper-actions.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Create `src/lib/admin/scraper-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidatePublicFestivalPages: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const q = {
  getPriceCheckById: vi.fn(),
  updateOfferPriceAvailability: vi.fn(),
  updatePriceCheckStatus: vi.fn(),
  getOfferSuggestionById: vi.fn(),
  insertTicketOfferFromSuggestion: vi.fn(),
  updateOfferSuggestionStatus: vi.fn(),
};
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
```

- [ ] **Step 2: Run test om falen te bevestigen**

Run: `npx vitest run src/lib/admin/scraper-actions.test.ts`
Expected: FAIL — kan `@/lib/admin/scraper-actions` niet resolven.

- [ ] **Step 3: Implementeer `scraper-actions.ts`**

Create `src/lib/admin/scraper-actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./session";
import { revalidatePublicFestivalPages } from "./revalidate";
import {
  getPriceCheckById,
  updateOfferPriceAvailability,
  updatePriceCheckStatus,
  getOfferSuggestionById,
  insertTicketOfferFromSuggestion,
  updateOfferSuggestionStatus,
} from "./scraper-queries";

export async function approvePriceCheck(id: string): Promise<void> {
  await requireAdmin();
  const check = await getPriceCheckById(id);
  if (!check || check.status !== "pending") return;
  await updateOfferPriceAvailability(check.ticket_offer_id, {
    price_from: check.scraped_price,
    availability: check.scraped_availability ?? "unknown",
  });
  await updatePriceCheckStatus(id, "approved");
  revalidatePublicFestivalPages();
  revalidatePath("/admin/scrapers");
}

export async function rejectPriceCheck(id: string): Promise<void> {
  await requireAdmin();
  await updatePriceCheckStatus(id, "rejected");
  revalidatePath("/admin/scrapers");
}

export async function approveOfferSuggestion(id: string): Promise<void> {
  await requireAdmin();
  const suggestion = await getOfferSuggestionById(id);
  if (!suggestion || suggestion.status !== "pending") return;
  await insertTicketOfferFromSuggestion({
    festival_id: suggestion.festival_id,
    provider: suggestion.provider,
    url: suggestion.detected_url,
    affiliate_url: suggestion.affiliate_url,
  });
  await updateOfferSuggestionStatus(id, "approved");
  revalidatePublicFestivalPages();
  revalidatePath("/admin/scrapers");
}

export async function rejectOfferSuggestion(id: string): Promise<void> {
  await requireAdmin();
  await updateOfferSuggestionStatus(id, "rejected");
  revalidatePath("/admin/scrapers");
}
```

- [ ] **Step 4: Run test om te bevestigen dat hij slaagt**

Run: `npx vitest run src/lib/admin/scraper-actions.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/scraper-actions.ts src/lib/admin/scraper-actions.test.ts
git commit -m "feat(scraper): approve/reject-acties voor price-checks en offer-suggesties (TDD)"
```

---

## Task 6: Cron-route + vercel.json + config invullen

**Files:**
- Create: `src/app/api/cron/scrape/route.ts`
- Create: `vercel.json`
- Modify: `src/lib/scraper/config.ts` (curated set invullen)

- [ ] **Step 1: Schrijf de cron-route**

Create `src/app/api/cron/scrape/route.ts`:

```ts
import { NextResponse } from "next/server";
import { PRICE_SCRAPE_CONFIG } from "@/lib/scraper/config";
import { parsePrice, detectSoldOut } from "@/lib/scraper/parse";
import {
  ticketswapCandidateUrl,
  ticketswapAffiliate,
  matchesFestival,
} from "@/lib/scraper/marketplaces";
import {
  getOfficialOfferForSlug,
  getFestivalsForMarketplaceCheck,
  supersedeAutoPriceChecks,
  insertPriceCheck,
  insertOfferSuggestion,
} from "@/lib/admin/scraper-queries";

export const dynamic = "force-dynamic";
// LET OP: Vercel Hobby cap = 60s, Pro = tot 300s. Houd de curated set + MAX_MARKETPLACE
// klein genoeg dat een run binnen de limiet van je plan blijft (zie de sleep/timing hieronder).
export const maxDuration = 300;

const UA = "FestivalDiscounter-PriceCheck/1.0 (+https://festivaldiscounter.nl)";
const REQUEST_DELAY_MS = 1000;   // netjes richting de doelsites
const MAX_MARKETPLACE = 15;      // max festivals per run voor capaciteit B (tijdsbudget)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Kies willekeurig maximaal `n` items, zodat over meerdere dagen alle festivals
// aan de beurt komen zonder dat we een "checked"-status hoeven bij te houden.
function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Capaciteit A: prijs + beschikbaarheid van de official sites (curated set).
async function runPriceScrape(): Promise<number> {
  let count = 0;
  for (const cfg of PRICE_SCRAPE_CONFIG) {
    const target = await getOfficialOfferForSlug(cfg.festivalSlug).catch(() => null);
    if (!target) continue;
    try {
      const html = await fetchHtml(target.url);
      const price = parsePrice(html, cfg.priceSelector);
      const soldOut = detectSoldOut(html, cfg.soldOutKeywords);
      await supersedeAutoPriceChecks(target.offerId);
      if (price === null && !soldOut) {
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "failed",
          scraped_price: null, scraped_availability: null,
          failure_reason: `Prijs-selector '${cfg.priceSelector}' leverde niets op`,
        });
      } else {
        await insertPriceCheck({
          ticket_offer_id: target.offerId, status: "pending",
          scraped_price: price,
          scraped_availability: soldOut ? "sold_out" : "available",
          failure_reason: null,
        });
        count++;
      }
    } catch (e) {
      await supersedeAutoPriceChecks(target.offerId).catch(() => {});
      await insertPriceCheck({
        ticket_offer_id: target.offerId, status: "failed",
        scraped_price: null, scraped_availability: null,
        failure_reason: e instanceof Error ? e.message : "onbekende fout",
      }).catch(() => {});
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return count;
}

// Capaciteit B: detecteer festivals op TicketSwap → affiliate-suggestie.
// Retourneert het aantal nieuwe suggesties + hoeveel festivals door de cap zijn overgeslagen.
async function runMarketplaceDetection(): Promise<{ suggested: number; skipped: number }> {
  let suggested = 0;
  const affiliateId = process.env.TICKETSWAP_AFFILIATE_ID || null;
  const all = await getFestivalsForMarketplaceCheck().catch(() => []);
  const batch = sample(all, MAX_MARKETPLACE);
  const skipped = all.length - batch.length;
  for (const f of batch) {
    try {
      const url = ticketswapCandidateUrl(f.slug);
      const html = await fetchHtml(url); // gooit bij 404/timeout → "niet gevonden"
      if (!matchesFestival(html, f.name)) continue;
      await insertOfferSuggestion({
        festival_id: f.id, provider: "ticketswap",
        detected_url: url, affiliate_url: ticketswapAffiliate(url, affiliateId),
      });
      suggested++;
    } catch {
      // niet gevonden / netwerkfout: geen ruis in de wachtrij.
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return { suggested, skipped };
}

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const priceChecks = await runPriceScrape();
  const { suggested, skipped } = await runMarketplaceDetection();
  // `skipped` > 0 betekent dat niet alle kandidaten deze run zijn gecheckt (cap);
  // ze komen door de willekeurige sampling op volgende dagen aan de beurt.
  return NextResponse.json({ ok: true, priceChecks, suggestions: suggested, marketplaceSkipped: skipped });
}
```

- [ ] **Step 2: Schrijf vercel.json**

Create `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/scrape", "schedule": "0 5 * * *" }
  ]
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: build slaagt; `/api/cron/scrape` verschijnt als route.

- [ ] **Step 4: Verifieer de auth-guard lokaal**

Run: `npm run dev` in één terminal. In een andere:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/scrape
curl -s -o /dev/null -w "%{http_code}\n" -H "authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)" http://localhost:3000/api/cron/scrape
```
Expected: eerste `401`; tweede `200` met JSON `{ok:true, priceChecks, suggestions, marketplaceSkipped}` (met lege `PRICE_SCRAPE_CONFIG` doet capaciteit A niets; capaciteit B checkt maximaal `MAX_MARKETPLACE` (15) gepubliceerde festivals per run — dit duurt ~15-30s door de 1s vertraging + fetches, dat is verwacht).

- [ ] **Step 5: Vul de curated set + verifieer het TicketSwap-URL-scheme**

Inspecteer 2-3 grote festivalsites uit de `official`-offers (bv. `lowlands.nl`, `pinkpop.nl`, `awakenings.nl`) om de prijs-selector te vinden:
```bash
curl -s -A "Mozilla/5.0" https://lowlands.nl/ | grep -io '[^"]*price[^"]*' | head
```
Vul de gevonden selectors in `src/lib/scraper/config.ts` in (minstens 1-2 werkende entries). Verifieer óók het TicketSwap-URL-scheme door een bekende festival-URL te openen (bv. zoek "Lowlands" op ticketswap.com en noteer het `…-tickets/…`-pad); pas `ticketswapCandidateUrl` in `src/lib/scraper/marketplaces.ts` én de test in `marketplaces.test.ts` aan als het echte scheme afwijkt van `/event/{slug}`.

> **Belangrijk:** als een site JS-gerenderd is (geen prijs in de kale HTML — zie de eerdere 0-treffers bij `fetch-festival-images`), laat die uit de config; cheerio ziet alleen server-HTML. Documenteer welke festivals niet werkten.

- [ ] **Step 6: Draai de cron één keer echt en controleer de DB**

Met de ingevulde config, roep de route lokaal aan (zoals Step 4, met auth-header). Controleer daarna in Supabase:
```sql
select status, count(*) from price_checks group by status;
select status, count(*) from offer_suggestions group by status;
```
Expected: `pending`/`failed`-rijen in `price_checks` naar gelang de scrape lukte; eventueel `pending` in `offer_suggestions`. Er mag niets in `ticket_offers` gewijzigd zijn (geen automatische live-gang).

- [ ] **Step 7: Commit**

```bash
git add "src/app/api/cron/scrape/route.ts" vercel.json src/lib/scraper/config.ts src/lib/scraper/marketplaces.ts src/lib/scraper/marketplaces.test.ts
git commit -m "feat(scraper): dagelijkse cron-route (beide capaciteiten) + curated config"
```

---

## Task 7: Admin-reviewpagina + nav + eindverificatie

**Files:**
- Create: `src/components/admin/ReviewButtons.tsx`
- Create: `src/app/admin/(dashboard)/scrapers/page.tsx`
- Modify: `src/app/admin/(dashboard)/layout.tsx` (nav-link)

- [ ] **Step 1: Schrijf de ReviewButtons (client)**

Create `src/components/admin/ReviewButtons.tsx`:

```tsx
"use client";
import { useTransition } from "react";

export default function ReviewButtons({
  onApprove,
  onReject,
  approveLabel = "Goedkeuren",
  rejectLabel = "Afkeuren",
}: {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  approveLabel?: string;
  rejectLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => onApprove())}
        className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-ground disabled:opacity-60"
      >
        {pending ? "Bezig…" : approveLabel}
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => onReject())}
        className="rounded-sm border border-line px-3 py-1.5 text-xs font-semibold text-mut disabled:opacity-60"
      >
        {rejectLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Schrijf de reviewpagina**

Create `src/app/admin/(dashboard)/scrapers/page.tsx`:

```tsx
import {
  getPendingPriceChecks,
  getPendingOfferSuggestions,
  getFailedPriceChecks,
} from "@/lib/admin/scraper-queries";
import {
  approvePriceCheck,
  rejectPriceCheck,
  approveOfferSuggestion,
  rejectOfferSuggestion,
} from "@/lib/admin/scraper-actions";
import ReviewButtons from "@/components/admin/ReviewButtons";

function euro(n: number | null): string {
  return n === null ? "—" : `€ ${n.toFixed(2).replace(".", ",")}`;
}

export default async function ScrapersPage() {
  const [priceChecks, suggestions, failures] = await Promise.all([
    getPendingPriceChecks(),
    getPendingOfferSuggestions(),
    getFailedPriceChecks(),
  ]);

  return (
    <section className="flex flex-col gap-10">
      <h1 className="display text-3xl">Scrapers</h1>

      {/* Sectie 1: prijs-updates */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Prijs-updates te reviewen ({priceChecks.length})</h2>
        {priceChecks.length === 0 && <p className="text-mut">Niets te reviewen.</p>}
        {priceChecks.map((pc) => {
          const off = pc.ticket_offers;
          const fest = off?.festivals;
          return (
            <article key={pc.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-panel p-4">
              <div className="text-sm">
                <p className="font-bold">{fest?.name ?? "Onbekend festival"} <span className="font-normal text-mut">· {off?.provider}</span></p>
                <p className="text-mut">
                  Prijs: {euro(off?.price_from ?? null)} → <span className="text-accent">{euro(pc.scraped_price)}</span>
                  {" · "}Beschikbaarheid: {off?.availability} → <span className="text-accent">{pc.scraped_availability ?? "—"}</span>
                </p>
              </div>
              <ReviewButtons
                onApprove={approvePriceCheck.bind(null, pc.id)}
                onReject={rejectPriceCheck.bind(null, pc.id)}
              />
            </article>
          );
        })}
      </div>

      {/* Sectie 2: voorgestelde nieuwe aanbieders */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Voorgestelde nieuwe aanbieders ({suggestions.length})</h2>
        {suggestions.length === 0 && <p className="text-mut">Geen voorstellen.</p>}
        {suggestions.map((s) => (
          <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-panel p-4">
            <div className="text-sm">
              <p className="font-bold">{s.festivals?.name ?? "Onbekend festival"} <span className="font-normal text-mut">· {s.provider}</span></p>
              <a href={s.detected_url} target="_blank" rel="noreferrer" className="text-accent underline break-all">
                {s.detected_url}
              </a>
              {!s.affiliate_url && <span className="ml-2 text-xs text-warn">(nog geen affiliate-link)</span>}
            </div>
            <ReviewButtons
              onApprove={approveOfferSuggestion.bind(null, s.id)}
              onReject={rejectOfferSuggestion.bind(null, s.id)}
              approveLabel="Toevoegen"
              rejectLabel="Afwijzen"
            />
          </article>
        ))}
      </div>

      {/* Sectie 3: mislukt */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Mislukt ({failures.length})</h2>
        {failures.length === 0 && <p className="text-mut">Geen mislukte scrapes.</p>}
        {failures.map((f) => (
          <article key={f.id} className="rounded border border-warn/30 bg-panel p-4 text-sm">
            <p className="font-bold">{f.ticket_offers?.festivals?.name ?? "Onbekend festival"}</p>
            <p className="text-mut">{f.failure_reason ?? "onbekende fout"}</p>
            {f.ticket_offers?.url && (
              <a href={f.ticket_offers.url} target="_blank" rel="noreferrer" className="text-accent underline break-all">
                {f.ticket_offers.url}
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Voeg de nav-link toe**

Modify `src/app/admin/(dashboard)/layout.tsx` — voeg in het `<nav>`-blok een link toe ná de "Review-wachtrij"-link:

```tsx
          <Link href="/admin/scrapers" className="hover:text-accent">Scrapers</Link>
```

- [ ] **Step 4: Handmatige verificatie**

Run: `npm run dev`, log in op `/admin` en open `/admin/scrapers`.
Expected: de drie secties renderen. Als er (uit Task 6) pending price_checks/suggestions zijn, verschijnen die met knoppen. Klik **Goedkeuren** op een prijs-update → de rij verdwijnt; controleer in Supabase dat de `ticket_offers`-rij de nieuwe prijs/beschikbaarheid heeft en `price_checks.status = 'approved'` staat. Klik **Afkeuren** op een andere → rij verdwijnt, `ticket_offers` ongewijzigd, status `rejected`. Idem voor een suggestie: **Toevoegen** maakt een nieuwe `ticket_offers`-rij (provider ticketswap) aan en die verschijnt binnen seconden op de publieke festivalpagina.

- [ ] **Step 5: Volledige testsuite + typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: typecheck/lint schoon; alle tests groen (bestaande + nieuwe parse/marketplaces/scraper-actions-tests); build slaagt met de nieuwe routes.

- [ ] **Step 6: Productie-smoke-test (publieke site onaangetast)**

Run: `SMOKE_BASE_URL=https://festivaldiscounter.nl npm run smoke`
Expected: 9/9 groen (de scraper/admin raken de publieke routes niet).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ReviewButtons.tsx "src/app/admin/(dashboard)/scrapers/page.tsx" "src/app/admin/(dashboard)/layout.tsx"
git commit -m "feat(scraper): /admin/scrapers reviewpagina (3 secties) + nav-link"
```

- [ ] **Step 8: Vercel-env-vars zetten (eigenaar)**

Zet in Vercel → Project → Environment Variables (Production): `CRON_SECRET` (zelfde als lokaal of een nieuwe sterke waarde) en, zodra beschikbaar, `TICKETSWAP_AFFILIATE_ID`. Vercel injecteert `CRON_SECRET` automatisch als `Authorization: Bearer`-header bij de cron-aanroep. Zonder `CRON_SECRET` geeft de route altijd 401 en draait de cron niet. Daarna ff-merge `fase-1` → `main` (na akkoord) voor de deploy; de cron draait vervolgens dagelijks om 05:00 UTC.

---

## Definition of done (uit de spec)

- [ ] Dagelijkse Vercel Cron draait beide capaciteiten en logt resultaten in `price_checks` / `offer_suggestions` zonder de publieke site te raken.
- [ ] `/admin/scrapers` toont werkende secties "Prijs-updates te reviewen", "Voorgestelde nieuwe aanbieders" en "Mislukt"; goedkeuren werkt door naar `ticket_offers` (update resp. nieuwe rij) + revalidate, afkeuren laat de live data ongewijzigd.
- [ ] Capaciteit B raakt alleen crawlbare marktplaats-pagina's aan en slaat geen prijs/listing-data op — alleen een doorlink.
- [ ] Eén kapotte site of netwerkfout breekt de rest van de cron-run niet (try/catch per item).
- [ ] Cron-endpoint is afgeschermd met `CRON_SECRET`; alle vier de admin-acties blijven achter `requireAdmin()`.
- [ ] Tests groen (parse-logica + URL/match-logica + approve/reject-acties); typecheck, lint en build slagen; productie-smoke-test blijft 9/9.
```
