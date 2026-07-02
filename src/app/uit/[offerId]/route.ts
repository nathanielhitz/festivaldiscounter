import { NextResponse } from "next/server";
import { getOfferById, logClick } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const offer = await getOfferById(offerId).catch(() => null);
  if (!offer) return NextResponse.redirect(new URL("/", base), 307);

  try {
    await logClick(offer.id, request.headers.get("referer"));
  } catch {
    // klik-logging mag een bezoeker nooit blokkeren (spec: faalt stil)
  }

  return NextResponse.redirect(offer.affiliate_url ?? offer.url, 307);
}
