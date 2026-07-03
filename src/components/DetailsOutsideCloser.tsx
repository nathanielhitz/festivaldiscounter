"use client";

import { useEffect } from "react";

// Vertrouwt op de exclusieve <details name> group-semantiek (Chrome 120+,
// Safari 17.4+, Firefox 125+). Op oudere browsers regelt dit component nog
// wel "sluit bij tap buiten de groep", maar niet de accordion-exclusiviteit
// zelf; twee panelen kunnen daar dan tegelijk open blijven staan. Acceptabel
// gezien de doelgroep, maar bewust — niet per ongeluk aanpassen.
export default function DetailsOutsideCloser({ groupName }: { groupName: string }) {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const groupMembers = document.querySelectorAll<HTMLDetailsElement>(
        `details[name="${groupName}"]`
      );
      const target = e.target as Node;
      // Tap binnen een details uit deze groep (open of dicht, bv. de summary van
      // een ANDER paneel): laat het native exclusieve group-gedrag dit afhandelen,
      // niet zelf ingrijpen. Alleen een tap écht buiten de hele filtergroep sluit
      // alle open panelen.
      const isInsideGroup = [...groupMembers].some((d) => d.contains(target));
      if (isInsideGroup) return;
      groupMembers.forEach((d) => {
        if (d.open) d.open = false;
      });
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [groupName]);

  return null;
}
