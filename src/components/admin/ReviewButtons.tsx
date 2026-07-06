"use client";
import { useTransition } from "react";

export default function ReviewButtons({
  onApprove,
  onReject,
  approveLabel = "Goedkeuren",
  rejectLabel = "Afkeuren",
}: {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  approveLabel?: string;
  rejectLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {/* py-2.5 + min-w houdt de knoppen op mobiel boven de aanbevolen 44px-duimmaat. */}
      <button
        disabled={pending}
        onClick={() => start(() => onApprove())}
        className="min-w-[110px] flex-1 rounded-sm bg-accent px-4 py-2.5 text-sm font-bold text-ground disabled:opacity-60 sm:flex-none"
      >
        {pending ? "Bezig…" : approveLabel}
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => onReject())}
        className="min-w-[110px] flex-1 rounded-sm border border-line px-4 py-2.5 text-sm font-semibold text-mut disabled:opacity-60 sm:flex-none"
      >
        {rejectLabel}
      </button>
    </div>
  );
}
