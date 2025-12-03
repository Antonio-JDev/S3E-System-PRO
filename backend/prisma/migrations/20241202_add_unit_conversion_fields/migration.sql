-- AlterTable: Adicionar campos para conversão de unidades (OPCIONAIS para compatibilidade)
-- Estes campos permitem que barramentos, trilhos e cabos sejam vendidos em unidades diferentes da compra

ALTER TABLE "orcamento_items" ADD COLUMN IF NOT EXISTS "unidadeVenda" TEXT;
ALTER TABLE "orcamento_items" ADD COLUMN IF NOT EXISTS "tipoMaterial" TEXT;

-- Comentários para documentação
COMMENT ON COLUMN "orcamento_items"."unidadeVenda" IS 'Unidade de venda do item (ex: cm para barramentos). Pode ser diferente da unidade de estoque.';
COMMENT ON COLUMN "orcamento_items"."tipoMaterial" IS 'Tipo do material para conversão: BARRAMENTO_COBRE, TRILHO_DIN, CABO, PADRAO';

