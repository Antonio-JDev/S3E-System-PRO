-- Compatibilidade audit_logs: garante colunas snake_case usadas pelo Prisma
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_role text;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS previous_hash text;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS chain_id text;

-- Copiar dados de colunas camelCase legadas (se existirem), sem apagar as antigas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'userId') THEN
    UPDATE audit_logs SET user_id = COALESCE(user_id, "userId"::uuid) WHERE user_id IS NULL AND "userId" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'userName') THEN
    UPDATE audit_logs SET user_name = COALESCE(user_name, "userName") WHERE user_name IS NULL AND "userName" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'userRole') THEN
    UPDATE audit_logs SET user_role = COALESCE(user_role, "userRole") WHERE user_role IS NULL AND "userRole" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entityId') THEN
    UPDATE audit_logs SET entity_id = COALESCE(entity_id, "entityId") WHERE entity_id IS NULL AND "entityId" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'ipAddress') THEN
    UPDATE audit_logs SET ip_address = COALESCE(ip_address, "ipAddress") WHERE ip_address IS NULL AND "ipAddress" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'userAgent') THEN
    UPDATE audit_logs SET user_agent = COALESCE(user_agent, "userAgent") WHERE user_agent IS NULL AND "userAgent" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'createdAt') THEN
    UPDATE audit_logs SET created_at = COALESCE(created_at, "createdAt") WHERE created_at IS NULL AND "createdAt" IS NOT NULL;
  END IF;
END $$;
