-- Exportação folha contábil: configurações globais
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "codigoEmpresaContabil" TEXT;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "empresaFiscalIdFolha" TEXT;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "percentualHeFolhaContabil" INTEGER DEFAULT 70;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "rubricasFolhaContabil" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_sistema_empresaFiscalIdFolha_fkey'
  ) THEN
    ALTER TABLE "configuracoes_sistema"
      ADD CONSTRAINT "configuracoes_sistema_empresaFiscalIdFolha_fkey"
      FOREIGN KEY ("empresaFiscalIdFolha") REFERENCES "empresas_fiscais"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
