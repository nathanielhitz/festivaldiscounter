"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./session";
import { revalidatePublicFestivalPages } from "./revalidate";
import {
  getPriceCheckById,
  updateOfferPriceAvailability,
  updatePriceCheckStatus,
  getOfferSuggestionById,
  insertTicketOfferFromSuggestion,
  updateOfferSuggestionStatus,
} from "./scraper-queries";

export async function approvePriceCheck(id: string): Promise<void> {
  await requireAdmin();
  const check = await getPriceCheckById(id);
  if (!check || check.status !== "pending") return;
  await updateOfferPriceAvailability(check.ticket_offer_id, {
    price_from: check.scraped_price,
    availability: check.scraped_availability ?? "unknown",
  });
  await updatePriceCheckStatus(id, "approved");
  revalidatePublicFestivalPages();
  revalidatePath("/admin/scrapers");
}

export async function rejectPriceCheck(id: string): Promise<void> {
  await requireAdmin();
  await updatePriceCheckStatus(id, "rejected");
  revalidatePath("/admin/scrapers");
}

export async function approveOfferSuggestion(id: string): Promise<void> {
  await requireAdmin();
  const suggestion = await getOfferSuggestionById(id);
  if (!suggestion || suggestion.status !== "pending") return;
  await insertTicketOfferFromSuggestion({
    festival_id: suggestion.festival_id,
    provider: suggestion.provider,
    url: suggestion.detected_url,
    affiliate_url: suggestion.affiliate_url,
  });
  await updateOfferSuggestionStatus(id, "approved");
  revalidatePublicFestivalPages();
  revalidatePath("/admin/scrapers");
}

export async function rejectOfferSuggestion(id: string): Promise<void> {
  await requireAdmin();
  await updateOfferSuggestionStatus(id, "rejected");
  revalidatePath("/admin/scrapers");
}
