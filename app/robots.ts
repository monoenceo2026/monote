import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://monote.jp";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /* 個人のマイページ・企業の管理画面・相談フォームは検索対象にしない */
        disallow: ["/my/", "/admin", "/admin/", "/inquiry/", "/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
