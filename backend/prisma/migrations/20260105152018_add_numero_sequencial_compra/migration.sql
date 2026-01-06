-- AlterTable
-- Adicionar coluna numeroSequencial (permitir NULL inicialmente para dados existentes)
ALTER TABLE "compras" ADD COLUMN IF NOT EXISTS "numeroSequencial" INTEGER;

-- Atribuir números sequenciais retroativos para compras existentes (ordenadas por data de criação)
-- Usar CTE para atualizar em lote
WITH compras_ordenadas AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "dataCompra" ASC) as num_seq
    FROM "compras"
    WHERE "numeroSequencial" IS NULL
)
UPDATE "compras" c
SET "numeroSequencial" = co.num_seq
FROM compras_ordenadas co
WHERE c.id = co.id;

-- Criar sequência se não existir
CREATE SEQUENCE IF NOT EXISTS "compras_numeroSequencial_seq";

-- Definir o próximo valor da sequência baseado no máximo existente
SELECT setval('"compras_numeroSequencial_seq"', COALESCE((SELECT MAX("numeroSequencial") FROM "compras"), 0) + 1, false);

-- Tornar a coluna NOT NULL após preencher valores
ALTER TABLE "compras" ALTER COLUMN "numeroSequencial" SET NOT NULL;

-- Definir default para a sequência
ALTER TABLE "compras" ALTER COLUMN "numeroSequencial" SET DEFAULT nextval('"compras_numeroSequencial_seq"');

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "compras_numeroSequencial_key" ON "compras"("numeroSequencial");

