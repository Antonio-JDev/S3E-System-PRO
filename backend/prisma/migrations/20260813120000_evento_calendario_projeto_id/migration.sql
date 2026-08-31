-- AlterTable
ALTER TABLE "eventos_calendario" ADD COLUMN IF NOT EXISTS "projetoId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "eventos_calendario_projetoId_idx" ON "eventos_calendario"("projetoId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eventos_calendario_projetoId_fkey'
  ) THEN
    ALTER TABLE "eventos_calendario"
      ADD CONSTRAINT "eventos_calendario_projetoId_fkey"
      FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
