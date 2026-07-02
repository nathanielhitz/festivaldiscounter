# FestivalDiscounter.nl Fase 1 — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publieke Nederlandstalige festivalvergelijker met ~75 festivalpagina's, ticketvergelijker met vanaf-prijzen, klik-tracking via eigen redirect, en volledige SEO-basis — live op festivaldiscounter.nl.

**Architecture:** Next.js 15 (App Router) op Vercel met ISR (revalidate 3600 s); Supabase Postgres als enige databron, uitsluitend server-side benaderd met de service-role key. Donker "Nachtprogramma"-thema als Tailwind v4 design-tokens; alle uitgaande ticketlinks lopen via `/uit/[offerId]` dat kliks logt en doorstuurt.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS v4, @supabase/supabase-js v2, marked (markdown), Vitest (unit tests), Plausible (analytics).

**Spec:** `docs/superpowers/specs/2026-07-02-festivaldiscounter-fase1-design.md` — lees deze eerst.

**Vereisten vooraf:** Node 20+, npm. Vanaf Taak 3 is een Supabase-project nodig (gratis tier volstaat); vraag de eigenaar om de project-URL en service-role key als `.env.local` nog niet bestaat.

**Designrichtlijn:** De frontend-taken (9 t/m 15) volgen de gekozen visuele richting uit de spec-sectie "Visuele richting". Raadpleeg bij het bouwen van UI de `design-taste-frontend`-skill; wijk niet af van de kleurtokens in Taak 2.

---

## Bestandsstructuur (eindbeeld)

```
festivaldiscounter/            (repo-root = huidige map)
├── docs/superpowers/          (specs & plannen, bestaat al)
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── scripts/smoke.mjs
├── public/fonts/              (Built Titling woff2, licentie vereist)
├── public/og-default.png
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, not-found.tsx, globals.css, icon.png
│   │   ├── sitemap.ts, robots.ts
│   │   ├── festivals/page.tsx
│   │   ├── festivals/[slug]/page.tsx
│   │   ├── goedkope-festivaltickets/page.tsx
│   │   ├── last-minute-festivals/page.tsx
│   │   ├── agenda/[maand]/page.tsx
│   │   ├── gids/page.tsx  +  gids/[slug]/page.tsx
│   │   ├── over/page.tsx, contact/page.tsx, privacy/page.tsx
│   │   └── uit/[offerId]/route.ts
│   ├── components/  (Logo, SiteHeader, SiteFooter, FestivalCard, TicketComparator, JsonLd)
│   └── lib/         (types, supabase, queries, format, months, faq, schema-org)  + *.test.ts
├── package.json, tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts
└── .env.local.example, .gitignore
```

---

### Taak 1: Projectscaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Stap 1: Maak `package.json`**

```json
{
  "name": "festivaldiscounter",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "smoke": "node scripts/smoke.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "marked": "^15.0.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.5.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Stap 2: Maak configbestanden**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

`.gitignore`:
```
node_modules/
.next/
.env.local
.DS_Store
*.tsbuildinfo
next-env.d.ts
```

`.env.local.example`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
```

- [ ] **Stap 3: Maak minimale app-bestanden**

`src/app/globals.css` (wordt in Taak 2 vervangen):
```css
@import "tailwindcss";
```

`src/app/layout.tsx` (wordt in Taak 2 vervangen):
```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` (wordt in Taak 10 vervangen):
```tsx
export default function Home() {
  return <main>FestivalDiscounter.nl</main>;
}
```

- [ ] **Stap 4: Installeer en verifieer**

Run: `npm install && npm run build`
Verwacht: build slaagt zonder fouten ("Compiled successfully").

- [ ] **Stap 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js 15 + TypeScript + Tailwind v4 + Vitest"
```

---

### Taak 2: Huisstijl — tokens, fonts, logo, header/footer, layout

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/Logo.tsx`, `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/app/icon.png`, `public/og-default.png`, `public/fonts/` (map)

- [ ] **Stap 1: Vervang `src/app/globals.css` door de design-tokens uit de spec**

```css
@import "tailwindcss";

/* Merkletter — voeg built-titling.woff2 toe zodra de licentie geregeld is.
   Ontbreekt het bestand, dan valt de stack terug op Avenir Next Condensed. */
@font-face {
  font-family: "Built Titling";
  src: url("/fonts/built-titling.woff2") format("woff2");
  font-weight: 400 700;
  font-display: swap;
}

@theme {
  --color-ground: #061410;
  --color-panel: #0b211a;
  --color-panel2: #0e2a21;
  --color-line: #1b3a30;
  --color-ink: #eaf4ef;
  --color-mut: #8fa99d;
  --color-accent: #60dbcc;
  --color-accent-deep: #2e8f82;
  --color-warn: #e8c567;
  --font-display: "Built Titling", "Avenir Next Condensed", "Arial Narrow", sans-serif;
  --font-body: "Avenir Next", ui-sans-serif, system-ui, sans-serif;
}

body {
  background: var(--color-ground);
  color: var(--color-ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

.display {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 0.95;
}

/* Leeskolom voor gidsartikelen (spec: max ~65 tekens, ruimere interlinie) */
.prose-dark {
  max-width: 65ch;
  line-height: 1.75;
}
.prose-dark h2 { font-size: 1.5rem; margin: 1.6em 0 0.6em; font-weight: 700; }
.prose-dark h3 { font-size: 1.2rem; margin: 1.4em 0 0.5em; font-weight: 700; }
.prose-dark p, .prose-dark ul, .prose-dark ol { margin: 0 0 1em; color: var(--color-ink); }
.prose-dark a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 3px; }
.prose-dark li { margin-bottom: 0.4em; }
```

- [ ] **Stap 2: Maak `src/components/Logo.tsx`**

```tsx
export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="fd-logo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E8F82" />
            <stop offset="100%" stopColor="#60DBCC" />
          </linearGradient>
        </defs>
        <path
          fill="url(#fd-logo)"
          d="M9.663 12.988L12.675 16l-6.338 6.337 3.326 3.326L16 19.325l3.012 3.012-6.337 6.338L16 32l6.337-6.337 3.326-3.326L32 16l-3.325-3.325-6.338 6.337L19.325 16l6.338-6.337-3.326-3.326L16 12.675l-3.012-3.012 6.337-6.338L16 0 9.663 6.337 6.337 9.663 0 16l3.325 3.325z"
        />
      </svg>
      <b className="display text-lg tracking-wide">Festivaldiscounter</b>
    </span>
  );
}
```

- [ ] **Stap 3: Maak `src/components/SiteHeader.tsx` en `src/components/SiteFooter.tsx`**

`SiteHeader.tsx`:
```tsx
import Link from "next/link";
import Logo from "./Logo";

const NAV = [
  { href: "/festivals", label: "Festivals" },
  { href: "/last-minute-festivals", label: "Last-minute" },
  { href: "/goedkope-festivaltickets", label: "Goedkope tickets" },
  { href: "/gids", label: "Gids" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
        <Link href="/" aria-label="FestivalDiscounter home"><Logo /></Link>
        <div className="ml-auto flex flex-wrap gap-5 text-sm font-semibold text-mut">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
```

`SiteFooter.tsx`:
```tsx
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-mut">
        <span>© {new Date().getFullYear()} FestivalDiscounter.nl</span>
        <Link href="/over" className="hover:text-ink">Over ons</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <span className="basis-full text-xs">
          Sommige links op deze site zijn affiliate-links: wij kunnen een vergoeding ontvangen
          als je via ons een ticket koopt. Jij betaalt nooit meer.
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Stap 4: Vervang `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "FestivalDiscounter.nl — Festivaltickets vergelijken",
    template: "%s · FestivalDiscounter.nl",
  },
  description:
    "Vergelijk ticketprijzen van officiële verkoop en doorverkoop voor 75+ Nederlandse festivals. Dagelijks gecheckt.",
  openGraph: { locale: "nl_NL", type: "website", images: ["/og-default.png"] },
};

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        {plausibleDomain && (
          <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
        )}
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
```

- [ ] **Stap 5: Kopieer merkassets**

```bash
mkdir -p public/fonts
cp "Festivaldiscounter-logo inspitratie/profile.png" src/app/icon.png
cp "Festivaldiscounter-logo inspitratie/cover.png" public/og-default.png
```

- [ ] **Stap 6: Verifieer en commit**

Run: `npm run build`
Verwacht: build slaagt.

```bash
git add -A && git commit -m "feat: huisstijl-tokens, logo, header/footer, basislayout"
```

---

### Taak 3: Database — migratie en seed

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`

- [ ] **Stap 1: Maak `supabase/migrations/0001_init.sql`**

```sql
create extension if not exists "pgcrypto";

create type festival_status as enum ('announced','tickets_live','sold_out','cancelled','past');
create type ticket_provider as enum ('official','ticketswap','gigsberg','ticombo');
create type ticket_availability as enum ('available','limited','sold_out','unknown');

create table festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  genres text[] not null default '{}',
  lineup text,
  city text not null,
  venue text,
  province text not null,
  country text not null default 'NL',
  start_date date not null,
  end_date date not null,
  image_url text,
  website_url text,
  status festival_status not null default 'announced',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_offers (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals(id) on delete cascade,
  provider ticket_provider not null,
  price_from numeric(8,2),
  currency text not null default 'EUR',
  url text not null,
  affiliate_url text,
  availability ticket_availability not null default 'unknown',
  last_checked_at timestamptz not null default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz
);

create table clicks (
  id bigint generated always as identity primary key,
  offer_id uuid not null references ticket_offers(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referer text
);

create index festivals_published_start_idx on festivals (published, start_date);
create index ticket_offers_festival_idx on ticket_offers (festival_id);
create index clicks_offer_idx on clicks (offer_id);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

create trigger festivals_updated_at
  before update on festivals
  for each row execute function set_updated_at();

-- RLS aan, géén policies: anonieme toegang is overal geblokkeerd.
-- De site leest server-side met de service-role key (omzeilt RLS).
alter table festivals enable row level security;
alter table ticket_offers enable row level security;
alter table articles enable row level security;
alter table clicks enable row level security;
```

- [ ] **Stap 2: Maak `supabase/seed.sql` met 6 echte festivals + 1 artikel**

Vaste UUID's zodat de smoke-test (Taak 17) een bekende redirect kan controleren.

```sql
insert into festivals (id, slug, name, description, genres, city, venue, province, start_date, end_date, website_url, status, published) values
('11111111-1111-1111-1111-111111111101','lowlands','Lowlands',
 'Lowlands (voluit A Campingflight to Lowlands Paradise) is een van de grootste meerdaagse festivals van Nederland. Drie dagen lang muziek, kunst, wetenschap en theater op het evenemententerrein in Biddinghuizen, met campings direct naast het festivalterrein.',
 '{pop,rock,electronic,hiphop}','Biddinghuizen','Evenemententerrein Walibi Holland','Flevoland','2026-08-21','2026-08-23','https://lowlands.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111102','defqon-1','Defqon.1',
 'Defqon.1 Weekend Festival is het grootste hardstyle-festival ter wereld, georganiseerd door Q-dance. Vier dagen harder styles verdeeld over ruim vijftien podia, met camping, de iconische endshow en tienduizenden bezoekers uit de hele wereld.',
 '{hardstyle,hardcore}','Biddinghuizen','Evenemententerrein Walibi Holland','Flevoland','2026-06-26','2026-06-28','https://defqon1.nl','sold_out',true),
('11111111-1111-1111-1111-111111111103','awakenings-summer-festival','Awakenings Summer Festival',
 'Awakenings Summer Festival is hét techno-festival van Nederland. Een heel weekend lang draaien de grootste techno-artiesten van de wereld op meerdere podia in de bossen van Hilvarenbeek, inclusief camping.',
 '{techno}','Hilvarenbeek','Beekse Bergen','Noord-Brabant','2026-07-10','2026-07-12','https://awakenings.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111104','mysteryland','Mysteryland',
 'Mysteryland in Haarlemmermeer is het langstlopende dancefestival van Nederland. Op het voormalige Floriade-terrein komen alle stijlen van de elektronische muziek samen, van house en techno tot hardstyle.',
 '{house,techno,hardstyle}','Haarlemmermeer','Floriadeterrein','Noord-Holland','2026-08-28','2026-08-30','https://mysteryland.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111105','down-the-rabbit-hole','Down The Rabbit Hole',
 'Down The Rabbit Hole is een driedaags muziekfestival op de Groene Heuvels bij Ewijk, van de makers van Lowlands. Een eigenzinnige line-up met pop, rock, hiphop en electronic, midden in de natuur met camping.',
 '{pop,rock,hiphop}','Ewijk','De Groene Heuvels','Gelderland','2026-07-03','2026-07-05','https://downtherabbithole.nl','tickets_live',true),
('11111111-1111-1111-1111-111111111106','pinkpop','Pinkpop',
 'Pinkpop in Landgraaf is het oudste jaarlijkse festival van Nederland en staat al decennia garant voor wereldsterren uit pop en rock op de Megaland-heuvel in Zuid-Limburg.',
 '{pop,rock}','Landgraaf','Megaland','Limburg','2026-06-19','2026-06-21','https://pinkpop.nl','tickets_live',true);

insert into ticket_offers (id, festival_id, provider, price_from, url, availability, last_checked_at) values
('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','official',260.00,'https://lowlands.nl/tickets','limited','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111101','ticketswap',240.00,'https://www.ticketswap.nl/event/lowlands-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111101','gigsberg',254.00,'https://www.gigsberg.com/lowlands-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111102','ticketswap',129.00,'https://www.ticketswap.nl/event/defqon-1-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222205','11111111-1111-1111-1111-111111111103','official',115.00,'https://awakenings.nl/tickets','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222206','11111111-1111-1111-1111-111111111104','official',62.00,'https://mysteryland.nl/tickets','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222207','11111111-1111-1111-1111-111111111105','ticketswap',205.00,'https://www.ticketswap.nl/event/down-the-rabbit-hole-2026','available','2026-07-02T09:00:00Z'),
('22222222-2222-2222-2222-222222222208','11111111-1111-1111-1111-111111111106','official',110.00,'https://pinkpop.nl/tickets','available','2026-07-02T09:00:00Z');

insert into articles (slug, title, excerpt, content, seo_title, seo_description, published_at) values
('is-ticketswap-betrouwbaar','Is TicketSwap betrouwbaar? Zo werkt veilig tickets kopen',
 'TicketSwap is de grootste doorverkoopsite van Nederland. Zo koop je er veilig en herken je risico''s.',
 e'## Wat is TicketSwap?\n\nTicketSwap is een Nederlands platform waar particulieren festivaltickets doorverkopen. De maximale doorverkoopprijs is er begrensd op 120% van de originele prijs.\n\n## Zo blijft het veilig\n\n- **SecureSwap**: bij de meeste festivals wordt het ticket automatisch opnieuw uitgegeven op jouw naam, waardoor het oude ticket ongeldig wordt.\n- **Betaal nooit buiten het platform om.** Oplichters proberen je naar Marktplaats of Tikkie te lokken.\n- **Check de verkoper** en koop alleen tickets met het SecureSwap-label als dat beschikbaar is.\n\n## Wanneer liever officieel kopen?\n\nZolang de officiële verkoop open is en de prijs vergelijkbaar, koop je daar. Doorverkoop is vooral interessant bij uitverkochte festivals of last-minute prijsdalingen.',
 'Is TicketSwap betrouwbaar? Veilig festivaltickets kopen (2026)',
 'Is TicketSwap betrouwbaar? Lees hoe SecureSwap werkt, waar je op moet letten en wanneer je beter officieel kunt kopen.',
 '2026-07-02T08:00:00Z');
```

- [ ] **Stap 3: Pas migratie en seed toe op het Supabase-project**

Als `.env.local` nog niet bestaat: vraag de eigenaar een Supabase-project aan te maken (supabase.com → New project) en noteer URL + service-role key in `.env.local` (kopieer `.env.local.example`).

Toepassen kan op twee manieren:
1. Supabase Dashboard → SQL Editor → plak en run eerst `0001_init.sql`, daarna `seed.sql`; of
2. `psql "<connection string uit dashboard>" -f supabase/migrations/0001_init.sql -f supabase/seed.sql`

Verifieer met deze query in de SQL Editor: `select count(*) from festivals;`
Verwacht: `6`.

- [ ] **Stap 4: Commit**

```bash
git add supabase/ && git commit -m "feat: databaseschema (festivals, ticket_offers, articles, clicks) + seed"
```

---

### Taak 4: Types en Supabase-client

**Files:**
- Create: `src/lib/types.ts`, `src/lib/supabase.ts`

- [ ] **Stap 1: Maak `src/lib/types.ts`**

```ts
export type FestivalStatus = "announced" | "tickets_live" | "sold_out" | "cancelled" | "past";
export type Provider = "official" | "ticketswap" | "gigsberg" | "ticombo";
export type Availability = "available" | "limited" | "sold_out" | "unknown";

export interface Festival {
  id: string;
  slug: string;
  name: string;
  description: string;
  genres: string[];
  lineup: string | null;
  city: string;
  venue: string | null;
  province: string;
  country: string;
  start_date: string; // ISO date, bv. "2026-08-21"
  end_date: string;
  image_url: string | null;
  website_url: string | null;
  status: FestivalStatus;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketOffer {
  id: string;
  festival_id: string;
  provider: Provider;
  price_from: number | null;
  currency: string;
  url: string;
  affiliate_url: string | null;
  availability: Availability;
  last_checked_at: string;
}

export type FestivalWithOffers = Festival & { ticket_offers: TicketOffer[] };

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
}
```

- [ ] **Stap 2: Maak `src/lib/supabase.ts`**

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

- [ ] **Stap 3: Verifieer en commit**

Run: `npm run typecheck`
Verwacht: geen fouten.

```bash
git add src/lib/ && git commit -m "feat: databasetypes en server-side Supabase-client"
```

---

### Taak 5: `format.ts` — datum-, prijs- en aanbieder-weergave (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Stap 1: Schrijf de falende tests in `src/lib/format.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { formatDateRange, formatPrice, formatCheckedDate, minPrice, PROVIDER_LABELS } from "@/lib/format";

describe("formatDateRange", () => {
  it("toont één datum bij een eendaags festival", () => {
    expect(formatDateRange("2026-06-19", "2026-06-19")).toBe("19 juni 2026");
  });
  it("verkort binnen dezelfde maand", () => {
    expect(formatDateRange("2026-08-21", "2026-08-23")).toBe("21–23 augustus 2026");
  });
  it("toont beide maanden bij maandoverschrijding", () => {
    expect(formatDateRange("2026-08-28", "2026-09-01")).toBe("28 augustus – 1 september 2026");
  });
});

describe("formatPrice", () => {
  it("laat hele bedragen zonder decimalen zien", () => {
    expect(formatPrice(240)).toBe("€ 240");
  });
  it("toont centen met komma", () => {
    expect(formatPrice(59.5)).toBe("€ 59,50");
  });
});

describe("formatCheckedDate", () => {
  it("formatteert een ISO-timestamp als Nederlandse datum", () => {
    expect(formatCheckedDate("2026-07-02T09:00:00Z")).toBe("2 juli 2026");
  });
});

describe("minPrice", () => {
  it("kiest de laagste prijs en negeert uitverkochte en prijsloze offers", () => {
    expect(
      minPrice([
        { price_from: 260, availability: "limited" },
        { price_from: 240, availability: "available" },
        { price_from: 100, availability: "sold_out" },
        { price_from: null, availability: "available" },
      ])
    ).toBe(240);
  });
  it("geeft null zonder bruikbare prijzen", () => {
    expect(minPrice([{ price_from: null, availability: "available" }])).toBeNull();
  });
});

describe("PROVIDER_LABELS", () => {
  it("kent alle vier de aanbieders", () => {
    expect(PROVIDER_LABELS.official).toBe("Officiële verkoop");
    expect(PROVIDER_LABELS.ticketswap).toBe("TicketSwap");
    expect(PROVIDER_LABELS.gigsberg).toBe("Gigsberg");
    expect(PROVIDER_LABELS.ticombo).toBe("Ticombo");
  });
});
```

- [ ] **Stap 2: Run de tests — verwacht FAIL**

Run: `npm test`
Verwacht: FAIL met "Cannot find module '@/lib/format'" (of gelijksoortig).

- [ ] **Stap 3: Implementeer `src/lib/format.ts`**

```ts
import type { Availability, Provider } from "./types";

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function parts(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

export function formatDateRange(start: string, end: string): string {
  const s = parts(start);
  const e = parts(end);
  if (start === end) return `${s.day} ${MAANDEN[s.month]} ${s.year}`;
  if (s.month === e.month && s.year === e.year)
    return `${s.day}–${e.day} ${MAANDEN[s.month]} ${s.year}`;
  return `${s.day} ${MAANDEN[s.month]} – ${e.day} ${MAANDEN[e.month]} ${e.year}`;
}

export function formatPrice(amount: number): string {
  const heleEuros = Math.round(amount * 100) % 100 === 0;
  const num = amount.toLocaleString("nl-NL", {
    minimumFractionDigits: heleEuros ? 0 : 2,
    maximumFractionDigits: heleEuros ? 0 : 2,
  });
  return `€ ${num}`;
}

export function formatCheckedDate(iso: string): string {
  const p = parts(iso);
  return `${p.day} ${MAANDEN[p.month]} ${p.year}`;
}

export function minPrice(
  offers: Array<{ price_from: number | null; availability: Availability }>
): number | null {
  const prijzen = offers
    .filter((o) => o.price_from != null && o.availability !== "sold_out")
    .map((o) => Number(o.price_from));
  return prijzen.length ? Math.min(...prijzen) : null;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  official: "Officiële verkoop",
  ticketswap: "TicketSwap",
  gigsberg: "Gigsberg",
  ticombo: "Ticombo",
};

export const PROVIDER_SUB: Record<Provider, string> = {
  official: "via festivalorganisatie",
  ticketswap: "doorverkoop · veilig via SecureSwap",
  gigsberg: "doorverkoop · internationale marktplaats",
  ticombo: "doorverkoop · internationale marktplaats",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Beschikbaar",
  limited: "Bijna uitverkocht",
  sold_out: "Uitverkocht",
  unknown: "Beschikbaarheid onbekend",
};
```

- [ ] **Stap 4: Run de tests — verwacht PASS**

Run: `npm test`
Verwacht: alle tests groen.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: NL datum-, prijs- en aanbieder-formattering (TDD)"
```

---

### Taak 6: `months.ts` — agenda-maandslugs (TDD)

**Files:**
- Create: `src/lib/months.ts`
- Test: `src/lib/months.test.ts`

- [ ] **Stap 1: Schrijf de falende tests in `src/lib/months.test.ts`**

```ts
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
```

- [ ] **Stap 2: Run de tests — verwacht FAIL**

Run: `npm test`
Verwacht: FAIL op ontbrekende module `@/lib/months`.

- [ ] **Stap 3: Implementeer `src/lib/months.ts`**

```ts
const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function monthSlug(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  return `${MAANDEN[month - 1]}-${year}`;
}

export function parseMonthSlug(slug: string): { year: number; month: number } | null {
  const m = slug.match(/^([a-z]+)-(\d{4})$/);
  if (!m) return null;
  const month = MAANDEN.indexOf(m[1]);
  if (month === -1) return null;
  return { year: Number(m[2]), month };
}

export function monthLabel(slug: string): string | null {
  const parsed = parseMonthSlug(slug);
  return parsed ? `${MAANDEN[parsed.month]} ${parsed.year}` : null;
}

export function monthsWithFestivals(festivals: Array<{ start_date: string }>): string[] {
  const keys = new Set(festivals.map((f) => f.start_date.slice(0, 7))); // "2026-08"
  return [...keys].sort().map((k) => monthSlug(`${k}-01`));
}
```

- [ ] **Stap 4: Run de tests — verwacht PASS**

Run: `npm test`

- [ ] **Stap 5: Commit**

```bash
git add src/lib/months.ts src/lib/months.test.ts
git commit -m "feat: maandslug-helpers voor agendapagina's (TDD)"
```

---

### Taak 7: `queries.ts` — dataleeslaag

**Files:**
- Create: `src/lib/queries.ts`

Dunne wrappers om Supabase; logica die te testen valt zit in `format.ts`/`months.ts` (al getest). Fouten uit Supabase worden gegooid — pagina's vangen ze niet af (ISR serveert dan de vorige versie, conform spec).

- [ ] **Stap 1: Maak `src/lib/queries.ts`**

```ts
import { supabase } from "./supabase";
import type { Article, FestivalWithOffers, TicketOffer } from "./types";

const FESTIVAL_SELECT = "*, ticket_offers(*)";

export async function getPublishedFestivals(): Promise<FestivalWithOffers[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("published", true)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FestivalWithOffers[];
}

export async function getUpcomingFestivals(limit?: number): Promise<FestivalWithOffers[]> {
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("published", true)
    .gte("end_date", today)
    .order("start_date", { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FestivalWithOffers[];
}

export async function getFestivalBySlug(slug: string): Promise<FestivalWithOffers | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data as FestivalWithOffers | null;
}

export async function getPublishedArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return data as Article | null;
}

export async function getOfferById(id: string): Promise<TicketOffer | null> {
  const { data, error } = await supabase
    .from("ticket_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as TicketOffer | null;
}

export async function logClick(offerId: string, referer: string | null): Promise<void> {
  const { error } = await supabase.from("clicks").insert({ offer_id: offerId, referer });
  if (error) throw error;
}
```

- [ ] **Stap 2: Verifieer en commit**

Run: `npm run typecheck`
Verwacht: geen fouten.

```bash
git add src/lib/queries.ts && git commit -m "feat: dataleeslaag op Supabase"
```

---

### Taak 8: `faq.ts` en `schema-org.ts` (TDD)

**Files:**
- Create: `src/lib/faq.ts`, `src/lib/schema-org.ts`
- Test: `src/lib/faq.test.ts`, `src/lib/schema-org.test.ts`

- [ ] **Stap 1: Schrijf de falende tests**

`src/lib/faq.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildFaq } from "@/lib/faq";
import type { Festival, TicketOffer } from "@/lib/types";

const festival = {
  name: "Lowlands", city: "Biddinghuizen", venue: "Evenemententerrein Walibi Holland",
  province: "Flevoland", start_date: "2026-08-21", end_date: "2026-08-23",
  status: "tickets_live",
} as Festival;

const offers = [
  { provider: "ticketswap", price_from: 240, availability: "available" },
  { provider: "official", price_from: 260, availability: "limited" },
] as TicketOffer[];

describe("buildFaq", () => {
  it("bouwt vragen over datum, locatie, prijs en status", () => {
    const faq = buildFaq(festival, offers);
    expect(faq.map((f) => f.question)).toEqual([
      "Wanneer is Lowlands 2026?",
      "Waar is Lowlands?",
      "Wat kost een ticket voor Lowlands?",
      "Is Lowlands uitverkocht?",
    ]);
    expect(faq[0].answer).toContain("21–23 augustus 2026");
    expect(faq[1].answer).toContain("Biddinghuizen");
    expect(faq[2].answer).toContain("€ 240");
    expect(faq[2].answer).toContain("TicketSwap");
    expect(faq[3].answer).toContain("niet uitverkocht");
  });

  it("laat de prijsvraag weg zonder bruikbare prijs", () => {
    const faq = buildFaq(festival, []);
    expect(faq.map((f) => f.question)).not.toContain("Wat kost een ticket voor Lowlands?");
  });

  it("meldt uitverkocht bij status sold_out", () => {
    const faq = buildFaq({ ...festival, status: "sold_out" }, offers);
    expect(faq.at(-1)!.answer).toContain("officieel uitverkocht");
  });
});
```

`src/lib/schema-org.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildEventSchema, buildFaqSchema, buildBreadcrumbSchema } from "@/lib/schema-org";
import type { Festival, TicketOffer } from "@/lib/types";

const festival = {
  name: "Lowlands", description: "Drie dagen muziek.", city: "Biddinghuizen",
  venue: "Walibi", province: "Flevoland", country: "NL",
  start_date: "2026-08-21", end_date: "2026-08-23", status: "tickets_live",
  image_url: null,
} as Festival;

const offers = [
  { id: "abc", price_from: 240, currency: "EUR", availability: "available" },
  { id: "def", price_from: null, currency: "EUR", availability: "unknown" },
] as TicketOffer[];

describe("buildEventSchema", () => {
  it("bouwt een Festival-event met offers via /uit/", () => {
    const s = buildEventSchema(festival, offers, "https://festivaldiscounter.nl");
    expect(s["@type"]).toBe("Festival");
    expect(s.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(s.offers).toHaveLength(1); // prijsloze offer weggelaten
    expect(s.offers[0].url).toBe("https://festivaldiscounter.nl/uit/abc");
  });
  it("markeert afgelaste festivals", () => {
    const s = buildEventSchema({ ...festival, status: "cancelled" }, [], "https://x.nl");
    expect(s.eventStatus).toBe("https://schema.org/EventCancelled");
  });
});

describe("buildFaqSchema", () => {
  it("bouwt een FAQPage", () => {
    const s = buildFaqSchema([{ question: "V?", answer: "A." }]);
    expect(s["@type"]).toBe("FAQPage");
    expect(s.mainEntity[0].acceptedAnswer.text).toBe("A.");
  });
});

describe("buildBreadcrumbSchema", () => {
  it("nummert de kruimels vanaf 1", () => {
    const s = buildBreadcrumbSchema("https://x.nl", [
      { name: "Festivals", path: "/festivals" },
      { name: "Lowlands", path: "/festivals/lowlands" },
    ]);
    expect(s.itemListElement[1].position).toBe(2);
    expect(s.itemListElement[1].item).toBe("https://x.nl/festivals/lowlands");
  });
});
```

- [ ] **Stap 2: Run de tests — verwacht FAIL**

Run: `npm test`
Verwacht: FAIL op ontbrekende modules.

- [ ] **Stap 3: Implementeer `src/lib/faq.ts`**

```ts
import type { Festival, TicketOffer } from "./types";
import { formatDateRange, formatPrice, minPrice, PROVIDER_LABELS } from "./format";

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaq(festival: Festival, offers: TicketOffer[]): FaqItem[] {
  const jaar = festival.start_date.slice(0, 4);
  const items: FaqItem[] = [];

  items.push({
    question: `Wanneer is ${festival.name} ${jaar}?`,
    answer: `${festival.name} vindt plaats op ${formatDateRange(festival.start_date, festival.end_date)}.`,
  });

  items.push({
    question: `Waar is ${festival.name}?`,
    answer: `${festival.name} vindt plaats in ${festival.city} (${festival.province})${
      festival.venue ? `, op ${festival.venue}` : ""
    }.`,
  });

  const laagste = minPrice(offers);
  if (laagste != null) {
    const goedkoopste = offers
      .filter((o) => o.price_from != null && o.availability !== "sold_out")
      .sort((a, b) => Number(a.price_from) - Number(b.price_from))[0];
    items.push({
      question: `Wat kost een ticket voor ${festival.name}?`,
      answer: `Tickets voor ${festival.name} zijn er op dit moment vanaf ${formatPrice(laagste)} bij ${
        PROVIDER_LABELS[goedkoopste.provider]
      }. Prijzen wisselen; vergelijk altijd de actuele aanbieders.`,
    });
  }

  items.push({
    question: `Is ${festival.name} uitverkocht?`,
    answer:
      festival.status === "sold_out"
        ? `Ja, ${festival.name} is officieel uitverkocht. Via doorverkoopplatforms zoals TicketSwap komen vaak nog tickets beschikbaar.`
        : `Nee, ${festival.name} is niet uitverkocht. Vergelijk de aanbieders hierboven voor de beste prijs.`,
  });

  return items;
}
```

- [ ] **Stap 4: Implementeer `src/lib/schema-org.ts`**

```ts
import type { Festival, TicketOffer } from "./types";
import type { FaqItem } from "./faq";

export function buildEventSchema(festival: Festival, offers: TicketOffer[], base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Festival" as const,
    name: festival.name,
    description: festival.description,
    startDate: festival.start_date,
    endDate: festival.end_date,
    eventStatus:
      festival.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    ...(festival.image_url ? { image: festival.image_url } : {}),
    location: {
      "@type": "Place",
      name: festival.venue ?? festival.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: festival.city,
        addressRegion: festival.province,
        addressCountry: festival.country,
      },
    },
    offers: offers
      .filter((o) => o.price_from != null)
      .map((o) => ({
        "@type": "Offer" as const,
        price: Number(o.price_from),
        priceCurrency: o.currency,
        url: `${base}/uit/${o.id}`,
        availability:
          o.availability === "sold_out"
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
      })),
  };
}

export function buildFaqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage" as const,
    mainEntity: items.map((i) => ({
      "@type": "Question" as const,
      name: i.question,
      acceptedAnswer: { "@type": "Answer" as const, text: i.answer },
    })),
  };
}

export function buildBreadcrumbSchema(base: string, crumbs: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList" as const,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}
```

- [ ] **Stap 5: Run de tests — verwacht PASS, en commit**

Run: `npm test`
Verwacht: alle tests groen.

```bash
git add src/lib/faq.ts src/lib/faq.test.ts src/lib/schema-org.ts src/lib/schema-org.test.ts
git commit -m "feat: FAQ-generator en schema.org-builders (TDD)"
```

---

### Taak 9: Componenten — JsonLd, FestivalCard, TicketComparator

**Files:**
- Create: `src/components/JsonLd.tsx`, `src/components/FestivalCard.tsx`, `src/components/TicketComparator.tsx`

- [ ] **Stap 1: Maak `src/components/JsonLd.tsx`**

```tsx
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Stap 2: Maak `src/components/FestivalCard.tsx`**

```tsx
import Link from "next/link";
import type { FestivalWithOffers } from "@/lib/types";
import { formatDateRange, formatPrice, minPrice } from "@/lib/format";

export default function FestivalCard({ festival }: { festival: FestivalWithOffers }) {
  const prijs = minPrice(festival.ticket_offers);
  return (
    <Link
      href={`/festivals/${festival.slug}`}
      className="group block overflow-hidden rounded border border-line bg-panel transition hover:-translate-y-0.5 hover:border-accent-deep"
    >
      <div className="relative h-36 bg-gradient-to-br from-accent-deep to-accent">
        {festival.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={festival.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-ground/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          {formatDateRange(festival.start_date, festival.end_date)}
        </span>
        {festival.status === "sold_out" && (
          <span className="absolute right-3 top-3 rounded-sm bg-ground/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-warn">
            Uitverkocht
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="display text-xl">{festival.name}</h3>
        <p className="text-sm text-mut">{festival.city} · {festival.province}</p>
        <div className="mt-3 flex items-baseline justify-between">
          {prijs != null ? (
            <span className="font-bold text-accent">
              <span className="mr-1 text-xs font-medium text-mut">vanaf</span>
              {formatPrice(prijs)}
            </span>
          ) : (
            <span className="text-sm text-mut">Bekijk aanbieders</span>
          )}
          <span className="text-sm font-semibold group-hover:underline">Vergelijk →</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Stap 3: Maak `src/components/TicketComparator.tsx`**

Vergelijker met de vertrouwenselementen uit de spec: "Laagste prijs"-badge, peildatum, disclaimer. Uitverkochte festivals tonen doorverkoop bovenaan.

```tsx
import type { FestivalWithOffers, TicketOffer } from "@/lib/types";
import {
  AVAILABILITY_LABELS, PROVIDER_LABELS, PROVIDER_SUB,
  formatCheckedDate, formatPrice, minPrice,
} from "@/lib/format";

function sortOffers(offers: TicketOffer[], soldOutFestival: boolean): TicketOffer[] {
  return [...offers].sort((a, b) => {
    if (soldOutFestival) {
      // doorverkoop eerst bij uitverkochte festivals
      const aResale = a.provider === "official" ? 1 : 0;
      const bResale = b.provider === "official" ? 1 : 0;
      if (aResale !== bResale) return aResale - bResale;
    }
    const ap = a.price_from == null || a.availability === "sold_out" ? Infinity : Number(a.price_from);
    const bp = b.price_from == null || b.availability === "sold_out" ? Infinity : Number(b.price_from);
    return ap - bp;
  });
}

export default function TicketComparator({ festival }: { festival: FestivalWithOffers }) {
  const offers = sortOffers(festival.ticket_offers, festival.status === "sold_out");
  const laagste = minPrice(offers);
  const peildatum = offers.length
    ? formatCheckedDate(
        offers.map((o) => o.last_checked_at).sort().at(-1)!
      )
    : null;

  return (
    <section aria-labelledby="tickets-heading" className="rounded border border-line bg-panel p-6">
      <h2 id="tickets-heading" className="display text-2xl">Ticketprijzen</h2>
      {peildatum && <p className="mb-4 mt-1 text-sm text-mut">Prijzen gecheckt op {peildatum}</p>}

      {festival.status === "sold_out" && (
        <p className="mb-4 rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Dit festival is officieel uitverkocht — via doorverkoop komen vaak nog tickets beschikbaar.
        </p>
      )}

      {offers.length === 0 && (
        <p className="text-mut">Nog geen ticketaanbieders bekend voor dit festival.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {offers.map((o) => {
          const isLaagste = laagste != null && o.price_from != null &&
            Number(o.price_from) === laagste && o.availability !== "sold_out";
          return (
            <div
              key={o.id}
              className={`relative grid grid-cols-2 items-center gap-3 rounded border px-4 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr_auto] ${
                isLaagste ? "border-accent bg-accent/5" : "border-line"
              }`}
            >
              {isLaagste && (
                <span className="absolute -top-2.5 left-3 rounded-sm bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ground">
                  Laagste prijs
                </span>
              )}
              <div>
                <p className="font-bold">{PROVIDER_LABELS[o.provider]}</p>
                <p className="text-xs text-mut">{PROVIDER_SUB[o.provider]}</p>
              </div>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  o.availability === "available" ? "text-accent"
                  : o.availability === "sold_out" ? "text-mut" : "text-warn"
                }`}
              >
                {AVAILABILITY_LABELS[o.availability]}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {o.price_from != null ? (
                  <>
                    {formatPrice(Number(o.price_from))}
                    <span className="block text-xs font-medium text-mut">vanaf</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-mut">prijs bij aanbieder</span>
                )}
              </p>
              <a
                href={`/uit/${o.id}`}
                rel="sponsored nofollow"
                className="rounded-sm bg-accent px-5 py-2.5 text-center text-sm font-bold text-ground hover:bg-accent-deep hover:text-ink"
              >
                Bekijk tickets
              </a>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-mut">
        Prijzen kunnen afwijken op de site van de aanbieder. Links kunnen affiliate-links zijn — jij betaalt nooit meer.
      </p>
    </section>
  );
}
```

- [ ] **Stap 4: Verifieer en commit**

Run: `npm run typecheck`
Verwacht: geen fouten.

```bash
git add src/components/ && git commit -m "feat: FestivalCard, TicketComparator en JsonLd-componenten"
```

---

### Taak 10: Homepage

**Files:**
- Modify: `src/app/page.tsx` (volledige vervanging)

Vereist een gevulde `.env.local` (Taak 3) — de build rendert nu tegen de database.

- [ ] **Stap 1: Vervang `src/app/page.tsx`**

```tsx
import Link from "next/link";
import FestivalCard from "@/components/FestivalCard";
import { getUpcomingFestivals } from "@/lib/queries";

export const revalidate = 3600;

export default async function Home() {
  const festivals = await getUpcomingFestivals(6);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 340px at 82% -10%, rgba(96,219,204,.16), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            Dagelijks prijzen gecheckt
          </p>
          <h1 className="display mt-3 max-w-[12ch] text-5xl sm:text-7xl">
            Nooit te veel betalen voor een{" "}
            <em className="bg-gradient-to-r from-accent-deep to-accent bg-clip-text not-italic text-transparent">
              festival.
            </em>
          </h1>
          <p className="mt-4 max-w-xl text-mut">
            Vergelijk ticketprijzen van officiële verkoop én doorverkoop voor alle grote
            Nederlandse festivals — op één plek.
          </p>
          <form action="/festivals" className="mt-8 flex max-w-xl gap-1.5 rounded border border-line bg-panel p-1.5">
            <input
              type="search"
              name="q"
              placeholder="Zoek een festival, stad of genre…"
              aria-label="Zoek een festival"
              className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-ink placeholder:text-mut focus:outline-none"
            />
            <button className="rounded-sm bg-accent px-6 font-bold text-ground">Zoek</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="display text-3xl">Binnenkort</h2>
          <Link href="/festivals" className="text-sm font-semibold text-accent hover:underline">
            Alle festivals →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-12 sm:grid-cols-2">
        <Link href="/goedkope-festivaltickets" className="rounded border border-line bg-panel p-6 transition hover:border-accent-deep">
          <h3 className="display text-2xl">Goedkope festivaltickets</h3>
          <p className="mt-1 text-sm text-mut">De laagste vanaf-prijzen van dit moment, gesorteerd op prijs.</p>
        </Link>
        <Link href="/last-minute-festivals" className="rounded border border-line bg-panel p-6 transition hover:border-accent-deep">
          <h3 className="display text-2xl">Last-minute festivals</h3>
          <p className="mt-1 text-sm text-mut">Festivals die binnen 30 dagen starten — vaak met dalende doorverkoopprijzen.</p>
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Stap 2: Verifieer visueel**

Run: `npm run dev` en open http://localhost:3000
Verwacht: donkere homepage met hero, 6 festivalkaarten uit de seed, twee landingsblokken.

- [ ] **Stap 3: Commit**

```bash
git add src/app/page.tsx && git commit -m "feat: homepage met hero, zoekformulier en festivaloverzicht"
```

---

### Taak 11: Festivaloverzicht met filters

**Files:**
- Create: `src/app/festivals/page.tsx`

- [ ] **Stap 1: Maak `src/app/festivals/page.tsx`**

Filtering gebeurt in JS na één query (≤ enkele honderden rijen — ruim voldoende voor fase 1). Zoekterm matcht naam, stad en genres.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import FestivalCard from "@/components/FestivalCard";
import { getUpcomingFestivals } from "@/lib/queries";
import { monthLabel, monthSlug, monthsWithFestivals } from "@/lib/months";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Alle festivals in Nederland (2026)",
  description:
    "Overzicht van alle grote Nederlandse festivals met data, locaties en de laagste ticketprijzen. Filter op maand, genre of provincie.",
};

interface Search { q?: string; maand?: string; genre?: string; provincie?: string }

export default async function FestivalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q, maand, genre, provincie } = await searchParams;
  const alle = await getUpcomingFestivals();

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

  const filterLink = (patch: Partial<Search>) => {
    const params = new URLSearchParams();
    const merged = { q, maand, genre, provincie, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/festivals?${qs}` : "/festivals";
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Alle festivals</h1>
      <p className="mt-2 text-mut">
        {festivals.length} {festivals.length === 1 ? "festival" : "festivals"} gevonden
        {term ? ` voor “${q}”` : ""}.
      </p>

      <div className="mt-6 flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Maand</span>
          <Link href={filterLink({ maand: undefined })} className={!maand ? "font-bold text-accent" : "text-mut hover:text-ink"}>Alle</Link>
          {maanden.map((m) => (
            <Link key={m} href={filterLink({ maand: m })} className={maand === m ? "font-bold text-accent" : "text-mut hover:text-ink"}>
              {monthLabel(m)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Genre</span>
          <Link href={filterLink({ genre: undefined })} className={!genre ? "font-bold text-accent" : "text-mut hover:text-ink"}>Alle</Link>
          {genres.map((g) => (
            <Link key={g} href={filterLink({ genre: g })} className={genre === g ? "font-bold text-accent" : "text-mut hover:text-ink"}>{g}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Provincie</span>
          <Link href={filterLink({ provincie: undefined })} className={!provincie ? "font-bold text-accent" : "text-mut hover:text-ink"}>Alle</Link>
          {provincies.map((p) => (
            <Link key={p} href={filterLink({ provincie: p })} className={provincie === p ? "font-bold text-accent" : "text-mut hover:text-ink"}>{p}</Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
      </div>
      {festivals.length === 0 && (
        <p className="mt-8 text-mut">
          Geen festivals gevonden. <Link href="/festivals" className="text-accent underline">Wis de filters</Link>.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Stap 2: Verifieer**

Run: `npm run dev`, open http://localhost:3000/festivals?genre=techno
Verwacht: alleen Awakenings zichtbaar; filterregels tonen actieve staat.

- [ ] **Stap 3: Commit**

```bash
git add src/app/festivals/page.tsx && git commit -m "feat: festivaloverzicht met maand-, genre- en provinciefilters"
```

---

### Taak 12: Festival-detailpagina

**Files:**
- Create: `src/app/festivals/[slug]/page.tsx`

- [ ] **Stap 1: Maak `src/app/festivals/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FestivalCard from "@/components/FestivalCard";
import JsonLd from "@/components/JsonLd";
import TicketComparator from "@/components/TicketComparator";
import { buildFaq } from "@/lib/faq";
import { formatDateRange, formatPrice, minPrice } from "@/lib/format";
import { getFestivalBySlug, getPublishedFestivals, getUpcomingFestivals } from "@/lib/queries";
import { buildBreadcrumbSchema, buildEventSchema, buildFaqSchema } from "@/lib/schema-org";

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  const festivals = await getPublishedFestivals();
  return festivals.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  if (!festival) return {};
  const jaar = festival.start_date.slice(0, 4);
  const prijs = minPrice(festival.ticket_offers);
  return {
    title: `${festival.name} ${jaar} tickets — prijzen vergelijken`,
    description: `${festival.name} ${jaar} in ${festival.city}: ${formatDateRange(
      festival.start_date, festival.end_date
    )}. Vergelijk ticketprijzen${prijs != null ? ` vanaf ${formatPrice(prijs)}` : ""} van officiële verkoop en doorverkoop.`,
    ...(festival.image_url ? { openGraph: { images: [festival.image_url] } } : {}),
  };
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  if (!festival) notFound();

  const faq = buildFaq(festival, festival.ticket_offers);
  const verwant = (await getUpcomingFestivals())
    .filter((f) => f.id !== festival.id &&
      (f.province === festival.province || f.genres.some((g) => festival.genres.includes(g))))
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <JsonLd data={buildEventSchema(festival, festival.ticket_offers, BASE)} />
      <JsonLd data={buildFaqSchema(faq)} />
      <JsonLd data={buildBreadcrumbSchema(BASE, [
        { name: "Festivals", path: "/festivals" },
        { name: festival.name, path: `/festivals/${festival.slug}` },
      ])} />

      <nav className="text-sm text-mut" aria-label="Kruimelpad">
        <Link href="/festivals" className="hover:text-ink">Festivals</Link>
        <span className="mx-2">/</span>
        <span>{festival.name}</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          {formatDateRange(festival.start_date, festival.end_date)} · {festival.city}, {festival.province}
        </p>
        <h1 className="display mt-2 text-5xl sm:text-6xl">{festival.name}</h1>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="max-w-prose text-ink/90">{festival.description}</p>
          {festival.lineup && (
            <section className="mt-8">
              <h2 className="display text-2xl">Line-up</h2>
              <p className="mt-2 max-w-prose text-mut">{festival.lineup}</p>
            </section>
          )}
          <section className="mt-8">
            <h2 className="display text-2xl">Veelgestelde vragen</h2>
            <dl className="mt-3 flex flex-col gap-4">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-bold">{item.question}</dt>
                  <dd className="mt-1 text-mut">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
          {festival.website_url && (
            <p className="mt-8 text-sm text-mut">
              Officiële website:{" "}
              <a href={festival.website_url} rel="noopener" className="text-accent underline">
                {new URL(festival.website_url).hostname}
              </a>
            </p>
          )}
        </div>
        <div>
          <TicketComparator festival={festival} />
        </div>
      </div>

      {verwant.length > 0 && (
        <section className="mt-14">
          <h2 className="display text-3xl">Vergelijkbare festivals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verwant.map((f) => <FestivalCard key={f.id} festival={f} />)}
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Stap 2: Verifieer**

Run: `npm run dev`, open http://localhost:3000/festivals/lowlands
Verwacht: detailpagina met vergelijker (TicketSwap € 240 met "Laagste prijs"-badge), FAQ en verwante festivals. Bekijk de paginabron: drie `application/ld+json`-blokken aanwezig. Open ook /festivals/bestaat-niet → 404.

- [ ] **Stap 3: Commit**

```bash
git add "src/app/festivals/[slug]/" && git commit -m "feat: festival-detailpagina met vergelijker, FAQ en structured data"
```

---

### Taak 13: Redirect-route `/uit/[offerId]` met klik-log (TDD)

**Files:**
- Create: `src/app/uit/[offerId]/route.ts`
- Test: `src/app/uit/[offerId]/route.test.ts`

- [ ] **Stap 1: Schrijf de falende tests in `src/app/uit/[offerId]/route.test.ts`**

```ts
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
    expect(res.headers.get("location")).toBe("https://a.nl/t");
  });

  it("logt de klik met referer", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    await GET(makeRequest("http://localhost:3000/festivals/lowlands"), params("1"));
    expect(logClick).toHaveBeenCalledWith("1", "http://localhost:3000/festivals/lowlands");
  });

  it("redirect blijft werken als het loggen faalt", async () => {
    getOfferById.mockResolvedValue({ id: "1", url: "https://a.nl/t", affiliate_url: null });
    logClick.mockRejectedValue(new Error("db down"));
    const res = await GET(makeRequest(), params("1"));
    expect(res.headers.get("location")).toBe("https://a.nl/t");
  });

  it("stuurt onbekende ids naar de homepage", async () => {
    getOfferById.mockResolvedValue(null);
    const res = await GET(makeRequest(), params("bestaat-niet"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("stuurt naar de homepage als de databasequery faalt", async () => {
    getOfferById.mockRejectedValue(new Error("db down"));
    const res = await GET(makeRequest(), params("1"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });
});
```

- [ ] **Stap 2: Run de tests — verwacht FAIL**

Run: `npm test`
Verwacht: FAIL — `./route` bestaat nog niet.

- [ ] **Stap 3: Implementeer `src/app/uit/[offerId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getOfferById, logClick } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const offer = await getOfferById(offerId).catch(() => null);
  if (!offer) return NextResponse.redirect(new URL("/", base), 307);

  try {
    await logClick(offer.id, request.headers.get("referer"));
  } catch {
    // klik-logging mag een bezoeker nooit blokkeren (spec: faalt stil)
  }

  return NextResponse.redirect(offer.affiliate_url ?? offer.url, 307);
}
```

- [ ] **Stap 4: Run de tests — verwacht PASS**

Run: `npm test`
Verwacht: alle tests groen.

Let op: `src/lib/supabase.ts` importeert `server-only`, wat in Vitest faalt zodra het via de mock tóch geladen wordt — de `vi.mock("@/lib/queries", …)` voorkomt dat. Faalt de test hierop, controleer dan of de mock bóven de `import { GET }` staat.

- [ ] **Stap 5: Handmatige controle en commit**

Run: `npm run dev`, open http://localhost:3000/uit/22222222-2222-2222-2222-222222222202
Verwacht: redirect naar TicketSwap-URL. Controleer in Supabase (Table Editor → clicks): 1 rij met deze offer_id.

```bash
git add "src/app/uit/" && git commit -m "feat: /uit-redirect met klik-tracking en stille logfout (TDD)"
```

---

### Taak 14: Landingspagina's en agenda

**Files:**
- Create: `src/app/goedkope-festivaltickets/page.tsx`, `src/app/last-minute-festivals/page.tsx`, `src/app/agenda/[maand]/page.tsx`

- [ ] **Stap 1: Maak `src/app/goedkope-festivaltickets/page.tsx`**

```tsx
import type { Metadata } from "next";
import FestivalCard from "@/components/FestivalCard";
import { minPrice } from "@/lib/format";
import { getUpcomingFestivals } from "@/lib/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Goedkope festivaltickets — laagste prijzen van dit moment",
  description:
    "De goedkoopste festivaltickets van Nederland op een rij, gesorteerd op laagste vanaf-prijs. Dagelijks gecheckt bij officiële verkoop en doorverkoop.",
};

export default async function GoedkopeTicketsPage() {
  const festivals = (await getUpcomingFestivals())
    .map((f) => ({ f, prijs: minPrice(f.ticket_offers) }))
    .filter((x): x is { f: (typeof x)["f"]; prijs: number } => x.prijs != null)
    .sort((a, b) => a.prijs - b.prijs);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Goedkope festivaltickets</h1>
      <p className="mt-3 max-w-prose text-mut">
        Hieronder staan alle aankomende festivals gesorteerd op de laagste vanaf-prijs die wij
        bij officiële verkoop en doorverkoop tegenkwamen. Prijzen wisselen dagelijks — klik door
        voor de actuele prijs per aanbieder.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map(({ f }) => <FestivalCard key={f.id} festival={f} />)}
      </div>
    </main>
  );
}
```

- [ ] **Stap 2: Maak `src/app/last-minute-festivals/page.tsx`**

```tsx
import type { Metadata } from "next";
import FestivalCard from "@/components/FestivalCard";
import { getUpcomingFestivals } from "@/lib/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Last-minute festivals — binnen 30 dagen",
  description:
    "Deze festivals starten binnen 30 dagen. Ideaal voor een last-minute festivalweekend — doorverkoopprijzen dalen vaak vlak voor de festivaldatum.",
};

export default async function LastMinutePage() {
  const grens = new Date();
  grens.setDate(grens.getDate() + 30);
  const grensIso = grens.toISOString().slice(0, 10);

  const festivals = (await getUpcomingFestivals()).filter((f) => f.start_date <= grensIso);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Last-minute festivals</h1>
      <p className="mt-3 max-w-prose text-mut">
        Deze festivals starten binnen 30 dagen. Juist vlak voor de festivaldatum dalen
        doorverkoopprijzen vaak — vergelijk dus altijd even alle aanbieders.
      </p>
      {festivals.length === 0 ? (
        <p className="mt-8 text-mut">Geen festivals binnen 30 dagen — kijk in de agenda voor wat eraan komt.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Stap 3: Maak `src/app/agenda/[maand]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FestivalCard from "@/components/FestivalCard";
import { monthLabel, monthSlug, monthsWithFestivals, parseMonthSlug } from "@/lib/months";
import { getPublishedFestivals } from "@/lib/queries";

export const revalidate = 3600;

export async function generateStaticParams() {
  const festivals = await getPublishedFestivals();
  return monthsWithFestivals(festivals).map((maand) => ({ maand }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ maand: string }>;
}): Promise<Metadata> {
  const { maand } = await params;
  const label = monthLabel(maand);
  if (!label) return {};
  return {
    title: `Festivals in ${label} — data en ticketprijzen`,
    description: `Welke festivals zijn er in ${label}? Alle Nederlandse festivals in ${label} met data, locaties en de laagste ticketprijzen.`,
  };
}

export default async function AgendaMaandPage({
  params,
}: {
  params: Promise<{ maand: string }>;
}) {
  const { maand } = await params;
  if (!parseMonthSlug(maand)) notFound();

  const festivals = (await getPublishedFestivals()).filter(
    (f) => monthSlug(f.start_date) === maand
  );
  if (festivals.length === 0) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Festivals in {monthLabel(maand)}</h1>
      <p className="mt-2 text-mut">{festivals.length} {festivals.length === 1 ? "festival" : "festivals"} deze maand.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
      </div>
    </main>
  );
}
```

- [ ] **Stap 4: Verifieer en commit**

Run: `npm run dev`; controleer /goedkope-festivaltickets (Mysteryland € 62 eerst), /last-minute-festivals en /agenda/augustus-2026 (Lowlands + Mysteryland) en /agenda/januari-2030 → 404.

```bash
git add src/app/goedkope-festivaltickets src/app/last-minute-festivals src/app/agenda
git commit -m "feat: SEO-landingspagina's en maandagenda"
```

---

### Taak 15: Gids, statische pagina's en 404

**Files:**
- Create: `src/app/gids/page.tsx`, `src/app/gids/[slug]/page.tsx`, `src/app/over/page.tsx`, `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/not-found.tsx`

- [ ] **Stap 1: Maak `src/app/gids/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/queries";
import { formatCheckedDate } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Festivalgids — koopgidsen en tips",
  description:
    "Praktische gidsen over festivaltickets: veilig doorverkoop kopen, prijzen vergelijken en slim je festivalweekend plannen.",
};

export default async function GidsPage() {
  const artikelen = await getPublishedArticles();
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Festivalgids</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artikelen.map((a) => (
          <Link key={a.id} href={`/gids/${a.slug}`} className="rounded border border-line bg-panel p-6 transition hover:border-accent-deep">
            <h2 className="display text-xl">{a.title}</h2>
            <p className="mt-2 text-sm text-mut">{a.excerpt}</p>
            {a.published_at && (
              <p className="mt-3 text-xs text-mut">{formatCheckedDate(a.published_at)}</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Stap 2: Maak `src/app/gids/[slug]/page.tsx`**

Markdown wordt gerenderd met `marked`; artikelinhoud komt uit onze eigen database en is vertrouwde invoer.

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import JsonLd from "@/components/JsonLd";
import { getArticleBySlug, getPublishedArticles } from "@/lib/queries";

export const revalidate = 3600;

export async function generateStaticParams() {
  const artikelen = await getPublishedArticles();
  return artikelen.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artikel = await getArticleBySlug(slug);
  if (!artikel) return {};
  return { title: artikel.seo_title || artikel.title, description: artikel.seo_description };
}

export default async function ArtikelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artikel = await getArticleBySlug(slug);
  if (!artikel) notFound();

  const html = await marked.parse(artikel.content);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: artikel.title,
          description: artikel.excerpt,
          ...(artikel.published_at ? { datePublished: artikel.published_at } : {}),
        }}
      />
      <article>
        <h1 className="display max-w-[20ch] text-4xl sm:text-5xl">{artikel.title}</h1>
        <div className="prose-dark mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}
```

- [ ] **Stap 3: Maak de statische pagina's**

`src/app/over/page.tsx`:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Over FestivalDiscounter",
  description: "Wie we zijn, hoe we ticketprijzen vergelijken en hoe we geld verdienen.",
};

export default function OverPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Over FestivalDiscounter</h1>
      <div className="prose-dark mt-6">
        <p>
          FestivalDiscounter.nl vergelijkt ticketprijzen voor Nederlandse festivals. We tonen per
          festival de vanaf-prijzen van de officiële verkoop en van doorverkoopplatforms zoals
          TicketSwap, Gigsberg en Ticombo, met de datum waarop we de prijs voor het laatst checkten.
        </p>
        <h2>Hoe verdienen we geld?</h2>
        <p>
          Sommige links naar aanbieders zijn affiliate-links: koop je via zo&apos;n link een ticket,
          dan ontvangen wij een vergoeding van de aanbieder. Jij betaalt daardoor nooit meer — de
          prijs is exact dezelfde. Vergoedingen hebben geen invloed op de volgorde waarin we
          aanbieders tonen: we sorteren altijd op prijs.
        </p>
        <h2>Onafhankelijk</h2>
        <p>
          We verkopen zelf geen tickets en zijn geen onderdeel van een ticketplatform of
          festivalorganisatie. Klopt er iets niet aan een prijs of festival? Laat het ons weten via
          de contactpagina.
        </p>
      </div>
    </main>
  );
}
```

`src/app/contact/page.tsx`:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Neem contact op met FestivalDiscounter.nl.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Contact</h1>
      <div className="prose-dark mt-6">
        <p>
          Vragen, een foutje gespot in een prijs of festivalinformatie, of samenwerken? Mail ons op{" "}
          <a href="mailto:info@festivaldiscounter.nl">info@festivaldiscounter.nl</a> — we reageren
          doorgaans binnen twee werkdagen.
        </p>
        <p>
          Ben je festivalorganisator en klopt er iets niet aan jouw festivalpagina? Mail ons en we
          passen het snel aan.
        </p>
      </div>
    </main>
  );
}
```

`src/app/privacy/page.tsx`:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description: "Hoe FestivalDiscounter.nl omgaat met je gegevens.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Privacyverklaring</h1>
      <div className="prose-dark mt-6">
        <p>FestivalDiscounter.nl is zuinig op je gegevens. Dit is wat we wél en niet verzamelen.</p>
        <h2>Geen cookies, anonieme statistieken</h2>
        <p>
          We gebruiken Plausible Analytics: privacyvriendelijke, cookieloze bezoekersstatistieken
          waarbij geen persoonsgegevens of IP-adressen worden opgeslagen. Daarom zie je bij ons ook
          geen cookiebanner.
        </p>
        <h2>Kliks op ticketlinks</h2>
        <p>
          Klik je op &quot;Bekijk tickets&quot;, dan registreren we anoniem dát er op die aanbieder
          is geklikt en vanaf welke pagina. We slaan hierbij geen IP-adres of andere
          persoonsgegevens op.
        </p>
        <h2>Affiliate-links</h2>
        <p>
          Links naar ticketaanbieders kunnen affiliate-links zijn. De aanbieder kan daarbij zelf
          cookies plaatsen op zíjn website; daarop is het privacybeleid van die aanbieder van
          toepassing.
        </p>
        <h2>Contact</h2>
        <p>
          Vragen over privacy? Mail{" "}
          <a href="mailto:info@festivaldiscounter.nl">info@festivaldiscounter.nl</a>.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Stap 4: Maak `src/app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-24 text-center">
      <h1 className="display text-5xl">Pagina niet gevonden</h1>
      <p className="mx-auto mt-4 max-w-md text-mut">
        Deze pagina bestaat niet (meer). Zoek een festival of bekijk het volledige overzicht.
      </p>
      <form action="/festivals" className="mx-auto mt-8 flex max-w-md gap-1.5 rounded border border-line bg-panel p-1.5">
        <input
          type="search"
          name="q"
          placeholder="Zoek een festival…"
          aria-label="Zoek een festival"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-ink placeholder:text-mut focus:outline-none"
        />
        <button className="rounded-sm bg-accent px-6 font-bold text-ground">Zoek</button>
      </form>
      <Link href="/festivals" className="mt-6 inline-block font-semibold text-accent hover:underline">
        Alle festivals →
      </Link>
    </main>
  );
}
```

- [ ] **Stap 5: Verifieer en commit**

Run: `npm run dev`; controleer /gids, /gids/is-ticketswap-betrouwbaar (markdown netjes gerenderd in leeskolom), /over, /privacy en een niet-bestaande URL → eigen 404.

```bash
git add src/app/gids src/app/over src/app/contact src/app/privacy src/app/not-found.tsx
git commit -m "feat: gidsartikelen, vertrouwenspagina's en 404"
```

---

### Taak 16: SEO-afronding — sitemap en robots

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`

- [ ] **Stap 1: Maak `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { getPublishedArticles, getPublishedFestivals } from "@/lib/queries";
import { monthsWithFestivals } from "@/lib/months";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const festivals = await getPublishedFestivals();
  const artikelen = await getPublishedArticles();

  const statisch = [
    "", "/festivals", "/goedkope-festivaltickets", "/last-minute-festivals",
    "/gids", "/over", "/contact", "/privacy",
  ].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const }));

  return [
    ...statisch,
    ...festivals.map((f) => ({
      url: `${base}/festivals/${f.slug}`,
      lastModified: f.updated_at,
      changeFrequency: "daily" as const,
    })),
    ...monthsWithFestivals(festivals).map((m) => ({
      url: `${base}/agenda/${m}`,
      changeFrequency: "weekly" as const,
    })),
    ...artikelen.map((a) => ({
      url: `${base}/gids/${a.slug}`,
      ...(a.published_at ? { lastModified: a.published_at } : {}),
      changeFrequency: "monthly" as const,
    })),
  ];
}
```

- [ ] **Stap 2: Maak `src/app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/uit/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Stap 3: Verifieer en commit**

Run: `npm run build && npm run start`, open http://localhost:3000/sitemap.xml en /robots.txt
Verwacht: sitemap bevat homepage, 6 festivalpagina's, agenda-maanden en het gidsartikel; robots.txt blokkeert /uit/.

```bash
git add src/app/sitemap.ts src/app/robots.ts
git commit -m "feat: dynamische sitemap en robots.txt"
```

---

### Taak 17: Smoke-test kernpad

**Files:**
- Create: `scripts/smoke.mjs`

- [ ] **Stap 1: Maak `scripts/smoke.mjs`**

```js
// Smoke-test van het kernpad (spec: homepage → festival → ticketklik → redirect).
// Gebruik: start de site (npm run build && npm run start) en run `npm run smoke`.
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SEED_OFFER = "22222222-2222-2222-2222-222222222202"; // Lowlands · TicketSwap (seed.sql)

let failures = 0;

async function checkPage(path, marker) {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.text();
  const ok = res.status === 200 && body.includes(marker);
  console.log(`${ok ? "PASS" : "FAIL"}  ${path}  (status ${res.status}, marker "${marker}")`);
  if (!ok) failures++;
}

async function checkRedirect(path, expectedPrefix) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  const ok = res.status === 307 && loc.startsWith(expectedPrefix);
  console.log(`${ok ? "PASS" : "FAIL"}  ${path} → ${loc || "(geen location)"} (status ${res.status})`);
  if (!ok) failures++;
}

await checkPage("/", "Nooit te veel betalen");
await checkPage("/festivals", "Lowlands");
await checkPage("/festivals/lowlands", "Laagste prijs");
await checkPage("/festivals/lowlands", "application/ld+json");
await checkPage("/goedkope-festivaltickets", "Mysteryland");
await checkPage("/gids/is-ticketswap-betrouwbaar", "SecureSwap");
await checkPage("/sitemap.xml", "/festivals/lowlands");
await checkRedirect(`/uit/${SEED_OFFER}`, "https://www.ticketswap.nl/");
await checkRedirect("/uit/00000000-0000-0000-0000-000000000000", BASE);

if (failures > 0) {
  console.error(`\n${failures} check(s) gefaald.`);
  process.exit(1);
}
console.log("\nAlle smoke-checks geslaagd.");
```

- [ ] **Stap 2: Run de smoke-test**

```bash
npm run build && (npm run start &) && sleep 3 && npm run smoke; kill %1 2>/dev/null
```
Verwacht: alle regels PASS, exit 0. Controleer daarna in Supabase dat de clicks-tabel precies 1 rij extra heeft (de geldige offer-check; de onbekende id logt niets).

- [ ] **Stap 3: Run alle controles samen en commit**

Run: `npm test && npm run typecheck`
Verwacht: groen.

```bash
git add scripts/smoke.mjs && git commit -m "test: smoke-script voor kernpad en redirects"
```

---

### Taak 18: Deploy en lancering

Geen code — een checklist met exacte stappen. Onderdelen gemarkeerd met **[eigenaar]** vereisen accounts/beslissingen van de eigenaar.

- [ ] **Stap 1: Productie-Supabase controleren**

De migratie en seed uit Taak 3 draaien al op het Supabase-project. Controleer in het dashboard (Table Editor) dat `festivals` 6 rijen heeft en RLS overal aan staat (slotje-icoon per tabel).

- [ ] **Stap 2: [eigenaar] Vercel-project aanmaken**

1. Push de repo naar GitHub (privé is prima): `git remote add origin <repo-url> && git push -u origin main`
2. vercel.com → Add New → Project → importeer de repo (framework: Next.js, geen extra instellingen).
3. Environment variables instellen (Production + Preview):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (uit Supabase dashboard → Settings → API)
   - `NEXT_PUBLIC_SITE_URL=https://festivaldiscounter.nl`
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=festivaldiscounter.nl`
4. Deploy en controleer de preview-URL.

- [ ] **Stap 3: [eigenaar] Domein koppelen**

Vercel → Project → Settings → Domains → voeg `festivaldiscounter.nl` en `www.festivaldiscounter.nl` toe (www → apex redirect). Pas de DNS aan bij de registrar volgens de instructies van Vercel.

- [ ] **Stap 4: [eigenaar] Plausible en Search Console**

1. plausible.io → Add website → `festivaldiscounter.nl`.
2. search.google.com/search-console → Property toevoegen (domein-variant, DNS-verificatie).
3. Dien de sitemap in: `https://festivaldiscounter.nl/sitemap.xml`.

- [ ] **Stap 5: Productie-smoke-test**

Run: `SMOKE_BASE_URL=https://festivaldiscounter.nl npm run smoke`
Verwacht: alle checks PASS. Test daarna handmatig één ticketklik en controleer de nieuwe rij in `clicks`.

- [ ] **Stap 6: [eigenaar] Font-licentie**

Koop de Built Titling-webfontlicentie (fontspring.com, Typodermic), plaats het bestand als `public/fonts/built-titling.woff2`, commit en push. Tot die tijd rendert de fallback (Avenir Next Condensed) — de site is er niet van afhankelijk.

---

### Taak 19: Volledige dataset — ~75 festivals

Contentwerk, geen code. Uitvoerbaar door een AI-researchagent + eigenaarscontrole (conform spec-sectie "Datavulling").

- [ ] **Stap 1: Stel de festivallijst samen**

Onderzoek (websearch) de ~75 grootste Nederlandse festivals met een editie in 2026. Dekking over genres (pop/rock, dance/techno, hardstyle, urban, meerdaags/eendaags) en provincies. Bronnen: festivalagenda's, officiële festivalsites, ticketplatforms.

- [ ] **Stap 2: Genereer `supabase/seed_full.sql`**

Zelfde insert-formaat als `supabase/seed.sql` (Taak 3, Stap 2), met per festival:
- alle festivals-kolommen; `published = false` (eigenaar publiceert na controle);
- unieke beschrijving van 150–400 woorden in eigen woorden (géén tekst van festivalsites kopiëren);
- per festival minimaal één ticket_offer (provider, vanaf-prijs indien bekend, gewone URL, availability, `last_checked_at` = datum van onderzoek).

Validatie vóór import: geen dubbele slugs, alle datums in 2026, elke offer verwijst naar een bestaand festival-id.

- [ ] **Stap 2b: Schrijf 4–9 extra gidsartikelen in hetzelfde bestand**

De spec vraagt 5–10 artikelen bij lancering; de seed bevat er 1. Voeg in `seed_full.sql` inserts toe in het articles-formaat van Taak 3, Stap 2. Onderwerpen (kies er minimaal 4): "Goedkope festivaltickets scoren: 7 bewezen tactieken", "Festival-inpaklijst: dit neem je mee", "Hoe werkt Gigsberg?", "Uitverkocht festival — zo kom je er tóch in", "Eerste keer festivalcamping: wat je moet weten", "Last-minute festivaltickets: wanneer dalen de prijzen?". Elk artikel: 400–800 woorden markdown in `content`, gevulde `excerpt`, `seo_title`, `seo_description` en `published_at`.

- [ ] **Stap 3: Importeer en laat de eigenaar controleren**

1. Run `seed_full.sql` via de Supabase SQL Editor.
2. **[eigenaar]** Controleer per festival naam/datum/prijs in de Table Editor en zet `published = true` per gecontroleerd festival.

- [ ] **Stap 4: Herbouw en verifieer**

Na publicatie: Vercel → Deploys → Redeploy (of wacht op ISR-verversing, max 1 uur). Controleer dat de sitemap alle nieuwe festivalpagina's bevat en dien hem opnieuw in bij Search Console.

```bash
git add supabase/seed_full.sql && git commit -m "feat: volledige festivaldataset 2026 (75 festivals)"
```

---

## Definitie van klaar (uit de spec)

- [ ] Site live op festivaldiscounter.nl (Vercel + Supabase productie)
- [ ] ≥ 75 gepubliceerde festivals met elk ≥ 1 ticketaanbieder
- [ ] 5–10 gepubliceerde gidsartikelen (1 in seed; overige via zelfde articles-insertformaat als Taak 3)
- [ ] Sitemap ingediend in Google Search Console
- [ ] Klik-tracking aantoonbaar werkend (rijen in `clicks` na productie-smoke-test)
- [ ] Structured data gevalideerd met Google Rich Results Test (festivalpagina + artikelpagina)
- [ ] Lighthouse ≥ 90 op Performance en SEO (homepage + festivalpagina)
