-- Extrato mensal do banco de horas (saldo inicial → movimentos → saldo final)
CREATE TABLE IF NOT EXISTS "banco_horas_extrato_competencia" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "referenciaAno" INTEGER NOT NULL,
    "referenciaMes" INTEGER NOT NULL,
    "saldoInicialPositivas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoInicialNegativas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoInicialLiquido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditosMes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debitosMes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pagamentosMes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoFinalPositivas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoFinalNegativas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoFinalLiquido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "origemAtualizacao" TEXT NOT NULL DEFAULT 'FOLHA',
    "movimentosJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "banco_horas_extrato_competencia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "banco_horas_extrato_competencia_funcionarioId_referenciaAno_referenciaMes_key"
  ON "banco_horas_extrato_competencia"("funcionarioId", "referenciaAno", "referenciaMes");

CREATE INDEX IF NOT EXISTS "banco_horas_extrato_competencia_funcionarioId_referenciaAno_referenciaMes_idx"
  ON "banco_horas_extrato_competencia"("funcionarioId", "referenciaAno", "referenciaMes");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'banco_horas_extrato_competencia_funcionarioId_fkey'
  ) THEN
    ALTER TABLE "banco_horas_extrato_competencia"
      ADD CONSTRAINT "banco_horas_extrato_competencia_funcionarioId_fkey"
      FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
