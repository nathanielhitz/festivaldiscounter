import Link from "next/link";
import FestivalCard from "@/components/FestivalCard";
import { getUpcomingFestivals } from "@/lib/queries";

export const revalidate = 3600;

export default async function Home() {
  const festivals = await getUpcomingFestivals(6);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 340px at 82% -10%, rgba(96,219,204,.16), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            Dagelijks prijzen gecheckt
          </p>
          <h1 className="display mt-3 max-w-[12ch] text-5xl sm:text-7xl">
            Nooit te veel betalen voor een{" "}
            <em className="bg-gradient-to-r from-accent-deep to-accent bg-clip-text not-italic text-transparent">
              festival.
            </em>
          </h1>
          <p className="mt-4 max-w-xl text-mut">
            Vergelijk ticketprijzen van officiële verkoop én doorverkoop voor alle grote
            Nederlandse festivals — op één plek.
          </p>
          <form action="/festivals" className="mt-8 flex max-w-xl gap-1.5 rounded border border-line bg-panel p-1.5">
            <input
              type="search"
              name="q"
              placeholder="Zoek een festival, stad of genre…"
              aria-label="Zoek een festival"
              className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-ink placeholder:text-mut focus:outline-none"
            />
            <button className="rounded-sm bg-accent px-6 font-bold text-ground">Zoek</button>
          </form>
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
          <p className="mt-1 text-sm text-mut">Festivals die binnen 30 dagen starten — vaak met dalende doorverkoopprijzen.</p>
        </Link>
      </section>
    </main>
  );
}
