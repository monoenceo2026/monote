import type { Metadata } from "next";
import "@/css/base.css";
import "@/css/platform.css";
import RevealFx from "@/components/RevealFx";

export const metadata: Metadata = {
  title: { default: "MONOTE｜つくりたいものから、つくれる会社を探す。", template: "%s | MONOTE" },
  description: "加工方法・材質・ロット・精度・認証などの条件で、製造業の技術記事と企業情報をまとめて検索できます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Serif+JP:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <RevealFx />
      </body>
    </html>
  );
}
