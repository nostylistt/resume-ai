CREATE TABLE IF NOT EXISTS resume_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_kind TEXT NOT NULL DEFAULT 'resume_review',
  source_type TEXT NOT NULL DEFAULT 'resume_upload',
  file_name TEXT,
  file_mime_type TEXT,
  file_size_bytes INTEGER,
  target_position TEXT,
  analysis_mode TEXT,
  overall_score SMALLINT,
  resume_quality_score SMALLINT,
  market_fit_score SMALLINT,
  result_schema_version INTEGER NOT NULL DEFAULT 1,
  analysis_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resume_analyses_user_created_at_idx
  ON resume_analyses (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS resume_analyses_user_target_position_idx
  ON resume_analyses (user_id, target_position);
