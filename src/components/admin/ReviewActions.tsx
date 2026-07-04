"use client";
import Link from "next/link";
import { useTransition } from "react";
import { setFestivalPublished, deleteFestival } from "@/lib/admin/festival-actions";
import DeleteButton from "@/components/admin/DeleteButton";

export default function ReviewActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => setFestivalPublished(id, true))}
        className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-ground disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Publiceer"}
      </button>
      <Link href={`/admin/festivals/${id}`} className="rounded-sm border border-line px-3 py-1.5 text-xs font-semibold">
        Bewerken
      </Link>
      {/* "Overslaan" = niets doen; het festival blijft concept. */}
      <DeleteButton onDelete={deleteFestival.bind(null, id)} />
    </div>
  );
}
