import type { Festival, TicketOffer } from "./types";
import type { FaqItem } from "./faq";

export function buildEventSchema(festival: Festival, offers: TicketOffer[], base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Festival" as const,
    name: festival.name,
    description: festival.description,
    startDate: festival.start_date,
    endDate: festival.end_date,
    eventStatus:
      festival.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    ...(festival.image_url ? { image: festival.image_url } : {}),
    location: {
      "@type": "Place",
      name: festival.venue ?? festival.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: festival.city,
        addressRegion: festival.province,
        addressCountry: festival.country,
      },
    },
    offers: offers
      .filter((o) => o.price_from != null)
      .map((o) => ({
        "@type": "Offer" as const,
        price: Number(o.price_from),
        priceCurrency: o.currency,
        url: `${base}/uit/${o.id}`,
        availability:
          o.availability === "sold_out"
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
      })),
  };
}

export function buildFaqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage" as const,
    mainEntity: items.map((i) => ({
      "@type": "Question" as const,
      name: i.question,
      acceptedAnswer: { "@type": "Answer" as const, text: i.answer },
    })),
  };
}

export function buildBreadcrumbSchema(base: string, crumbs: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList" as const,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}
