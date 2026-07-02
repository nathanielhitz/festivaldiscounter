import type { FestivalWithOffers, TicketOffer } from "@/lib/types";
import {
  AVAILABILITY_LABELS, PROVIDER_LABELS, PROVIDER_SUB,
  formatCheckedDate, formatPrice, minPrice,
} from "@/lib/format";

function sortOffers(offers: TicketOffer[], soldOutFestival: boolean): TicketOffer[] {
  return [...offers].sort((a, b) => {
    if (soldOutFestival) {
      // doorverkoop eerst bij uitverkochte festivals
      const aOfficial = a.provider === "official" ? 1 : 0;
      const bOfficial = b.provider === "official" ? 1 : 0;
      if (aOfficial !== bOfficial) return aOfficial - bOfficial;
    }
    const ap = a.price_from == null || a.availability === "sold_out" ? Infinity : Number(a.price_from);
    const bp = b.price_from == null || b.availability === "sold_out" ? Infinity : Number(b.price_from);
    return ap - bp;
  });
}

export default function TicketComparator({ festival }: { festival: FestivalWithOffers }) {
  const offers = sortOffers(festival.ticket_offers, festival.status === "sold_out");
  const laagste = minPrice(offers);
  const peildatum = offers.length
    ? formatCheckedDate(
        offers.map((o) => o.last_checked_at).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)!
      )
    : null;

  return (
    <section aria-labelledby="tickets-heading" className="rounded border border-line bg-panel p-6">
      <h2 id="tickets-heading" className="display text-2xl">Ticketprijzen</h2>
      {peildatum && <p className="mb-4 mt-1 text-sm text-mut">Prijzen gecheckt op {peildatum}</p>}

      {festival.status === "sold_out" && (
        <p className="mb-4 rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          Dit festival is officieel uitverkocht — via doorverkoop komen vaak nog tickets beschikbaar.
        </p>
      )}

      {offers.length === 0 && (
        <p className="text-mut">Nog geen ticketaanbieders bekend voor dit festival.</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {offers.map((o) => {
          const isLaagste = laagste != null && o.price_from != null &&
            Number(o.price_from) === laagste && o.availability !== "sold_out";
          return (
            <li
              key={o.id}
              className={`relative grid grid-cols-2 items-center gap-3 rounded border px-4 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr_auto] ${
                isLaagste ? "border-accent bg-accent/5" : "border-line"
              }`}
            >
              {isLaagste && (
                <span className="absolute -top-2.5 left-3 rounded-sm bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ground">
                  Laagste prijs
                </span>
              )}
              <div>
                <p className="font-bold">{PROVIDER_LABELS[o.provider]}</p>
                <p className="text-xs text-mut">{PROVIDER_SUB[o.provider]}</p>
              </div>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  o.availability === "available" ? "text-accent"
                  : o.availability === "sold_out" ? "text-mut" : "text-warn"
                }`}
              >
                {AVAILABILITY_LABELS[o.availability]}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {o.price_from != null ? (
                  <>
                    {formatPrice(Number(o.price_from))}
                    <span className="block text-xs font-medium text-mut">vanaf</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-mut">prijs bij aanbieder</span>
                )}
              </p>
              <a
                href={`/uit/${o.id}`}
                rel="sponsored nofollow"
                aria-label={`Bekijk tickets bij ${PROVIDER_LABELS[o.provider]}`}
                className="rounded-sm bg-accent px-5 py-2.5 text-center text-sm font-bold text-ground hover:bg-accent-deep"
              >
                Bekijk tickets
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-mut">
        Prijzen kunnen afwijken op de site van de aanbieder. Links kunnen affiliate-links zijn — jij betaalt nooit meer.
      </p>
    </section>
  );
}
