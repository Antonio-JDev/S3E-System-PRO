-- AlterTable: Adiciona campo vendedorNome na tabela vendas
-- Este campo armazena o nome do vendedor/responsável pela venda
-- Herdado do orcamentistaNome do orçamento quando a venda é criada

ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "vendedorNome" TEXT;

-- Preencher vendedorNome para vendas existentes a partir do orcamentistaNome do orçamento
UPDATE "vendas" v
SET "vendedorNome" = o."orcamentistaNome"
FROM "orcamentos" o
WHERE v."orcamentoId" = o.id
  AND v."vendedorNome" IS NULL
  AND o."orcamentistaNome" IS NOT NULL;
