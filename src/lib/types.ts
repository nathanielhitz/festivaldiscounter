export type FestivalStatus = "announced" | "tickets_live" | "sold_out" | "cancelled" | "past";
export type Provider = "official" | "ticketswap" | "gigsberg" | "ticombo";
export type Availability = "available" | "limited" | "sold_out" | "unknown";

export interface Festival {
  id: string;
  slug: string;
  name: string;
  description: string;
  genres: string[];
  lineup: string | null;
  city: string;
  venue: string | null;
  province: string;
  country: string;
  start_date: string; // ISO date, bv. "2026-08-21"
  end_date: string;
  image_url: string | null;
  website_url: string | null;
  status: FestivalStatus;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketOffer {
  id: string;
  festival_id: string;
  provider: Provider;
  price_from: number | null;
  currency: string;
  url: string;
  affiliate_url: string | null;
  availability: Availability;
  last_checked_at: string;
}

export type FestivalWithOffers = Festival & { ticket_offers: TicketOffer[] };

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
}
