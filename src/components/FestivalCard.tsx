import Link from "next/link";
import type { FestivalWithOffers } from "@/lib/types";
import { formatDateRange, formatPrice, minPrice } from "@/lib/format";

const GRADIENTS = [
  "bg-gradient-to-br from-accent-deep to-accent",
  "bg-gradient-to-tr from-[#0e4a3c] via-accent-deep to-accent",
  "bg-gradient-to-b from-accent via-[#37b3a0] to-accent-deep",
  "bg-gradient-to-br from-[#123a4a] via-[#1d6e66] to-accent",
  "bg-gradient-to-tl from-[#0b2f28] via-accent-deep to-[#8fe8da]",
  "bg-gradient-to-r from-[#0e4a3c] to-[#4fc5b4]",
];

function gradientFor(slug: string): string {
  const hash = [...slug].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export default function FestivalCard({ festival }: { festival: FestivalWithOffers }) {
  const prijs = minPrice(festival.ticket_offers);
  return (
    <Link
      href={`/festivals/${festival.slug}`}
      className="group block overflow-hidden rounded border border-line bg-panel transition hover:-translate-y-0.5 hover:border-accent-deep"
    >
      {/* gradientFor is de merk-gradient-achtergrond: zichtbaar als placeholder terwijl de
          afbeelding laadt, en als fallback wanneer een festival geen (werkende) image_url
          heeft. De img ligt hier bovenop zodra hij laadt. */}
      <div className={`relative h-36 ${gradientFor(festival.slug)}`}>
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
        {/* Leesbaarheids-overlay boven de foto, onder de chips: zorgt dat de datum-chip en
            de uitverkocht-badge leesbaar blijven op lichte/drukke festivalfoto's. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ground/55 via-transparent to-ground/25" />
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
