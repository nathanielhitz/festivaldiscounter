# FestivalDiscounter.nl — Ontwerp Fase 2a (Admin-dashboard)

Datum: 2026-07-04
Status: goedgekeurd in brainstormsessie

## Context & positie in de routekaart

Fase 1 (fundament: publieke site + database + handmatige ticketvergelijker) is
volledig gebouwd, gereviewd en live. Fase 2 uit de fase-1-spec ("Automatisering")
omvat meerdere losstaande subsystemen: een prijs-scraper, dagelijkse checks via
Vercel Cron, automatische uitverkocht-status, een eigen admin-dashboard, en het
activeren van affiliate-links.

Die onderdelen zijn te groot en te verschillend van aard voor één spec. Ze zijn
daarom opgeknipt; elk sub-project krijgt een eigen spec → plan → bouwcyclus:

- **Fase 2a — Admin-dashboard (deze spec):** eigen, afgeschermde beheeromgeving.
- **Fase 2b — Automatiserings-pipeline (later):** prijs-scraper + dagelijkse
  Vercel Cron + automatische uitverkocht-status, mét een review-stap in het
  admin-dashboard vóórdat data live gaat.
- **Affiliate-links activeren:** feitelijk een data-actie (`affiliate_url`
  vullen), geblokkeerd door externe affiliate-goedkeuringen; wordt triviaal
  zodra 2a er is en de goedkeuringen binnen zijn. Geen eigen spec nodig.

Het admin-dashboard is bewust eerst gekozen: het haalt de eigenaar uit de ruwe
Supabase Table Editor voor het dagelijkse werk, deblokkeert de nog openstaande
review van 69 concept-festivals, en is de review-laag die de scraper (2b) later
nodig heeft (geen bot mag ongecontroleerd prijzen live zetten).

## Besluiten uit de brainstorm

| Onderwerp | Besluit |
|---|---|
| Eerste sub-project | Admin-dashboard (vóór scraper); scraper krijgt later een eigen spec |
| Authenticatie | Eén gedeeld wachtwoord (env-var) + HMAC-ondertekende sessie-cookie. Géén Clerk (overkill voor één beheerder), géén Supabase Auth |
| Technische aanpak | Server-rendered admin in dezelfde Next-app; formulieren via Next 15 server actions met de bestaande service-role Supabase-client |
| V1-scope | Kern: festivals + ticket-aanbieders beheren/publiceren. Plus: bulk-review-wachtrij voor de 69 concept-festivals |
| Buiten v1 | Artikelbeheer, afbeeldingen-upload naar Storage (blijft `image_url` plakken) |
| Edge vs Node | Géén edge-middleware; auth-guard draait server-side in Node-runtime (past bij "geen edge functions") |

## Architectuur

- **Locatie:** dezelfde Next.js 15-app, alles onder `/admin`. Geen aparte app.
- **Rendering:** server components; formulieren via server actions. Minimale
  client-side JS (alleen waar interactie het vereist, bv. `useActionState` en
  bevestigingsdialogen).
- **Database:** de bestaande service-role Supabase-client (servercontext). Admin
  leest álles (ook `published=false`); schrijft festivals en ticket-aanbieders.
- **Runtime:** volledig Node-runtime; geen edge-middleware, geen nieuwe
  externe leverancier.

## Routes

| Route | Toegang | Doel |
|---|---|---|
| `/admin/login` | publiek | Wachtwoord-invoer; buiten de beveiligde route-group |
| `/admin` | beveiligd | Dashboard-home: telling gepubliceerd/concept, snelkoppelingen, link naar review-wachtrij |
| `/admin/festivals` | beveiligd | Lijst van álle festivals (ook concepten); zoek + filter concept/gepubliceerd; publiceer-schakelaar + edit-link |
| `/admin/festivals/new` | beveiligd | Nieuw festival aanmaken |
| `/admin/festivals/[id]` | beveiligd | Festival bewerken (alle velden) + beheer van de ticket-aanbieders van dat festival op dezelfde pagina |
| `/admin/review` | beveiligd | Bulk-review-wachtrij: alleen `published=false`; compacte kaarten met *Publiceer* / *Overslaan* / *Verwijder* |

De beveiligde pagina's staan in route-group `src/app/admin/(dashboard)/` met een
gedeelde `layout.tsx`. `/admin/login` staat buiten die group en is vrij
toegankelijk.

## Authenticatie

- **Helper** `requireAdmin()` in `src/lib/admin/auth.ts`: leest de sessie-cookie
  via `next/headers`, verifieert een HMAC-SHA256-handtekening (Node `crypto`)
  met vervaldatum (30 dagen). Geeft geldig/ongeldig terug.
- **Pagina-gating:** `src/app/admin/(dashboard)/layout.tsx` roept `requireAdmin()`
  aan en redirect bij ongeldige/ontbrekende cookie naar `/admin/login`.
- **Harde grens = server actions:** server actions zijn losse publiek
  bereikbare endpoints; de layout-guard beschermt ze niet. Daarom roept **elke**
  admin-server-action `requireAdmin()` aan als eerste regel. Dit is de echte
  beveiligingsgrens; de layout-guard is puur voor nette redirects.
- **Login-action:** vergelijkt het wachtwoord constant-time met `ADMIN_PASSWORD`;
  bij succes wordt een HttpOnly, Secure, SameSite=Lax, HMAC-ondertekende cookie
  gezet. `logoutAction` wist de cookie.
- **Nieuwe env-vars:** `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (HMAC-sleutel).
  Beide alleen server-side; toegevoegd aan `.env.local.example` en in Vercel.

## Data-operaties

Admin-reads in `src/lib/admin/queries.ts`, bewust gescheiden van de publieke
`src/lib/queries.ts`, zodat concept-data nooit op de publieke site lekt.

Server actions in `src/lib/admin/actions.ts` (elk begint met `requireAdmin()`):

| Action | Wat |
|---|---|
| `loginAction` / `logoutAction` | Sessie-cookie zetten / wissen |
| `upsertFestival` | Festival aanmaken of bijwerken (alle velden uit het datamodel) |
| `setFestivalPublished(id, published)` | Publiceer-schakelaar (ook in de review-wachtrij) |
| `deleteFestival(id)` | Festival verwijderen (met bevestiging) |
| `upsertOffer(festivalId, …)` | Ticket-aanbieder toevoegen of bewerken |
| `deleteOffer(id)` | Ticket-aanbieder verwijderen |

**Live doorwerken op de publieke site:** de publieke pagina's draaien op ISR
(`revalidate=3600`). Elke schrijf-action roept gerichte `revalidatePath()` aan
voor de geraakte routes (`/festivals`, `/festivals/[slug]`, de landingspagina's,
`sitemap.xml`), zodat publicaties en prijswijzigingen binnen seconden live staan
i.p.v. na een uur.

## UI / pagina-indeling

Functioneel, in de bestaande donkere huisstijl (bestaande Tailwind-tokens); geen
nieuw designsysteem.

- **Festival-lijst:** tabel met naam, status, publicatie-badge, startdatum,
  aantal aanbieders, edit-link + publiceer-schakelaar. Zoekveld + filter op
  concept/gepubliceerd.
- **Festival-edit:** één formulier met alle festivalvelden; daaronder een sectie
  met de ticket-aanbieders van dat festival (inline toevoegen/bewerken/verwijderen).
- **Review-wachtrij:** compacte kaarten per concept-festival met de kernvelden
  zichtbaar + knoppen *Publiceer* / *Overslaan* / *Verwijder*. *Overslaan* laat
  het festival op concept staan (niet-destructief).
- **Login:** simpel gecentreerd wachtwoordformulier.

Formulieren gebruiken server actions met `useActionState` voor validatie-feedback
in beeld.

## Foutafhandeling

- Validatiefouten komen via `useActionState` terug en worden in beeld getoond bij
  het veld/formulier; ingevulde waarden blijven staan (geen dataverlies, geen crash).
- Server-side validatie vóór elke write: verplichte velden, geldige slug,
  `start_date` ≤ `end_date`, geldige URL's.
- Mislukte DB-schrijfactie → nette foutmelding in het formulier; actie faalt veilig.
- Ongeldige/verlopen sessie → redirect naar `/admin/login`.

## Beveiliging

- `/admin/*` krijgt `noindex` via `robots`-metadata op de admin-layout en staat
  niet in de sitemap; mag nooit geïndexeerd worden.
- Wachtwoordvergelijking constant-time; bij fout een generieke melding, geen hints.
- Sessie-cookie: HttpOnly, Secure, SameSite=Lax, HMAC-ondertekend met vervaldatum.
- **Brute-force (bewuste keuze):** voor één beheerder met een sterk wachtwoord is
  het risico klein. We houden het slank met een kleine vaste vertraging (~500 ms)
  bij een foute login, i.p.v. een volledige rate-limiter.
- `requireAdmin()` in élke server action blijft de harde beveiligingsgrens.

## Tests

Bestaande Vitest-opzet.

- **Auth-helper:** cookie ondertekenen/verifiëren, verlopen cookie afwijzen, fout
  wachtwoord afwijzen, geknoeide handtekening afwijzen.
- **Pure validatie-/parsing-logica** van de formulieren (slug, datums, URL's).
- Server actions die direct met Supabase praten worden niet volledig geïsoleerd
  getest (dat is integratie); de toetsbare logica wordt in pure functies
  getrokken — in lijn met de aanpak van fase 1.

## Bewust buiten scope (fase 2a)

Artikelbeheer, afbeeldingen-upload naar Supabase Storage, meerdere admin-gebruikers,
rollen/rechten, audit-log, de prijs-scraper en cron (fase 2b), en het daadwerkelijk
vullen van affiliate-links (wacht op externe goedkeuringen).

## Definition of done

- Inloggen op `/admin` met het wachtwoord werkt; onbevoegde toegang tot
  `/admin/*` en tot server actions wordt geweigerd.
- Festivals en ticket-aanbieders zijn volledig aan te maken, te bewerken, te
  publiceren/depubliceren en te verwijderen via de admin.
- Wijzigingen verschijnen binnen seconden op de publieke site (on-demand revalidate).
- De review-wachtrij toont de concept-festivals en laat ze vlot publiceren/overslaan/verwijderen.
- `/admin/*` is `noindex` en niet in de sitemap.
- Tests groen (auth-helper + validatielogica); typecheck, lint en build slagen;
  productie-smoke-test blijft 9/9.
