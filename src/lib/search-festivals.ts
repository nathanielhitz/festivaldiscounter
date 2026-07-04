import { MAANDEN } from "./months";

// Lichte subset van Festival die de autocomplete client-side nodig heeft.
// Bewust minimaal: naam + datumbereik + slug voor de link.
export interface SearchFestival {
  slug: string;
  name: string;
  start_date: string; // ISO "2026-08-21"
  end_date: string;
}

export interface SearchResult {
  festival: SearchFestival;
  // 0 = naam-prefix, 1 = woord-prefix, 2 = naam-bevat, 3 = datum-match.
  // Lager = relevanter (bepaalt de sortering).
  rank: 0 | 1 | 2 | 3;
  // Char-range in festival.name die gehighlight moet worden (null bij datum-match).
  highlight: { start: number; end: number } | null;
}

// Normaliseer voor accent- en hoofdletterongevoelig matchen, én bouw een
// index-map terug naar de originele string zodat de highlight ook klopt als
// een teken door NFD-decompositie van lengte verandert (bv. "ß" → "ss").
function normalizeWithMap(input: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const stripped = input[i]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    for (const c of stripped) {
      norm += c;
      map.push(i);
    }
  }
  return { norm, map };
}

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Engelse maandnamen als alias, zodat "2 july" ook matcht (zie brief).
const ENGELSE_MAANDEN = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Vind een 1-based maandnummer voor een token; matcht op prefix van ≥3 letters
// ("aug" → augustus), zowel NL als EN. Retourneert 0 als het geen maand is.
function maandVanToken(token: string): number {
  if (token.length < 3) return 0;
  for (let i = 0; i < MAANDEN.length; i++) {
    if (MAANDEN[i].startsWith(token) || ENGELSE_MAANDEN[i].startsWith(token)) {
      return i + 1;
    }
  }
  return 0;
}

type DateQuery =
  | { kind: "year"; year: number }
  | { kind: "month"; month: number; year?: number }
  | { kind: "day"; day: number; month: number; year?: number };

// Probeer de query als datum-expressie te lezen: "juli", "juli 2026",
// "2 juli", "2 juli 2026", "2026" of "2026-07". Retourneert null als er geen
// bruikbaar datum-signaal (maand of jaar) in zit.
function parseDateQuery(normQuery: string): DateQuery | null {
  const iso = normQuery.match(/^(\d{4})-(\d{1,2})$/);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { kind: "month", month, year: Number(iso[1]) };
  }

  const tokens = normQuery.split(/[\s.,/-]+/).filter(Boolean);
  let month = 0;
  let year: number | undefined;
  let day: number | undefined;
  for (const t of tokens) {
    const m = maandVanToken(t);
    if (m) {
      month = m;
      continue;
    }
    if (/^\d+$/.test(t)) {
      const n = Number(t);
      if (t.length === 4 && n >= 2020 && n <= 2100) year = n;
      else if (n >= 1 && n <= 31) day = n;
    }
  }

  if (month && day) return { kind: "day", day, month, year };
  if (month) return { kind: "month", month, year };
  if (year) return { kind: "year", year };
  return null;
}

function isoParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

// Twee intervallen [aStart,aEnd] en [bStart,bEnd] (UTC-ms) overlappen?
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

// Matcht het festival-datumbereik met de datum-query? Bij een ontbrekend jaar
// toetsen we tegen de eigen jaren van het festival, zodat "juli" ook een
// juli-festival in 2026 vindt.
function matchesDate(fStart: string, fEnd: string, dq: DateQuery): boolean {
  const s = isoParts(fStart);
  const e = isoParts(fEnd);
  const fs = Date.UTC(s.y, s.m - 1, s.d);
  const fe = Date.UTC(e.y, e.m - 1, e.d);
  const jaren = [...new Set([s.y, e.y])];

  if (dq.kind === "year") {
    const ts = Date.UTC(dq.year, 0, 1);
    const te = Date.UTC(dq.year, 11, 31);
    return overlaps(fs, fe, ts, te);
  }

  if (dq.kind === "month") {
    const kandidaten = dq.year ? [dq.year] : jaren;
    return kandidaten.some((y) => {
      const ts = Date.UTC(y, dq.month - 1, 1);
      const te = Date.UTC(y, dq.month, 0); // dag 0 = laatste dag vorige maand
      return overlaps(fs, fe, ts, te);
    });
  }

  // kind === "day"
  const kandidaten = dq.year ? [dq.year] : jaren;
  return kandidaten.some((y) => {
    const t = Date.UTC(y, dq.month - 1, dq.day);
    return overlaps(fs, fe, t, t);
  });
}

// Bepaal de naam-match: prefix (0), woord-prefix (1) of bevat (2), plus de
// highlight-range. null als de naam de query niet bevat.
function matchName(
  name: string,
  normQuery: string
): { rank: 0 | 1 | 2; highlight: { start: number; end: number } } | null {
  const { norm, map } = normalizeWithMap(name);
  const idx = norm.indexOf(normQuery);
  if (idx === -1) return null;

  const start = map[idx];
  const end = map[idx + normQuery.length - 1] + 1;
  const highlight = { start, end };

  if (idx === 0) return { rank: 0, highlight };
  // Woordgrens ervoor → woord-prefix (bv. "rabbit" in "Down The Rabbit Hole").
  const isWordStart = /[^a-z0-9]/.test(norm[idx - 1]);
  return { rank: isWordStart ? 1 : 2, highlight };
}

/**
 * Live-autocomplete matcher voor de festival-zoekbalk.
 * Matcht op naam (prefix > woord-prefix > bevat) en op datum/periode,
 * sorteert op relevantie (rank) en daarna op startdatum (eerst) + naam,
 * en kapt af op `limit` (default 6).
 */
export function searchFestivals(
  festivals: SearchFestival[],
  query: string,
  limit = 6
): SearchResult[] {
  const normQuery = normalize(query.trim());
  if (!normQuery) return [];

  const dateQuery = parseDateQuery(normQuery);

  const results: SearchResult[] = [];
  for (const festival of festivals) {
    const nameMatch = matchName(festival.name, normQuery);
    if (nameMatch) {
      results.push({ festival, rank: nameMatch.rank, highlight: nameMatch.highlight });
    } else if (dateQuery && matchesDate(festival.start_date, festival.end_date, dateQuery)) {
      results.push({ festival, rank: 3, highlight: null });
    }
  }

  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.festival.start_date !== b.festival.start_date)
      return a.festival.start_date < b.festival.start_date ? -1 : 1;
    return a.festival.name.localeCompare(b.festival.name, "nl");
  });

  return results.slice(0, limit);
}
