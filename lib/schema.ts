export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer','company')),
  company_id INTEGER REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  employees TEXT NOT NULL DEFAULT '',
  founded INTEGER,
  description TEXT NOT NULL DEFAULT '',
  specialty_process TEXT NOT NULL DEFAULT '',
  specialty_process_sub TEXT NOT NULL DEFAULT '',
  specialty_lot TEXT NOT NULL DEFAULT '',
  specialty_lot_sub TEXT NOT NULL DEFAULT '',
  specialty_quality TEXT NOT NULL DEFAULT '',
  specialty_quality_sub TEXT NOT NULL DEFAULT '',
  lot_min INTEGER NOT NULL DEFAULT 1,
  lot_max INTEGER NOT NULL DEFAULT 1000,
  precision_mm REAL,
  delivery_min INTEGER,
  delivery_max INTEGER,
  size_note TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  capacity TEXT NOT NULL DEFAULT '',
  industries TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  price_hint TEXT NOT NULL DEFAULT '',
  contact_hours TEXT NOT NULL DEFAULT '',
  hard_conditions TEXT NOT NULL DEFAULT '',
  response_days INTEGER,
  trade_terms TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  completeness INTEGER NOT NULL DEFAULT 50,
  profile_confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conditions (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  UNIQUE (category, label)
);

CREATE TABLE IF NOT EXISTS company_conditions (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  condition_id INTEGER NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, condition_id)
);

CREATE TABLE IF NOT EXISTS company_photos (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS works (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  spec TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '[]',
  theme TEXT NOT NULL DEFAULT 'case',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','review','published')),
  reviewed INTEGER NOT NULL DEFAULT 0,
  read_minutes INTEGER NOT NULL DEFAULT 5,
  tag1 TEXT NOT NULL DEFAULT '',
  tag2 TEXT NOT NULL DEFAULT '',
  thumb TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS article_conditions (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  condition_id INTEGER NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, condition_id)
);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'estimate',
  process TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  quantity TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  required_precision TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  attachments TEXT NOT NULL DEFAULT '[]',
  anonymous INTEGER NOT NULL DEFAULT 1,
  no_forward INTEGER NOT NULL DEFAULT 0,
  contact_company TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'search',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft','sent')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiry_recipients (
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','replied','declined')),
  PRIMARY KEY (inquiry_id, company_id)
);

CREATE TABLE IF NOT EXISTS saves (
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('company','article')),
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, kind, target_id)
);

CREATE TABLE IF NOT EXISTS compares (
  session_id TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, company_id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  company_id INTEGER,
  article_id INTEGER,
  term TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_company ON events(company_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_articles_company ON articles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_saves_session ON saves(session_id);
`;
