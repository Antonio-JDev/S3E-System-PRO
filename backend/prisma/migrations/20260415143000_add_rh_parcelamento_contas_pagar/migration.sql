-- Campos adicionais em contas_pagar para tipo de despesa e desconto em folha
ALTER TABLE "contas_pagar"
ADD COLUMN "subtipo" TEXT,
ADD COLUMN "origemCadastro" TEXT,
ADD COLUMN "descontoFolhaTipo" TEXT,
ADD COLUMN "descontoFolhaParcelas" INTEGER,
ADD COLUMN "descontoFolhaReferenciaAno" INTEGER,
ADD COLUMN "descontoFolhaReferenciaMes" INTEGER,
ADD COLUMN "rhParcelamentoId" TEXT;

-- Parcelamento de adiantamentos/vales em RH
CREATE TABLE "rh_adiantamentos_parcelamentos" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "contaPagarId" TEXT,
    "subtipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "valorParcela" DECIMAL(12,2) NOT NULL,
    "saldoRestante" DECIMAL(12,2) NOT NULL,
    "parcelasTotal" INTEGER NOT NULL,
    "parcelasAplicadas" INTEGER NOT NULL DEFAULT 0,
    "referenciaAnoInicio" INTEGER NOT NULL,
    "referenciaMesInicio" INTEGER NOT NULL,
    "proximaReferenciaAno" INTEGER NOT NULL,
    "proximaReferenciaMes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rh_adiantamentos_parcelamentos_pkey" PRIMARY KEY ("id")
);

-- Campos de vínculo no lançamento de folha
ALTER TABLE "lancamentos_folha"
ADD COLUMN "rhParcelamentoId" TEXT,
ADD COLUMN "rhParcelaNumero" INTEGER;

-- Índices
CREATE INDEX "contas_pagar_rhParcelamentoId_idx" ON "contas_pagar"("rhParcelamentoId");
CREATE INDEX "rh_adiantamentos_parcelamentos_funcionarioId_idx" ON "rh_adiantamentos_parcelamentos"("funcionarioId");
CREATE INDEX "rh_adiantamentos_parcelamentos_contaPagarId_idx" ON "rh_adiantamentos_parcelamentos"("contaPagarId");
CREATE INDEX "rh_adiantamentos_parcelamentos_status_proximaReferenciaAno_proximaReferenciaMes_idx"
ON "rh_adiantamentos_parcelamentos"("status", "proximaReferenciaAno", "proximaReferenciaMes");
CREATE INDEX "lancamentos_folha_rhParcelamentoId_idx" ON "lancamentos_folha"("rhParcelamentoId");
CREATE UNIQUE INDEX "lancamentos_folha_rhParcelamentoId_rhParcelaNumero_key"
ON "lancamentos_folha"("rhParcelamentoId", "rhParcelaNumero");

-- FKs
ALTER TABLE "contas_pagar"
ADD CONSTRAINT "contas_pagar_rhParcelamentoId_fkey"
FOREIGN KEY ("rhParcelamentoId") REFERENCES "rh_adiantamentos_parcelamentos"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rh_adiantamentos_parcelamentos"
ADD CONSTRAINT "rh_adiantamentos_parcelamentos_funcionarioId_fkey"
FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rh_adiantamentos_parcelamentos"
ADD CONSTRAINT "rh_adiantamentos_parcelamentos_contaPagarId_fkey"
FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lancamentos_folha"
ADD CONSTRAINT "lancamentos_folha_rhParcelamentoId_fkey"
FOREIGN KEY ("rhParcelamentoId") REFERENCES "rh_adiantamentos_parcelamentos"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
