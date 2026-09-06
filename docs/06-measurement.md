# 06. 計測とKPI

> 構想資料の一節:
> 「投稿メリットが弱い」→ **“閲覧数”ではなく、専門検索流入・保存・相談行動をレポートする。**

MONOTE の計測設計は、この一文をそのままテーブルにしたものである。
実装: `events` テーブル、`lib/repo.ts` の `recordEvent` / `recordImpressions` / `dashboardStats`、
`app/admin/page.tsx`。

---

## 6.1 イベント種別

| `type` | 記録タイミング | 記録元 | `term` |
|---|---|---|---|
| `impression` | 検索結果1ページ目に企業カードが出た | `/search` | 適用条件を `×` で連結 |
| `click` | **検索経由で**企業詳細を開いた（`?from=search` が付いているとき） | `/companies/[slug]` | `?term` または `?q` |
| `view` | 企業詳細を開いた（経路を問わず常時） | `/companies/[slug]` | — |
| `save` | 企業を保存した | `toggleSave` | — |
| `inquiry` | 相談が送信された（送信先企業ごとに1件） | `createInquiry` | — |
| `inquiry_source_search` | 相談の流入元＝検索結果から直接 | 同上 | — |
| `inquiry_source_article` | 相談の流入元＝記事を読んでから | 同上 | — |
| `inquiry_source_compare` | 相談の流入元＝比較表から | 同上 | — |
| `article_view` | 記事詳細を開いた | `/articles/[slug]` | — |
| `article_save` | 記事を保存した | `toggleSave` | — |
| `article_inquiry` | 記事起点の相談（シードで投入） | — | — |

### 設計上のポイント

- **`view` と `click` を分けている**
  `view` は「企業ページが見られた総数」、`click` は「そのうち検索から来た分」。
  この2つの差から「うち検索経由 N%」が出る。
  ※ 検索から来た場合は `view` と `click` の**両方**が記録される。
- **`term` を記録している**
  「どの条件で見つかったか」まで残すことで、
  「表示は多いのに相談にならない条件」という**改善可能な単位**でレポートできる。
  これが構想資料の「詳細レポート・改善提案」（有料層）の原型。
- **相談は送信先ごとに1件**
  3社に同時送信すれば `inquiry` イベントは3件（各社1件）。

---

## 6.2 ダッシュボードのKPI（`dashboardStats`）

集計窓は **直近30日**、比較対象は **その前の30日（31〜61日前）**。

| KPI | 定義 | 補足表示 |
|---|---|---|
| 検索結果に表示された回数 | `impression`(30日) | 「条件検索で候補に出た回数」 |
| 記事・企業ページの閲覧 | `click` + `view`（30日） | 「うち検索経由 N%」 |
| 保存・比較された数 | `save`(30日) | 「検討候補に入った回数」 |
| 相談・見積依頼 | `inquiry`(30日) | 「未対応 N件 / 返信 平均N営業日」 |

各KPIは前期比を表示する。閲覧・表示・保存は変化率（%）、相談は件数差。

**検索経由シェア**
```
searchShare = click(30日) / (click + view)(30日) × 100
```

---

## 6.3 検索条件別の成果テーブル

```sql
SELECT term,
       SUM(type='impression') AS impressions,
       SUM(type='click')      AS clicks,
       SUM(type='save')       AS saves,
       SUM(type='inquiry')    AS inquiries
FROM events
WHERE company_id = ? AND term != '' AND created_at >= datetime('now','-30 days')
GROUP BY term
ORDER BY inquiries DESC, impressions DESC
LIMIT 8
```

各行に `termRankMap`（→ [05.10](./05-search-and-ranking.md#510-順位の逆算ダッシュボード用)）で
**「今その条件で検索したら何位か」**を添える。

「表示された → クリックされた → 保存された → 相談された」という
**ファネルが条件単位で読める**のが、このテーブルの狙い。

---

## 6.4 改善サジェスト

次の条件をすべて満たす term のうち、表示回数が最大のものを1つ提示する。

```
inquiries == 0
AND impressions >= 50
AND clicks / impressions < 0.15
```

> 「表示されているのにクリックされず、相談にも至っていない条件」
> ＝ プロフィールか記事に手を入れれば伸びる余地がある条件。

条件文字列を `×` で分割した**最後のトークン**を、改善の焦点として文言に埋め込む。

---

## 6.5 記事別の成果

```sql
SELECT a.id, a.title, a.published_at,
       SUM(e.type='article_view')    AS views,
       SUM(e.type='article_save')    AS saves,
       SUM(e.type='article_inquiry') AS inquiries
FROM events e JOIN articles a ON a.id = e.article_id
WHERE e.company_id = ? AND e.created_at >= datetime('now','-30 days')
GROUP BY a.id ORDER BY views DESC LIMIT 5
```

記事ごとに「読まれた → 保存された → 相談につながった」を出す。
**記事単体のPVではなく、記事から相談までの距離を見る**設計。

---

## 6.6 相談のソース内訳

| 表示 | イベント |
|---|---|
| 検索結果から直接 | `inquiry_source_search` |
| 記事を読んでから | `inquiry_source_article` |
| 比較表から（複数社同時） | `inquiry_source_compare` |

横棒の長さは実数比。
「記事を読んでから相談が来ている」ことが数字で見えると、記事を書く動機が具体化する。

---

## 6.7 会社情報の充足度TODO

実データから未入力項目を判定して提示する。

| 判定 | 表示 |
|---|---|
| `price_hint` が空 | 「価格帯の目安が未入力」 |
| `works` が5件未満 | 「実績がN件（推奨5件以上）」 |
| `equipment` が空 | 「保有設備の型式が未記載」 |

`companies.completeness` は検索ランキングの richness に直接効くため、
**このTODOを埋める＝検索順位が上がる**という因果が閉じている。

---

## 6.8 事業KPIへの接続

構想資料の「停止条件」——
**有料意向・検索利用・継続投稿が確認できなければ、対象業種か提供価値を絞り直す**——
を、このイベント設計で観測するとすれば次のようになる。

| 検証したい仮説 | 観測できる指標 | 現状の実装 |
|---|---|---|
| 条件検索が選定に使われるか | `impression` の伸び、条件あたりの `click` 率、緩和サジェストの利用 | ✅ 記録済み（サジェストのクリックは未計測） |
| 発信が成果につながるか | 記事本数 × `article_view` → `inquiry` の転換 | ✅ 記事別テーブル |
| 継続投稿されるか | 企業別の記事公開ペース | ⚠️ 記事の `published_at` から算出可能だが画面なし |
| 有料意向があるか | 優先表示・運用代行の申込 | ❌ 未実装（課金導線そのものが無い） |

> 次に足すべき計測は「サジェスト・緩和の採用率」と「企業別の継続投稿率」、
> そして有料プランへの関心を測る導線（資料請求・見積依頼）。
