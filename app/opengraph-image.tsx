import { ImageResponse } from "next/og";

/* SNS・チャットに貼られたときのカード画像。
   フォントは取りに行かず system フォントで描くのでビルド時のネットワークに依存しない。 */
export const runtime = "nodejs";
export const alt = "MONOTE｜つくりたいものから、つくれる会社を探す。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#EFEFEF",
          padding: "72px 80px",
          color: "#181C1F",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#181C1F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 40, letterSpacing: -2, fontWeight: 600 }}>MONOTE</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* satori は複数の子を持つ div に明示的な display を要求し、<br /> も扱えない */}
          <div style={{ display: "flex", flexDirection: "column", fontSize: 62, lineHeight: 1.3, fontWeight: 600, letterSpacing: -1 }}>
            <div style={{ display: "flex" }}>つくりたいものから、</div>
            <div style={{ display: "flex" }}>つくれる会社を探す。</div>
          </div>
          <div style={{ fontSize: 26, lineHeight: 1.6, color: "#48494C" }}>
            加工・材質・ロット・精度・認証の条件で、技術記事と企業をまとめて検索。
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#6b6b6b" }}>
          <div>製造業特化型 情報発信プラットフォーム</div>
          <div>運営：株式会社モノエン</div>
        </div>
      </div>
    ),
    size,
  );
}
