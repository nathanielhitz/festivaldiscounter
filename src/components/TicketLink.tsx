"use client";

import { trackTicketClick } from "@/lib/plausible";

// De affiliate-link uit TicketComparator, als client component zodat een klik
// ook een Plausible-event kan afvuren. De navigatie zelf is een gewone <a href>
// naar /uit/[offerId] (server-redirect + Supabase-logging); Plausible verstuurt
// het event via navigator.sendBeacon, dus het overleeft het verlaten van de pagina.
export default function TicketLink({
  offerId,
  festival,
  aanbieder,
}: {
  offerId: string;
  festival: string;
  aanbieder: string;
}) {
  return (
    <a
      href={`/uit/${offerId}`}
      rel="sponsored nofollow"
      aria-label={`Bekijk tickets bij ${aanbieder}`}
      onClick={() => trackTicketClick({ festival, aanbieder })}
      className="whitespace-nowrap rounded-sm bg-accent px-4 py-2.5 text-center text-sm font-bold text-ground hover:bg-accent-deep"
    >
      Bekijk tickets
    </a>
  );
}
