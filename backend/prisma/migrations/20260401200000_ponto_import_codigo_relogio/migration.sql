-- CreateEnum
CREATE TYPE "StatusConsistenciaPonto" AS ENUM ('CONSISTENTE', 'INCONSISTENTE');

-- AlterTable: funcionarios
ALTER TABLE "funcionarios" ADD COLUMN "codigoRelogio" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_codigoRelogio_key" ON "funcionarios"("codigoRelogio");

-- Deduplicate registros_ponto before unique constraint (keep most recently updated per funcionario+dia)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY "funcionarioId", ("dataReferencia"::date)
      ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC
    ) AS rn
  FROM "registros_ponto"
)
DELETE FROM "registros_ponto" r
USING ranked x
WHERE r.id = x.id AND x.rn > 1;

-- DropIndex (old non-unique index from Prisma)
DROP INDEX IF EXISTS "registros_ponto_funcionarioId_dataReferencia_idx";

-- AlterTable: registros_ponto
ALTER TABLE "registros_ponto" ADD COLUMN "batidasBrutas" JSONB;
ALTER TABLE "registros_ponto" ADD COLUMN "statusConsistencia" "StatusConsistenciaPonto";
ALTER TABLE "registros_ponto" ADD COLUMN "origemImportacao" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "registros_ponto_funcionarioId_dataReferencia_key" ON "registros_ponto"("funcionarioId", "dataReferencia");
