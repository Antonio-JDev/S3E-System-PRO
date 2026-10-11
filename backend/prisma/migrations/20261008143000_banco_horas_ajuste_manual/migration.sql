-- Lançamento manual de horas no banco, com justificativa e competência de pagamento.

CREATE TABLE IF NOT EXISTS "banco_horas_ajustes_manuais" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "referenciaAno" INTEGER NOT NULL,
    "referenciaMes" INTEGER NOT NULL,
    "horas" DECIMAL(12,2) NOT NULL,
    "justificativa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banco_horas_ajustes_manuais_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "banco_horas_ajustes_manuais_funcionarioId_referenciaAno_referenciaMes_idx"
ON "banco_horas_ajustes_manuais"("funcionarioId", "referenciaAno", "referenciaMes");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banco_horas_ajustes_manuais_funcionarioId_fkey'
    ) THEN
        ALTER TABLE "banco_horas_ajustes_manuais"
        ADD CONSTRAINT "banco_horas_ajustes_manuais_funcionarioId_fkey"
        FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
