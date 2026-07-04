# Lancering-checklist FestivalDiscounter.nl

Bijgewerkt: 2026-07-03. De site zelf is volledig gebouwd, gereviewd en live
op Vercel (fase 1 uit `docs/superpowers/plans/2026-07-02-festivaldiscounter-fase1.md`).
Dit bestand houdt bij wat er nog openstaat vóór/tijdens de lancering.

## Bij jou (eigenaar)

- [ ] **DNS afronden** — `www.festivaldiscounter.nl` wijst al correct naar Vercel
      (CNAME klopt, SSL-certificaat wordt automatisch uitgegeven). Het kale
      domein `festivaldiscounter.nl` wijst nog naar de oude Vimexx-hosting
      (Apache, IP 185.104.29.176) — het A-record voor host `@` moet nog naar
      Vercel wijzen. Check in DirectAdmin of dat record daadwerkelijk is
      opgeslagen.
- [ ] **Affiliate-aanvragen indienen** — TradeTracker, Awin, Booking.com,
      Bol.com. Site is hiervoor gereed (werkende vergelijker + Over/Contact/
      Privacy-pagina's). *(loopt al)*
- [ ] **Dataset doorlopen en publiceren** — `supabase/seed_full.sql` bevat 69
      nieuwe festivals + 5 gidsartikelen, allemaal met `published = false` in
      Supabase. Per rij controleren en op `true` zetten in de Supabase Table
      Editor zodra akkoord. Twee aandachtspunten uit het onderzoek:
      - *Misty Fields* en *Valkhof Festival*: bronnen spraken elkaar tegen
        over de exacte 2026-datum — extra check waard.
      - *Welcome To The Future* en *ZeeZout*: zwakke/tegenstrijdige bronnen
        of er überhaupt een 2026-editie is.
- [ ] **Google Search Console instellen** — property toevoegen voor
      festivaldiscounter.nl, sitemap (`/sitemap.xml`) indienen.
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

- [ ] **`NEXT_PUBLIC_SITE_URL` bijwerken + redeploy** naar
      `https://festivaldiscounter.nl` zodra het domein volledig werkt (deze
      waarde wordt bij het bouwen ingebakken, dus vereist een nieuwe build).
- [ ] **Smoke-test herhalen** op het eigen domein na de domeinswitch.
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
