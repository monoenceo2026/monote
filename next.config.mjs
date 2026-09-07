/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  /* next dev は同一マシンでも Origin が食い違うと静的チャンクを403で拒む。
     127.0.0.1 で開くとハイドレーションが起きず「JSが動かない」ように見えるため、
     ループバックの表記ゆれを開発時だけ許可する（本番ビルドには影響しない）。 */
  allowedDevOrigins: ["127.0.0.1", "localhost", "[::1]"],
  async headers() {
    return [
      {
        /* 画像・動画は内容が変わればファイル名を変える運用にして長期キャッシュ */
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
