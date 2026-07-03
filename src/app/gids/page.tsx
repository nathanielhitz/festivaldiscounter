import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/queries";
import { formatCheckedDate } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Festivalgids: koopgidsen en tips",
  description:
    "Praktische gidsen over festivaltickets: veilig doorverkoop kopen, prijzen vergelijken en slim je festivalweekend plannen.",
};

export default async function GidsPage() {
  const artikelen = await getPublishedArticles();
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Festivalgids</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artikelen.map((a) => (
          <Link key={a.id} href={`/gids/${a.slug}`} className="rounded border border-line bg-panel p-6 transition hover:border-accent-deep">
            <h2 className="display text-xl">{a.title}</h2>
            <p className="mt-2 text-sm text-mut">{a.excerpt}</p>
            {a.published_at && (
              <p className="mt-3 text-xs text-mut">{formatCheckedDate(a.published_at)}</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
