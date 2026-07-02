import type { Metadata } from "next";
import FestivalCard from "@/components/FestivalCard";
import { minPrice } from "@/lib/format";
import { getUpcomingFestivals } from "@/lib/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Goedkope festivaltickets — laagste prijzen van dit moment",
  description:
    "De goedkoopste festivaltickets van Nederland op een rij, gesorteerd op laagste vanaf-prijs. Dagelijks gecheckt bij officiële verkoop en doorverkoop.",
};

export default async function GoedkopeTicketsPage() {
  const festivals = (await getUpcomingFestivals())
    .map((f) => ({ f, prijs: minPrice(f.ticket_offers) }))
    .filter((x): x is { f: (typeof x)["f"]; prijs: number } => x.prijs != null)
    .sort((a, b) => a.prijs - b.prijs);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Goedkope festivaltickets</h1>
      <p className="mt-3 max-w-prose text-mut">
        Hieronder staan alle aankomende festivals gesorteerd op de laagste vanaf-prijs die wij
        bij officiële verkoop en doorverkoop tegenkwamen. Prijzen wisselen dagelijks — klik door
        voor de actuele prijs per aanbieder.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map(({ f }) => <FestivalCard key={f.id} festival={f} />)}
      </div>
    </main>
  );
}
