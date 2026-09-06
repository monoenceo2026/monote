# 04. データモデル

定義元: `lib/schema.ts`（`SCHEMA` 定数）。SQLite。

## 4.1 ER 概要

```
                    ┌───────────┐
                    │  users    │ role: buyer | company
                    └─────┬─────┘
                          │ company_id
                          ▼
   conditions ◄── company_conditions ──► companies ──┬──► company_photos
       ▲                                   ▲         ├──► works
       │                                   │         └──► articles ──► article_conditions ──► conditions
       └── article_conditions ─────────────┼──────────────────┘
                                           │
                       inquiry_recipients ─┤
                              ▲            │
                              │            ├──► events   (計測)
                        inquiries          ├──► saves    (session_id で紐づけ)
                                           └──► compares (session_id で紐づけ)
```

---

## 4.2 テーブル定義

### `users`
| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PK | |
| `email` | TEXT UNIQUE | |
| `name` | TEXT | |
| `role` | TEXT | `buyer`（探す側）/ `company`（掲載企業） |
| `company_id` | INTEGER FK→companies | company ロールのみ |

パスワードカラムは無い（デモ用のワンクリックログイン）。

---

### `companies` — 掲載企業
検索・比較の中心。カラムは大きく4群に分かれる。

**識別・基本**

| カラム | 説明 |
|---|---|
| `slug` | URL（`/companies/[slug]`）。UNIQUE |
| `name` | 会社名 |
| `verified` | 0/1。「確認済み」バッジと検索順位に影響 |
| `prefecture` / `city` / `address` | 所在地 |
| `employees` / `founded` / `description` | 従業員数 / 創業年 / 説明 |

**強みの表示3枠**（企業詳細のカード）

| カラム | 説明 |
|---|---|
| `specialty_process` / `_sub` | 加工の強み（見出し／補足） |
| `specialty_lot` / `_sub` | ロット・納期の強み |
| `specialty_quality` / `_sub` | 品質の強み |

**検索・比較に使う実値**

| カラム | 説明 | 使われ方 |
|---|---|---|
| `lot_min` / `lot_max` | 対応ロット | 比較表「対応ロット幅」 |
| `precision_mm` | 標準精度（mm） | 比較表「精度」（小さいほど優位） |
| `delivery_min` / `delivery_max` | 納期（日） | 比較表「最短納期」 |
| `response_days` | 相談への平均返信日数 | 検索ランキング / 比較表「返信の速さ」 |
| `size_note` / `equipment` / `capacity` / `industries` / `area` | サイズ / 設備 / 生産能力 / 業種 / エリア | 表示・フリーワード検索対象 |
| `price_hint` / `contact_hours` / `trade_terms` | 価格帯の目安 / 連絡可能時間 / 取引条件 | 表示・充足度TODO |
| `hard_conditions` | **対応が難しい条件** | ミスマッチ相談の抑制 |

**運用メタ**

| カラム | 説明 |
|---|---|
| `completeness` | プロフィール充足度（%）。`/signup` のメーターが書き込む。ランキングに直接効く |
| `profile_confirmed_at` | 企業自身が内容を確認した日時 |
| `created_at` / `updated_at` | |

---

### `conditions` — 検索条件タクソノミー
| カラム | 説明 |
|---|---|
| `category` | `process` / `material` / `lot` / `delivery` / `cert` / `area` / `precision` |
| `label` | 表示ラベル |

`UNIQUE (category, label)`。→ 全27件の内訳は [05. 検索設計](./05-search-and-ranking.md#51-条件タクソノミー)。

### `company_conditions` / `article_conditions`
企業／記事と条件の多対多。ともに `ON DELETE CASCADE`。
**この2表があることで「記事の条件から企業を検索する」導線が成立する。**

---

### `company_photos` / `works`
| テーブル | 内容 |
|---|---|
| `company_photos` | 写真パスと表示順（`sort`）。検索ランキングの richness に +40 |
| `works` | 実績（`title` / `spec`）。ダッシュボードの充足度TODO（5件未満で警告） |

---

### `articles` — 技術記事
| カラム | 説明 |
|---|---|
| `slug` | UNIQUE。エディタ新規作成時は `post-<base36 timestamp>` |
| `company_id` | 執筆企業 |
| `title` / `excerpt` | 見出し・抜粋（抜粋はエディタが本文先頭80文字から自動生成） |
| `body` | **`[{ heading: string, paragraphs: string[] }]` の JSON 文字列** |
| `theme` | `case` / `equipment` / `quality` / `people` / `explain` |
| `status` | `draft` / `review` / `published`（CHECK制約） |
| `reviewed` | 0/1。monoen編集部レビュー済みフラグ |
| `read_minutes` | 読了目安 |
| `tag1` / `tag2` | エディタが選択条件の process / material ラベルから自動設定 |
| `thumb` | サムネイル画像パス。TOPの「読んで探す」で優先される |
| `published_at` | `published` に初めてなった時刻（一度入ると保持） |

インデックス: `idx_articles_company (company_id, status)`

---

### `inquiries` / `inquiry_recipients` — 相談・見積依頼

**`inquiries`**

| 区分 | カラム |
|---|---|
| 内容 | `type`（`estimate` / `technical` など）, `process`, `material`, `quantity`, `deadline`, `size`, `required_precision`, `budget`, `industry`, `note` |
| 添付 | `attachments`（JSON配列。最大20件、各200文字まで） |
| 配慮 | `anonymous`（既定1）, `no_forward` |
| 連絡先 | `contact_company`, `contact_name`, `contact_email`, `contact_phone` |
| メタ | `source`（`search` / `article` / `compare`）, `status`（`draft` / `sent`）, `created_by`（users.id）, `created_at` |

**`inquiry_recipients`**（相談 × 送信先企業）

| カラム | 説明 |
|---|---|
| `status` | `open`（未対応）/ `replied`（返信済み）/ `declined`（対応できない） |

1件の相談を複数社へ同時に送るため、ステータスは**受信企業ごと**に持つ。
受信箱（`inboxOf`）は `inquiries.status='sent'` のものだけを返すので、下書きは相手に見えない。

---

### `saves` / `compares` — 探す側の検討状態
| テーブル | PK | 内容 |
|---|---|---|
| `saves` | `(session_id, kind, target_id)` | `kind` は `company` / `article` |
| `compares` | `(session_id, company_id)` | `memo` を持つ。**最大3社**（`addCompare` が制限） |

`session_id` は `user-<id>` / `anon-<sid>` / `anon-guest`（→ [03.6](./03-architecture.md#36-セッションと認証)）。
ログインしていなくても保存・比較ができ、ログインすると自分のリストに切り替わる。

インデックス: `idx_saves_session (session_id)`

---

### `events` — 行動ログ（このプロダクトの心臓）
| カラム | 説明 |
|---|---|
| `type` | イベント種別（下表） |
| `company_id` | 対象企業 |
| `article_id` | 対象記事（記事系イベントのみ） |
| `term` | そのとき適用されていた検索条件文字列（例 `SUS304 × 小ロット × 短納期`） |
| `created_at` | |

インデックス: `idx_events_company (company_id, type, created_at)`

イベント種別の一覧と用途は [06. 計測とKPI](./06-measurement.md) を参照。

---

## 4.3 主要なライフサイクル

### 企業
```
/signup 送信
  → createCompany()（新規）または自社を特定
  → updateCompanyProfile()  数値・テキスト
  → updateCompanyConditions() 条件を総入れ替え
  → 新規なら createCompanyUser() + loginAs()
  → revalidate(/search) で即検索対象に
```

### 記事
```
エディタ（自動保存）  → status='draft'   … 一覧・検索に出ない
「社内で確認」        → status='review'  … 同上
「公開」             → status='published' + published_at 設定
                     → 関連ページを revalidate
```

### 相談
```
/inquiry/new 送信
  → inquiries(status='sent') 1件
  → inquiry_recipients(status='open') を送信先の数だけ
  → 受信企業ごとに events: 'inquiry' と 'inquiry_source_<source>'
  → /admin#inbox に「未対応」で出る
  → 企業が「返信する」/「対応できない」→ recipients.status を更新
```
