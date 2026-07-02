import Link from "next/link";
import type { FestivalWithOffers } from "@/lib/types";
import { formatDateRange, formatPrice, minPrice } from "@/lib/format";

export default function FestivalCard({ festival }: { festival: FestivalWithOffers }) {
  const prijs = minPrice(festival.ticket_offers);
  return (
    <Link
      href={`/festivals/${festival.slug}`}
      className="group block overflow-hidden rounded border border-line bg-panel transition hover:-translate-y-0.5 hover:border-accent-deep"
    >
      <div className="relative h-36 bg-gradient-to-br from-accent-deep to-accent">
        {festival.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={festival.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-ground/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          {formatDateRange(festival.start_date, festival.end_date)}
        </span>
        {festival.status === "sold_out" && (
          <span className="absolute right-3 top-3 rounded-sm bg-ground/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-warn">
            Uitverkocht
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="display text-xl">{festival.name}</h3>
        <p className="text-sm text-mut">{festival.city} · {festival.province}</p>
        <div className="mt-3 flex items-baseline justify-between">
          {prijs != null ? (
            <span className="font-bold text-accent">
              <span className="mr-1 text-xs font-medium text-mut">vanaf</span>
              {formatPrice(prijs)}
            </span>
          ) : (
            <span className="text-sm text-mut">Bekijk aanbieders</span>
          )}
          <span className="text-sm font-semibold group-hover:underline">Vergelijk →</span>
        </div>
      </div>
    </Link>
  );
}
