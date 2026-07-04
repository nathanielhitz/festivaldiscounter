"use server";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
import { requireAdmin } from "./session";
import { parseOfferForm } from "./validation";
import { revalidatePublicFestivalPages } from "./revalidate";
import type { ActionState } from "./types";

export async function upsertOffer(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseOfferForm(form);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const id = String(form.get("id") ?? "").trim();
  const { error } = id
    ? await supabase.from("ticket_offers").update(parsed.data).eq("id", id)
    : await supabase.from("ticket_offers").insert(parsed.data);
  if (error) return { ok: false, error: `Opslaan mislukt: ${error.message}` };

  revalidatePublicFestivalPages();
  revalidatePath(`/admin/festivals/${parsed.data.festival_id}`);
  return { ok: true };
}

export async function deleteOffer(id: string, festivalId: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabase.from("ticket_offers").delete().eq("id", id);
  if (error) throw error;
  revalidatePublicFestivalPages();
  revalidatePath(`/admin/festivals/${festivalId}`);
}
