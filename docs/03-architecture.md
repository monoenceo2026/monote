# 03. システムアーキテクチャ

## 3.1 技術構成

| レイヤ | 採用技術 | 備考 |
|---|---|---|
| フレームワーク | **Next.js**（App Router） | `package.json` は `next: ^16.3.3`。`AGENTS.md` の警告どおり、学習データと異なる可能性があるため `node_modules/next/dist/docs/` を参照すること |
| UI | **React 19**（Server Components 中心 + 必要箇所のみ Client Components） | |
| 言語 | **TypeScript**（`typescript: ^7.0.2`） | パスエイリアス `@/*` → リポジトリルート |
| データ | **SQLite**（`better-sqlite3`、同期API） | `next.config.mjs` の `serverExternalPackages` に登録 |
| 書き込み | **Server Actions**（`"use server"`） | REST API ルートは持たない |
| スタイル | **プレーンCSS**（`css/*.css`） | フレームワーク不使用。トークンは `css/base.css` |
| フォント | Google Fonts（Bodoni Moda / IBM Plex Sans JP / Noto Serif JP） | ルートレイアウトで読み込み |

> ⚠️ `README.md` には「Next.js 15」と書かれているが、`package.json` の依存は `^16.3.3`。
> 実装の実体は package.json 側。

---

## 3.2 ディレクトリ構造

```
monote/
├── app/                       ルーティング（App Router）
│   ├── layout.tsx             ルートレイアウト（metadata・フォント・RevealFx）
│   ├── page.tsx               TOP
│   ├── actions.ts             共通 Server Actions（保存・比較・ログイン）
│   ├── search/                条件検索
│   ├── companies/[slug]/      企業詳細
│   ├── articles/              記事一覧・詳細
│   ├── my/compare/            保存・比較
│   ├── inquiry/new/           相談・見積依頼（フォーム + 完了画面）
│   ├── signup/                企業登録（page / client / defs / actions）
│   ├── login/                 デモログイン
│   └── admin/                 企業管理ダッシュボード・記事エディタ
├── components/                Header / Footer / HeroFx / Intro / RevealFx
├── lib/
│   ├── db.ts                  SQLite接続・スキーマ適用・初回シード
│   ├── schema.ts              CREATE TABLE 群（SCHEMA 定数）
│   ├── seed.ts                デモデータ生成（決定的RNG）
│   ├── repo.ts                リポジトリ層（★ページからの単一入口）
│   ├── session.ts             Cookie セッション
│   └── extra/                 ページ固有の追加クエリ
│       ├── admin.ts  editor.ts  search.ts  inquiry.ts  company.ts  signup.ts
├── css/                       base / platform + 画面別CSS
├── public/assets/             画像・メディア
├── AGENTS.md / CLAUDE.md      エージェント向け規約
└── docs/                      このドキュメント
```

---

## 3.3 レイヤ構造とルール

```
┌─────────────────────────────────────────────────────┐
│ app/**  (Server Components / Client Components)     │
│   - 表示ロジックのみ。SQLは書かない                    │
└──────────────┬──────────────────┬───────────────────┘
               │ 読み取り           │ 書き込み
               ▼                  ▼
┌──────────────────────┐  ┌───────────────────────────┐
│ lib/repo.ts          │  │ app/**/actions.ts         │
│  共通リポジトリ         │  │  "use server" アクション    │
│  ★ READ-ONLY 規約     │  │  検証 → repo → revalidate │
└──────────┬───────────┘  └───────────┬───────────────┘
           │                          │
┌──────────▼──────────┐               │
│ lib/extra/<page>.ts │◄──────────────┘
│  ページ固有クエリ      │
└──────────┬──────────┘
           ▼
    ┌──────────────┐
    │  lib/db.ts   │ → SQLite (better-sqlite3)
    └──────────────┘
```

### 重要な規約（`lib/repo.ts` 冒頭のコメント）

> **Page agents: treat this file as READ-ONLY.**
> 追加クエリが必要なときは `lib/extra/<page>.ts` に書くこと。

この規約により、複数のページ実装が同時に進んでも共通リポジトリが壊れないようになっている。
実際 `lib/extra/` には、各画面が必要とした最小限のクエリだけが置かれている。

| ファイル | 提供するもの |
|---|---|
| `extra/admin.ts` | `termRankMap`（条件別の順位再計算）、`articleSlugsOf`、`worksCountOf` |
| `extra/search.ts` | `inquiryEventCounts`（企業別の相談数） |
| `extra/company.ts` | `inquiryCountOf` |
| `extra/article` 相当 | （`repo.ts` で充足） |
| `extra/inquiry.ts` | `inquiryWithRecipients`（完了画面用） |
| `extra/signup.ts` | `recentSearchCount`、`conditionIdByKey`、`createCompanyUser` |
| `extra/editor.ts` | `articleSlugById` |

---

## 3.4 データベース接続とブートストラップ

`lib/db.ts` の `db()` は遅延シングルトン。初回呼び出し時に次を行う。

1. **書き込み可能なディレクトリを決定**
   - `VERCEL` または `AWS_LAMBDA_FUNCTION_NAME` が設定されていれば `os.tmpdir()/monote-data` のみ
   - それ以外は `<cwd>/data` → だめなら `os.tmpdir()/monote-data`
   - 実際に `.write-probe` を書いて確認する
2. `journal_mode = WAL`、`foreign_keys = ON`
3. `SCHEMA`（`lib/schema.ts`）を `CREATE TABLE IF NOT EXISTS` で適用
4. 軽量マイグレーション（例：`articles.thumb` 列が無ければ `ALTER TABLE` で追加）
5. `companies` が0件なら `runSeed()` を実行

つまり **`npm run dev` するだけで、シード済みのプラットフォームが立ち上がる**。

---

## 3.5 レンダリング戦略

- 主要ページは `export const dynamic = "force-dynamic"`
  （検索結果・イベント記録・セッション依存表示のため、キャッシュしない）
- 書き込み後は `revalidatePath()` で関連ページを無効化
  - 記事公開時：`/`, `/articles`, `/search`, `/articles/[slug]`, `/companies/[slug]`
  - 企業登録時：`/signup`, `/search`, `/admin`
  - 相談送信時：`/inquiry/new`, `/admin`
- Client Component は最小限（モーション、エディタ、相談フォーム、チップUI、期間選択など）

---

## 3.6 セッションと認証

`lib/session.ts`。**デモ用の簡易実装であり、本番の認証ではない。**

| Cookie | 内容 | 用途 |
|---|---|---|
| `monote_user` | ユーザーID（平文の数値） | ログイン状態 |
| `monote_sid` | ランダム文字列（httpOnly, 90日） | 匿名ユーザーの保存・比較の紐づけ |

**セッションキー**（`saves` / `compares` の `session_id`）

```
ログイン中      → "user-<id>"      （シードは user-1 に保存・比較を投入済み）
匿名（sid有り） → "anon-<sid>"
匿名（sid無し） → "anon-guest"
```

`ensureSessionKey()` は書き込み前に呼ばれ、匿名ユーザーに sid Cookie を発行する。

> ⚠️ 制約：パスワード検証が無く、Cookie の値がそのままユーザーIDになる。
> 本番化には正規の認証（セッション署名 / IdP 連携）への差し替えが必須。

---

## 3.7 デザイントークン

`css/base.css` の `:root`（Figma変数と一致）。

| トークン | 値 | 用途 |
|---|---|---|
| `--ink` | `#181c1f` | 見出し |
| `--text` | `#48494c` | 本文 |
| `--sub` | `#737373` | 本文（サブ） |
| `--line` | `#c5c5c5` | ライン |
| `--bg` | `#efefef` | 背景 |
| `--white` | `#ffffff` | 白 |
| `--blue` | `#2f6feb` | アクセント |
| `--skyblue` | `#eaf1fe` | 淡いアクセント面 |
| `--red` | `#e5484d` | 必須マーク |
| `--font-brand` | Didot / Bodoni Moda | MONOTE ワードマーク |
| `--font-serif` | Noto Serif JP | 見出し |
| `--font-sans` | IBM Plex Sans JP | 本文 |
| `--container-w` | `1280px` | TOPのコンテンツ幅 |
| `--container-wide` | `1360px` | 下層ページ |
| `--header-h` | `80px` | ヘッダー高さ |

CSSは画面ごとに分割（`top.css` / `search.css` / `company.css` / `article.css` / `articles.css` /
`compare.css` / `inquiry.css` / `signup.css` / `login.css` / `admin-dashboard.css` / `admin-article.css`）し、
各ページで `import` する。共通は `base.css` + `platform.css`。
