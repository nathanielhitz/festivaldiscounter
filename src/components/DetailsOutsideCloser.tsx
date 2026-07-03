"use client";

import { useEffect } from "react";

export default function DetailsOutsideCloser({ groupName }: { groupName: string }) {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      document
        .querySelectorAll<HTMLDetailsElement>(`details[name="${groupName}"][open]`)
        .forEach((d) => {
          if (!d.contains(e.target as Node)) d.open = false;
        });
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [groupName]);

  return null;
}
