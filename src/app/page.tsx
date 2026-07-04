import type { Metadata } from "next";
import Link from "next/link";
import FestivalCard from "@/components/FestivalCard";
import FestivalSearch from "@/components/FestivalSearch";
import JsonLd from "@/components/JsonLd";
import { getUpcomingFestivals } from "@/lib/queries";
import { buildOrganizationSchema, buildWebSiteSchema } from "@/lib/schema-org";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Alle aankomende festivals: de volledige (lichte) lijst voedt de live
  // autocomplete-zoekbalk client-side; de "Binnenkort"-grid toont de eerste 6.
  const alleFestivals = await getUpcomingFestivals();
  const festivals = alleFestivals.slice(0, 6);
  const zoekFestivals = alleFestivals.map((f) => ({
    slug: f.slug,
    name: f.name,
    start_date: f.start_date,
    end_date: f.end_date,
  }));

  return (
    <main>
      <JsonLd data={buildOrganizationSchema(SITE_URL)} />
      <JsonLd data={buildWebSiteSchema(SITE_URL)} />
      {/* Geen overflow-hidden hier: de autocomplete-dropdown is een absolute
          overlay die onder het zoekveld uit de hero mag steken. De radiale
          gradient hieronder is een background op een inset-0 div en schildert
          sowieso niet buiten zijn eigen box, dus clipping is niet nodig. */}
      <section className="relative border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 82% -10%, rgba(96,219,204,.24), transparent 65%), radial-gradient(600px 300px at 8% 115%, rgba(46,143,130,.12), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            Dagelijks prijzen gecheckt
          </p>
          <h1 className="display mt-3 max-w-[12ch] text-5xl sm:text-7xl">
            Nooit te veel betalen voor een{" "}
            <span className="bg-gradient-to-r from-accent-deep to-accent bg-clip-text text-transparent">
              festival.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-mut">
            Vergelijk ticketprijzen van officiële verkoop én doorverkoop voor alle grote
            Nederlandse festivals, op één plek.
          </p>
          <FestivalSearch festivals={zoekFestivals} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="display text-3xl">Binnenkort</h2>
          <Link href="/festivals" className="text-sm font-semibold text-accent hover:underline">
            Alle festivals →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-12 sm:grid-cols-2">
        <Link href="/goedkope-festivaltickets" className="rounded border border-line bg-panel p-6 transition hover:border-accent-deep">
          <h3 className="display text-2xl">Goedkope festivaltickets</h3>
          <p className="mt-1 text-sm text-mut">De laagste vanaf-prijzen van dit moment, gesorteerd op prijs.</p>
        </Link>
        <Link href="/last-minute-festivals" className="rounded border border-line bg-panel p-6 transition hover:border-accent-deep">
          <h3 className="display text-2xl">Last-minute festivals</h3>
          <p className="mt-1 text-sm text-mut">Festivals die binnen 30 dagen starten, vaak met dalende doorverkoopprijzen.</p>
        </Link>
      </section>
    </main>
  );
}
