# FestivalDiscounter.nl — Ontwerp Fase 2b (Prijs-scraper & review-wachtrij)

Datum: 2026-07-04
Status: goedgekeurd in brainstormsessie

## Context & positie in de routekaart

Fase 2a (admin-dashboard) is live. Fase 2b is het volgende sub-project uit de
fase-2-routekaart (zie `docs/superpowers/specs/2026-07-04-fase2-admin-dashboard-design.md`):
een automatiserings-pipeline die periodiek prijs- en beschikbaarheidsinformatie
verzamelt, mét een verplichte review-stap in het admin-dashboard vóórdat data
live gaat — geen bot mag ongecontroleerd prijzen live zetten.

## Belangrijke koerswijziging t.o.v. de oorspronkelijke fase-2-omschrijving

De oorspronkelijke aanname was dat de scraper de doorverkoop-marktplaatsen
(TicketSwap, Gigsberg, Ticombo — de waarden van het `ticket_provider`-enum
naast `official`) zou controleren. Onderzoek tijdens de brainstorm wees dit af:

- **TicketSwap:** Trust & Safety Policy verbiedt scripts/bots expliciet, met
  actieve anti-bot-detectie; `robots.txt` blokkeert losse listing-pagina's.
- **Gigsberg:** Terms and Conditions verbieden scraping/exploitatie van
  "Proprietary Data" hard, ondanks een los `robots.txt`.
- **Ticombo:** ToS niet volledig op te halen (bot-bescherming blokkeerde zelfs
  de onderzoeksfetch), vergelijkbaar risico aannemelijk.

Alle drie hebben alleen een affiliate-programma (referral/commissie per klik),
geen data-feed. **Besluit: geen scraper voor deze drie marktplaatsen.** Die
blijven bij de al lopende affiliate-aanvragen (buiten deze spec).

Vervolgens bleek ook de aanname over `official`-aanbieders onjuist: dit zijn
geen paar grote platforms (Ticketmaster/Paylogic/Eventix), maar 72 losse
festival-domeinen (`lowlands.nl`, `awakenings.nl`, `pinkpop.nl`, …), elk met
andere HTML. Een scraper die dit generiek aanpakt is niet haalbaar; per-festival
configuratie is de enige begaanbare weg, en dus is de scope beperkt tot een
**curated set** i.p.v. alle festivals.

## Besluiten uit de brainstorm

| Onderwerp | Besluit |
|---|---|
| Wat wordt gescraped | Alleen `official`-aanbieders (eigen festivalsite); géén TicketSwap/Gigsberg/Ticombo (ToS-verbod) |
| Scope | Curated set van ~10 grote/bekende festivals, config per festival in code |
| Nieuwe aanbieders zoeken | Nee — alleen bestaande `ticket_offers`-rijen verversen, geen automatische discovery |
| Review-strengheid | Alles moet handmatig goedgekeurd worden vóór het live gaat; geen automatische drempel |
| Mislukte scrapes | Stil overslaan (geen wijziging), apart "mislukt"-overzicht in admin — niet in de review-wachtrij |
| Notificaties | Geen (geen e-mail/Slack); eigenaar checkt zelf periodiek in `/admin/scrapers` |
| Frequentie | Dagelijks, via Vercel Cron |

## Data-model

Nieuwe tabel, naar het append-only-patroon van de bestaande `clicks`-tabel:

```sql
create type price_check_status as enum ('pending', 'approved', 'rejected', 'failed');

create table price_checks (
  id uuid primary key default gen_random_uuid(),
  ticket_offer_id uuid not null references ticket_offers(id) on delete cascade,
  status price_check_status not null default 'pending',
  scraped_price numeric(8,2),
  scraped_availability ticket_availability,
  failure_reason text,
  checked_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index price_checks_offer_idx on price_checks (ticket_offer_id);
create index price_checks_status_idx on price_checks (status);

alter table price_checks enable row level security;
-- geen policies: zelfde patroon als de andere tabellen, alleen service-role leest/schrijft.
```

- Elke cron-run schrijft precies één `price_checks`-rij per gescrapete
  `ticket_offer`: `pending` (iets gevonden) of `failed` (niets gevonden /
  netwerkfout, met `failure_reason`).
- **Goedkeuren** (server action) schrijft `scraped_price` → `ticket_offers.price_from`
  en `scraped_availability` → `ticket_offers.availability` (plus
  `last_checked_at = now()`), zet `price_checks.status = 'approved'`,
  `reviewed_at`/`reviewed_by`, en triggert `revalidateTag("festivals")`.
- **Afkeuren** zet alleen `status = 'rejected'` + `reviewed_at`/`reviewed_by`;
  geen wijziging aan `ticket_offers`.
- Bestaande `ticket_offers.last_checked_at` en `.availability` blijven ongewijzigd
  totdat een `price_checks`-rij is goedgekeurd — de publieke site verandert nooit
  automatisch.

## Scraper-mechanica

- **Config in code**, niet in de database — `src/lib/scraper/config.ts`, één
  entry per curated festival:

  ```ts
  type ScraperConfig = {
    festivalSlug: string;
    ticketOfferId: string;
    priceSelector: string;
    soldOutKeywords: string[];
  };
  ```

  Onderhoud is developer-werk (net als `scripts/fetch-festival-images.mjs`),
  niet via de admin-UI — bewust, want dit vereist het inspecteren van elke
  festivalsite.
- **Curated set:** ~10 grote/bekende festivals (bv. Lowlands, Pinkpop, Awakenings,
  Dekmantel, DGTL, Dance Valley, Zwarte Cross, Best Kept Secret, Into the Great
  Wide Open) — exacte lijst en selectors worden tijdens implementatie per site
  bepaald.
- **Nieuwe dependency:** `cheerio` (server-side HTML-parser; geen browser/JS-rendering
  nodig, in lijn met eerdere ervaring dat JS-gerenderde sites toch niet werken
  met simpele fetch — zie de 0-treffers bij `fetch-festival-images` voor
  JS-gerenderde sites).
- **Per festival, per cron-run:**
  1. `fetch(url, { signal: AbortSignal.timeout(10_000) })` met duidelijke
     User-Agent (`FestivalDiscounter-PriceCheck/1.0 (+https://festivaldiscounter.nl)`).
  2. `priceSelector` toepassen met cheerio, getal parsen (NL-notatie, bv. `€ 89,00`).
     Niets gevonden of parse-fout → `failed` met reden.
  3. Sold-out: zoek `soldOutKeywords` (case-insensitive) in de pagina-tekst →
     `scraped_availability = 'sold_out'`, anders `'available'`.
  4. Elke festival-scrape in eigen try/catch — één kapotte site blokkeert de
     andere niet.
  5. Kleine vertraging (~2s) tussen requests — netjes richting de festivalsites,
     bij ~10 festivals per dag geen enkel probleem.

## Cron

- `vercel.json`: dagelijkse cron-job (05:00 UTC) naar `GET /api/cron/scrape-prices`.
- Route verifieert `Authorization: Bearer $CRON_SECRET` (Vercel's standaard
  cron-header) → 401 bij ontbreken/mismatch. Nieuwe env-var `CRON_SECRET`
  (lokaal + Vercel), zelfde patroon als `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`.
- Route loopt over `config.ts`, scraped elke entry, schrijft één `price_checks`-rij.
  Geen `revalidatePath` hier — dat gebeurt pas bij goedkeuren.

## Admin-UI

Nieuwe pagina `/admin/scrapers` (in de bestaande `(dashboard)`-route-group,
naast `/admin/festivals` en `/admin/review`):

- **Sectie "Te reviewen":** alle `price_checks` met `status = 'pending'`,
  gesorteerd op `checked_at` (nieuwste eerst). Per rij: festivalnaam, huidige
  vs. gescrapete prijs, huidige vs. gescrapete beschikbaarheid, knoppen
  **Goedkeuren** / **Afkeuren**.
- **Sectie "Mislukt":** per `ticket_offer` de laatste `failed`-poging, maar
  alléén als die recenter is dan de laatste succesvolle scrape van diezelfde
  offer — festivalnaam, `failure_reason`, link naar de site.
- Server actions (`approvePriceCheck`, `rejectPriceCheck`) in
  `src/lib/admin/scraper-actions.ts`, elk beginnend met `requireAdmin()` —
  zelfde harde beveiligingsgrens als de rest van de admin.
- Zelfde functionele, donkere huisstijl als de rest van `/admin`; geen nieuw
  designsysteem.

## Foutafhandeling

- Netwerkfouten, timeouts (10s) en lege selectors resulteren allemaal in een
  `failed`-rij met een leesbare `failure_reason` — nooit een crash van de
  hele cron-run.
- Eén festival-fout beïnvloedt de andere festivals in dezelfde run niet
  (try/catch per festival).
- Cron-route zonder/met foute `CRON_SECRET` → 401, geen scrape.
- Goedkeuren/afkeuren zonder geldige admin-sessie → geweigerd door `requireAdmin()`.

## Tests

Bestaande Vitest-opzet, zelfde stijl als fase 2a (pure logica getest, geen
live netwerkcalls in CI):

- Unit-tests voor prijs-extractie en sold-out-keyword-detectie met vaste
  HTML-fixtures (cheerio tegen statische strings, geen echte fetch).
- Unit-tests voor `approvePriceCheck`/`rejectPriceCheck`: schrijft correct naar
  `ticket_offers` bij approve, laat `ticket_offers` ongewijzigd bij reject,
  weigert zonder geldige sessie.
- Geen end-to-end test die echte festivalsites benadert (te fragiel/traag voor CI).

## Bewust buiten scope (fase 2b)

Scraping van TicketSwap/Gigsberg/Ticombo (ToS-verbod), automatische discovery
van nieuwe aanbieders, uitbreiding van de curated set voorbij ~10 festivals,
e-mail/Slack-notificaties bij nieuwe review-items, automatische goedkeuring
(ook niet voor kleine prijswijzigingen).

## Definition of done

- Dagelijkse Vercel Cron scraped de curated set en logt resultaten in
  `price_checks` zonder de publieke site te raken.
- `/admin/scrapers` toont een werkende "Te reviewen"- en "Mislukt"-sectie;
  goedkeuren werkt door naar `ticket_offers` + revalidate, afkeuren laat de
  live data ongewijzigd.
- Eén kapotte festivalsite of netwerkfout breekt de rest van de cron-run niet.
- Cron-endpoint is afgeschermd met `CRON_SECRET`; admin-acties blijven achter
  `requireAdmin()`.
- Tests groen (parse-logica + approve/reject-acties); typecheck, lint en build
  slagen; productie-smoke-test blijft 9/9.
