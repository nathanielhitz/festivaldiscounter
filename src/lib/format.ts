import type { Availability, Provider } from "./types";

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function parts(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

export function formatDateRange(start: string, end: string): string {
  const s = parts(start);
  const e = parts(end);
  if (start === end) return `${s.day} ${MAANDEN[s.month]} ${s.year}`;
  if (s.month === e.month && s.year === e.year)
    return `${s.day}–${e.day} ${MAANDEN[s.month]} ${s.year}`;
  return `${s.day} ${MAANDEN[s.month]} – ${e.day} ${MAANDEN[e.month]} ${e.year}`;
}

export function formatPrice(amount: number): string {
  const heleEuros = Math.round(amount * 100) % 100 === 0;
  const num = amount.toLocaleString("nl-NL", {
    minimumFractionDigits: heleEuros ? 0 : 2,
    maximumFractionDigits: heleEuros ? 0 : 2,
  });
  return `€ ${num}`;
}

export function formatCheckedDate(iso: string): string {
  const p = parts(iso);
  return `${p.day} ${MAANDEN[p.month]} ${p.year}`;
}

export function minPrice(
  offers: Array<{ price_from: number | null; availability: Availability }>
): number | null {
  const prijzen = offers
    .filter((o) => o.price_from != null && o.availability !== "sold_out")
    .map((o) => Number(o.price_from));
  return prijzen.length ? Math.min(...prijzen) : null;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  official: "Officiële verkoop",
  ticketswap: "TicketSwap",
  gigsberg: "Gigsberg",
  ticombo: "Ticombo",
};

export const PROVIDER_SUB: Record<Provider, string> = {
  official: "via festivalorganisatie",
  ticketswap: "doorverkoop · veilig via SecureSwap",
  gigsberg: "doorverkoop · internationale marktplaats",
  ticombo: "doorverkoop · internationale marktplaats",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Beschikbaar",
  limited: "Bijna uitverkocht",
  sold_out: "Uitverkocht",
  unknown: "Beschikbaarheid onbekend",
};
