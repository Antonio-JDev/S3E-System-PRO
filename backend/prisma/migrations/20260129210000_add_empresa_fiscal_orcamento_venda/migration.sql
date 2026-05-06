-- Add empresaFiscalId to orcamentos (empresa executora: Orçamento -> PV -> NF-e/NFS-e)
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "empresaFiscalId" TEXT;

-- Add FK orcamentos -> empresas_fiscais (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_empresaFiscalId_fkey'
  ) THEN
    ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_empresaFiscalId_fkey"
      FOREIGN KEY ("empresaFiscalId") REFERENCES "empresas_fiscais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add empresaFiscalId to vendas (herdada do orçamento)
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "empresaFiscalId" TEXT;

-- Add FK vendas -> empresas_fiscais (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendas_empresaFiscalId_fkey'
  ) THEN
    ALTER TABLE "vendas" ADD CONSTRAINT "vendas_empresaFiscalId_fkey"
      FOREIGN KEY ("empresaFiscalId") REFERENCES "empresas_fiscais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
