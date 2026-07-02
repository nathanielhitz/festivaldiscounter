# FestivalDiscounter.nl — Ontwerp Fase 1 (Fundament)

Datum: 2026-07-02
Status: goedgekeurd in brainstormsessie

## Context & routekaart

FestivalDiscounter.nl wordt een affiliate-platform voor festivaltickets, verblijf en
festivalbenodigdheden. De volledige visie (PRD) omvat scraping, AI-contentgeneratie,
nieuwsbrief en een admin-dashboard. Dat wordt in fases gebouwd; elke fase krijgt een
eigen spec en implementatieplan.

- **Fase 1 — Fundament (deze spec):** publieke site + database, ticketvergelijker met
  handmatige vanaf-prijzen, SEO-basis, klik-tracking. Doel: live en geïndexeerd zijn en
  als portfolio dienen voor affiliate-aanmeldingen.
- **Fase 2 — Automatisering:** prijs-scraper, dagelijkse checks (Vercel Cron),
  uitverkocht-status, eigen admin-dashboard, activeren affiliate-links.
- **Fase 3 — Content-machine:** AI-contentgenerator, nieuwsbrief met prijsalerts.
- **Fase 4 — Schaal:** internationale festivals, meertaligheid, overige PRD-features.

## Besluiten uit de brainstorm

| Onderwerp | Besluit |
|---|---|
| MVP-scope | Site + database eerst; scraping en AI-content in latere fases |
| Affiliates | Nog niets geregeld → fase 1 gebruikt gewone uitgaande links, omzetbaar via databaseveld |
| Markt & taal | Alleen Nederlandse festivals, site volledig Nederlandstalig; datamodel houdt rekening met internationalisering (country-veld) |
| Datavulling | AI-research levert startdataset (~75 festivals 2026); eigenaar controleert vóór publicatie |
| Stack | Slank: Next.js 15 + TypeScript + Tailwind op Vercel, Supabase Postgres, Plausible. Geen Redis, geen edge functions |
| Beheer | Supabase-dashboard; geen eigen admin in fase 1 |
| Vergelijker | Handmatige "vanaf €X"-prijzen met zichtbare peildatum per aanbieder |

## Architectuur

- **Frontend/hosting:** Next.js 15 (App Router), TypeScript, TailwindCSS, gehost op Vercel.
- **Database:** Supabase (PostgreSQL). Alleen de server praat met Supabase (service-role
  key in servercontext); er is geen client-side databasetoegang nodig in fase 1.
- **Rendering:** festival- en overzichtspagina's via statische generatie met ISR
  (revalidate = 3600 s). Artikelpagina's idem. De redirect-route is dynamisch.
- **Analytics:** Plausible (script op alle pagina's) + Google Search Console-verificatie.
- **Huisstijl:** bestaand logo; kopregels in Built Titling; kleuren donkergroen `#021802`
  → teal `#60DBCC` (gradient), zwart `#000000` voor tekst.

## Pagina's & routes

| Route | Inhoud | SEO-elementen |
|---|---|---|
| `/` | Uitgelichte + eerstvolgende festivals, zoekveld, links naar landingspagina's | WebSite schema, meta |
| `/festivals/` | Alle gepubliceerde festivals; filters: maand, genre, provincie (URL-querystring) | ItemList schema |
| `/festivals/[slug]/` | Hero met afbeelding/datum/locatie, beschrijving, line-up (indien gevuld), ticketvergelijker, FAQ-blok (automatisch opgebouwd uit de festivaldata: wanneer, waar, vanaf-prijs, uitverkocht-status), gerelateerde festivals | Event + FAQPage + BreadcrumbList schema |
| `/goedkope-festivaltickets/` | Landingspagina met intro-tekst + festivals gesorteerd op laagste vanaf-prijs | Meta + ItemList |
| `/last-minute-festivals/` | Landingspagina: festivals die binnen 30 dagen starten | Meta + ItemList |
| `/agenda/[maand-jaar]/` | bv. `/agenda/juli-2026/`: festivals in die maand; alleen maanden met ≥1 festival bestaan | Meta + ItemList |
| `/gids/` en `/gids/[slug]/` | 5–10 artikelen bij lancering (koopgidsen, uitleg doorverkoopplatforms, inpaklijst) | Article schema |
| `/uit/[offerId]` | Redirect-route: logt klik, stuurt door naar `affiliate_url` (indien gevuld) anders `url` | `noindex`, geen sitemap |
| `/over/`, `/contact/`, `/privacy/` | Statische vertrouwenspagina's (vereist voor affiliate-goedkeuring en AdSense later) | Meta |
| `sitemap.xml`, `robots.txt` | Automatisch gegenereerd vanuit de database | — |
| 404 | Nette foutpagina met zoekveld en populaire festivals | — |

Alle uitgaande ticketlinks krijgen `rel="sponsored nofollow"` en lopen via `/uit/[offerId]`.

## Datamodel (Supabase/Postgres)

### festivals
| Kolom | Type | Toelichting |
|---|---|---|
| id | uuid PK | |
| slug | text unique | bv. `lowlands` |
| name | text | |
| description | text | 150–400 woorden, uniek per festival |
| genres | text[] | bv. `{hardstyle, techno}` |
| lineup | text nullable | vrij tekstveld met namen; leeg = line-upsectie verborgen |
| city | text | |
| venue | text nullable | terrein/locatienaam |
| province | text | NL-provincie |
| country | text default 'NL' | voor latere internationalisering |
| start_date / end_date | date | eendaags: gelijk |
| image_url | text nullable | fallback-afbeelding als leeg |
| website_url | text nullable | officiële site |
| status | enum | `announced` / `tickets_live` / `sold_out` / `cancelled` / `past` |
| published | boolean default false | alleen `true` verschijnt op de site |
| created_at / updated_at | timestamptz | |

### ticket_offers
| Kolom | Type | Toelichting |
|---|---|---|
| id | uuid PK | |
| festival_id | uuid FK → festivals | |
| provider | enum | `official` / `ticketswap` / `gigsberg` / `ticombo` |
| price_from | numeric nullable | handmatig in fase 1; scraper vult in fase 2 |
| currency | text default 'EUR' | |
| url | text | gewone uitgaande link |
| affiliate_url | text nullable | leeg in fase 1; zodra gevuld gebruikt `/uit/` deze |
| availability | enum | `available` / `limited` / `sold_out` / `unknown` |
| last_checked_at | timestamptz | getoond als peildatum op de site |

### articles
| Kolom | Type |
|---|---|
| id, slug (unique), title, excerpt, content (markdown), cover_image_url (nullable), seo_title, seo_description, published_at (nullable = concept) | |

### clicks
| Kolom | Type | Toelichting |
|---|---|---|
| id | bigint PK | |
| offer_id | uuid FK → ticket_offers | |
| clicked_at | timestamptz default now() | |
| referer | text nullable | interne pagina waarvandaan geklikt |

Row Level Security: alle tabellen dicht voor anonieme toegang; de site leest server-side
met de service-role key. Beheer gebeurt in het Supabase-dashboard.

## Ticketvergelijker (component)

Per festival een blok met één rij per `ticket_offer`:
aanbiedernaam/logo · "vanaf €X" (of "prijs onbekend") · beschikbaarheidslabel ·
"Prijs gecheckt op [datum]" · knop "Bekijk tickets" → `/uit/[offerId]`.
Rijen gesorteerd op prijs (laagste eerst, prijsloos onderaan). Bij status `sold_out`
van het festival toont het blok een uitverkocht-melding met doorverkoop-aanbieders bovenaan.

## Datavulling

1. AI-research stelt een dataset samen van de ~75 grootste Nederlandse festivals van 2026:
   alle festivalvelden + per festival de bekende ticketaanbieders met vanaf-prijs en URL.
2. Levering als importbestand (CSV/SQL seed) + import in Supabase met `published = false`.
3. Eigenaar controleert per festival in het Supabase-dashboard en zet `published = true`.
4. Beschrijvingen zijn uniek geschreven (geen gekopieerde teksten van festivalsites).

## Foutafhandeling

- Onbekende slug → 404 met suggesties.
- `image_url` leeg → standaard fallback-afbeelding in huisstijl.
- Geen ticket_offers of geen prijzen → vergelijker toont linkknoppen zonder prijs;
  pagina blijft functioneel.
- `/uit/[offerId]` met onbekend id → redirect naar homepage; klik-log mag nooit een
  bezoeker blokkeren (logging faalt stil).
- Database onbereikbaar tijdens revalidatie → laatste statische versie blijft staan (ISR-gedrag).

## Testen & kwaliteitscontrole

- Buildcontrole (`next build`) zonder fouten; TypeScript strict.
- Smoke-test van het kernpad: homepage → festivaloverzicht → festivalpagina →
  ticketklik → redirect + klik-log in database.
- Structured data gevalideerd (Google Rich Results Test) voor festival- en artikelpagina.
- Lighthouse ≥ 90 op Performance en SEO voor homepage en een festivalpagina.

## Definitie van "fase 1 klaar"

- Site live op festivaldiscounter.nl (domein + Vercel + Supabase productie).
- ≥ 75 gepubliceerde festivals met elk ≥ 1 ticketaanbieder.
- 5–10 gepubliceerde gidsartikelen.
- Sitemap ingediend in Google Search Console.
- Klik-tracking aantoonbaar werkend.
- Vertrouwenspagina's (over/contact/privacy) aanwezig → klaar om affiliate-aanmeldingen
  (TradeTracker, Awin, Booking.com, Bol.com) in te dienen.

## Bewust buiten scope (fase 1)

Scraper, AI-contentgenerator, nieuwsbrief, eigen admin-dashboard, Redis,
edge functions, meertaligheid, internationale festivals, hotels/producten-secties,
AdSense (pas zinvol bij verkeer), community-features.
