-- Скрипт для створення таблиць в базі даних Resumatch

-- Створення розширення для UUID (якщо воно не увімкнене в Postgres за замовчуванням)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Таблиця користувачів
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 2. Таблиця аналізів резюме
CREATE TABLE IF NOT EXISTS public.resume_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL,
  analysis_kind text NOT NULL DEFAULT 'resume_review'::text,
  source_type text NOT NULL DEFAULT 'resume_upload'::text,
  file_name text,
  file_mime_type text,
  file_size_bytes integer,
  target_position text,
  analysis_mode text,
  overall_score smallint,
  resume_quality_score smallint,
  market_fit_score smallint,
  result_schema_version integer NOT NULL DEFAULT 1,
  analysis_payload jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resume_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. Таблиця токенів для відновлення паролю
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
