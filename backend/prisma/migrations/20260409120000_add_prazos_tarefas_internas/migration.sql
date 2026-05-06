-- Add prazo + flags to tarefas internas (Kanban administrativo)

-- 1) tarefas_internas: prazo obrigatório + flag prazoDefinido
ALTER TABLE "tarefas_internas"
ADD COLUMN IF NOT EXISTS "prazo" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "prazoDefinido" BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: prazo = createdAt + 1 dia (mantém regra padrão)
UPDATE "tarefas_internas"
SET "prazo" = "createdAt" + INTERVAL '1 day',
    "prazoDefinido" = FALSE
WHERE "prazoDefinido" IS FALSE;

-- 2) tarefas_internas_itens: flag prazoDefinido + backfill dataPrevisaoFim se nula
ALTER TABLE "tarefas_internas_itens"
ADD COLUMN IF NOT EXISTS "prazoDefinido" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "tarefas_internas_itens"
SET "dataPrevisaoFim" = "createdAt" + INTERVAL '1 day',
    "prazoDefinido" = FALSE
WHERE "dataPrevisaoFim" IS NULL;

