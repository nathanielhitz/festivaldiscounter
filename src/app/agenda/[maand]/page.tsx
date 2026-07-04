import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FestivalCard from "@/components/FestivalCard";
import { monthLabel, monthSlug, monthsWithFestivals, parseMonthSlug } from "@/lib/months";
import { getPublishedFestivals } from "@/lib/queries";

export const revalidate = 3600;

export async function generateStaticParams() {
  const festivals = await getPublishedFestivals();
  return monthsWithFestivals(festivals).map((maand) => ({ maand }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ maand: string }>;
}): Promise<Metadata> {
  const { maand } = await params;
  const label = monthLabel(maand);
  if (!label) return {};
  return {
    title: `Festivals in ${label}: data en ticketprijzen`,
    description: `Welke festivals zijn er in ${label}? Alle Nederlandse festivals in ${label} met data, locaties en de laagste ticketprijzen.`,
    alternates: { canonical: `/agenda/${maand}` },
  };
}

export default async function AgendaMaandPage({
  params,
}: {
  params: Promise<{ maand: string }>;
}) {
  const { maand } = await params;
  if (!parseMonthSlug(maand)) notFound();

  const festivals = (await getPublishedFestivals()).filter(
    (f) => monthSlug(f.start_date) === maand
  );
  if (festivals.length === 0) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Festivals in {monthLabel(maand)}</h1>
      <p className="mt-2 text-mut">{festivals.length} {festivals.length === 1 ? "festival" : "festivals"} deze maand.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
      </div>
    </main>
  );
}
