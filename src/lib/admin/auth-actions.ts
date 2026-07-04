"use server";
import { redirect } from "next/navigation";
import { checkPassword } from "./auth";
import { adminPassword, requireAdmin, startSession, endSession } from "./session";
import type { ActionState } from "./types";

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get("password") ?? "");
  // Kleine vaste vertraging tegen brute-force (bewuste keuze, geen volledige rate-limiter).
  await new Promise((r) => setTimeout(r, 500));
  if (!checkPassword(password, adminPassword())) {
    return { ok: false, error: "Onjuist wachtwoord." };
  }
  await startSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await requireAdmin();
  await endSession();
  redirect("/admin/login");
}
