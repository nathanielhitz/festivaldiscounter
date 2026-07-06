import type { Availability } from "../types";

// Bewust conservatieve regel: alleen kleine, ondubbelzinnige prijswijzigingen
// mogen automatisch live (rechtstreeks op de offer, met een 'approved'-rij als
// logregel voor het "Automatisch toegepast"-overzicht). Bij twijfel altijd naar
// de handmatige wachtrij in /admin/scrapers — nooit automatisch fout.
export const AUTO_APPROVE_MAX_DELTA = 0.3; // ±30% van de huidige prijs

export interface AutoApproveInput {
  currentPrice: number | null;
  scrapedPrice: number | null;
  scrapedAvailability: Availability | null;
}

export interface AutoApproveDecision {
  autoApprove: boolean;
  reason: string;
}

export function evaluateAutoApprove(input: AutoApproveInput): AutoApproveDecision {
  const { currentPrice, scrapedPrice, scrapedAvailability } = input;

  // Uitverkocht is het belangrijkste signaal dat een bezoeker ziet — en het
  // meest gevoelig voor een fout-positieve keyword-match. Altijd een mens laten
  // bevestigen.
  if (scrapedAvailability === "sold_out") {
    return { autoApprove: false, reason: "sold-out-signaal: altijd handmatig bevestigen" };
  }
  if (scrapedPrice === null) {
    return {
      autoApprove: false,
      reason: "geen prijs in de scrape (alleen beschikbaarheid): handmatig bevestigen",
    };
  }
  if (currentPrice === null) {
    return { autoApprove: false, reason: "eerste prijsmeting: geen bestaande prijs om tegen af te zetten" };
  }
  if (currentPrice <= 0) {
    return { autoApprove: false, reason: "huidige prijs is € 0: percentage niet betekenisvol" };
  }

  const delta = Math.abs(scrapedPrice - currentPrice) / currentPrice;
  if (delta > AUTO_APPROVE_MAX_DELTA) {
    return {
      autoApprove: false,
      reason: `prijswijziging ${Math.round(delta * 100)}% > drempel ${Math.round(AUTO_APPROVE_MAX_DELTA * 100)}%`,
    };
  }
  return { autoApprove: true, reason: `prijswijziging ${Math.round(delta * 100)}% binnen drempel` };
}
