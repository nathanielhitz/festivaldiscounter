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
      <button
        disabled={pending}
        onClick={() => start(() => onApprove())}
        className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold text-ground disabled:opacity-60"
      >
        {pending ? "Bezig…" : approveLabel}
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => onReject())}
        className="rounded-sm border border-line px-3 py-1.5 text-xs font-semibold text-mut disabled:opacity-60"
      >
        {rejectLabel}
      </button>
    </div>
  );
}
