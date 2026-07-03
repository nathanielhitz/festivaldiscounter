import { NextResponse, after } from "next/server";
import { getOfferById, logClick } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

function redirectNoStore(target: URL): NextResponse {
  const res = NextResponse.redirect(target, 307);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const home = new URL("/", SITE_URL);

  const offer = await getOfferById(offerId).catch(() => null);
  if (!offer) return redirectNoStore(home);

  let targetUrl: URL;
  try {
    targetUrl = new URL(offer.affiliate_url ?? offer.url);
  } catch {
    // ongeldig doel: geen klik loggen, bezoeker veilig naar de homepage
    return redirectNoStore(home);
  }

  // klik-logging mag een bezoeker nooit blokkeren (spec: faalt stil)
  const referer = request.headers.get("referer");
  const log = () => logClick(offer.id, referer).catch(() => {});
  try {
    // buiten de response-cyclus loggen zodat de redirect direct vertrekt
    after(log);
  } catch {
    // geen Next request-context (bijv. in tests): log direct, fire-and-forget
    void log();
  }

  return redirectNoStore(targetUrl);
}
