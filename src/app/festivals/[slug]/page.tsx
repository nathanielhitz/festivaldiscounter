import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FestivalCard from "@/components/FestivalCard";
import JsonLd from "@/components/JsonLd";
import TicketComparator from "@/components/TicketComparator";
import { buildFaq } from "@/lib/faq";
import { formatDateRange, formatPrice, minPrice } from "@/lib/format";
import { getFestivalBySlug, getPublishedFestivals, getUpcomingFestivals } from "@/lib/queries";
import { buildBreadcrumbSchema, buildEventSchema, buildFaqSchema } from "@/lib/schema-org";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const festivals = await getPublishedFestivals();
  return festivals.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  if (!festival) return {};
  const jaar = festival.start_date.slice(0, 4);
  const prijs = minPrice(festival.ticket_offers);
  return {
    title: `${festival.name} ${jaar} tickets: prijzen vergelijken`,
    description: `${festival.name} ${jaar} in ${festival.city}: ${formatDateRange(
      festival.start_date, festival.end_date
    )}. Vergelijk ticketprijzen${prijs != null ? ` vanaf ${formatPrice(prijs)}` : ""} van officiële verkoop en doorverkoop.`,
    alternates: { canonical: `/festivals/${slug}` },
    ...(festival.image_url ? { openGraph: { images: [festival.image_url] } } : {}),
  };
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  if (!festival) notFound();

  const faq = buildFaq(festival, festival.ticket_offers);
  const verwant = (await getUpcomingFestivals())
    .filter((f) => f.id !== festival.id &&
      (f.province === festival.province || f.genres.some((g) => festival.genres.includes(g))))
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <JsonLd data={buildEventSchema(festival, festival.ticket_offers, SITE_URL)} />
      <JsonLd data={buildFaqSchema(faq)} />
      <JsonLd data={buildBreadcrumbSchema(SITE_URL, [
        { name: "Festivals", path: "/festivals" },
        { name: festival.name, path: `/festivals/${festival.slug}` },
      ])} />

      <nav className="text-sm text-mut" aria-label="Kruimelpad">
        <Link href="/festivals" className="inline-block py-2 hover:text-ink">Festivals</Link>
        <span className="mx-2">/</span>
        <span aria-current="page">{festival.name}</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          {formatDateRange(festival.start_date, festival.end_date)} · {festival.city}, {festival.province}
        </p>
        <h1 className="display mt-2 text-5xl sm:text-6xl">{festival.name}</h1>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="max-w-prose text-ink/90">{festival.description}</p>
          {festival.lineup && (
            <section className="mt-8">
              <h2 className="display text-2xl">Line-up</h2>
              <p className="mt-2 max-w-prose text-mut">{festival.lineup}</p>
            </section>
          )}
          <section className="mt-8">
            <h2 className="display text-2xl">Veelgestelde vragen</h2>
            <dl className="mt-3 flex flex-col gap-4">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-bold">{item.question}</dt>
                  <dd className="mt-1 text-mut">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
          {festival.website_url && URL.canParse(festival.website_url) && (
            <p className="mt-8 text-sm text-mut">
              Officiële website:{" "}
              <a href={festival.website_url} rel="noopener noreferrer" className="text-accent underline">
                {new URL(festival.website_url).hostname}
              </a>
            </p>
          )}
        </div>
        <div className="order-first lg:order-none">
          <TicketComparator festival={festival} />
        </div>
      </div>

      {verwant.length > 0 && (
        <section className="mt-14">
          <h2 className="display text-3xl">Vergelijkbare festivals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verwant.map((f) => <FestivalCard key={f.id} festival={f} />)}
          </div>
        </section>
      )}
    </main>
  );
}
