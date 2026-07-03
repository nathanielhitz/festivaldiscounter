import type { Festival, TicketOffer } from "./types";
import { cheapestOffer, formatDateRange, formatPrice, PROVIDER_LABELS } from "./format";

export interface FaqItem {
  question: string;
  answer: string;
}

// Statusafhankelijk vraag/antwoord-paar; null betekent: weglaten (bv. voorbij festival).
function statusItem(festival: Festival): FaqItem | null {
  switch (festival.status) {
    case "past":
      return null;
    case "cancelled":
      return {
        question: `Gaat ${festival.name} nog door?`,
        answer: `Nee, ${festival.name} is afgelast. Voor terugbetaling van je ticket kun je terecht bij het verkooppunt waar je het ticket hebt gekocht.`,
      };
    case "sold_out":
      return {
        question: `Is ${festival.name} uitverkocht?`,
        answer: `Ja, ${festival.name} is officieel uitverkocht. Via doorverkoopplatforms zoals TicketSwap komen vaak nog tickets beschikbaar.`,
      };
    case "announced":
      return {
        question: `Is ${festival.name} uitverkocht?`,
        answer: `Nee, de officiële kaartverkoop voor ${festival.name} is nog niet gestart.`,
      };
    case "tickets_live":
      return {
        question: `Is ${festival.name} uitverkocht?`,
        answer: `Nee, ${festival.name} is niet uitverkocht. Vergelijk de actuele aanbieders op deze pagina voor de beste prijs.`,
      };
  }
}

export function buildFaq(festival: Festival, offers: TicketOffer[]): FaqItem[] {
  const jaar = festival.start_date.slice(0, 4);
  const items: FaqItem[] = [];

  items.push({
    question: `Wanneer is ${festival.name} ${jaar}?`,
    answer: `${festival.name} vindt plaats op ${formatDateRange(festival.start_date, festival.end_date)}.`,
  });

  items.push({
    question: `Waar is ${festival.name}?`,
    answer: `${festival.name} vindt plaats in ${festival.city} (${festival.province})${
      festival.venue ? `, op ${festival.venue}` : ""
    }.`,
  });

  // Geen prijsvraag voor afgelaste of voorbije festivals: een "vanaf-prijs"
  // is daar misleidend, ook als er nog geprijsde offers in de data staan.
  const prijsRelevant = festival.status !== "cancelled" && festival.status !== "past";
  const goedkoopste = prijsRelevant ? cheapestOffer(offers) : null;
  if (goedkoopste) {
    items.push({
      question: `Wat kost een ticket voor ${festival.name}?`,
      answer: `Tickets voor ${festival.name} zijn er op dit moment vanaf ${formatPrice(
        Number(goedkoopste.price_from)
      )} bij ${PROVIDER_LABELS[goedkoopste.provider]}. Prijzen wisselen; vergelijk altijd de actuele aanbieders.`,
    });
  }

  const status = statusItem(festival);
  if (status) items.push(status);

  return items;
}
