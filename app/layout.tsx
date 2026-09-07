import type { Metadata } from "next";
import "@/css/base.css";
import "@/css/platform.css";
import RevealFx from "@/components/RevealFx";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://monote.jp";
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=IBM+Plex+Sans+JP:wght@400;500;600&family=Noto+Serif+JP:wght@400;500;600&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "MONOTE｜つくりたいものから、つくれる会社を探す。", template: "%s｜MONOTE" },
  description:
    "加工方法・材質・ロット・精度・認証などの条件で、製造業の技術記事と企業情報をまとめて検索できます。",
  applicationName: "MONOTE",
  openGraph: {
    type: "website",
    siteName: "MONOTE",
    locale: "ja_JP",
    title: "MONOTE｜つくりたいものから、つくれる会社を探す。",
    description:
      "加工方法・材質・ロット・精度・認証などの条件で、製造業の技術記事と企業情報をまとめて検索できます。",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* head のインラインスクリプトが <html> に data-intro-off / js を足すため、
       サーバー出力との差分でハイドレーション警告が出る。ここだけ抑止する */
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Web フォントの CSS は描画をブロックしない形で読み込む。
          外部CDNが遅い・落ちている場合でも本文はフォールバック書体で即座に表示される。
        */}
        <link id="gf" rel="stylesheet" href={FONT_CSS} media="print" />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={FONT_CSS} />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.getElementById('gf');if(!l)return;var on=function(){l.media='all'};l.addEventListener('load',on);setTimeout(on,2000);})();",
          }}
        />
        {/*
          登場アニメーションの初期状態（opacity:0）は、この js クラスが付いている
          ときだけ適用する。JSが全く動かない環境では最初から見えたままになる。
          さらに css/base.css の失効タイマーが、スクリプトの読み込みに失敗して
          .fx-ready が付かなかった場合に本文を強制的に表示する。
        */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.className+=' js';" }} />
      </head>
      <body>
        {/* キーボード利用者がヘッダー・サイドバーを飛ばして本文へ入れるようにする */}
        <a className="skip-link" href="#main">本文へスキップ</a>
        {children}
        <RevealFx />
      </body>
    </html>
  );
}
