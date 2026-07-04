import type { Availability, FestivalStatus, Provider } from "../types";

export const FESTIVAL_STATUSES: FestivalStatus[] = [
  "announced", "tickets_live", "sold_out", "cancelled", "past",
];
export const PROVIDERS: Provider[] = ["official", "ticketswap", "gigsberg", "ticombo"];
export const AVAILABILITIES: Availability[] = ["available", "limited", "sold_out", "unknown"];

export interface FestivalInput {
  slug: string;
  name: string;
  description: string;
  genres: string[];
  lineup: string | null;
  city: string;
  venue: string | null;
  province: string;
  country: string;
  start_date: string;
  end_date: string;
  image_url: string | null;
  website_url: string | null;
  status: FestivalStatus;
  published: boolean;
}

export interface OfferInput {
  festival_id: string;
  provider: Provider;
  price_from: number | null;
  currency: string;
  url: string;
  affiliate_url: string | null;
  availability: Availability;
  last_checked_at: string;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

export function parseFestivalForm(form: FormData): ParseResult<FestivalInput> {
  const fieldErrors: Record<string, string> = {};

  const slug = str(form, "slug");
  const name = str(form, "name");
  const description = str(form, "description");
  const city = str(form, "city");
  const province = str(form, "province");
  const country = str(form, "country") || "NL";
  const start_date = str(form, "start_date");
  const end_date = str(form, "end_date");
  const statusRaw = str(form, "status");
  const website_url = optStr(form, "website_url");
  const image_url = optStr(form, "image_url");
  const lineup = optStr(form, "lineup");
  const venue = optStr(form, "venue");
  const genres = str(form, "genres").split(",").map((g) => g.trim()).filter(Boolean);
  const publishedRaw = form.get("published");
  const published = publishedRaw === "on" || publishedRaw === "true";

  if (!isValidSlug(slug))
    fieldErrors.slug = "Ongeldige slug (alleen kleine letters, cijfers, koppeltekens).";
  if (!name) fieldErrors.name = "Naam is verplicht.";
  if (!description) fieldErrors.description = "Beschrijving is verplicht.";
  if (!city) fieldErrors.city = "Plaats is verplicht.";
  if (!province) fieldErrors.province = "Provincie is verplicht.";
  if (!DATE_RE.test(start_date)) fieldErrors.start_date = "Ongeldige startdatum (YYYY-MM-DD).";
  if (!DATE_RE.test(end_date)) fieldErrors.end_date = "Ongeldige einddatum (YYYY-MM-DD).";
  if (DATE_RE.test(start_date) && DATE_RE.test(end_date) && start_date > end_date)
    fieldErrors.end_date = "Einddatum mag niet vóór de startdatum liggen.";
  if (!(FESTIVAL_STATUSES as string[]).includes(statusRaw)) fieldErrors.status = "Ongeldige status.";
  if (website_url && !isValidHttpUrl(website_url)) fieldErrors.website_url = "Ongeldige URL.";
  if (image_url && !isValidHttpUrl(image_url)) fieldErrors.image_url = "Ongeldige URL.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      slug, name, description, genres, lineup, city, venue, province, country,
      start_date, end_date, image_url, website_url,
      status: statusRaw as FestivalStatus, published,
    },
  };
}

export function parseOfferForm(form: FormData): ParseResult<OfferInput> {
  const fieldErrors: Record<string, string> = {};

  const festival_id = str(form, "festival_id");
  const providerRaw = str(form, "provider");
  const availabilityRaw = str(form, "availability") || "unknown";
  const url = str(form, "url");
  const affiliate_url = optStr(form, "affiliate_url");
  const currency = str(form, "currency") || "EUR";
  const priceRaw = str(form, "price_from");

  let price_from: number | null = null;
  if (priceRaw !== "") {
    const n = Number(priceRaw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) fieldErrors.price_from = "Ongeldige prijs.";
    else price_from = n;
  }
  if (!festival_id) fieldErrors.festival_id = "Festival ontbreekt.";
  if (!(PROVIDERS as string[]).includes(providerRaw)) fieldErrors.provider = "Ongeldige aanbieder.";
  if (!(AVAILABILITIES as string[]).includes(availabilityRaw))
    fieldErrors.availability = "Ongeldige beschikbaarheid.";
  if (!isValidHttpUrl(url)) fieldErrors.url = "Ongeldige URL.";
  if (affiliate_url && !isValidHttpUrl(affiliate_url)) fieldErrors.affiliate_url = "Ongeldige URL.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      festival_id, provider: providerRaw as Provider, price_from, currency, url,
      affiliate_url, availability: availabilityRaw as Availability,
      last_checked_at: new Date().toISOString(),
    },
  };
}
