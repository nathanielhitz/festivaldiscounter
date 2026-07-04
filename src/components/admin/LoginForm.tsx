"use client";
import { useActionState } from "react";
import { loginAction } from "@/lib/admin/auth-actions";
import type { ActionState } from "@/lib/admin/types";

const initial: ActionState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        required
        placeholder="Wachtwoord"
        className="rounded border border-line bg-panel px-3 py-2"
      />
      {state.error && <p className="text-sm text-warn">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-sm bg-accent px-4 py-2 font-bold text-ground disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
