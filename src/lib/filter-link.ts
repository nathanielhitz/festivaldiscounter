export interface FestivalFilterState {
  q?: string;
  maand?: string;
  genre?: string;
  provincie?: string;
}

// Bouwt de href voor /festivals met bestaande filters + een patch samengevoegd.
// Lege/undefined waarden vallen weg uit de querystring; blijft er niets over,
// dan is het resultaat de kale /festivals-URL.
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
