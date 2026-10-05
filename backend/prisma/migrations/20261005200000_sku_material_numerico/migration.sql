-- SKU de materiais passa a ser somente numérico e sequencial (100001, 100002, ...).
-- Materiais com SKU contendo letras recebem um novo número (em ordem de cadastro);
-- o SKU antigo fica em "skuAnterior". SKUs já numéricos são mantidos.

ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "skuAnterior" TEXT;

CREATE SEQUENCE IF NOT EXISTS "material_sku_seq" START WITH 100001 MINVALUE 1;

WITH inicio AS (
    SELECT GREATEST(100000, COALESCE(MAX(sku::bigint), 0)) AS valor
    FROM "materiais"
    WHERE sku ~ '^[0-9]{1,6}$'
),
alvo AS (
    SELECT id, sku, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS ordem
    FROM "materiais"
    WHERE sku !~ '^[0-9]+$'
)
UPDATE "materiais" m
SET "skuAnterior" = alvo.sku,
    sku = (inicio.valor + alvo.ordem)::text
FROM alvo, inicio
WHERE m.id = alvo.id;

SELECT setval(
    'material_sku_seq',
    GREATEST(100000, (SELECT COALESCE(MAX(sku::bigint), 0) FROM "materiais" WHERE sku ~ '^[0-9]{1,6}$'))
);
