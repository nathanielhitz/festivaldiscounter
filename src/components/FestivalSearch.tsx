"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateRange } from "@/lib/format";
import { searchFestivals, type SearchFestival } from "@/lib/search-festivals";

const DEBOUNCE_MS = 180;

// Rendert de festivalnaam met het gematchte deel in mint (accent).
function highlightName(name: string, hl: { start: number; end: number } | null) {
  if (!hl) return name;
  return (
    <>
      {name.slice(0, hl.start)}
      <mark className="bg-transparent text-accent">{name.slice(hl.start, hl.end)}</mark>
      {name.slice(hl.end)}
    </>
  );
}

/**
 * Live-autocomplete zoekbalk (combobox/listbox-patroon) voor de homepage-hero.
 * Filtert de meegegeven festivals volledig client-side; geen extra API-calls.
 * Zonder JS blijft het een gewoon <form action="/festivals"> dat naar de
 * server-gefilterde overzichtspagina navigeert.
 */
export default function FestivalSearch({ festivals }: { festivals: SearchFestival[] }) {
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1); // -1 = geen suggestie geselecteerd

  // Debounce de input voordat we filteren.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const results = useMemo(
    () => searchFestivals(festivals, debounced),
    [festivals, debounced]
  );

  const hasQuery = debounced.trim().length > 0;
  const open = focused && hasQuery;
  const showList = open && results.length > 0;

  // Reset de actieve suggestie zodra de resultaten wijzigen.
  useEffect(() => setActive(-1), [debounced]);

  // Sluit bij tap/klik buiten de zoekbalk (zelfde patroon als DetailsOutsideCloser).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Houd de actieve optie in beeld bij toetsnavigatie.
  useEffect(() => {
    if (active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function goTo(f: SearchFestival) {
    setFocused(false);
    router.push(`/festivals/${f.slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setFocused(false);
      return;
    }
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      // Enter mét geselecteerde suggestie → direct naar detailpagina.
      // Zonder selectie valt Enter door naar de native form-submit (/festivals?q=).
      e.preventDefault();
      goTo(results[active].festival);
    }
  }

  return (
    <div ref={containerRef} className="relative mt-8 max-w-xl">
      <form
        action="/festivals"
        role="search"
        className="flex gap-1.5 rounded border border-line bg-panel p-1.5"
        onSubmit={() => setFocused(false)}
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder="Zoek een festival…"
          aria-label="Zoek een festival"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
          className="min-w-0 flex-1 rounded-sm bg-transparent px-3.5 py-3 text-ink placeholder:text-mut focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
        <button className="rounded-sm bg-accent px-6 font-bold text-ground">Zoek</button>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded border border-line bg-panel shadow-2xl shadow-black/50">
          {results.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-mut">Geen festivals gevonden.</p>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Festival-suggesties"
              className="max-h-[min(60vh,22rem)] divide-y divide-line overflow-y-auto overscroll-contain"
            >
              {results.map((r, i) => (
                <li
                  key={r.festival.slug}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // pointerdown i.p.v. click: vuurt vóór de input-blur, zodat de
                  // navigatie niet verloren gaat wanneer de dropdown sluit.
                  onPointerDown={(e) => {
                    e.preventDefault();
                    goTo(r.festival);
                  }}
                  onMouseMove={() => setActive(i)}
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2.5 ${
                    i === active ? "bg-accent/10" : "hover:bg-ground/40"
                  }`}
                >
                  <span className="truncate font-semibold text-ink">
                    {highlightName(r.festival.name, r.highlight)}
                  </span>
                  <span className="shrink-0 text-sm text-mut">
                    {formatDateRange(r.festival.start_date, r.festival.end_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
