-- Migration: fix_audit_logs_compat
-- Goal: make audit_logs columns/indexes compatible across environments where
-- the table may have been created with camelCase columns.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure table exists (no-op if already created by older migration)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_role text,
  action text NOT NULL,
  entity text,
  entity_id text,
  description text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash text,
  previous_hash text,
  chain_id text,
  sequence integer
);

-- Normalize/ensure expected snake_case columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_logs RENAME COLUMN "userId" TO user_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='entityId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='entity_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_logs RENAME COLUMN "entityId" TO entity_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='chainId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='chain_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_logs RENAME COLUMN "chainId" TO chain_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='created_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_logs RENAME COLUMN "createdAt" TO created_at';
  END IF;
END $$;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_id text;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS chain_id text;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entityid ON audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_chain_id ON audit_logs (chain_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

