"use client";

import { useState } from "react";

/* ============================================================
   「レポートを書き出す」— ダッシュボードに出ている実測値を
   そのまま CSV（Excel で開ける UTF-8 BOM 付き）で書き出す。
   以前は押しても何も起きないボタンだった。
   ============================================================ */

export type ReportData = {
  companyName: string;
  period: string;
  kpis: Array<{ label: string; value: number; unit: string; diff: string; note: string }>;
  terms: Array<{ term: string; impressions: number; clicks: number; saves: number; inquiries: number; rank: string }>;
  articles: Array<{ title: string; views: number; saves: number; inquiries: number; published: string }>;
  sources: Array<{ label: string; n: number }>;
};

const esc = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const row = (cells: Array<string | number>) => cells.map(esc).join(",");

function buildCsv(d: ReportData): string {
  const lines: string[] = [];
  lines.push(row(["MONOTE 企業管理レポート", d.companyName]));
  lines.push(row(["集計期間", d.period]));
  lines.push(row(["書き出し日時", new Date().toLocaleString("ja-JP")]));
  lines.push("");
  lines.push(row(["主要指標", "値", "単位", "前月比", "補足"]));
  for (const k of d.kpis) lines.push(row([k.label, k.value, k.unit, k.diff, k.note]));
  lines.push("");
  lines.push(row(["検索条件", "表示", "クリック", "保存", "相談", "順位"]));
  for (const t of d.terms) lines.push(row([t.term, t.impressions, t.clicks, t.saves, t.inquiries, t.rank]));
  lines.push("");
  lines.push(row(["記事", "閲覧", "保存", "相談", "公開日"]));
  for (const a of d.articles) lines.push(row([a.title, a.views, a.saves, a.inquiries, a.published]));
  lines.push("");
  lines.push(row(["相談の流入経路", "件数"]));
  for (const s of d.sources) lines.push(row([s.label, s.n]));
  return lines.join("\r\n");
}

export default function ExportReport({ data }: { data: ReportData }) {
  const [done, setDone] = useState(false);

  const download = () => {
    const blob = new Blob(["﻿", buildCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `monote-report-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(true);
    setTimeout(() => setDone(false), 2600);
  };

  return (
    <button
      className="btn btn--box btn--outline-thin dash-head__export"
      type="button"
      onClick={download}
      title="この画面の数値を CSV で書き出します"
    >
      {done ? "書き出しました（CSV）" : "レポートを書き出す"}
    </button>
  );
}
