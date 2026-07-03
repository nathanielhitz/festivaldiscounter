import type { MetadataRoute } from "next";
import { getPublishedArticles, getPublishedFestivals } from "@/lib/queries";
import { monthsWithFestivals } from "@/lib/months";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const festivals = await getPublishedFestivals();
  const artikelen = await getPublishedArticles();

  const statisch = [
    "", "/festivals", "/goedkope-festivaltickets", "/last-minute-festivals",
    "/gids", "/over", "/contact", "/privacy",
  ].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "daily" as const }));

  return [
    ...statisch,
    ...festivals.map((f) => ({
      url: `${SITE_URL}/festivals/${f.slug}`,
      lastModified: f.updated_at,
      changeFrequency: "daily" as const,
    })),
    ...monthsWithFestivals(festivals).map((m) => ({
      url: `${SITE_URL}/agenda/${m}`,
      changeFrequency: "weekly" as const,
    })),
    ...artikelen.map((a) => ({
      url: `${SITE_URL}/gids/${a.slug}`,
      ...(a.published_at ? { lastModified: a.published_at } : {}),
      changeFrequency: "monthly" as const,
    })),
  ];
}
