import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import FestivalCard from "@/components/FestivalCard";
import FilterDropdown from "@/components/FilterDropdown";
import DetailsOutsideCloser from "@/components/DetailsOutsideCloser";
import { getUpcomingFestivals } from "@/lib/queries";
import { monthLabel, monthSlug, monthsWithFestivals } from "@/lib/months";
import { buildFilterHref, type FestivalFilterState } from "@/lib/filter-link";

// Deze route is dynamisch (searchParams is een Dynamic API in Next 15), dus
// route-level ISR via `export const revalidate` werkt hier niet. In plaats
// daarvan cachen we de data-fetch zelf in de Data Cache (max 1 uur oud,
// dezelfde versheid als de ISR-pagina's). Let op: todayAmsterdam() draait
// bínnen getUpcomingFestivals, dus "vandaag" bevriest maximaal een uur mee.
const getCachedUpcomingFestivals = unstable_cache(
  () => getUpcomingFestivals(),
  ["festivals-overzicht"],
  { revalidate: 3600 }
);

export const metadata: Metadata = {
  title: "Alle festivals in Nederland (2026)",
  description:
    "Overzicht van alle grote Nederlandse festivals met data, locaties en de laagste ticketprijzen. Filter op maand, genre of provincie.",
  alternates: { canonical: "/festivals" },
};

type Search = FestivalFilterState;

export default async function FestivalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q, maand, genre, provincie } = await searchParams;
  const alle = await getCachedUpcomingFestivals();

  const term = q?.toLowerCase().trim();
  const festivals = alle.filter((f) => {
    if (term && ![f.name, f.city, ...f.genres].some((v) => v.toLowerCase().includes(term))) return false;
    if (maand && monthSlug(f.start_date) !== maand) return false;
    if (genre && !f.genres.includes(genre)) return false;
    if (provincie && f.province !== provincie) return false;
    return true;
  });

  const maanden = monthsWithFestivals(alle);
  const genres = [...new Set(alle.flatMap((f) => f.genres))].sort();
  const provincies = [...new Set(alle.map((f) => f.province))].sort();

  const current: Search = { q, maand, genre, provincie };
  const filterLink = (patch: Partial<Search>) => buildFilterHref(current, patch);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Alle festivals</h1>
      {festivals.length > 0 && (
        <p className="mt-2 text-mut">
          {festivals.length} {festivals.length === 1 ? "festival" : "festivals"} gevonden
          {term ? ` voor “${q}”` : ""}.
        </p>
      )}

      {/* Mobiel: compacte dropdowns met native accordion-gedrag. */}
      <div className="mt-6 flex flex-col gap-2 lg:hidden">
        <FilterDropdown
          key={`maand-${maand ?? "alle"}`}
          groupName="festival-filters"
          label="Maand"
          options={maanden.map((m) => ({ value: m, label: monthLabel(m) ?? m }))}
          selectedValue={maand}
          selectedLabel={maand ? monthLabel(maand) ?? maand : "Alle"}
          buildHref={(v) => filterLink({ maand: v })}
        />
        <FilterDropdown
          key={`genre-${genre ?? "alle"}`}
          groupName="festival-filters"
          label="Genre"
          options={genres.map((g) => ({ value: g, label: g }))}
          selectedValue={genre}
          selectedLabel={genre ?? "Alle"}
          buildHref={(v) => filterLink({ genre: v })}
        />
        <FilterDropdown
          key={`provincie-${provincie ?? "alle"}`}
          groupName="festival-filters"
          label="Provincie"
          options={provincies.map((p) => ({ value: p, label: p }))}
          selectedValue={provincie}
          selectedLabel={provincie ?? "Alle"}
          buildHref={(v) => filterLink({ provincie: v })}
        />
        <DetailsOutsideCloser groupName="festival-filters" />
      </div>

      {/* Desktop/tablet: ongewijzigde pill-rijen. */}
      <div className="mt-6 hidden flex-col gap-3 text-sm lg:flex">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Maand</span>
          <Link
            href={filterLink({ maand: undefined })}
            aria-current={!maand ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              !maand ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
            }`}
          >
            Alle
          </Link>
          {maanden.map((m) => (
            <Link
              key={m}
              href={filterLink({ maand: m })}
              aria-current={maand === m ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                maand === m ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
              }`}
            >
              {monthLabel(m)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Genre</span>
          <Link
            href={filterLink({ genre: undefined })}
            aria-current={!genre ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              !genre ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
            }`}
          >
            Alle
          </Link>
          {genres.map((g) => (
            <Link
              key={g}
              href={filterLink({ genre: g })}
              aria-current={genre === g ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                genre === g ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
              }`}
            >
              {g}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-mut">Provincie</span>
          <Link
            href={filterLink({ provincie: undefined })}
            aria-current={!provincie ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
              !provincie ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
            }`}
          >
            Alle
          </Link>
          {provincies.map((p) => (
            <Link
              key={p}
              href={filterLink({ provincie: p })}
              aria-current={provincie === p ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                provincie === p ? "border-accent bg-accent/10 text-accent" : "border-line text-mut hover:text-ink"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>

      {festivals.length === 0 ? (
        <p className="mt-8 text-mut">
          Geen festivals gevonden{term ? ` voor “${q}”` : ""}.{" "}
          <Link href="/festivals" className="text-accent underline">Wis de filters</Link>.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((f) => <FestivalCard key={f.id} festival={f} />)}
        </div>
      )}
    </main>
  );
}
