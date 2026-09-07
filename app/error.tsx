"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="sys-page" role="alert">
      <p className="sys-page__brand">MONOTE</p>
      <h1 className="sys-page__title">ページを表示できませんでした</h1>
      <p className="sys-page__lead">
        一時的な問題が起きた可能性があります。もう一度お試しください。
        <br />
        繰り返す場合は時間をおいてからアクセスしてください。
      </p>
      <div className="sys-page__actions">
        <button className="btn btn--pill btn--dark" type="button" onClick={reset}>
          再読み込み
        </button>
        <Link className="btn btn--pill btn--outline" href="/">
          トップへ戻る
        </Link>
      </div>
      {error.digest ? <p className="sys-page__code">エラーコード：{error.digest}</p> : null}
    </main>
  );
}
