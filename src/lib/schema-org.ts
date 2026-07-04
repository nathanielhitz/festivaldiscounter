import type { Availability, Festival, TicketOffer } from "./types";
import type { FaqItem } from "./faq";

const AVAILABILITY_SCHEMA: Partial<Record<Availability, string>> = {
  available: "https://schema.org/InStock",
  limited: "https://schema.org/LimitedAvailability",
  sold_out: "https://schema.org/SoldOut",
  // unknown: bewust geen mapping; het veld wordt dan weggelaten.
};

// Zet het vrije line-up-tekstveld om naar losse artiestennamen. De data is in de
// praktijk een komma- (soms nieuwe-regel-)gescheiden lijst; we splitsen daarop,
// trimmen en gooien lege stukken weg. Google toont `performer` in Event-rich-results.
function parseLineup(lineup: string | null): string[] {
  if (!lineup) return [];
  return lineup
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export function buildEventSchema(festival: Festival, offers: TicketOffer[], base: string) {
  const offerList = offers
    .filter((o) => o.price_from != null)
    .map((o) => {
      const availability = AVAILABILITY_SCHEMA[o.availability];
      return {
        "@type": "Offer" as const,
        // Zelfde centen-afronding als formatPrice.
        price: Math.round(Number(o.price_from) * 100) / 100,
        priceCurrency: o.currency,
        url: `${base}/uit/${o.id}`,
        ...(availability ? { availability } : {}),
      };
    });

  const performers = parseLineup(festival.lineup).map((name) => ({
    "@type": "PerformingGroup" as const,
    name,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Festival" as const,
    name: festival.name,
    description: festival.description,
    url: `${base}/festivals/${festival.slug}`,
    startDate: festival.start_date,
    endDate: festival.end_date,
    eventStatus:
      festival.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
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
    ...(performers.length ? { performer: performers } : {}),
    ...(offerList.length ? { offers: offerList } : {}),
  };
}

// Merk-brede structured data voor de homepage: helpt Google het merk te herkennen
// (knowledge panel / sitelinks). Geen SearchAction: de site heeft geen server-side
// zoek-resultatenpagina (de zoekbalk is client-side autocomplete).
export function buildOrganizationSchema(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization" as const,
    name: "FestivalDiscounter.nl",
    url: base,
    logo: `${base}/og-default.png`,
  };
}

export function buildWebSiteSchema(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite" as const,
    name: "FestivalDiscounter.nl",
    url: base,
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
