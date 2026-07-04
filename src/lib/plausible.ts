declare global {
  interface Window {
    // Aanwezig zodra het Plausible-script (of de init-stub in layout.tsx) geladen
    // is. Optioneel: als NEXT_PUBLIC_PLAUSIBLE_DOMAIN niet gezet is, bestaat het niet.
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void;
  }
}

// Custom event voor een klik op "Bekijk tickets". Faalt stil als Plausible niet
// geladen is (lokaal/preview zonder domein) — tracking mag een klik nooit blokkeren.
// De server-side klik-logging naar Supabase (/uit/[offerId]) blijft de bron van
// waarheid; dit event geeft dezelfde klik ook zichtbaarheid in Plausible.
export function trackTicketClick(props: { festival: string; aanbieder: string }) {
  window.plausible?.("Ticket klik", { props });
}

export {};
