"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
import { requireAdmin } from "./session";
import { parseFestivalForm } from "./validation";
import { revalidatePublicFestivalPages } from "./revalidate";
import type { ActionState } from "./types";

export async function upsertFestival(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseFestivalForm(form);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const id = String(form.get("id") ?? "").trim();
  const payload = { ...parsed.data, updated_at: new Date().toISOString() };
  const { error } = id
    ? await supabase.from("festivals").update(payload).eq("id", id)
    : await supabase.from("festivals").insert(payload);

  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: "Deze slug bestaat al." } };
    return { ok: false, error: `Opslaan mislukt: ${error.message}` };
  }
  revalidatePublicFestivalPages();
  revalidatePath("/admin/festivals");
  redirect("/admin/festivals");
}

export async function setFestivalPublished(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  const { error } = await supabase
    .from("festivals")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePublicFestivalPages();
  revalidatePath("/admin/festivals");
  revalidatePath("/admin/review");
}

export async function deleteFestival(id: string): Promise<void> {
  await requireAdmin();
  // ticket_offers + clicks cascaden via de FK-migratie (Task 1).
  const { error } = await supabase.from("festivals").delete().eq("id", id);
  if (error) throw error;
  revalidatePublicFestivalPages();
  revalidatePath("/admin/festivals");
  revalidatePath("/admin/review");
  redirect("/admin/festivals");
}
