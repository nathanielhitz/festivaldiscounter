"use client";
import { useTransition } from "react";
import { setFestivalPublished } from "@/lib/admin/festival-actions";

export default function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setFestivalPublished(id, !published))}
      className={`rounded-sm px-2 py-1 text-xs font-bold disabled:opacity-60 ${
        published ? "bg-accent text-ground" : "border border-line text-mut"
      }`}
    >
      {published ? "Gepubliceerd" : "Concept"}
    </button>
  );
}
