-- Migration: add_audit_logs
-- Generated: 2026-02-13

-- Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create table audit_logs
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

-- Indexes to support queries used by the application
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entityid ON audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_chain_id ON audit_logs (chain_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

