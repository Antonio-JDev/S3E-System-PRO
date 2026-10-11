-- Contas bancárias da empresa e transferência de tesouraria (não é receita nem despesa)

CREATE TABLE IF NOT EXISTS "contas_bancarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT,
    "agencia" TEXT,
    "numeroConta" TEXT,
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contas_bancarias_ativo_idx" ON "contas_bancarias"("ativo");

CREATE TABLE IF NOT EXISTS "transferencias_bancarias" (
    "id" TEXT NOT NULL,
    "contaOrigemId" TEXT NOT NULL,
    "contaDestinoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transferencias_bancarias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "transferencias_bancarias_contaOrigemId_idx" ON "transferencias_bancarias"("contaOrigemId");
CREATE INDEX IF NOT EXISTS "transferencias_bancarias_contaDestinoId_idx" ON "transferencias_bancarias"("contaDestinoId");
CREATE INDEX IF NOT EXISTS "transferencias_bancarias_data_idx" ON "transferencias_bancarias"("data");

CREATE TABLE IF NOT EXISTS "movimentacoes_tesouraria" (
    "id" TEXT NOT NULL,
    "contaBancariaId" TEXT NOT NULL,
    "transferenciaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimentacoes_tesouraria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "movimentacoes_tesouraria_contaBancariaId_idx" ON "movimentacoes_tesouraria"("contaBancariaId");
CREATE INDEX IF NOT EXISTS "movimentacoes_tesouraria_transferenciaId_idx" ON "movimentacoes_tesouraria"("transferenciaId");
CREATE INDEX IF NOT EXISTS "movimentacoes_tesouraria_data_idx" ON "movimentacoes_tesouraria"("data");
CREATE INDEX IF NOT EXISTS "movimentacoes_tesouraria_classificacao_idx" ON "movimentacoes_tesouraria"("classificacao");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transferencias_bancarias_contaOrigemId_fkey'
  ) THEN
    ALTER TABLE "transferencias_bancarias"
      ADD CONSTRAINT "transferencias_bancarias_contaOrigemId_fkey"
      FOREIGN KEY ("contaOrigemId") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transferencias_bancarias_contaDestinoId_fkey'
  ) THEN
    ALTER TABLE "transferencias_bancarias"
      ADD CONSTRAINT "transferencias_bancarias_contaDestinoId_fkey"
      FOREIGN KEY ("contaDestinoId") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_tesouraria_contaBancariaId_fkey'
  ) THEN
    ALTER TABLE "movimentacoes_tesouraria"
      ADD CONSTRAINT "movimentacoes_tesouraria_contaBancariaId_fkey"
      FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimentacoes_tesouraria_transferenciaId_fkey'
  ) THEN
    ALTER TABLE "movimentacoes_tesouraria"
      ADD CONSTRAINT "movimentacoes_tesouraria_transferenciaId_fkey"
      FOREIGN KEY ("transferenciaId") REFERENCES "transferencias_bancarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
