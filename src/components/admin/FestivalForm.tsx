"use client";
import { useActionState } from "react";
import { upsertFestival } from "@/lib/admin/festival-actions";
import { FESTIVAL_STATUSES } from "@/lib/admin/validation";
import type { ActionState } from "@/lib/admin/types";
import type { Festival } from "@/lib/types";

const initial: ActionState = {};

function Field({
  label, name, defaultValue, error, type = "text", required = false,
}: {
  label: string; name: string; defaultValue?: string | null; error?: string;
  type?: string; required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}{required && " *"}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded border border-line bg-panel px-3 py-2"
      />
      {error && <span className="text-xs text-warn">{error}</span>}
    </label>
  );
}

export default function FestivalForm({ festival }: { festival?: Festival }) {
  const [state, action, pending] = useActionState(upsertFestival, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {festival && <input type="hidden" name="id" value={festival.id} />}
      {state.error && <p className="rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">{state.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Naam" name="name" defaultValue={festival?.name} error={e.name} required />
        <Field label="Slug" name="slug" defaultValue={festival?.slug} error={e.slug} required />
        <Field label="Plaats" name="city" defaultValue={festival?.city} error={e.city} required />
        <Field label="Terrein/locatie" name="venue" defaultValue={festival?.venue} error={e.venue} />
        <Field label="Provincie" name="province" defaultValue={festival?.province} error={e.province} required />
        <Field label="Land" name="country" defaultValue={festival?.country ?? "NL"} error={e.country} />
        <Field label="Startdatum" name="start_date" type="date" defaultValue={festival?.start_date} error={e.start_date} required />
        <Field label="Einddatum" name="end_date" type="date" defaultValue={festival?.end_date} error={e.end_date} required />
        <Field label="Website-URL" name="website_url" defaultValue={festival?.website_url} error={e.website_url} />
        <Field label="Afbeelding-URL" name="image_url" defaultValue={festival?.image_url} error={e.image_url} />
        <Field label="Genres (komma-gescheiden)" name="genres" defaultValue={festival?.genres.join(", ")} error={e.genres} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Status *</span>
          <select name="status" defaultValue={festival?.status ?? "announced"} className="rounded border border-line bg-panel px-3 py-2">
            {FESTIVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {e.status && <span className="text-xs text-warn">{e.status}</span>}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Beschrijving *</span>
        <textarea name="description" defaultValue={festival?.description ?? ""} rows={6} required
          className="rounded border border-line bg-panel px-3 py-2" />
        {e.description && <span className="text-xs text-warn">{e.description}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Line-up (vrij tekstveld, leeg = verborgen)</span>
        <textarea name="lineup" defaultValue={festival?.lineup ?? ""} rows={3}
          className="rounded border border-line bg-panel px-3 py-2" />
      </label>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="published" defaultChecked={festival?.published ?? false} />
        Gepubliceerd
      </label>

      <button disabled={pending} className="self-start rounded-sm bg-accent px-5 py-2.5 font-bold text-ground disabled:opacity-60">
        {pending ? "Opslaan…" : "Opslaan"}
      </button>
    </form>
  );
}
