import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://monote.jp";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const companies = db()
    .prepare("SELECT slug, updated_at FROM companies ORDER BY updated_at DESC LIMIT 5000")
    .all() as Array<{ slug: string; updated_at: string }>;
  const articles = db()
    .prepare("SELECT slug, updated_at FROM articles WHERE status='published' ORDER BY published_at DESC LIMIT 5000")
    .all() as Array<{ slug: string; updated_at: string }>;

  const at = (s: string) => new Date(s.replace(" ", "T") + "Z");

  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },
    ...companies.map((c) => ({
      url: `${SITE_URL}/companies/${c.slug}`,
      lastModified: at(c.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: at(a.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
