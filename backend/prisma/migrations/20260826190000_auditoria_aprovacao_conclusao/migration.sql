-- AlterTable orcamentos: quem aprovou
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "aprovadoPorId" TEXT;

-- AlterTable projetos: quem concluiu
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "concluidoPorId" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "orcamentos_aprovadoPorId_idx" ON "orcamentos"("aprovadoPorId");
CREATE INDEX IF NOT EXISTS "projetos_concluidoPorId_idx" ON "projetos"("concluidoPorId");

-- Foreign keys (idempotent-ish: drop if exists then add)
DO $$ BEGIN
  ALTER TABLE "orcamentos"
    ADD CONSTRAINT "orcamentos_aprovadoPorId_fkey"
    FOREIGN KEY ("aprovadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "projetos"
    ADD CONSTRAINT "projetos_concluidoPorId_fkey"
    FOREIGN KEY ("concluidoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
