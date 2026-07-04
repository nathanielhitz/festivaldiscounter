"use client";
import { useTransition } from "react";

export default function DeleteButton({
  onDelete,
  label = "Verwijder",
  confirmText = "Zeker weten verwijderen? Dit kan niet ongedaan gemaakt worden.",
}: {
  onDelete: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm(confirmText)) start(() => onDelete());
      }}
      className="rounded-sm border border-warn/50 px-2 py-1 text-xs font-semibold text-warn disabled:opacity-60"
    >
      {pending ? "Bezig…" : label}
    </button>
  );
}
