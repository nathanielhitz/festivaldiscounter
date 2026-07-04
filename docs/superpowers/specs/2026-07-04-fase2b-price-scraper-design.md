# FestivalDiscounter.nl — Ontwerp Fase 2b (Prijs-scraper & review-wachtrij)

Datum: 2026-07-04
Status: goedgekeurd in brainstormsessie

## Context & positie in de routekaart

Fase 2a (admin-dashboard) is live. Fase 2b is het volgende sub-project uit de
fase-2-routekaart (zie `docs/superpowers/specs/2026-07-04-fase2-admin-dashboard-design.md`):
een automatiserings-pipeline die periodiek prijs- en beschikbaarheidsinformatie
verzamelt, mét een verplichte review-stap in het admin-dashboard vóórdat data
live gaat — geen bot mag ongecontroleerd data live zetten.

Fase 2b bestaat uit **twee capaciteiten** die dezelfde review-wachtrij en cron
delen maar een andere bron en doel hebben:

- **A — Prijs-scraper (official sites):** haalt prijs + beschikbaarheid op van
  de eigen festivalsites voor een curated set festivals, en werkt daarmee
  bestaande `official`-aanbieders bij.
- **B — Marktplaats-detectie (affiliate):** detecteert of een festival op een
  doorverkoop-marktplaats (TicketSwap e.d.) staat en stelt een *nieuwe*
  aanbieder mét affiliate-link voor. Tóónt géén gescrapete prijs — puur een
  doorlink. Dit lost het bekende kwaliteitsprobleem op dat elk festival nu maar
  één aanbieder heeft, waardoor de vergelijker mager is.

## Belangrijke koerswijziging t.o.v. de oorspronkelijke fase-2-omschrijving

De oorspronkelijke aanname was dat de scraper de **prijzen/beschikbaarheid** van
de doorverkoop-marktplaatsen (TicketSwap, Gigsberg, Ticombo — de waarden van het
`ticket_provider`-enum naast `official`) zou scrapen. Onderzoek tijdens de
brainstorm wees dit af:

- **TicketSwap:** Trust & Safety Policy verbiedt scripts/bots expliciet, met
  actieve anti-bot-detectie; `robots.txt` blokkeert losse listing-pagina's.
- **Gigsberg:** Terms and Conditions verbieden scraping/exploitatie van
  "Proprietary Data" hard, ondanks een los `robots.txt`.
- **Ticombo:** ToS niet volledig op te halen (bot-bescherming blokkeerde zelfs
  de onderzoeksfetch), vergelijkbaar risico aannemelijk.

**Besluit: géén prijs-/beschikbaarheidsdata scrapen van deze marktplaatsen.**

Er is echter een cruciaal onderscheid, en het is de kern van capaciteit B: het
**tonen van een affiliate-doorlink** is juist waar deze platforms een
affiliate-programma voor hebben. Alleen *detecteren dat* een festival op een
marktplaats staat — via één crawlbare event-overzichtspagina (die bij TicketSwap
volgens `robots.txt` wél toegankelijk is; alleen de losse listings zijn dat niet)
— en er dan een affiliate-link bij zetten, is legitiem gebruik. We slaan daarbij
geen prijs of listing-data op; enkel de doorlink. Zo blijven we binnen de
voorwaarden én lossen we het "één-aanbieder"-probleem op.

Vervolgens bleek ook de aanname over `official`-aanbieders onjuist: dit zijn
geen paar grote platforms (Ticketmaster/Paylogic/Eventix), maar 72 losse
festival-domeinen (`lowlands.nl`, `awakenings.nl`, `pinkpop.nl`, …), elk met
andere HTML. Een scraper die dit generiek aanpakt is niet haalbaar; per-festival
configuratie is de enige begaanbare weg, en dus is capaciteit A beperkt tot een
**curated set** i.p.v. alle festivals.

## Besluiten uit de brainstorm

| Onderwerp | Besluit |
|---|---|
| Capaciteit A — prijs-scrapen | Alleen `official`-aanbieders (eigen festivalsite); géén prijzen van TicketSwap/Gigsberg/Ticombo (ToS-verbod) |
| Capaciteit A — scope | Curated set van ~10 grote/bekende festivals, config per festival in code; ververst bestaande `ticket_offers`-rijen |
| Capaciteit B — marktplaats-detectie | Detecteer of een festival op een marktplaats (TicketSwap e.d.) staat en stel een nieuwe aanbieder mét affiliate-link voor; géén prijs tonen, alleen doorlink |
| Nieuwe aanbieders zoeken | Ja, maar uitsluitend voor capaciteit B (marktplaats-affiliate); capaciteit A ververst alleen bestaande offers |
| Review-strengheid | Alles (prijsupdate én voorgestelde nieuwe aanbieder) moet handmatig goedgekeurd worden vóór het live gaat; geen automatische drempel |
| Mislukte scrapes | Stil overslaan (geen wijziging), apart "mislukt"-overzicht in admin — niet in de review-wachtrij |
| Notificaties | Geen (geen e-mail/Slack); eigenaar checkt zelf periodiek in `/admin/scrapers` |
| Frequentie | Dagelijks, via Vercel Cron (beide capaciteiten in dezelfde run) |

## Data-model

Twee nieuwe tabellen, naar het append-only-patroon van de bestaande
`clicks`-tabel. Ze zijn bewust gescheiden omdat ze een andere vorm hebben:
capaciteit A werkt een *bestaande* offer bij, capaciteit B stelt een *nieuwe*
offer voor (en heeft dus nog geen `ticket_offer_id`).

Een gedeeld status-enum:

```sql
create type review_status as enum ('pending', 'approved', 'rejected', 'failed');
```

**Capaciteit A — `price_checks`** (prijsupdate van een bestaande offer):

```sql
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
alter table price_checks enable row level security;
```

- Elke cron-run schrijft precies één `price_checks`-rij per gescrapete
  `ticket_offer`: `pending` (iets gevonden) of `failed` (niets gevonden /
  netwerkfout, met `failure_reason`).
- **Goedkeuren** schrijft `scraped_price` → `ticket_offers.price_from` en
  `scraped_availability` → `ticket_offers.availability` (plus
  `last_checked_at = now()`), zet `status = 'approved'` +
  `reviewed_at`/`reviewed_by`, en triggert `revalidateTag("festivals")`.
- **Afkeuren** zet alleen `status = 'rejected'` + `reviewed_at`/`reviewed_by`;
  geen wijziging aan `ticket_offers`.

**Capaciteit B — `offer_suggestions`** (voorgestelde nieuwe marktplaats-aanbieder):

```sql
create table offer_suggestions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals(id) on delete cascade,
  provider ticket_provider not null,   -- 'ticketswap' | 'gigsberg' | 'ticombo'
  detected_url text not null,          -- de gevonden event-overzichtspagina
  affiliate_url text,                  -- affiliate-wrapped variant (indien affiliate-ID bekend)
  status review_status not null default 'pending',
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint offer_suggestions_festival_provider_key unique (festival_id, provider)
);

create index offer_suggestions_status_idx on offer_suggestions (status);
alter table offer_suggestions enable row level security;
```

- De cron stelt alleen een suggestie voor als het festival nog géén
  `ticket_offers`-rij voor die provider heeft én er nog geen openstaande
  `pending`-suggestie voor bestaat (unieke constraint + check).
- **Goedkeuren** maakt een nieuwe `ticket_offers`-rij aan
  (`provider`, `url = detected_url`, `affiliate_url`, `price_from = null`,
  `availability = 'unknown'`), zet de suggestie op `approved`, en triggert
  `revalidateTag("festivals")`.
- **Afkeuren** zet de suggestie op `rejected`; er wordt geen offer aangemaakt.

Voor beide geldt: `ticket_offers` verandert nooit automatisch — de publieke site
wijzigt pas na handmatige goedkeuring. Géén RLS-policies (zelfde patroon als de
andere tabellen; alleen de service-role leest/schrijft).

## Capaciteit A — prijs-scraper (official sites)

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

## Capaciteit B — marktplaats-detectie (affiliate)

- **Doel:** per festival vaststellen óf het op een marktplaats staat, en zo ja
  een affiliate-doorlink voorstellen. Geen prijs, geen listing-data.
- **Alleen crawlbare pagina's:** we raken uitsluitend de event-overzichtspagina
  aan die `robots.txt` toestaat (bij TicketSwap bv. het `…-tickets/…`-pad), nooit
  de geblokkeerde losse listings. Zelfde transparante User-Agent en 10s-timeout
  als capaciteit A.
- **Marktplaats-config in code** — `src/lib/scraper/marketplaces.ts`, één entry
  per marktplaats met: hoe een kandidaat-URL uit de festivalnaam/-slug wordt
  gebouwd, en hoe de affiliate-link wordt samengesteld uit het affiliate-ID.
  We beginnen met **TicketSwap** (crawlbare event-pagina's, affiliate-programma);
  Gigsberg/Ticombo kunnen later met dezelfde structuur volgen zodra hun
  affiliate-goedkeuringen binnen zijn.
- **Affiliate-ID** komt uit een env-var (bv. `TICKETSWAP_AFFILIATE_ID`). Is die
  nog niet gezet (goedkeuring nog niet binnen), dan wordt de suggestie tóch
  voorgesteld met `detected_url` maar zonder `affiliate_url`; bij goedkeuren
  wordt dan de kale URL gebruikt tot het affiliate-ID er is.
- **Per festival zonder bestaande aanbieder voor die marktplaats:**
  1. Bouw een kandidaat-URL uit de festivalnaam/-slug.
  2. `fetch` die crawlbare overzichtspagina (10s-timeout).
  3. 200 + naam-match in de pagina-titel/inhoud → schrijf één
     `offer_suggestions`-rij (`pending`). Geen match / 404 → niets doen (geen
     ruis in de wachtrij; dit is geen "mislukking" maar simpelweg "niet gevonden").
  4. Eigen try/catch per festival; ~2s vertraging tussen requests.

## Cron

- `vercel.json`: dagelijkse cron-job (05:00 UTC) naar `GET /api/cron/scrape`.
- Route verifieert `Authorization: Bearer $CRON_SECRET` (Vercel's standaard
  cron-header) → 401 bij ontbreken/mismatch. Nieuwe env-var `CRON_SECRET`
  (lokaal + Vercel), zelfde patroon als `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`.
- De route draait beide capaciteiten na elkaar: eerst A (prijs-scrape over
  `config.ts` → `price_checks`), dan B (marktplaats-detectie over de festivals
  → `offer_suggestions`). Geen `revalidatePath` hier — dat gebeurt pas bij
  goedkeuren.

## Admin-UI

Nieuwe pagina `/admin/scrapers` (in de bestaande `(dashboard)`-route-group,
naast `/admin/festivals` en `/admin/review`) met drie secties:

- **"Prijs-updates te reviewen":** alle `price_checks` met `status = 'pending'`,
  nieuwste eerst. Per rij: festivalnaam, huidige vs. gescrapete prijs, huidige
  vs. gescrapete beschikbaarheid, knoppen **Goedkeuren** / **Afkeuren**.
- **"Voorgestelde nieuwe aanbieders":** alle `offer_suggestions` met
  `status = 'pending'`. Per rij: festivalnaam, marktplaats (provider),
  `detected_url` (klikbaar om te controleren of het echt hetzelfde
  festival/editie is), knoppen **Toevoegen** / **Afwijzen**.
- **"Mislukt":** per `ticket_offer` de laatste `failed`-poging, maar alléén als
  die recenter is dan de laatste succesvolle scrape van diezelfde offer —
  festivalnaam, `failure_reason`, link naar de site.
- Server actions in `src/lib/admin/scraper-actions.ts`, elk beginnend met
  `requireAdmin()` — zelfde harde beveiligingsgrens als de rest van de admin:
  `approvePriceCheck`, `rejectPriceCheck`, `approveOfferSuggestion`,
  `rejectOfferSuggestion`.
- Zelfde functionele, donkere huisstijl als de rest van `/admin`; geen nieuw
  designsysteem.

## Foutafhandeling

- Capaciteit A: netwerkfouten, timeouts (10s) en lege selectors resulteren in
  een `failed`-rij met leesbare `failure_reason` — nooit een crash.
- Capaciteit B: "niet gevonden" (404 / geen naam-match) is géén fout en levert
  geen rij op; alleen een echte netwerkfout wordt in de logs gemeld, zonder de
  wachtrij te vervuilen.
- Eén festival-fout beïnvloedt de andere festivals in dezelfde run niet
  (try/catch per festival, in beide capaciteiten).
- Cron-route zonder/met foute `CRON_SECRET` → 401, geen run.
- Alle vier de goedkeur-/afwijs-acties zonder geldige admin-sessie → geweigerd
  door `requireAdmin()`.

## Tests

Bestaande Vitest-opzet, zelfde stijl als fase 2a (pure logica getest, geen
live netwerkcalls in CI):

- Unit-tests voor prijs-extractie en sold-out-keyword-detectie met vaste
  HTML-fixtures (cheerio tegen statische strings, geen echte fetch).
- Unit-tests voor de marktplaats-URL-bouw en naam-match-logica (capaciteit B),
  ook met fixtures — inclusief het geval "geen match → geen suggestie".
- Unit-tests voor de vier approve/reject-acties: `approvePriceCheck` schrijft
  naar de bestaande offer, `approveOfferSuggestion` maakt een nieuwe offer aan,
  reject laat `ticket_offers` ongewijzigd, en alle vier weigeren zonder sessie.
- Geen end-to-end test die echte sites benadert (te fragiel/traag voor CI).

## Bewust buiten scope (fase 2b)

Het scrapen van **prijs-/beschikbaarheidsdata** van TicketSwap/Gigsberg/Ticombo
(ToS-verbod; capaciteit B toont alleen een affiliate-doorlink, geen prijs),
uitbreiding van de curated set voorbij ~10 festivals, marktplaats-detectie voor
meer dan TicketSwap (Gigsberg/Ticombo volgen later), e-mail/Slack-notificaties
bij nieuwe review-items, en elke vorm van automatische goedkeuring (ook niet
voor kleine prijswijzigingen).

## Definition of done

- Dagelijkse Vercel Cron draait beide capaciteiten en logt resultaten in
  `price_checks` / `offer_suggestions` zonder de publieke site te raken.
- `/admin/scrapers` toont werkende secties "Prijs-updates te reviewen",
  "Voorgestelde nieuwe aanbieders" en "Mislukt"; goedkeuren werkt door naar
  `ticket_offers` (update resp. nieuwe rij) + revalidate, afkeuren laat de live
  data ongewijzigd.
- Capaciteit B raakt alleen crawlbare marktplaats-pagina's aan en slaat geen
  prijs/listing-data op — alleen een doorlink.
- Eén kapotte site of netwerkfout breekt de rest van de cron-run niet.
- Cron-endpoint is afgeschermd met `CRON_SECRET`; alle admin-acties blijven
  achter `requireAdmin()`.
- Tests groen (parse-logica + URL/match-logica + approve/reject-acties);
  typecheck, lint en build slagen; productie-smoke-test blijft 9/9.
