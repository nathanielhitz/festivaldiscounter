export const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function monthSlug(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  return `${MAANDEN[month - 1]}-${year}`;
}

export function parseMonthSlug(slug: string): { year: number; month: number } | null {
  const m = slug.match(/^([a-z]+)-(\d{4})$/);
  if (!m) return null;
  const month = MAANDEN.indexOf(m[1]);
  if (month === -1) return null;
  const year = Number(m[2]);
  if (year < 2020 || year > 2100) return null;
  return { year, month };
}

export function monthLabel(slug: string): string | null {
  const parsed = parseMonthSlug(slug);
  return parsed ? `${MAANDEN[parsed.month]} ${parsed.year}` : null;
}

// "Vandaag" in Nederlandse tijd (en-CA formatteert als YYYY-MM-DD).
// UTC-vandaag loopt tussen 00:00–02:00 NL-tijd een dag achter.
export function todayAmsterdam(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

export function monthsWithFestivals(festivals: Array<{ start_date: string }>): string[] {
  const keys = new Set(festivals.map((f) => f.start_date.slice(0, 7))); // "2026-08"
  return [...keys].sort().map((k) => monthSlug(`${k}-01`));
}
