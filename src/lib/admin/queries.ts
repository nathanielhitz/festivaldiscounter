import "server-only";
import { supabase } from "../supabase";
import type { Festival, FestivalWithOffers } from "../types";

// Voor de lijstweergave: festival + aantal offers (PostgREST count-embedding).
export interface AdminFestivalRow extends Festival {
  ticket_offers: { count: number }[];
}

export async function getAllFestivalsForAdmin(): Promise<AdminFestivalRow[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*, ticket_offers(count)")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminFestivalRow[];
}

export async function getFestivalForAdmin(id: string): Promise<FestivalWithOffers | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*, ticket_offers(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as FestivalWithOffers | null;
}

export async function getDraftFestivalsForAdmin(): Promise<FestivalWithOffers[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*, ticket_offers(*)")
    .eq("published", false)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FestivalWithOffers[];
}

export async function getAdminCounts(): Promise<{ published: number; draft: number; total: number }> {
  const totalRes = await supabase.from("festivals").select("*", { count: "exact", head: true });
  if (totalRes.error) throw totalRes.error;
  const pubRes = await supabase
    .from("festivals")
    .select("*", { count: "exact", head: true })
    .eq("published", true);
  if (pubRes.error) throw pubRes.error;
  const total = totalRes.count ?? 0;
  const published = pubRes.count ?? 0;
  return { published, draft: total - published, total };
}

// Helper voor de lijst: aantal offers uit de count-embedding halen.
export function offerCount(row: AdminFestivalRow): number {
  return row.ticket_offers[0]?.count ?? 0;
}
