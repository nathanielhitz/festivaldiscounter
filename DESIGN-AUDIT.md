# Design-audit FestivalDiscounter.nl

Datum: 2026-07-03 · Mobile-first (375px eerst, daarna 768/1440) · Beoordeeld met Playwright-screenshots van de productie-build plus code-analyse, langs het "design-taste-frontend"-kader (anti-generieke-patronen, touch-normen, layout-discipline, WCAG AA).

Screenshots: `docs/design-audit/` · Meetdata (headerhoogte, tap targets, scroll): via Playwright-DOM-metingen op 375×812.

---

## 1. Samenvatting

**Totaalscore: 3,5 / 5.** Het fundament is opvallend sterk: heldere visuele hiërarchie (binnen 3 seconden duidelijk wat de site doet), gedisciplineerd één-accent-kleursysteem dat overal WCAG AA haalt, geen horizontale scroll op welke pagina dan ook, CLS-veilige layout en een krachtige merktypografie. Maar de mobiele navigatie is een echt gat, en juist mobiel is de doelgroep.

**Top 3 problemen:**
1. **De header is op mobiel kapot** (P1): 173px hoog (norm: max ~64px), vier los gestapelde tekstlinks van 20px hoog (norm: 44px tap targets), geen menu-patroon, niet sticky. Op een 812px-scherm eet de header 21% van de viewport.
2. **De conversieknoppen en prijzen wrappen** (P1): "Bekijk tickets" breekt op élk formaat in twee regels; op desktop breekt zelfs het euroteken los van het bedrag ("€" boven "240"). Dit raakt het belangrijkste conversie-element van de site.
3. **Filterlinks op /festivals zijn te klein voor duimen** (P1): 20px hoog en soms maar 26px breed ("pop", "Alle") — voor een deals-doelgroep die vrijwel altijd mobiel filtert is dit de primaire interactie.

---

## 2. Bevindingen per onderdeel

### 2.1 Header & navigatie mobiel — score 1,5/5

Gemeten op 375px (alle pagina's identiek):

| Meting | Waarde | Norm |
|---|---|---|
| Headerhoogte | **173px** | 56–64px |
| Tap-hoogte navigatielinks | **20px** | ≥44px |
| Menu-patroon | geen (4 links gestapeld) | hamburger/sheet of tabbalk |
| Sticky | nee | aanbevolen bij lange lijstpagina's |

Oorzaak (code): `SiteHeader.tsx` gebruikt `flex flex-wrap gap-5` zonder mobiel breakpoint; onder ~640px wrapt elke link naar een eigen regel, rechts uitgelijnd naast het logo. Screenshot: `docs/design-audit/home--mobile-fold.png`. Op tablet (768px) en desktop staat alles op één regel en is de header 57px — daar is niets mis (`home--tablet-fold.png`, `home--desktop-fold.png`).

**Advies:** compacte sticky header (56px) met hamburger + uitklappaneel op mobiel; desktop ongewijzigd. Volledig implementatievoorstel in §4.1.

### 2.2 Typografie — score 4/5

- Sterke, herkenbare display-typografie (condensed caps) met duidelijke schaalverhouding: H1 48px mobiel op contentpagina's is stevig maar leesbaar; artikel-H1 36px met nette leeskolom (`prose-dark`, 65ch, regelafstand 1.75) — het artikel leest uitstekend op 375px (`artikel--mobile-fold.png`... zie audit-map).
- Hero-headline (3 regels op mobiel én desktop door `max-w-[12ch]`) is een bewuste, krachtige keuze die binnen de fold blijft inclusief zoek-CTA. ✔
- **Punt:** de zoekveld-placeholder ("Zoek een festival, stad of genre…") wordt op 375px midden in een woord afgekapt (`home--mobile-fold.png`). Korter maken voor mobiel.
- **Punt:** de merkletter (Built Titling) ontbreekt nog (licentie); de fallback Avenir Next Condensed is prima, maar het `@font-face` veroorzaakt wel een 404-request per pageload (zie 2.8).

### 2.3 Spacing & layout — score 4/5

- Consistent spacing-systeem (Tailwind-schaal, `max-w-6xl`-container, `px-5`), rustige ritmiek tussen secties. Geen horizontale scroll op geen enkele geteste pagina (Playwright: `scrollWidth == clientWidth` overal). ✔
- Detailpagina-volgorde op mobiel is goed: vergelijker direct onder de kop (eerder gefixt met `order-first`), dan beschrijving, FAQ, verwante festivals (`detail-lowlands--mobile-full.png`). ✔
- **Punt (desktop):** de vergelijker-zijkolom is te krap voor zijn 4-koloms grid: aanbieder-subtekst breekt in 3 mini-regels en de prijs breekt het euroteken los van het bedrag (`detail-lowlands--desktop-fold.png`). Zie P1-fix §4.2.
- **Punt (desktop):** de hero laat rechts ~50% ongebruikte donkerte; de radial-glow is te subtiel om als compositie te lezen. Acceptabele asymmetrie, maar een lichte versterking van de glow of een ondersteunend element zou de balans verbeteren (P3).

### 2.4 Kleur & contrast — score 4,5/5

- Één accent (teal `#60dbcc`), semantisch geel alléén voor beschikbaarheidswaarschuwingen, verder gedempte groentinten: dit volgt de "color consistency lock" uit het taste-kader netjes. Geen AI-paars, geen gradient-tekst behalve één bewust hero-woord.
- Contrast eerder in het traject doorgerekend en gefixt: gedempte tekst op achtergrond 7,5:1 (AAA), CTA-ruststand 11,2:1, CTA-hover 4,8:1 (AA), datum-chips ~10:1. ✔
- **Punt:** het contrast van `text-warn` op de gele waarschuwingsachtergrond (`bg-warn/10`) is krap maar voldoende voor groot/vet; geen actie nodig, wel monitoren als er langere waarschuwingsteksten komen.

### 2.5 Componenten — score 3,5/5

- Cards, badges, chips en de vergelijker delen één vormtaal (zelfde radius-schaal, zelfde borders, zelfde labelstijl) — consistent, geen generieke "AI-slop"-mix. ✔
- "Laagste prijs"-badge en peildatum zijn sterke vertrouwenselementen. ✔
- **Punt (grootste "taste"-issue):** elk festival zonder eigen afbeelding krijgt **exact dezelfde teal-gradient** als kaartafbeelding. Op de homepage staan zo 4 identieke vlakken boven elkaar (`home--mobile-full.png`) — dit is precies de monotonie die een site "template-achtig" laat ogen. Advies (P2): varieer de fallback deterministisch per festival (bv. gradient-hoek/tint afgeleid van de slug-hash, of duotoon per genre), tot er echte festivalfoto's zijn.
- **Punt:** "Bekijk tickets" wrapt in twee regels op alle formaten (zie P1 §4.2).

### 2.6 Touch & interactie — score 2,5/5

- **Kaarten zijn volledig tappable** (de hele card is één link) — de kleine "Vergelijk →"-tekst is dus geen tap-probleem. ✔
- Geen hover-afhankelijkheid: alle informatie is zonder hover zichtbaar; hovers zijn puur decoratief. ✔
- Focus-stijlen: zoekvelden en skip-link hebben zichtbare accentkleur-outlines (eerder gefixt); ticketknoppen en links vallen terug op de browser-default outline — acceptabel.
- **Punt (P1):** de filterrijen op /festivals: tap-hoogte 20px, breedtes vanaf 26px, en de rijen wrappen tot een dichte tekstwolk (`festivals--mobile-fold.png`). Voor de kernactie van de site op mobiel is dit te fijn motorisch. Zie §4.3.
- **Punt (P2):** header-navigatielinks 20px hoog (onderdeel van de header-fix), breadcrumb-links 19px, footer-links klein. De headerfix lost het grootste deel op; breadcrumb/footer zijn secundaire navigatie (P3).

### 2.7 Visuele hiërarchie — score 4,5/5

De 3-secondentest slaagt overtuigend: eyebrow ("Dagelijks prijzen gecheckt") → headline ("Nooit te veel betalen voor een festival.") → zoekveld als primaire actie, direct gevolgd door concrete festivals met prijzen. Ook de detailpagina leidt het oog goed: eyebrow met datum/plaats → festivalnaam → prijzen. States zijn verzorgd: uitverkocht-melding met doorverkoop bovenaan (`detail-soldout--mobile-fold.png`), lege vergelijker met eerlijke melding (`detail-announced-geen-offers--mobile-fold.png`), nette 404 met zoekveld (`404--mobile-fold.png`).

**Punt:** de lege-filterstaat toont een dubbele melding ("0 festivals gevonden voor …" bovenaan én "Geen festivals gevonden. Wis de filters." eronder) — voeg samen tot één regel met de wis-link (P3, `festivals-leeg--mobile-fold.png`).

### 2.8 Performance-gerelateerd design — score 4/5

- **CLS:** kaartafbeeldingen zitten in containers met vaste hoogte (`h-36`), hero bevat geen media, lettertype heeft `font-display: swap` → geen gemeten layout-verschuivingen. ✔
- **LCP:** het LCP-element is de hero-headline (tekst) — optimaal. ✔
- **Loading states:** niet nodig in de huidige architectuur (alles ISR/statisch; navigatie levert direct volledige HTML). Als fase 2 client-side dataladen introduceert, dan skeletons toevoegen. ✔
- **Punt (P3):** `@font-face` verwijst naar het nog niet bestaande `/fonts/built-titling.woff2` → gegarandeerde 404 op elke pageload. Onschuldig maar slordig; verwijder de regel tot de licentie rond is, of koop de licentie.
- **Punt (P3):** meerdere em-dashes (—) in UI-copy (hero-subtekst, disclaimers, lege staten). Het taste-kader bant deze als typografische AI-tell; vervang door punt of komma.

---

## 3. Prioriteitenlijst

**P1 — breekt de mobiele ervaring**
1. Mobiele header: 173px hoog, geen menu-patroon, 20px tap targets, niet sticky → herontwerp (§4.1)
2. Vergelijker: CTA- en prijs-wrapping op alle viewports; krappe desktop-kolommen (§4.2)
3. Filterchips /festivals: tap targets ver onder 44px op het primaire interactie-element (§4.3)

**P2 — verzwakt het design**
4. Identieke gradient-fallback op elke kaart → deterministische variatie per festival/genre
5. Zoekveld-placeholder wordt afgekapt op 375px → korter ("Zoek een festival…")
6. Header niet sticky (meenemen in P1-fix §4.1)

**P3 — polish**
7. Font-404 op elke pageload (regel verwijderen of licentie afronden)
8. Em-dashes in UI-copy vervangen
9. Dubbele lege-staat-melding op /festivals samenvoegen
10. Lege vergelijker toont affiliate-disclaimer terwijl er geen links zijn → disclaimer conditioneel maken
11. Desktop-hero: rechterhelft compositioneel versterken (sterkere glow of ondersteunend element)
12. Breadcrumb-/footer-links iets groter tapgebied (py-toevoeging)

---

## 4. Implementatievoorstellen P1 (nog NIET geïmplementeerd)

### 4.1 Mobiele header: compact + sticky + uitklapmenu

Aanpak: één nieuwe client component (`MobileNav`) voor de mobiele menu-interactie — de eerste en enige client component in de codebase, klein gehouden. `SiteHeader` blijft een server component en rendert desktop-links zoals nu. De header wordt sticky met een blur-achtergrond, 56px hoog op mobiel.

**Nieuw: `src/components/MobileNav.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/festivals", label: "Festivals" },
  { href: "/last-minute-festivals", label: "Last-minute" },
  { href: "/goedkope-festivaltickets", label: "Goedkope tickets" },
  { href: "/gids", label: "Gids" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // menu sluiten na navigatie
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobiel-menu"
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        className="flex h-11 w-11 items-center justify-center rounded text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        {/* hamburger / kruis, puur CSS zodat er geen icon-dependency nodig is */}
        <span className="relative block h-4 w-5" aria-hidden>
          <span className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition ${open ? "top-2 rotate-45" : ""}`} />
          <span className={`absolute left-0 top-2 h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`} />
          <span className={`absolute left-0 top-4 h-0.5 w-5 bg-current transition ${open ? "top-2 -rotate-45" : ""}`} />
        </span>
      </button>

      {open && (
        <nav
          id="mobiel-menu"
          aria-label="Hoofdmenu"
          className="absolute inset-x-0 top-full border-b border-line bg-ground/95 backdrop-blur"
        >
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={pathname === n.href ? "page" : undefined}
                  className="block border-t border-line px-5 py-3.5 text-base font-semibold text-ink active:bg-panel"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
```

**Aangepast: `src/components/SiteHeader.tsx`**

```tsx
import Link from "next/link";
import Logo from "./Logo";
import MobileNav from "./MobileNav";

const NAV = [
  { href: "/festivals", label: "Festivals" },
  { href: "/last-minute-festivals", label: "Last-minute" },
  { href: "/goedkope-festivaltickets", label: "Goedkope tickets" },
  { href: "/gids", label: "Gids" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur">
      <nav className="relative mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label="FestivalDiscounter home" className="py-2">
          <Logo size={22} />
        </Link>
        {/* desktop: inline links met volwaardig tapgebied */}
        <div className="ml-auto hidden gap-1 text-sm font-semibold text-mut sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded px-3 py-2.5 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </div>
        {/* mobiel: hamburger rechts */}
        <div className="ml-auto sm:hidden">
          <MobileNav />
        </div>
      </nav>
    </header>
  );
}
```

Resultaat: header 56px op elk formaat (was 173px mobiel), sticky, 44px tap targets, menu-items van 48px hoog, `aria-expanded`/`aria-current` voor toegankelijkheid, desktop visueel vrijwel ongewijzigd (links krijgen alleen ruimer padding-tapgebied). Geen externe dependencies.

### 4.2 Vergelijker: wrap-vrije prijzen en CTA's

Drie gerichte wijzigingen in `src/components/TicketComparator.tsx`:

```tsx
{/* 1. Kolomverdeling desktop: subtekst-kolom breder, prijs/knop op inhoudsbreedte */}
<li className={`relative grid grid-cols-2 items-center gap-3 rounded border px-4 py-3.5
    sm:grid-cols-[minmax(0,1.6fr)_auto_auto_auto] ${...}`}>

{/* 2. Prijs: nooit breken */}
<p className="whitespace-nowrap text-lg font-bold tabular-nums">
  {formatPrice(Number(o.price_from))}
  <span className="block text-xs font-medium text-mut">vanaf</span>
</p>

{/* 3. CTA: één regel, korter label op smalle schermen is niet nodig als hij niet meer kan wrappen */}
<a
  href={`/uit/${o.id}`}
  rel="sponsored nofollow"
  aria-label={`Bekijk tickets bij ${PROVIDER_LABELS[o.provider]}`}
  className="whitespace-nowrap rounded-sm bg-accent px-4 py-2.5 text-center text-sm font-bold text-ground hover:bg-accent-deep"
>
  Bekijk tickets
</a>
```

Plus de aanbieder-subtekst (`PROVIDER_SUB`) op mobiel beperken tot één regel met `truncate` óf de "·"-scheiding vervangen door een regelafbreekpunt — voorstel: `<p className="text-xs text-mut sm:max-w-[16ch]">`. Bij twijfel eerst alleen 1+2+3 doorvoeren en visueel herchecken op 375/1440.

### 4.3 Filterchips /festivals: duimvriendelijke pills

Vervang de kale tekstlinks door chips met een volwaardig tapgebied; de rijen blijven wrappen maar elk doelwit wordt ≥44px hoog. In `src/app/festivals/page.tsx` (het patroon per filtergroep, hier "maand"):

```tsx
<div className="flex flex-wrap items-center gap-2">
  <span className="w-full text-xs font-bold uppercase tracking-wider text-mut sm:w-20 sm:shrink-0">
    Maand
  </span>
  <Link
    href={filterLink({ maand: undefined })}
    aria-current={!maand ? "true" : undefined}
    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
      !maand
        ? "border-accent bg-accent/10 text-accent"
        : "border-line text-mut hover:text-ink"
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
        maand === m
          ? "border-accent bg-accent/10 text-accent"
          : "border-line text-mut hover:text-ink"
      }`}
    >
      {monthLabel(m)}
    </Link>
  ))}
</div>
```

Zelfde patroon voor genre en provincie. De actieve staat krijgt naast kleur ook een gevulde achtergrond en rand (niet-kleurafhankelijk onderscheid). Kanttekening: met 75 festivals in de database worden de genre-/maandrijen langer; overweeg dan per groep een horizontaal scrollbare rij (`flex overflow-x-auto snap-x` zonder wrap) — dat is een vervolgkeuze bij de implementatie, niet nodig voor de eerste fix.

---

## 5. Wat bewust géén bevinding is

- **Donker thema als default**: bewuste merkkeuze ("Nachtprogramma"), door de eigenaar gekozen uit drie mockup-richtingen; consistent doorgevoerd, contrasten kloppen. Het taste-kader vraagt een licht/donker-paar voor consumentensites; voor dit merk is single-dark een gedocumenteerde uitzondering.
- **Drie gelijke kaartkolommen** op overzichtspagina's: dit zijn datalijsten (content-grid), niet de gebande "3 identieke feature-cards" uit marketingsecties.
- **Gecentreerde 404**: prima patroon voor een foutpagina.
- **Geen skeleton-loaders**: statische/ISR-architectuur levert complete HTML; er is niets om te skeletonen.
