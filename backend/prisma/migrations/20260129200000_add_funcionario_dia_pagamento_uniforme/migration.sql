-- AlterTable: Funcionário - dia do pagamento (1-31) e tamanhos de uniforme
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "diaPagamento" INTEGER DEFAULT 5;
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "uniformeCamisa" TEXT;
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "uniformeCalca" TEXT;
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "uniformeBermuda" TEXT;
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "uniformeSapato" TEXT;

-- Contas a pagar já possui funcionarioId; garantir FK e índice se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contas_pagar_funcionarioId_fkey'
  ) THEN
    ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_funcionarioId_fkey"
      FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "contas_pagar_funcionarioId_idx" ON "contas_pagar"("funcionarioId");
