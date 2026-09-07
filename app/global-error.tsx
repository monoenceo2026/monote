"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#48494c", background: "#fff" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "120px 20px", textAlign: "center" }} role="alert">
          <p style={{ fontFamily: "'Times New Roman', serif", fontSize: 22, letterSpacing: "-0.06em", color: "#181c1f" }}>MONOTE</p>
          <h1 style={{ fontSize: 24, margin: "24px 0 12px", color: "#181c1f" }}>ページを表示できませんでした</h1>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "#737373" }}>
            一時的な問題が起きた可能性があります。もう一度お試しください。
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 32, padding: "12px 24px", borderRadius: 999, border: "1px solid #181c1f", background: "#181c1f", color: "#fff", cursor: "pointer" }}
          >
            再読み込み
          </button>
          {error.digest ? <p style={{ marginTop: 24, fontSize: 12, color: "#737373" }}>エラーコード：{error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
