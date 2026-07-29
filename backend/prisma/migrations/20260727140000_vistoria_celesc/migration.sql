-- CreateEnum
CREATE TYPE "StatusVistoriaCelesc" AS ENUM (
  'PENDENTE_PROTOCOLO',
  'AGUARDANDO_CELESC',
  'REPROVADO',
  'VISTORIA_APROVADA'
);

-- AlterTable
ALTER TABLE "projetos"
  ADD COLUMN IF NOT EXISTS "exigeVistoriaCelesc" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "statusVistoria" "StatusVistoriaCelesc",
  ADD COLUMN IF NOT EXISTS "dataProtocoloVistoria" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "historico_reprovacao_vistoria" (
  "id" TEXT NOT NULL,
  "projetoId" TEXT NOT NULL,
  "dataReprovacao" TIMESTAMP(3) NOT NULL,
  "motivos" TEXT NOT NULL,
  "itensReprovados" JSONB NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criadoPorId" TEXT,

  CONSTRAINT "historico_reprovacao_vistoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "historico_reprovacao_vistoria_projetoId_idx"
  ON "historico_reprovacao_vistoria"("projetoId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'historico_reprovacao_vistoria_projetoId_fkey'
  ) THEN
    ALTER TABLE "historico_reprovacao_vistoria"
      ADD CONSTRAINT "historico_reprovacao_vistoria_projetoId_fkey"
      FOREIGN KEY ("projetoId") REFERENCES "projetos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'historico_reprovacao_vistoria_criadoPorId_fkey'
  ) THEN
    ALTER TABLE "historico_reprovacao_vistoria"
      ADD CONSTRAINT "historico_reprovacao_vistoria_criadoPorId_fkey"
      FOREIGN KEY ("criadoPorId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
