# Lancering-checklist FestivalDiscounter.nl

Bijgewerkt: 2026-07-04. De site is volledig gebouwd, gereviewd en live op het
eigen domein (fase 1 + fase 2a admin-dashboard). Dit bestand houdt bij wat er
nog openstaat vóór/tijdens de lancering.

## Bij jou (eigenaar)

- [x] **DNS afgerond** (geverifieerd 2026-07-04) — apex `festivaldiscounter.nl`
      én `www` wijzen naar Vercel (A-records 216.198.79.1 / 64.29.17.1; het oude
      Vimexx-IP 185.104.29.176 is weg). Apex-http → 308 naar https, `server:
      Vercel`. SSL actief.
- [ ] **Affiliate-aanvragen indienen** — TradeTracker, Awin, Booking.com,
      Bol.com. Site is hiervoor gereed (werkende vergelijker + Over/Contact/
      Privacy-pagina's). *(loopt al)*
- [ ] **Dataset doorlopen en publiceren** — `supabase/seed_full.sql` bevat 69
      nieuwe festivals + 5 gidsartikelen, allemaal met `published = false` in
      Supabase. Per rij controleren en op `true` zetten in de Supabase Table
      Editor zodra akkoord. **Kan nu comfortabel via de admin:** `/admin/review`
      (bulk-publiceer/overslaan/verwijder) of per festival op `/admin/festivals`.
      Twee aandachtspunten uit het onderzoek:
      - *Misty Fields* en *Valkhof Festival*: bronnen spraken elkaar tegen
        over de exacte 2026-datum — extra check waard.
      - *Welcome To The Future* en *ZeeZout*: zwakke/tegenstrijdige bronnen
        of er überhaupt een 2026-editie is.
- [x] **Google Search Console ingesteld** — property + sitemap (`/sitemap.xml`)
      ingediend. Sitemap bereikbaar (200, in smoke-test bevestigd); GSC-property
      staat in je eigen Google-account (niet extern te verifiëren).
- [x] **Web Analytics ingesteld** (2026-07-04) — begonnen met Plausible, maar
      overgestapt op **Vercel Web Analytics** (gratis tier, al op Vercel,
      cookieloos). `<Analytics />` in `layout.tsx`; kliks op "Bekijk tickets"
      vuren custom event **`Ticket klik`** af (props `festival` + `aanbieder`)
      via `TicketLink` → `@/lib/analytics`. *Nog te doen in Vercel-dashboard:*
      (1) Web Analytics inschakelen onder Project → Analytics; (2) de oude env-var
      `NEXT_PUBLIC_PLAUSIBLE_SRC` verwijderen; (3) de Plausible-proef opzeggen
      (geen kosten binnen 30 dagen).
- [ ] **Built Titling-fontlicentie** (optioneel) — koop de webfontlicentie
      (fontspring.com / Typodermic) en plaats als
      `public/fonts/built-titling.woff2`. Tot die tijd valt de site netjes
      terug op Avenir Next Condensed; geen blocker.

## Ik pak dit op zodra relevant

- [x] **`NEXT_PUBLIC_SITE_URL` bijwerken + redeploy** naar
      `https://festivaldiscounter.nl` zodra het domein volledig werkt (deze
      waarde wordt bij het bouwen ingebakken, dus vereist een nieuwe build).
- [x] **Smoke-test op eigen domein** — 9/9 groen op
      `https://festivaldiscounter.nl` (2026-07-04, na de domeinswitch én na de
      admin-deploy).
- [ ] **Eindreview** van de volledige implementatie.
- [ ] **Structured data + Lighthouse-check** — Rich Results Test en een
      Lighthouse-meting op homepage + festivalpagina (Performance/SEO ≥ 90,
      spec-doel).

## Al afgerond

- Volledige site gebouwd en gereviewd (19 taken, TDD waar relevant, 54
  geautomatiseerde tests).
- Live op `https://festivaldiscounter.vercel.app`, productie-smoke-test
  9/9 groen.
- Kritieke hydration-bug gevonden en gefixt na livegang (`f11bda8`).
- Database live met 6 gepubliceerde festivals + 1 artikel; 69 festivals +
  5 artikelen klaar in `seed_full.sql`, wachtend op review.
- Klik-tracking bewezen werkend (`/uit/[offerId]` logt naar Supabase).
- Eigen domein live: apex + www op Vercel, smoke 9/9 (2026-07-04).
- **Admin-dashboard (fase 2a) live op `/admin`** (2026-07-04): login (wachtwoord
  + HMAC-cookie), festivals + ticket-aanbieders CRUD/publiceren, bulk-review-
  wachtrij. 94 tests groen, gereviewd (goedgekeurd), auth runtime-geverifieerd.
  `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` staan in Vercel (prod `/admin` geeft
  correct 307 → login). Spec/plan in `docs/superpowers/`.
