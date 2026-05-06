-- CreateEnum
CREATE TYPE "LancamentoFolhaCategoria" AS ENUM ('ADIANTAMENTO', 'FALTA', 'DESCONTO_OUTRO', 'ACRESCIMO');

-- AlterTable funcionarios
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "valorDiaria" DECIMAL(12,2);
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "cargaHorariaMensal" INTEGER DEFAULT 220;
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "saldoBancoHoras" DECIMAL(12,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lancamentos_folha" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "referenciaAno" INTEGER NOT NULL,
    "referenciaMes" INTEGER NOT NULL,
    "categoria" "LancamentoFolhaCategoria" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_folha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lancamentos_folha_funcionarioId_referenciaAno_referenciaMes_idx" ON "lancamentos_folha"("funcionarioId", "referenciaAno", "referenciaMes");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_folha_funcionarioId_fkey') THEN
    ALTER TABLE "lancamentos_folha" ADD CONSTRAINT "lancamentos_folha_funcionarioId_fkey"
      FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
