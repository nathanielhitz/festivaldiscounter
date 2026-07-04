// Marktplaats-detectie (capaciteit B). We raken alleen crawlbare event-overzichts-
// pagina's aan (per robots.txt toegestaan) en scrapen GEEN prijs/listing-data —
// enkel: bestaat er een pagina voor dit festival? Zo ja, stel een affiliate-doorlink voor.

// Best-effort kandidaat-URL uit de festival-slug. Het exacte TicketSwap-URL-scheme
// wordt in Task 6 tegen de live site geverifieerd en hier zo nodig bijgesteld.
export function ticketswapCandidateUrl(slug: string): string {
  return `https://www.ticketswap.com/event/${slug}`;
}

// Wrapt de gevonden URL met het affiliate-ID. Zonder ID (goedkeuring nog niet
// binnen) geven we null terug: de suggestie krijgt dan alleen de kale detected_url.
export function ticketswapAffiliate(url: string, affiliateId: string | null): string | null {
  if (!affiliateId) return null;
  const u = new URL(url);
  u.searchParams.set("aff", affiliateId);
  return u.toString();
}

// Simpele naam-match als bevestiging dat de pagina echt over dit festival gaat.
// Review-gated, dus een grove check volstaat; de admin bevestigt handmatig.
export function matchesFestival(html: string, festivalName: string): boolean {
  const needle = festivalName.trim().toLowerCase();
  if (!needle) return false;
  return html.toLowerCase().includes(needle);
}
