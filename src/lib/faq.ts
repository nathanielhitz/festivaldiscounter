import type { Festival, TicketOffer } from "./types";
import { formatDateRange, formatPrice, minPrice, PROVIDER_LABELS } from "./format";

export interface FaqItem {
  question: string;
  answer: string;
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

  const laagste = minPrice(offers);
  if (laagste != null) {
    const goedkoopste = offers
      .filter((o) => o.price_from != null && o.availability !== "sold_out")
      .sort((a, b) => Number(a.price_from) - Number(b.price_from))[0];
    items.push({
      question: `Wat kost een ticket voor ${festival.name}?`,
      answer: `Tickets voor ${festival.name} zijn er op dit moment vanaf ${formatPrice(laagste)} bij ${
        PROVIDER_LABELS[goedkoopste.provider]
      }. Prijzen wisselen; vergelijk altijd de actuele aanbieders.`,
    });
  }

  items.push({
    question: `Is ${festival.name} uitverkocht?`,
    answer:
      festival.status === "sold_out"
        ? `Ja, ${festival.name} is officieel uitverkocht. Via doorverkoopplatforms zoals TicketSwap komen vaak nog tickets beschikbaar.`
        : `Nee, ${festival.name} is niet uitverkocht. Vergelijk de aanbieders hierboven voor de beste prijs.`,
  });

  return items;
}
