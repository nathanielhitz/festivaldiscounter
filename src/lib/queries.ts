import { supabase } from "./supabase";
import type { Article, FestivalWithOffers, TicketOffer } from "./types";

const FESTIVAL_SELECT = "*, ticket_offers(*)";

export async function getPublishedFestivals(): Promise<FestivalWithOffers[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("published", true)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FestivalWithOffers[];
}

export async function getUpcomingFestivals(limit?: number): Promise<FestivalWithOffers[]> {
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("published", true)
    .gte("end_date", today)
    .order("start_date", { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FestivalWithOffers[];
}

export async function getFestivalBySlug(slug: string): Promise<FestivalWithOffers | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data as FestivalWithOffers | null;
}

export async function getPublishedArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return data as Article | null;
}

export async function getOfferById(id: string): Promise<TicketOffer | null> {
  const { data, error } = await supabase
    .from("ticket_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as TicketOffer | null;
}

export async function logClick(offerId: string, referer: string | null): Promise<void> {
  const { error } = await supabase.from("clicks").insert({ offer_id: offerId, referer });
  if (error) throw error;
}
