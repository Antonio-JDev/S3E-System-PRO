-- AlterTable: Venda - valor já faturado (saldo a faturar = valorTotal - valorFaturado)
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "valorFaturado" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: ContaReceber - pagador (faturamento fracionado) e nota de origem
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "clienteId" TEXT;
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "notaFiscalId" TEXT;

-- AlterTable: NotaFiscal - vínculo com pedido de venda
ALTER TABLE "notas_fiscais" ADD COLUMN IF NOT EXISTS "vendaId" TEXT;

-- CreateIndex (optional, for FK lookups)
CREATE INDEX IF NOT EXISTS "contas_receber_clienteId_idx" ON "contas_receber"("clienteId");
CREATE INDEX IF NOT EXISTS "contas_receber_notaFiscalId_idx" ON "contas_receber"("notaFiscalId");
CREATE INDEX IF NOT EXISTS "notas_fiscais_vendaId_idx" ON "notas_fiscais"("vendaId");

-- AddForeignKey ContaReceber -> Cliente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contas_receber_clienteId_fkey'
  ) THEN
    ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_clienteId_fkey"
      FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey ContaReceber -> NotaFiscal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contas_receber_notaFiscalId_fkey'
  ) THEN
    ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_notaFiscalId_fkey"
      FOREIGN KEY ("notaFiscalId") REFERENCES "notas_fiscais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey NotaFiscal -> Venda
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notas_fiscais_vendaId_fkey'
  ) THEN
    ALTER TABLE "notas_fiscais" ADD CONSTRAINT "notas_fiscais_vendaId_fkey"
      FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
