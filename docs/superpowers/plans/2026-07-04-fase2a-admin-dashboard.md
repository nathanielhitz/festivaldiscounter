# Fase 2a — Admin-dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een afgeschermd `/admin`-dashboard bouwen waarmee de eigenaar festivals en ticket-aanbieders kan aanmaken, bewerken, publiceren en verwijderen zonder de ruwe Supabase Table Editor, met een bulk-review-wachtrij voor de 69 concept-festivals.

**Architecture:** Alles onder `/admin` in dezelfde Next.js 15-app. Auth = één wachtwoord (env-var) + HMAC-ondertekende sessie-cookie; `requireAdmin()` beschermt zowel de beveiligde layout als élke server action (de echte grens). Schrijfacties lopen via Next server actions met de bestaande service-role Supabase-client en roepen on-demand `revalidatePath`/`revalidateTag` aan zodat de publieke site binnen seconden bijwerkt.

**Tech Stack:** Next.js 15 (App Router, server actions), TypeScript strict, Tailwind v4, Supabase (@supabase/supabase-js, service-role), Vitest. Node `crypto` voor HMAC. Geen nieuwe externe leverancier.

**Spec:** `docs/superpowers/specs/2026-07-04-fase2-admin-dashboard-design.md`

**Werkwijze:** bouwen op branch `fase-1`; per taak committen. ff-merge naar `main` = Vercel-productiedeploy (pas na akkoord van de eigenaar).

---

## File Structure

**Nieuw — logica (`src/lib/admin/`):**
- `auth.ts` — pure crypto: `signSession`, `verifySession`, `checkPassword`, cookie-constanten. Geen `next`/`server-only` import (zo testbaar).
- `auth.test.ts` — unit tests voor bovenstaande.
- `session.ts` — `server-only`: `isAuthed`, `requireAdmin`, `startSession`, `endSession`, env-readers. Gebruikt `next/headers` + `auth.ts`.
- `types.ts` — `ActionState` (gedeeld door alle server actions + formulieren).
- `validation.ts` — pure `parseFestivalForm` / `parseOfferForm` + helpers (`isValidSlug`, `isValidHttpUrl`) + `FestivalInput`/`OfferInput`.
- `validation.test.ts` — unit tests.
- `queries.ts` — admin-reads (alle festivals incl. concept, één festival met offers, concepten, tellingen).
- `revalidate.ts` — `revalidatePublicFestivalPages()`.
- `auth-actions.ts` — `loginAction`, `logoutAction` (`"use server"`).
- `festival-actions.ts` — `upsertFestival`, `setFestivalPublished`, `deleteFestival` (`"use server"`).
- `offer-actions.ts` — `upsertOffer`, `deleteOffer` (`"use server"`).

**Nieuw — UI:**
- `src/app/admin/login/page.tsx` — publieke loginpagina.
- `src/app/admin/(dashboard)/layout.tsx` — guard + nav + `noindex`.
- `src/app/admin/(dashboard)/page.tsx` — dashboard-home (tellingen).
- `src/app/admin/(dashboard)/festivals/page.tsx` — festival-lijst.
- `src/app/admin/(dashboard)/festivals/new/page.tsx` — nieuw festival.
- `src/app/admin/(dashboard)/festivals/[id]/page.tsx` — festival bewerken + offers.
- `src/app/admin/(dashboard)/review/page.tsx` — review-wachtrij.
- `src/components/admin/LoginForm.tsx` — client.
- `src/components/admin/FestivalForm.tsx` — client (new + edit).
- `src/components/admin/OfferForm.tsx` — client (add + edit één offer).
- `src/components/admin/PublishToggle.tsx` — client.
- `src/components/admin/DeleteButton.tsx` — client (bevestiging + action).
- `src/components/admin/ReviewActions.tsx` — client (publiceer/overslaan/verwijder).

**Gewijzigd:**
- `.env.local.example` — `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
- `src/app/festivals/page.tsx` — `unstable_cache` een tag `"festivals"` geven zodat `revalidateTag` werkt.
- Supabase (SQL) — FK's op `ON DELETE CASCADE` (eenmalige migratie).

**Kleur-tokens** (bestaand, hergebruiken): `border-line`, `bg-panel`, `text-mut`, `text-accent`, `bg-accent`, `text-ground`, `text-warn`, class `display` voor koppen.

---

## Task 1: DB-migratie (cascade) + env-vars

**Files:**
- Create: `supabase/migrations/2026-07-04-admin-cascade.sql`
- Modify: `.env.local.example`

- [ ] **Step 1: Schrijf de migratie-SQL**

Create `supabase/migrations/2026-07-04-admin-cascade.sql`:

```sql
-- Fase 2a: festival-verwijdering in de admin moet offers (en hun clicks) mee-verwijderen.
-- Zet de bestaande foreign keys om naar ON DELETE CASCADE.

alter table public.ticket_offers
  drop constraint if exists ticket_offers_festival_id_fkey,
  add constraint ticket_offers_festival_id_fkey
    foreign key (festival_id) references public.festivals (id) on delete cascade;

alter table public.clicks
  drop constraint if exists clicks_offer_id_fkey,
  add constraint clicks_offer_id_fkey
    foreign key (offer_id) references public.ticket_offers (id) on delete cascade;
```

- [ ] **Step 2: Voer de migratie uit in Supabase**

Open de Supabase SQL Editor (project `vmcsecjnenmmxtrkqxrb`), plak de inhoud van het bestand en run.
Expected: "Success. No rows returned". Als een constraint een andere naam heeft, corrigeer de `drop constraint`-naam (zoek via `select conname from pg_constraint where conrelid = 'public.ticket_offers'::regclass;`).

- [ ] **Step 3: Voeg de env-vars toe aan het voorbeeld**

Modify `.env.local.example` — voeg onderaan toe:

```bash
# Admin-dashboard (fase 2a). ADMIN_PASSWORD: het login-wachtwoord.
# ADMIN_SESSION_SECRET: willekeurige lange string voor het ondertekenen van de sessie-cookie
# (genereer bv. met: openssl rand -base64 32). Beide alleen server-side; ook in Vercel zetten.
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

- [ ] **Step 4: Zet de vars lokaal in `.env.local`**

Voeg `ADMIN_PASSWORD=<kies-een-sterk-wachtwoord>` en `ADMIN_SESSION_SECRET=<openssl rand -base64 32>` toe aan `.env.local` (buiten git). Nodig om lokaal te testen.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/2026-07-04-admin-cascade.sql .env.local.example
git commit -m "chore(admin): FK-cascade-migratie + admin env-vars"
```

---

## Task 2: Auth-crypto kern (TDD)

**Files:**
- Create: `src/lib/admin/auth.ts`
- Test: `src/lib/admin/auth.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Create `src/lib/admin/auth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { signSession, verifySession, checkPassword } from "@/lib/admin/auth";

const SECRET = "test-secret-abc";
const NOW = 1_000_000;

describe("signSession/verifySession", () => {
  it("accepteert een net ondertekende, niet-verlopen sessie", () => {
    const token = signSession(NOW + 10_000, SECRET);
    expect(verifySession(token, SECRET, NOW)).toBe(true);
  });

  it("weigert een verlopen sessie", () => {
    const token = signSession(NOW - 1, SECRET);
    expect(verifySession(token, SECRET, NOW)).toBe(false);
  });

  it("weigert een geknoeide handtekening", () => {
    const token = signSession(NOW + 10_000, SECRET);
    const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
    expect(verifySession(tampered, SECRET, NOW)).toBe(false);
  });

  it("weigert een verkeerd secret", () => {
    const token = signSession(NOW + 10_000, SECRET);
    expect(verifySession(token, "ander-secret", NOW)).toBe(false);
  });

  it("weigert lege of vormloze waarden", () => {
    expect(verifySession(undefined, SECRET, NOW)).toBe(false);
    expect(verifySession("", SECRET, NOW)).toBe(false);
    expect(verifySession("geen-punt", SECRET, NOW)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("is waar bij gelijk wachtwoord", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
  });
  it("is onwaar bij verschillend wachtwoord (ook bij andere lengte)", () => {
    expect(checkPassword("fout", "hunter2")).toBe(false);
    expect(checkPassword("", "hunter2")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test om falen te bevestigen**

Run: `npx vitest run src/lib/admin/auth.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/admin/auth'".

- [ ] **Step 3: Implementeer `auth.ts`**

Create `src/lib/admin/auth.ts`:

```ts
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "fd_admin";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dagen

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// Cookie-waarde: "<payload>.<sig>" met payload = base64url(JSON{exp}).
export function signSession(expMs: number, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ exp: expMs })).toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifySession(
  value: string | undefined,
  secret: string,
  nowMs: number
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = hmac(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.exp === "number" && parsed.exp > nowMs;
  } catch {
    return false;
  }
}

// Constant-time vergelijking; beide naar vaste 32-byte hash zodat lengte niet lekt.
export function checkPassword(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run test om te bevestigen dat hij slaagt**

Run: `npx vitest run src/lib/admin/auth.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/auth.ts src/lib/admin/auth.test.ts
git commit -m "feat(admin): HMAC-sessie-crypto + constant-time wachtwoordcheck"
```

---

## Task 3: Sessie-helpers (server-only)

**Files:**
- Create: `src/lib/admin/session.ts`

- [ ] **Step 1: Implementeer `session.ts`**

Create `src/lib/admin/session.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  signSession,
  verifySession,
} from "./auth";

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("Missing env: ADMIN_SESSION_SECRET (zie .env.local.example)");
  return s;
}

export function adminPassword(): string {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("Missing env: ADMIN_PASSWORD (zie .env.local.example)");
  return p;
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, sessionSecret(), Date.now());
}

// Beveiligt pagina's: redirect naar login als de sessie ongeldig is.
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthed())) redirect("/admin/login");
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(Date.now() + SESSION_MAX_AGE_MS, sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: "/admin" });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/session.ts
git commit -m "feat(admin): sessie-helpers (requireAdmin, start/endSession)"
```

---

## Task 4: Gedeelde types + formuliervalidatie (TDD)

**Files:**
- Create: `src/lib/admin/types.ts`
- Create: `src/lib/admin/validation.ts`
- Test: `src/lib/admin/validation.test.ts`

- [ ] **Step 1: Schrijf `types.ts`**

Create `src/lib/admin/types.ts`:

```ts
// Gedeelde retourvorm van server actions (voor useActionState in de formulieren).
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
```

- [ ] **Step 2: Schrijf de falende test**

Create `src/lib/admin/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseFestivalForm, parseOfferForm, isValidSlug } from "@/lib/admin/validation";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const geldigFestival = {
  slug: "lowlands",
  name: "Lowlands",
  description: "Een festival.",
  city: "Biddinghuizen",
  province: "Flevoland",
  start_date: "2026-08-21",
  end_date: "2026-08-23",
  status: "tickets_live",
  genres: "rock, techno",
};

describe("isValidSlug", () => {
  it("accepteert kleine letters, cijfers en koppeltekens", () => {
    expect(isValidSlug("lowlands-2026")).toBe(true);
  });
  it("weigert hoofdletters, spaties en randkoppeltekens", () => {
    expect(isValidSlug("Lowlands")).toBe(false);
    expect(isValidSlug("low lands")).toBe(false);
    expect(isValidSlug("-low")).toBe(false);
  });
});

describe("parseFestivalForm", () => {
  it("parseert een geldig festival, genres als array", () => {
    const r = parseFestivalForm(fd(geldigFestival));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.genres).toEqual(["rock", "techno"]);
      expect(r.data.country).toBe("NL");
      expect(r.data.venue).toBeNull();
    }
  });

  it("weigert een ongeldige slug", () => {
    const r = parseFestivalForm(fd({ ...geldigFestival, slug: "Fout Slug" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.slug).toBeTruthy();
  });

  it("weigert einddatum vóór startdatum", () => {
    const r = parseFestivalForm(fd({ ...geldigFestival, end_date: "2026-08-20" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.end_date).toBeTruthy();
  });

  it("weigert een ongeldige website-URL", () => {
    const r = parseFestivalForm(fd({ ...geldigFestival, website_url: "geen-url" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.website_url).toBeTruthy();
  });
});

describe("parseOfferForm", () => {
  const geldigeOffer = {
    festival_id: "11111111-1111-1111-1111-111111111111",
    provider: "ticketswap",
    url: "https://ticketswap.nl/event/x",
    availability: "available",
    price_from: "79,50",
  };

  it("parseert een geldige offer en normaliseert de prijs", () => {
    const r = parseOfferForm(fd(geldigeOffer));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.price_from).toBe(79.5);
      expect(r.data.currency).toBe("EUR");
    }
  });

  it("laat een lege prijs toe (null)", () => {
    const r = parseOfferForm(fd({ ...geldigeOffer, price_from: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.price_from).toBeNull();
  });

  it("weigert een ongeldige aanbieder en een ongeldige URL", () => {
    expect(parseOfferForm(fd({ ...geldigeOffer, provider: "onzin" })).ok).toBe(false);
    expect(parseOfferForm(fd({ ...geldigeOffer, url: "ftp://x" })).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run test om falen te bevestigen**

Run: `npx vitest run src/lib/admin/validation.test.ts`
Expected: FAIL — kan `@/lib/admin/validation` niet resolven.

- [ ] **Step 4: Implementeer `validation.ts`**

Create `src/lib/admin/validation.ts`:

```ts
import type { Availability, FestivalStatus, Provider } from "../types";

export const FESTIVAL_STATUSES: FestivalStatus[] = [
  "announced", "tickets_live", "sold_out", "cancelled", "past",
];
export const PROVIDERS: Provider[] = ["official", "ticketswap", "gigsberg", "ticombo"];
export const AVAILABILITIES: Availability[] = ["available", "limited", "sold_out", "unknown"];

export interface FestivalInput {
  slug: string;
  name: string;
  description: string;
  genres: string[];
  lineup: string | null;
  city: string;
  venue: string | null;
  province: string;
  country: string;
  start_date: string;
  end_date: string;
  image_url: string | null;
  website_url: string | null;
  status: FestivalStatus;
  published: boolean;
}

export interface OfferInput {
  festival_id: string;
  provider: Provider;
  price_from: number | null;
  currency: string;
  url: string;
  affiliate_url: string | null;
  availability: Availability;
  last_checked_at: string;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

export function parseFestivalForm(form: FormData): ParseResult<FestivalInput> {
  const fieldErrors: Record<string, string> = {};

  const slug = str(form, "slug");
  const name = str(form, "name");
  const description = str(form, "description");
  const city = str(form, "city");
  const province = str(form, "province");
  const country = str(form, "country") || "NL";
  const start_date = str(form, "start_date");
  const end_date = str(form, "end_date");
  const statusRaw = str(form, "status");
  const website_url = optStr(form, "website_url");
  const image_url = optStr(form, "image_url");
  const lineup = optStr(form, "lineup");
  const venue = optStr(form, "venue");
  const genres = str(form, "genres").split(",").map((g) => g.trim()).filter(Boolean);
  const publishedRaw = form.get("published");
  const published = publishedRaw === "on" || publishedRaw === "true";

  if (!isValidSlug(slug))
    fieldErrors.slug = "Ongeldige slug (alleen kleine letters, cijfers, koppeltekens).";
  if (!name) fieldErrors.name = "Naam is verplicht.";
  if (!description) fieldErrors.description = "Beschrijving is verplicht.";
  if (!city) fieldErrors.city = "Plaats is verplicht.";
  if (!province) fieldErrors.province = "Provincie is verplicht.";
  if (!DATE_RE.test(start_date)) fieldErrors.start_date = "Ongeldige startdatum (YYYY-MM-DD).";
  if (!DATE_RE.test(end_date)) fieldErrors.end_date = "Ongeldige einddatum (YYYY-MM-DD).";
  if (DATE_RE.test(start_date) && DATE_RE.test(end_date) && start_date > end_date)
    fieldErrors.end_date = "Einddatum mag niet vóór de startdatum liggen.";
  if (!(FESTIVAL_STATUSES as string[]).includes(statusRaw)) fieldErrors.status = "Ongeldige status.";
  if (website_url && !isValidHttpUrl(website_url)) fieldErrors.website_url = "Ongeldige URL.";
  if (image_url && !isValidHttpUrl(image_url)) fieldErrors.image_url = "Ongeldige URL.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      slug, name, description, genres, lineup, city, venue, province, country,
      start_date, end_date, image_url, website_url,
      status: statusRaw as FestivalStatus, published,
    },
  };
}

export function parseOfferForm(form: FormData): ParseResult<OfferInput> {
  const fieldErrors: Record<string, string> = {};

  const festival_id = str(form, "festival_id");
  const providerRaw = str(form, "provider");
  const availabilityRaw = str(form, "availability") || "unknown";
  const url = str(form, "url");
  const affiliate_url = optStr(form, "affiliate_url");
  const currency = str(form, "currency") || "EUR";
  const priceRaw = str(form, "price_from");

  let price_from: number | null = null;
  if (priceRaw !== "") {
    const n = Number(priceRaw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) fieldErrors.price_from = "Ongeldige prijs.";
    else price_from = n;
  }
  if (!festival_id) fieldErrors.festival_id = "Festival ontbreekt.";
  if (!(PROVIDERS as string[]).includes(providerRaw)) fieldErrors.provider = "Ongeldige aanbieder.";
  if (!(AVAILABILITIES as string[]).includes(availabilityRaw))
    fieldErrors.availability = "Ongeldige beschikbaarheid.";
  if (!isValidHttpUrl(url)) fieldErrors.url = "Ongeldige URL.";
  if (affiliate_url && !isValidHttpUrl(affiliate_url)) fieldErrors.affiliate_url = "Ongeldige URL.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      festival_id, provider: providerRaw as Provider, price_from, currency, url,
      affiliate_url, availability: availabilityRaw as Availability,
      last_checked_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 5: Run test om te bevestigen dat hij slaagt**

Run: `npx vitest run src/lib/admin/validation.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/types.ts src/lib/admin/validation.ts src/lib/admin/validation.test.ts
git commit -m "feat(admin): formuliervalidatie voor festivals en offers (TDD)"
```

---

## Task 5: Login end-to-end (actions + form + login-pagina + guard-layout)

**Files:**
- Create: `src/lib/admin/auth-actions.ts`
- Create: `src/components/admin/LoginForm.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/(dashboard)/layout.tsx`
- Create: `src/app/admin/(dashboard)/page.tsx` (tijdelijke stub; volledige versie in Task 7)

- [ ] **Step 1: Schrijf de auth-actions**

Create `src/lib/admin/auth-actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { checkPassword } from "./auth";
import { adminPassword, startSession, endSession } from "./session";
import type { ActionState } from "./types";

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get("password") ?? "");
  // Kleine vaste vertraging tegen brute-force (bewuste keuze, geen volledige rate-limiter).
  await new Promise((r) => setTimeout(r, 500));
  if (!checkPassword(password, adminPassword())) {
    return { ok: false, error: "Onjuist wachtwoord." };
  }
  await startSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
```

- [ ] **Step 2: Schrijf de LoginForm (client)**

Create `src/components/admin/LoginForm.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { loginAction } from "@/lib/admin/auth-actions";
import type { ActionState } from "@/lib/admin/types";

const initial: ActionState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        required
        placeholder="Wachtwoord"
        className="rounded border border-line bg-panel px-3 py-2"
      />
      {state.error && <p className="text-sm text-warn">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-sm bg-accent px-4 py-2 font-bold text-ground disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Schrijf de login-pagina**

Create `src/app/admin/login/page.tsx`:

```tsx
import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Admin login",
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="display text-2xl">Admin</h1>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 4: Schrijf de guard-layout**

Create `src/app/admin/(dashboard)/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { logoutAction } from "@/lib/admin/auth-actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-line pb-4">
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/admin" className="hover:text-accent">Dashboard</Link>
          <Link href="/admin/festivals" className="hover:text-accent">Festivals</Link>
          <Link href="/admin/review" className="hover:text-accent">Review-wachtrij</Link>
        </nav>
        <form action={logoutAction}>
          <button className="text-sm text-mut hover:text-accent">Uitloggen</button>
        </form>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Schrijf een tijdelijke dashboard-stub**

Create `src/app/admin/(dashboard)/page.tsx`:

```tsx
export default function AdminHome() {
  return <p>Admin-dashboard (wordt ingevuld in Task 7).</p>;
}
```

- [ ] **Step 6: Handmatige verificatie in dev**

Run: `npm run dev`, open `http://localhost:3000/admin`.
Expected: redirect naar `/admin/login`. Fout wachtwoord → "Onjuist wachtwoord." (na ~0,5s). Juist wachtwoord (uit `.env.local`) → naar `/admin` met de stub-tekst. Klik "Uitloggen" → terug naar `/admin/login`, en `/admin` opnieuw bezoeken redirect weer naar login.

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: geen fouten.

- [ ] **Step 8: Commit**

```bash
git add src/lib/admin/auth-actions.ts src/components/admin/LoginForm.tsx "src/app/admin/login/page.tsx" "src/app/admin/(dashboard)/layout.tsx" "src/app/admin/(dashboard)/page.tsx"
git commit -m "feat(admin): login-flow + afgeschermde layout (noindex)"
```

---

## Task 6: Admin-queries

**Files:**
- Create: `src/lib/admin/queries.ts`

- [ ] **Step 1: Implementeer `queries.ts`**

Create `src/lib/admin/queries.ts`:

```ts
import "server-only";
import { supabase } from "../supabase";
import type { Festival, FestivalWithOffers } from "../types";

// Voor de lijstweergave: festival + aantal offers (PostgREST count-embedding).
export interface AdminFestivalRow extends Festival {
  ticket_offers: { count: number }[];
}

export async function getAllFestivalsForAdmin(): Promise<AdminFestivalRow[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*, ticket_offers(count)")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminFestivalRow[];
}

export async function getFestivalForAdmin(id: string): Promise<FestivalWithOffers | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*, ticket_offers(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as FestivalWithOffers | null;
}

export async function getDraftFestivalsForAdmin(): Promise<FestivalWithOffers[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*, ticket_offers(*)")
    .eq("published", false)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FestivalWithOffers[];
}

export async function getAdminCounts(): Promise<{ published: number; draft: number; total: number }> {
  const totalRes = await supabase.from("festivals").select("*", { count: "exact", head: true });
  if (totalRes.error) throw totalRes.error;
  const pubRes = await supabase
    .from("festivals")
    .select("*", { count: "exact", head: true })
    .eq("published", true);
  if (pubRes.error) throw pubRes.error;
  const total = totalRes.count ?? 0;
  const published = pubRes.count ?? 0;
  return { published, draft: total - published, total };
}

// Helper voor de lijst: aantal offers uit de count-embedding halen.
export function offerCount(row: AdminFestivalRow): number {
  return row.ticket_offers[0]?.count ?? 0;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/queries.ts
git commit -m "feat(admin): admin-reads (lijst, detail, concepten, tellingen)"
```

---

## Task 7: Revalidate-helper + festival-actions + dashboard-home

**Files:**
- Create: `src/lib/admin/revalidate.ts`
- Create: `src/lib/admin/festival-actions.ts`
- Modify: `src/app/admin/(dashboard)/page.tsx` (vervang de stub)
- Modify: `src/app/festivals/page.tsx` (tag toevoegen aan `unstable_cache`)

- [ ] **Step 1: Schrijf de revalidate-helper**

Create `src/lib/admin/revalidate.ts`:

```ts
import { revalidatePath, revalidateTag } from "next/cache";

// Bust alle publieke pagina's die festivaldata tonen, plus de getagde data-cache
// van de /festivals-lijst. Aanroepen na elke schrijf-actie op festivals/offers.
export function revalidatePublicFestivalPages(): void {
  revalidatePath("/");
  revalidatePath("/festivals");
  revalidatePath("/festivals/[slug]", "page");
  revalidatePath("/goedkope-festivaltickets");
  revalidatePath("/last-minute-festivals");
  revalidatePath("/agenda/[maand]", "page");
  revalidatePath("/sitemap.xml");
  revalidateTag("festivals");
}
```

- [ ] **Step 2: Geef de /festivals-datacache een tag**

Modify `src/app/festivals/page.tsx` — pas het `unstable_cache`-blok aan zodat `revalidateTag("festivals")` het bust:

```ts
const getCachedUpcomingFestivals = unstable_cache(
  () => getUpcomingFestivals(),
  ["festivals-overzicht"],
  { revalidate: 3600, tags: ["festivals"] }
);
```

(alleen de `tags: ["festivals"]` is toegevoegd aan het options-object)

- [ ] **Step 3: Schrijf de festival-actions**

Create `src/lib/admin/festival-actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
import { requireAdmin } from "./session";
import { parseFestivalForm } from "./validation";
import { revalidatePublicFestivalPages } from "./revalidate";
import type { ActionState } from "./types";

export async function upsertFestival(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseFestivalForm(form);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const id = String(form.get("id") ?? "").trim();
  const payload = { ...parsed.data, updated_at: new Date().toISOString() };
  const { error } = id
    ? await supabase.from("festivals").update(payload).eq("id", id)
    : await supabase.from("festivals").insert(payload);

  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: "Deze slug bestaat al." } };
    return { ok: false, error: `Opslaan mislukt: ${error.message}` };
  }
  revalidatePublicFestivalPages();
  revalidatePath("/admin/festivals");
  redirect("/admin/festivals");
}

export async function setFestivalPublished(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from("festivals")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePublicFestivalPages();
  revalidatePath("/admin/festivals");
  revalidatePath("/admin/review");
}

export async function deleteFestival(id: string): Promise<void> {
  await requireAdmin();
  // ticket_offers + clicks cascaden via de FK-migratie (Task 1).
  const { error } = await supabase.from("festivals").delete().eq("id", id);
  if (error) throw error;
  revalidatePublicFestivalPages();
  revalidatePath("/admin/festivals");
  revalidatePath("/admin/review");
  redirect("/admin/festivals");
}
```

- [ ] **Step 4: Vervang de dashboard-stub door de echte home**

Overwrite `src/app/admin/(dashboard)/page.tsx`:

```tsx
import Link from "next/link";
import { getAdminCounts } from "@/lib/admin/queries";

export default async function AdminHome() {
  const { published, draft, total } = await getAdminCounts();
  const cards = [
    { label: "Gepubliceerd", value: published },
    { label: "Concept", value: draft },
    { label: "Totaal", value: total },
  ];
  return (
    <section className="flex flex-col gap-6">
      <h1 className="display text-3xl">Dashboard</h1>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded border border-line bg-panel p-4">
            <p className="text-sm text-mut">{c.label}</p>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Link href="/admin/festivals" className="rounded-sm bg-accent px-4 py-2 font-bold text-ground">
          Festivals beheren
        </Link>
        <Link href="/admin/review" className="rounded-sm border border-line px-4 py-2 font-semibold">
          Review-wachtrij ({draft})
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: build slaagt; `/admin` en `/admin/festivals` verschijnen als routes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/revalidate.ts src/lib/admin/festival-actions.ts "src/app/admin/(dashboard)/page.tsx" src/app/festivals/page.tsx
git commit -m "feat(admin): festival-actions + revalidate + dashboard-home"
```

---

## Task 8: Festival-lijst + publiceer-schakelaar + verwijderknop

**Files:**
- Create: `src/components/admin/PublishToggle.tsx`
- Create: `src/components/admin/DeleteButton.tsx`
- Create: `src/app/admin/(dashboard)/festivals/page.tsx`

- [ ] **Step 1: Schrijf de PublishToggle (client)**

Create `src/components/admin/PublishToggle.tsx`:

```tsx
"use client";
import { useTransition } from "react";
import { setFestivalPublished } from "@/lib/admin/festival-actions";

export default function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setFestivalPublished(id, !published))}
      className={`rounded-sm px-2 py-1 text-xs font-bold disabled:opacity-60 ${
        published ? "bg-accent text-ground" : "border border-line text-mut"
      }`}
    >
      {published ? "Gepubliceerd" : "Concept"}
    </button>
  );
}
```

- [ ] **Step 2: Schrijf de DeleteButton (client)**

Create `src/components/admin/DeleteButton.tsx`:

```tsx
"use client";
import { useTransition } from "react";

export default function DeleteButton({
  onDelete,
  label = "Verwijder",
  confirmText = "Zeker weten verwijderen? Dit kan niet ongedaan gemaakt worden.",
}: {
  onDelete: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(confirmText)) start(() => onDelete());
      }}
      className="rounded-sm border border-warn/50 px-2 py-1 text-xs font-semibold text-warn disabled:opacity-60"
    >
      {pending ? "Bezig…" : label}
    </button>
  );
}
```

- [ ] **Step 3: Schrijf de festival-lijstpagina**

Create `src/app/admin/(dashboard)/festivals/page.tsx`:

```tsx
import Link from "next/link";
import { getAllFestivalsForAdmin, offerCount } from "@/lib/admin/queries";
import { deleteFestival } from "@/lib/admin/festival-actions";
import PublishToggle from "@/components/admin/PublishToggle";
import DeleteButton from "@/components/admin/DeleteButton";
import { formatDateRange } from "@/lib/format";

export default async function AdminFestivalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q = "", filter = "all" } = await searchParams;
  const all = await getAllFestivalsForAdmin();
  const term = q.trim().toLowerCase();
  const rows = all.filter((f) => {
    if (filter === "draft" && f.published) return false;
    if (filter === "published" && !f.published) return false;
    if (term && !f.name.toLowerCase().includes(term) && !f.slug.includes(term)) return false;
    return true;
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl">Festivals</h1>
        <Link href="/admin/festivals/new" className="rounded-sm bg-accent px-4 py-2 font-bold text-ground">
          + Nieuw festival
        </Link>
      </div>

      <form className="flex gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op naam of slug…"
          className="flex-1 rounded border border-line bg-panel px-3 py-2"
        />
        <select name="filter" defaultValue={filter} className="rounded border border-line bg-panel px-3 py-2">
          <option value="all">Alle</option>
          <option value="published">Gepubliceerd</option>
          <option value="draft">Concept</option>
        </select>
        <button className="rounded-sm border border-line px-4 py-2 font-semibold">Filter</button>
      </form>

      <p className="text-sm text-mut">{rows.length} van {all.length} festivals</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-mut">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Naam</th>
              <th className="py-2 pr-3">Datum</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Offers</th>
              <th className="py-2 pr-3">Publicatie</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-line/60">
                <td className="py-2 pr-3 font-semibold">
                  <Link href={`/admin/festivals/${f.id}`} className="hover:text-accent">{f.name}</Link>
                  <span className="block text-xs text-mut">{f.slug}</span>
                </td>
                <td className="py-2 pr-3 text-mut">{formatDateRange(f.start_date, f.end_date)}</td>
                <td className="py-2 pr-3 text-mut">{f.status}</td>
                <td className="py-2 pr-3 tabular-nums">{offerCount(f)}</td>
                <td className="py-2 pr-3"><PublishToggle id={f.id} published={f.published} /></td>
                <td className="py-2 pr-3">
                  <DeleteButton onDelete={deleteFestival.bind(null, f.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Handmatige verificatie**

Run: `npm run dev`, open `/admin/festivals`.
Expected: lijst toont alle festivals (ook concepten). Zoeken + filter werken. Publiceer-schakelaar wisselt de status (rij-badge verandert na de actie). Verwijder vraagt bevestiging. Controleer op de publieke site (`/festivals`) dat een net gepubliceerd festival binnen enkele seconden verschijnt.

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: geen fouten; build slaagt.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/PublishToggle.tsx src/components/admin/DeleteButton.tsx "src/app/admin/(dashboard)/festivals/page.tsx"
git commit -m "feat(admin): festival-lijst met publiceer-schakelaar en verwijderen"
```

---

## Task 9: Festival aanmaken/bewerken (formulier + pagina's)

**Files:**
- Create: `src/components/admin/FestivalForm.tsx`
- Create: `src/app/admin/(dashboard)/festivals/new/page.tsx`
- Create: `src/app/admin/(dashboard)/festivals/[id]/page.tsx`

- [ ] **Step 1: Schrijf de FestivalForm (client)**

Create `src/components/admin/FestivalForm.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { upsertFestival } from "@/lib/admin/festival-actions";
import { FESTIVAL_STATUSES } from "@/lib/admin/validation";
import type { ActionState } from "@/lib/admin/types";
import type { Festival } from "@/lib/types";

const initial: ActionState = {};

function Field({
  label, name, defaultValue, error, type = "text", required = false,
}: {
  label: string; name: string; defaultValue?: string | null; error?: string;
  type?: string; required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}{required && " *"}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded border border-line bg-panel px-3 py-2"
      />
      {error && <span className="text-xs text-warn">{error}</span>}
    </label>
  );
}

export default function FestivalForm({ festival }: { festival?: Festival }) {
  const [state, action, pending] = useActionState(upsertFestival, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {festival && <input type="hidden" name="id" value={festival.id} />}
      {state.error && <p className="rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">{state.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam" name="name" defaultValue={festival?.name} error={e.name} required />
        <Field label="Slug" name="slug" defaultValue={festival?.slug} error={e.slug} required />
        <Field label="Plaats" name="city" defaultValue={festival?.city} error={e.city} required />
        <Field label="Terrein/locatie" name="venue" defaultValue={festival?.venue} error={e.venue} />
        <Field label="Provincie" name="province" defaultValue={festival?.province} error={e.province} required />
        <Field label="Land" name="country" defaultValue={festival?.country ?? "NL"} error={e.country} />
        <Field label="Startdatum" name="start_date" type="date" defaultValue={festival?.start_date} error={e.start_date} required />
        <Field label="Einddatum" name="end_date" type="date" defaultValue={festival?.end_date} error={e.end_date} required />
        <Field label="Website-URL" name="website_url" defaultValue={festival?.website_url} error={e.website_url} />
        <Field label="Afbeelding-URL" name="image_url" defaultValue={festival?.image_url} error={e.image_url} />
        <Field label="Genres (komma-gescheiden)" name="genres" defaultValue={festival?.genres.join(", ")} error={e.genres} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Status *</span>
          <select name="status" defaultValue={festival?.status ?? "announced"} className="rounded border border-line bg-panel px-3 py-2">
            {FESTIVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {e.status && <span className="text-xs text-warn">{e.status}</span>}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Beschrijving *</span>
        <textarea name="description" defaultValue={festival?.description ?? ""} rows={6} required
          className="rounded border border-line bg-panel px-3 py-2" />
        {e.description && <span className="text-xs text-warn">{e.description}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Line-up (vrij tekstveld, leeg = verborgen)</span>
        <textarea name="lineup" defaultValue={festival?.lineup ?? ""} rows={3}
          className="rounded border border-line bg-panel px-3 py-2" />
      </label>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="published" defaultChecked={festival?.published ?? false} />
        Gepubliceerd
      </label>

      <button disabled={pending} className="self-start rounded-sm bg-accent px-5 py-2.5 font-bold text-ground disabled:opacity-60">
        {pending ? "Opslaan…" : "Opslaan"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Schrijf de "nieuw"-pagina**

Create `src/app/admin/(dashboard)/festivals/new/page.tsx`:

```tsx
import FestivalForm from "@/components/admin/FestivalForm";

export default function NewFestivalPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="display text-3xl">Nieuw festival</h1>
      <FestivalForm />
    </section>
  );
}
```

- [ ] **Step 3: Schrijf de "bewerken"-pagina (offers-sectie komt in Task 10)**

Create `src/app/admin/(dashboard)/festivals/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getFestivalForAdmin } from "@/lib/admin/queries";
import FestivalForm from "@/components/admin/FestivalForm";

export default async function EditFestivalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const festival = await getFestivalForAdmin(id);
  if (!festival) notFound();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="display text-3xl">{festival.name} bewerken</h1>
      <FestivalForm festival={festival} />
      {/* Ticket-aanbieders-sectie wordt toegevoegd in Task 10 */}
    </section>
  );
}
```

- [ ] **Step 4: Handmatige verificatie**

Run: `npm run dev`.
Expected: `/admin/festivals/new` → invullen + opslaan maakt een festival aan en redirect naar de lijst. Ongeldige slug/datumvolgorde → foutmelding bij het veld, ingevulde waarden blijven staan. Een bestaand festival openen via de lijst → formulier vooringevuld; wijziging opslaan werkt; wijziging zichtbaar op publieke site na enkele seconden.

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: geen fouten.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/FestivalForm.tsx "src/app/admin/(dashboard)/festivals/new/page.tsx" "src/app/admin/(dashboard)/festivals/[id]/page.tsx"
git commit -m "feat(admin): festival aanmaken en bewerken"
```

---

## Task 10: Ticket-aanbieders beheren

**Files:**
- Create: `src/lib/admin/offer-actions.ts`
- Create: `src/components/admin/OfferForm.tsx`
- Modify: `src/app/admin/(dashboard)/festivals/[id]/page.tsx` (offers-sectie toevoegen)

- [ ] **Step 1: Schrijf de offer-actions**

Create `src/lib/admin/offer-actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
import { requireAdmin } from "./session";
import { parseOfferForm } from "./validation";
import { revalidatePublicFestivalPages } from "./revalidate";
import type { ActionState } from "./types";

export async function upsertOffer(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseOfferForm(form);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const id = String(form.get("id") ?? "").trim();
  const { error } = id
    ? await supabase.from("ticket_offers").update(parsed.data).eq("id", id)
    : await supabase.from("ticket_offers").insert(parsed.data);
  if (error) return { ok: false, error: `Opslaan mislukt: ${error.message}` };

  revalidatePublicFestivalPages();
  revalidatePath(`/admin/festivals/${parsed.data.festival_id}`);
  return { ok: true };
}

export async function deleteOffer(id: string, festivalId: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase.from("ticket_offers").delete().eq("id", id);
  if (error) throw error;
  revalidatePublicFestivalPages();
  revalidatePath(`/admin/festivals/${festivalId}`);
}
```

- [ ] **Step 2: Schrijf de OfferForm (client)**

Create `src/components/admin/OfferForm.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { upsertOffer, deleteOffer } from "@/lib/admin/offer-actions";
import { PROVIDERS, AVAILABILITIES } from "@/lib/admin/validation";
import DeleteButton from "@/components/admin/DeleteButton";
import type { ActionState } from "@/lib/admin/types";
import type { TicketOffer } from "@/lib/types";

const initial: ActionState = {};

export default function OfferForm({
  festivalId,
  offer,
}: {
  festivalId: string;
  offer?: TicketOffer;
}) {
  const [state, action, pending] = useActionState(upsertOffer, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid items-end gap-2 rounded border border-line p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
      <input type="hidden" name="festival_id" value={festivalId} />
      {offer && <input type="hidden" name="id" value={offer.id} />}

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">Aanbieder</span>
        <select name="provider" defaultValue={offer?.provider ?? "official"} className="rounded border border-line bg-panel px-2 py-1.5">
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">URL</span>
        <input name="url" defaultValue={offer?.url ?? ""} className="rounded border border-line bg-panel px-2 py-1.5" />
        {e.url && <span className="text-warn">{e.url}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">Prijs vanaf</span>
        <input name="price_from" defaultValue={offer?.price_from ?? ""} placeholder="bv. 79,50"
          className="w-24 rounded border border-line bg-panel px-2 py-1.5" />
        {e.price_from && <span className="text-warn">{e.price_from}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">Beschikbaarheid</span>
        <select name="availability" defaultValue={offer?.availability ?? "unknown"} className="rounded border border-line bg-panel px-2 py-1.5">
          {AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <input name="affiliate_url" defaultValue={offer?.affiliate_url ?? ""} placeholder="affiliate-URL (optioneel)"
          className="rounded border border-line bg-panel px-2 py-1.5 text-xs" />
        <div className="flex gap-2">
          <button disabled={pending} className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-ground disabled:opacity-60">
            {offer ? "Bijwerken" : "Toevoegen"}
          </button>
          {offer && <DeleteButton onDelete={deleteOffer.bind(null, offer.id, festivalId)} label="Verwijder offer" />}
        </div>
        {state.ok && <span className="text-xs text-accent">Opgeslagen.</span>}
        {state.error && <span className="text-xs text-warn">{state.error}</span>}
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Voeg de offers-sectie toe aan de edit-pagina**

Overwrite `src/app/admin/(dashboard)/festivals/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getFestivalForAdmin } from "@/lib/admin/queries";
import FestivalForm from "@/components/admin/FestivalForm";
import OfferForm from "@/components/admin/OfferForm";

export default async function EditFestivalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const festival = await getFestivalForAdmin(id);
  if (!festival) notFound();

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="display text-3xl">{festival.name} bewerken</h1>
        <FestivalForm festival={festival} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Ticket-aanbieders</h2>
        {festival.ticket_offers.map((offer) => (
          <OfferForm key={offer.id} festivalId={festival.id} offer={offer} />
        ))}
        <h3 className="mt-2 text-sm font-semibold text-mut">Nieuwe aanbieder toevoegen</h3>
        <OfferForm festivalId={festival.id} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Handmatige verificatie**

Run: `npm run dev`, open een festival via de lijst.
Expected: bestaande aanbieders staan als vooringevulde rijen; bijwerken toont "Opgeslagen."; verwijderen vraagt bevestiging en haalt de rij weg na herladen; de lege "toevoegen"-rij maakt een nieuwe aanbieder aan. Ongeldige URL/prijs → foutmelding bij het veld. Controleer op de publieke festivalpagina dat een prijswijziging binnen seconden zichtbaar is.

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: geen fouten.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/offer-actions.ts src/components/admin/OfferForm.tsx "src/app/admin/(dashboard)/festivals/[id]/page.tsx"
git commit -m "feat(admin): ticket-aanbieders toevoegen/bewerken/verwijderen"
```

---

## Task 11: Review-wachtrij + eindverificatie

**Files:**
- Create: `src/components/admin/ReviewActions.tsx`
- Create: `src/app/admin/(dashboard)/review/page.tsx`

- [ ] **Step 1: Schrijf de ReviewActions (client)**

Create `src/components/admin/ReviewActions.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useTransition } from "react";
import { setFestivalPublished, deleteFestival } from "@/lib/admin/festival-actions";
import DeleteButton from "@/components/admin/DeleteButton";

export default function ReviewActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => setFestivalPublished(id, true))}
        className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-ground disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Publiceer"}
      </button>
      <Link href={`/admin/festivals/${id}`} className="rounded-sm border border-line px-3 py-1.5 text-xs font-semibold">
        Bewerken
      </Link>
      {/* "Overslaan" = niets doen; het festival blijft concept. */}
      <DeleteButton onDelete={deleteFestival.bind(null, id)} />
    </div>
  );
}
```

- [ ] **Step 2: Schrijf de review-pagina**

Create `src/app/admin/(dashboard)/review/page.tsx`:

```tsx
import { getDraftFestivalsForAdmin } from "@/lib/admin/queries";
import ReviewActions from "@/components/admin/ReviewActions";
import { formatDateRange } from "@/lib/format";

export default async function ReviewPage() {
  const drafts = await getDraftFestivalsForAdmin();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="display text-3xl">Review-wachtrij</h1>
      <p className="text-sm text-mut">{drafts.length} concept-festivals</p>

      {drafts.length === 0 && <p className="text-mut">Geen concepten meer — alles is beoordeeld. 🎉</p>}

      <div className="flex flex-col gap-3">
        {drafts.map((f) => (
          <article key={f.id} className="rounded border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{f.name} <span className="text-xs font-normal text-mut">/{f.slug}</span></h2>
                <p className="text-sm text-mut">
                  {formatDateRange(f.start_date, f.end_date)} · {f.city}, {f.province} · {f.status} · {f.ticket_offers.length} aanbieders
                </p>
                <p className="mt-2 line-clamp-3 text-sm">{f.description}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReviewActions id={f.id} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Handmatige verificatie**

Run: `npm run dev`, open `/admin/review`.
Expected: alle concept-festivals staan als kaarten met kernvelden. "Publiceer" haalt de kaart uit de wachtrij en zet het festival live (check `/festivals`). "Bewerken" opent de edit-pagina. "Verwijder" vraagt bevestiging. Bij nul concepten verschijnt de lege-status.

- [ ] **Step 4: Volledige testsuite + typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: typecheck/lint schoon; alle tests groen (bestaande 78 + nieuwe auth/validation-tests); build slaagt met de admin-routes.

- [ ] **Step 5: Productie-smoke-test (publieke site onaangetast)**

Run: `SMOKE_BASE_URL=https://festivaldiscounter.nl npm run smoke`
Expected: 9/9 groen (de admin raakt de publieke routes niet).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ReviewActions.tsx "src/app/admin/(dashboard)/review/page.tsx"
git commit -m "feat(admin): bulk-review-wachtrij voor concept-festivals"
```

- [ ] **Step 7: Vercel-env-vars zetten (eigenaar)**

Zet in Vercel → Project → Environment Variables (Production): `ADMIN_PASSWORD` en `ADMIN_SESSION_SECRET` (zelfde als lokaal, of nieuwe sterke waarden). Zonder deze twee vars faalt `/admin` in productie met een duidelijke env-fout. Daarna ff-merge `fase-1` → `main` (na akkoord) voor de deploy.

---

## Definition of done (uit de spec)

- [x] Inloggen op `/admin` werkt; onbevoegde toegang tot `/admin/*` en tot server actions wordt geweigerd (`requireAdmin` in layout én elke action).
- [x] Festivals en ticket-aanbieders volledig CRUD + publiceren/depubliceren via de admin.
- [x] Wijzigingen verschijnen binnen seconden op de publieke site (revalidatePath + revalidateTag).
- [x] Review-wachtrij toont concepten en laat ze publiceren/overslaan/verwijderen.
- [x] `/admin/*` is `noindex` en niet in de sitemap (admin staat niet in `sitemap.ts`).
- [x] Tests groen (auth-helper + validatielogica); typecheck, lint, build slagen; smoke 9/9.
