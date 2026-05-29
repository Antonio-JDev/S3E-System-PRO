-- Orçamentos com pedido de venda passam a status Concretizado
UPDATE "orcamentos" o
SET "status" = 'Concretizado'
WHERE o."status" = 'Aprovado'
  AND EXISTS (SELECT 1 FROM "vendas" v WHERE v."orcamentoId" = o."id");
