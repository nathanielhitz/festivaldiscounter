import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import JsonLd from "@/components/JsonLd";
import { getArticleBySlug, getPublishedArticles } from "@/lib/queries";

export const revalidate = 3600;

export async function generateStaticParams() {
  const artikelen = await getPublishedArticles();
  return artikelen.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artikel = await getArticleBySlug(slug);
  if (!artikel) return {};
  return {
    title: artikel.seo_title || artikel.title,
    description: artikel.seo_description,
    alternates: { canonical: `/gids/${slug}` },
  };
}

export default async function ArtikelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artikel = await getArticleBySlug(slug);
  if (!artikel) notFound();

  const html = DOMPurify.sanitize(await marked.parse(artikel.content));

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: artikel.title,
          description: artikel.excerpt,
          ...(artikel.published_at ? { datePublished: artikel.published_at } : {}),
        }}
      />
      <article>
        <h1 className="display max-w-[20ch] text-4xl sm:text-5xl">{artikel.title}</h1>
        <div className="prose-dark mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}
