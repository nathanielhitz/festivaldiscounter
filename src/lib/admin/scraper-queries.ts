import "server-only";
import { supabase } from "../supabase";
import type { Availability, PriceCheck, Provider } from "../types";

// --- Reads voor de reviewpagina --------------------------------------------

export interface PendingPriceCheck {
  id: string;
  scraped_price: number | null;
  scraped_availability: Availability | null;
  checked_at: string;
  ticket_offers: {
    provider: Provider;
    url: string;
    price_from: number | null;
    availability: Availability;
    festivals: { id: string; name: string; slug: string } | null;
  } | null;
}

export interface PendingOfferSuggestion {
  id: string;
  provider: Provider;
  detected_url: string;
  affiliate_url: string | null;
  detected_at: string;
  festivals: { id: string; name: string; slug: string } | null;
}

export interface FailedPriceCheck {
  id: string;
  failure_reason: string | null;
  checked_at: string;
  ticket_offers: { url: string; festivals: { name: string } | null } | null;
}

export async function getPendingPriceChecks(): Promise<PendingPriceCheck[]> {
  const { data, error } = await supabase
    .from("price_checks")
    .select(
      "id, scraped_price, scraped_availability, checked_at, ticket_offers(provider, url, price_from, availability, festivals(id, name, slug))"
    )
    .eq("status", "pending")
    .order("checked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PendingPriceCheck[];
}

export async function getPendingOfferSuggestions(): Promise<PendingOfferSuggestion[]> {
  const { data, error } = await supabase
    .from("offer_suggestions")
    .select("id, provider, detected_url, affiliate_url, detected_at, festivals(id, name, slug)")
    .eq("status", "pending")
    .order("detected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PendingOfferSuggestion[];
}

export async function getFailedPriceChecks(): Promise<FailedPriceCheck[]> {
  const { data, error } = await supabase
    .from("price_checks")
    .select("id, failure_reason, checked_at, ticket_offers(url, festivals(name))")
    .eq("status", "failed")
    .order("checked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FailedPriceCheck[];
}

// --- Reads/writes voor de cron ---------------------------------------------

// Zoekt de `official`-offer + festivalnaam bij een slug (capaciteit A).
export async function getOfficialOfferForSlug(
  slug: string
): Promise<{ offerId: string; url: string; festivalName: string } | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select("name, ticket_offers(id, url, provider)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const offers = (data.ticket_offers ?? []) as { id: string; url: string; provider: Provider }[];
  const official = offers.find((o) => o.provider === "official");
  if (!official) return null;
  return { offerId: official.id, url: official.url, festivalName: data.name as string };
}

export interface MarketplaceCandidate {
  id: string;
  name: string;
  slug: string;
}

// Gepubliceerde festivals zonder ticketswap-offer én zonder bestaande suggestie
// voor ticketswap (elke status) — die willen we (opnieuw) checken (capaciteit B).
export async function getFestivalsForMarketplaceCheck(): Promise<MarketplaceCandidate[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("id, name, slug, ticket_offers(provider), offer_suggestions(provider)")
    .eq("published", true);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    ticket_offers: { provider: Provider }[];
    offer_suggestions: { provider: Provider }[];
  }[];
  return rows
    .filter(
      (f) =>
        !f.ticket_offers.some((o) => o.provider === "ticketswap") &&
        !f.offer_suggestions.some((s) => s.provider === "ticketswap")
    )
    .map((f) => ({ id: f.id, name: f.name, slug: f.slug }));
}

// Vervang de vorige, nog niet-beoordeelde auto-rijen voor deze offer, zodat de
// wachtrij niet volloopt met één rij per dag.
export async function supersedeAutoPriceChecks(offerId: string): Promise<void> {
  const { error } = await supabase
    .from("price_checks")
    .delete()
    .eq("ticket_offer_id", offerId)
    .in("status", ["pending", "failed"]);
  if (error) throw error;
}

export async function insertPriceCheck(row: {
  ticket_offer_id: string;
  status: "pending" | "failed";
  scraped_price: number | null;
  scraped_availability: Availability | null;
  failure_reason: string | null;
}): Promise<void> {
  const { error } = await supabase.from("price_checks").insert(row);
  if (error) throw error;
}

export async function insertOfferSuggestion(row: {
  festival_id: string;
  provider: Provider;
  detected_url: string;
  affiliate_url: string | null;
}): Promise<void> {
  // Negeer duplicaten (unieke festival+provider): dubbele detectie is geen fout.
  const { error } = await supabase.from("offer_suggestions").insert(row);
  if (error && error.code !== "23505") throw error;
}

// --- Writes voor de review-acties ------------------------------------------

export async function getPriceCheckById(id: string): Promise<PriceCheck | null> {
  const { data, error } = await supabase
    .from("price_checks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PriceCheck | null) ?? null;
}

export async function updateOfferPriceAvailability(
  offerId: string,
  values: { price_from: number | null; availability: Availability }
): Promise<void> {
  const { error } = await supabase
    .from("ticket_offers")
    .update({ ...values, last_checked_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) throw error;
}

export async function updatePriceCheckStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  const { error } = await supabase
    .from("price_checks")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
    .eq("id", id);
  if (error) throw error;
}

export async function getOfferSuggestionById(id: string) {
  const { data, error } = await supabase
    .from("offer_suggestions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as import("../types").OfferSuggestion | null;
}

export async function insertTicketOfferFromSuggestion(row: {
  festival_id: string;
  provider: Provider;
  url: string;
  affiliate_url: string | null;
}): Promise<void> {
  const { error } = await supabase.from("ticket_offers").insert({
    ...row,
    currency: "EUR",
    price_from: null,
    availability: "unknown",
    last_checked_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateOfferSuggestionStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  const { error } = await supabase
    .from("offer_suggestions")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
    .eq("id", id);
  if (error) throw error;
}
