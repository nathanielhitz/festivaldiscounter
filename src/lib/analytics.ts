import { track } from "@vercel/analytics";

// Custom event voor een klik op "Bekijk tickets". Vercel Web Analytics verstuurt
// alleen op een Vercel-deploy (in lokale dev gebeurt er niets schadelijks). De
// server-side klik-logging naar Supabase (/uit/[offerId]) blijft de bron van
// waarheid; dit event geeft dezelfde klik ook zichtbaarheid in de analytics.
export function trackTicketClick(props: { festival: string; aanbieder: string }) {
  track("Ticket klik", props);
}
