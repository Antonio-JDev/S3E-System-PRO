-- AlterTable: fornecedores - classificação (Fabricante | Representante_Vendedor)
ALTER TABLE "fornecedores" ADD COLUMN IF NOT EXISTS "classificacao" TEXT;

-- AlterTable: configuracoes_sistema - multiplicador e imposto padrão
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "multiplicadorVenda" DOUBLE PRECISION DEFAULT 1.55;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "percentualImpostoPadrao" DOUBLE PRECISION DEFAULT 8;

-- AlterTable: materiais - percentual imposto por material
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "percentualImposto" DOUBLE PRECISION;

-- AlterTable: orcamento_items - custo agregado unitário para lucro líquido
ALTER TABLE "orcamento_items" ADD COLUMN IF NOT EXISTS "custoAgregadoUnit" DOUBLE PRECISION;
