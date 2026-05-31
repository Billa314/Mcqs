CREATE TABLE IF NOT EXISTS mcqs (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  category TEXT,
  chapter TEXT,
  source_pdf TEXT,
  source_page INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  mcq_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
