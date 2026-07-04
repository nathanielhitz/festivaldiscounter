import type { Metadata } from "next";
import FestivalCard from "@/components/FestivalCard";
import { getUpcomingFestivals } from "@/lib/queries";
import { todayAmsterdam } from "@/lib/months";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Last-minute festivals: binnen 30 dagen",
  description:
    "Deze festivals starten binnen 30 dagen. Ideaal voor een last-minute festivalweekend: doorverkoopprijzen dalen vaak vlak voor de festivaldatum.",
  alternates: { canonical: "/last-minute-festivals" },
};

export default async function LastMinutePage() {
  const grens = new Date(`${todayAmsterdam()}T00:00:00Z`);
  grens.setUTCDate(grens.getUTCDate() + 30);
  const grensIso = grens.toISOString().slice(0, 10);

  const festivals = (await getUpcomingFestivals()).filter((f) => f.start_date <= grensIso);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Last-minute festivals</h1>
      <p className="mt-3 max-w-prose text-mut">
        Deze festivals starten binnen 30 dagen. Juist vlak voor de festivaldatum dalen
        doorverkoopprijzen vaak; vergelijk dus altijd even alle aanbieders.
      </p>
      {festivals.length === 0 ? (
        <p className="mt-8 text-mut">Geen festivals binnen 30 dagen. Kijk in de agenda voor wat eraan komt.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
        </div>
      )}
    </main>
  );
}
