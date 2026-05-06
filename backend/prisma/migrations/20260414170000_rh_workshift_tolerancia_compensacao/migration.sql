-- CreateEnum
CREATE TYPE "OcorrenciaPontoRhTipo" AS ENUM ('FALTA_JUSTIFICADA', 'DIVIDA_HORAS');

-- CreateEnum
CREATE TYPE "StatusAprovacaoRh" AS ENUM ('PENDENTE', 'APROVADO_RH', 'REPROVADO');

-- CreateEnum
CREATE TYPE "ModoQuitacaoHorasNegativas" AS ENUM ('DESCONTAR_SALARIO', 'COMPENSAR_BANCO');

-- CreateEnum
CREATE TYPE "PeriodoCompensacaoHoras" AS ENUM ('DIAS_SEMANA', 'FINAL_DE_SEMANA');

-- AlterEnum
ALTER TYPE "LancamentoFolhaCategoria" ADD VALUE IF NOT EXISTS 'FALTA_JUSTIFICADA';

-- AlterTable
ALTER TABLE "funcionarios"
ADD COLUMN "saldoHorasNegativas" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN "modoQuitacaoHorasNegativas" "ModoQuitacaoHorasNegativas",
ADD COLUMN "periodoCompensacaoHoras" "PeriodoCompensacaoHoras";

-- CreateTable
CREATE TABLE "work_shifts" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "entrada1" TEXT NOT NULL,
    "saida1" TEXT NOT NULL,
    "entrada2" TEXT NOT NULL,
    "saida2" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocorrencias_ponto_rh" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "registroPontoId" TEXT,
    "dataReferencia" TIMESTAMP(3) NOT NULL,
    "tipo" "OcorrenciaPontoRhTipo" NOT NULL,
    "status" "StatusAprovacaoRh" NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "modoQuitacao" "ModoQuitacaoHorasNegativas",
    "periodoCompensacao" "PeriodoCompensacaoHoras",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocorrencias_ponto_rh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensacoes_horas_rh" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "referenciaAno" INTEGER NOT NULL,
    "referenciaMes" INTEGER NOT NULL,
    "minutosDivida" INTEGER NOT NULL,
    "minutosQuitados" INTEGER NOT NULL DEFAULT 0,
    "modoQuitacao" "ModoQuitacaoHorasNegativas" NOT NULL,
    "periodoCompensacao" "PeriodoCompensacaoHoras" NOT NULL,
    "status" "StatusAprovacaoRh" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensacoes_horas_rh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensacoes_horas_dias_rh" (
    "id" TEXT NOT NULL,
    "compensacaoRhId" TEXT NOT NULL,
    "ocorrenciaRhId" TEXT,
    "dataCompensacao" TIMESTAMP(3) NOT NULL,
    "minutosPrevistos" INTEGER NOT NULL DEFAULT 60,
    "minutosAprovados" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusAprovacaoRh" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensacoes_horas_dias_rh_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "configuracoes_ponto"
ADD COLUMN "workShiftId" TEXT,
ADD COLUMN "toleranciaMinutos" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "inicioNoturno" TEXT DEFAULT '18:00';

-- AlterTable
ALTER TABLE "registros_ponto"
ADD COLUMN "minutosTrabalhados" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "minutosAtraso" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "minutosHorasDevidas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "minutosExtra50" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "minutosExtra100" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "minutosExtra20" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "work_shifts_nome_key" ON "work_shifts"("nome");

-- CreateIndex
CREATE INDEX "configuracoes_ponto_workShiftId_idx" ON "configuracoes_ponto"("workShiftId");

-- CreateIndex
CREATE INDEX "ocorrencias_ponto_rh_funcionarioId_dataReferencia_idx" ON "ocorrencias_ponto_rh"("funcionarioId", "dataReferencia");
CREATE INDEX "ocorrencias_ponto_rh_registroPontoId_idx" ON "ocorrencias_ponto_rh"("registroPontoId");
CREATE UNIQUE INDEX "ocorrencias_ponto_rh_funcionarioId_dataReferencia_tipo_key" ON "ocorrencias_ponto_rh"("funcionarioId", "dataReferencia", "tipo");

-- CreateIndex
CREATE INDEX "compensacoes_horas_rh_funcionarioId_referenciaAno_referenciaMes_idx" ON "compensacoes_horas_rh"("funcionarioId", "referenciaAno", "referenciaMes");

-- CreateIndex
CREATE INDEX "compensacoes_horas_dias_rh_compensacaoRhId_idx" ON "compensacoes_horas_dias_rh"("compensacaoRhId");
CREATE INDEX "compensacoes_horas_dias_rh_dataCompensacao_idx" ON "compensacoes_horas_dias_rh"("dataCompensacao");

-- AddForeignKey
ALTER TABLE "configuracoes_ponto"
ADD CONSTRAINT "configuracoes_ponto_workShiftId_fkey"
FOREIGN KEY ("workShiftId") REFERENCES "work_shifts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias_ponto_rh"
ADD CONSTRAINT "ocorrencias_ponto_rh_funcionarioId_fkey"
FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ocorrencias_ponto_rh"
ADD CONSTRAINT "ocorrencias_ponto_rh_registroPontoId_fkey"
FOREIGN KEY ("registroPontoId") REFERENCES "registros_ponto"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensacoes_horas_rh"
ADD CONSTRAINT "compensacoes_horas_rh_funcionarioId_fkey"
FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensacoes_horas_dias_rh"
ADD CONSTRAINT "compensacoes_horas_dias_rh_compensacaoRhId_fkey"
FOREIGN KEY ("compensacaoRhId") REFERENCES "compensacoes_horas_rh"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compensacoes_horas_dias_rh"
ADD CONSTRAINT "compensacoes_horas_dias_rh_ocorrenciaRhId_fkey"
FOREIGN KEY ("ocorrenciaRhId") REFERENCES "ocorrencias_ponto_rh"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
