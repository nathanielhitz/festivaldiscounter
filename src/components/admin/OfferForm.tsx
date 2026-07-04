"use client";
import { useActionState } from "react";
import { upsertOffer, deleteOffer } from "@/lib/admin/offer-actions";
import { PROVIDERS, AVAILABILITIES } from "@/lib/admin/validation";
import DeleteButton from "@/components/admin/DeleteButton";
import type { ActionState } from "@/lib/admin/types";
import type { TicketOffer } from "@/lib/types";

const initial: ActionState = {};

export default function OfferForm({
  festivalId,
  offer,
}: {
  festivalId: string;
  offer?: TicketOffer;
}) {
  const [state, action, pending] = useActionState(upsertOffer, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid items-end gap-2 rounded border border-line p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
      <input type="hidden" name="festival_id" value={festivalId} />
      {offer && <input type="hidden" name="id" value={offer.id} />}

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">Aanbieder</span>
        <select name="provider" defaultValue={offer?.provider ?? "official"} className="rounded border border-line bg-panel px-2 py-1.5">
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">URL</span>
        <input name="url" defaultValue={offer?.url ?? ""} className="rounded border border-line bg-panel px-2 py-1.5" />
        {e.url && <span className="text-warn">{e.url}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">Prijs vanaf</span>
        <input name="price_from" defaultValue={offer?.price_from ?? ""} placeholder="bv. 79,50"
          className="w-24 rounded border border-line bg-panel px-2 py-1.5" />
        {e.price_from && <span className="text-warn">{e.price_from}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold">Beschikbaarheid</span>
        <select name="availability" defaultValue={offer?.availability ?? "unknown"} className="rounded border border-line bg-panel px-2 py-1.5">
          {AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <input name="affiliate_url" defaultValue={offer?.affiliate_url ?? ""} placeholder="affiliate-URL (optioneel)"
          className="rounded border border-line bg-panel px-2 py-1.5 text-xs" />
        <div className="flex gap-2">
          <button disabled={pending} className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-ground disabled:opacity-60">
            {offer ? "Bijwerken" : "Toevoegen"}
          </button>
          {offer && <DeleteButton onDelete={deleteOffer.bind(null, offer.id, festivalId)} label="Verwijder offer" />}
        </div>
        {state.ok && <span className="text-xs text-accent">Opgeslagen.</span>}
        {state.error && <span className="text-xs text-warn">{state.error}</span>}
      </div>
    </form>
  );
}
