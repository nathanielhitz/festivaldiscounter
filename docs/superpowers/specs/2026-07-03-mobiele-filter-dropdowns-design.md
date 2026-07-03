# Mobiele filter-dropdowns — Ontwerp

Datum: 2026-07-03
Status: goedgekeurd door eigenaar

## Aanleiding

De filterbalk op `/festivals` (Maand, Genre, Provincie) toont elke categorie als een
grid van losse pill-buttons. Op mobiel neemt dit te veel verticale ruimte in — de
pagina is grotendeels filter voordat er een festivalkaart in beeld komt. Dit wordt
urgenter zodra de volledige dataset (75 festivals, meer genres/provincies) live gaat.

## Scope

**Alleen mobiel** (onder het `lg`-breakpoint). De bestaande pill-grid op desktop/tablet
blijft ongewijzigd — die is in de eerdere design-audit al beoordeeld en heeft op grotere
schermen geen ruimteprobleem.

## Gekozen aanpak

Native `<details>`-elementen met gedeeld `name`-attribuut voor accordion-exclusiviteit
(browser sluit automatisch de andere groepen zodra er één opengaat — geen React-state
nodig voor dit gedrag). Alleen "sluiten bij tap buiten het menu" vereist JavaScript;
dat wordt een klein, geïsoleerd client-onderdeel. De rest van de filterbalk blijft
server-gerenderd, consistent met de rest van de site (URL is en blijft de bron van
waarheid voor de actieve filters; een keuze is een normale link-navigatie).

**Overwogen alternatieven:**
- *Volledig custom React-bottom-sheet* (fixed paneel onderaan het scherm, eigen
  open/dicht-state, backdrop, scroll-lock): voelt dichter bij een native iOS-sheet aan,
  maar vereist aanzienlijk meer code (portal, z-index-afstemming met de bestaande sticky
  header) voor een grotendeels cosmetisch verschil. Niet gekozen.
- *Puur CSS `<details>` zonder JS*: voldoet niet aan de eis "sluit bij tap buiten het
  menu". Niet gekozen.

## Componenten

### `src/lib/filter-link.ts` (nieuw, pure functie, TDD)

Vervangt de bestaande inline `filterLink`-closure in `festivals/page.tsx` door een
gedeelde, testbare functie:

```ts
export interface FestivalFilterState {
  q?: string;
  maand?: string;
  genre?: string;
  provincie?: string;
}

export function buildFilterHref(
  current: FestivalFilterState,
  patch: Partial<FestivalFilterState>
): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/festivals?${qs}` : "/festivals";
}
```

Zowel de nieuwe mobiele dropdowns als de bestaande desktop-pills gebruiken deze functie
(één bron van waarheid voor URL-opbouw). Eigen Vitest-tests, zelfde patroon als de
overige modules in `src/lib/`.

### `src/components/FilterDropdown.tsx` (nieuw, Server Component)

Geen `"use client"` — dit is puur server-gerenderde HTML plus `<Link>`-navigatie.

```ts
interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  groupName: string;          // gedeeld met de andere dropdowns → accordion-exclusiviteit
  label: string;               // bv. "Maand"
  options: FilterOption[];     // ZONDER "Alle" — component voegt die zelf toe
  selectedValue: string | undefined;
  selectedLabel: string;       // bv. "Alle" of "juli 2026", voor de collapsed-weergave
  buildHref: (value: string | undefined) => string;
}
```

Rendert:
- `<details name={groupName}>` met afgeronde hoeken, `border-line`/`bg-panel` (bestaande
  tokens, geen nieuwe kleuren).
- `<summary>`: linker kant het groepslabel (kleine caption, zoals nu al bij de pill-groepen),
  rechter kant de huidige geselecteerde waarde + een chevron. Geen icon-library (project
  gebruikt er bewust geen, zie `MobileNav.tsx`): een kleine inline SVG (simpel chevron-pad)
  die roteert bij openen via de `group-open:`-variant op de `<details>` (`group`-class op
  het `<details>`-element).
- Een lijst `<Link>`'s eronder, elk met de optietekst en een `✓` bij de geselecteerde
  waarde (`aria-current="true"` op diezelfde link voor screenreaders — zelfde patroon als
  de bestaande desktop-pills).

Reusable: dezelfde component wordt drie keer gebruikt (Maand, Genre, Provincie) met een
eigen `options`-array per aanroep.

### `src/components/DetailsOutsideCloser.tsx` (nieuw, het enige Client Component)

```tsx
"use client";
import { useEffect } from "react";

export default function DetailsOutsideCloser({ groupName }: { groupName: string }) {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(`details[name="${groupName}"][open]`)
        .forEach((d) => {
          if (!d.contains(e.target as Node)) d.open = false;
        });
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [groupName]);
  return null;
}
```

Rendert geen zichtbare UI; wordt één keer naast de drie `FilterDropdown`'s geplaatst.
Sluit géén enkele `<details>` bij een normale linknavigatie nodig — na het kiezen van een
optie rendert de pagina opnieuw zonder `open`-attribuut, dus het paneel staat dan al
vanzelf dicht.

## Integratie in `src/app/festivals/page.tsx`

- De bestaande drie inline pill-blokken (Maand/Genre/Provincie) worden gewrapt:
  - Op mobiel (`lg:hidden`): drie `<FilterDropdown>`'s + één `<DetailsOutsideCloser>`.
  - Op desktop (`hidden lg:flex`, ongewijzigde opmaak): de huidige pill-`<Link>`'s, nu
    gevoed door dezelfde `buildFilterHref`-functie in plaats van de inline closure.
- De data die de dropdowns nodig hebben (maanden/genres/provincies-lijsten, huidige
  geselecteerde waarden, labels) bestaat al in de pagina — geen nieuwe queries.

## Foutafhandeling

- Een lege optielijst voor een categorie (bv. geen genres in de huidige dataset) wordt
  niet apart afgevangen — dat is ook in de huidige pill-implementatie geen speciaal geval
  en komt in de praktijk niet voor zolang er gepubliceerde festivals zijn.
- Werkt zonder JavaScript voor het kernpad (open/dicht en de accordion-exclusiviteit zijn
  native HTML-gedrag); alleen "sluiten bij tap buiten het menu" vereist JS en degradeert
  netjes (het paneel blijft dan gewoon open tot een keuze of nieuwe tap op de summary).

## Testen

- `buildFilterHref`: Vitest-tests voor samenvoegen van bestaande + nieuwe filterwaarden,
  weglaten van lege/undefined waarden, en het speciale geval "geen enkele filter actief"
  (→ kaal `/festivals`).
- Handmatige/Playwright-verificatie na implementatie: op 375px opent één dropdown,
  sluit de andere twee automatisch; checkmark staat bij de juiste optie; tap buiten het
  paneel sluit het; kiezen van een optie navigeert en sluit het paneel; desktop (1440px)
  toont nog steeds de ongewijzigde pill-rijen.
