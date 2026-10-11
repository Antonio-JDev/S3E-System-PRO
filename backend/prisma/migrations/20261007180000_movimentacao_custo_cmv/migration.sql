-- CMV: custo congelado na movimentação de estoque e vínculo com a OS

ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "custoUnitario" DOUBLE PRECISION;
ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "valorCusto" DOUBLE PRECISION;
ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "projetoId" TEXT;
ALTER TABLE "movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "custoRetroativo" BOOLEAN NOT NULL DEFAULT false;

-- Saídas antigas (e devoluções de OS) recebem o preço atual do cadastro, marcado como estimado
UPDATE "movimentacoes_estoque" AS m
SET
  "custoUnitario" = COALESCE(mat.preco, 0),
  "valorCusto" = ROUND((m.quantidade * COALESCE(mat.preco, 0))::numeric, 2)::double precision,
  "custoRetroativo" = true
FROM "materiais" AS mat
WHERE m."materialId" = mat.id
  AND m."custoUnitario" IS NULL
  AND (
    (m.tipo = 'SAIDA' AND m.motivo IN ('OBRA', 'VENDA', 'Alocação para obra'))
    OR (m.tipo = 'ENTRADA' AND m.motivo = 'DEVOLUCAO')
  );

-- Liga a saída à OS quando a referência é a obra
UPDATE "movimentacoes_estoque" AS m
SET "projetoId" = o."projetoId"
FROM "obras" AS o
WHERE m.referencia = o.id
  AND o."projetoId" IS NOT NULL
  AND m."projetoId" IS NULL
  AND m.tipo = 'SAIDA';

-- Liga a baixa do pedido de venda à OS
UPDATE "movimentacoes_estoque" AS m
SET "projetoId" = v."projetoId"
FROM "vendas" AS v
WHERE m.referencia = v.id
  AND m.motivo = 'VENDA'
  AND v."projetoId" IS NOT NULL
  AND m."projetoId" IS NULL;

-- Devolução de rollback já grava o id do projeto na referência
UPDATE "movimentacoes_estoque" AS m
SET "projetoId" = p.id
FROM "projetos" AS p
WHERE m.motivo = 'DEVOLUCAO'
  AND m."projetoId" IS NULL
  AND m.referencia = p.id;

CREATE INDEX IF NOT EXISTS "movimentacoes_estoque_projetoId_idx" ON "movimentacoes_estoque"("projetoId");
CREATE INDEX IF NOT EXISTS "movimentacoes_estoque_data_tipo_idx" ON "movimentacoes_estoque"("data", "tipo");

DO $$ BEGIN
  ALTER TABLE "movimentacoes_estoque"
    ADD CONSTRAINT "movimentacoes_estoque_projetoId_fkey"
    FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
