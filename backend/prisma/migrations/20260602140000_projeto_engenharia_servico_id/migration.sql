-- ProjetoEngenharia + servicoId em orcamento_items

ALTER TABLE "orcamento_items" ADD COLUMN IF NOT EXISTS "servicoId" TEXT;

CREATE INDEX IF NOT EXISTS "orcamento_items_servicoId_idx" ON "orcamento_items"("servicoId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orcamento_items_servicoId_fkey'
  ) THEN
    ALTER TABLE "orcamento_items"
      ADD CONSTRAINT "orcamento_items_servicoId_fkey"
      FOREIGN KEY ("servicoId") REFERENCES "servicos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "projeto_engenharia" (
  "id" TEXT NOT NULL,
  "projetoId" TEXT NOT NULL,
  "nomeProjeto" TEXT,
  "tiposProjeto" JSONB,
  "statusEngenharia" TEXT NOT NULL DEFAULT 'Em Andamento',
  "statusCelesc" JSONB,
  "comentarioEngenharia" TEXT,
  "prioridade" TEXT NOT NULL DEFAULT 'Média',
  "responsavelEngenhariaId" TEXT,
  "atribuidoSetorEngenharia" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "projeto_engenharia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "projeto_engenharia_projetoId_key" ON "projeto_engenharia"("projetoId");
CREATE INDEX IF NOT EXISTS "projeto_engenharia_projetoId_idx" ON "projeto_engenharia"("projetoId");
CREATE INDEX IF NOT EXISTS "projeto_engenharia_responsavelEngenhariaId_idx" ON "projeto_engenharia"("responsavelEngenhariaId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projeto_engenharia_projetoId_fkey'
  ) THEN
    ALTER TABLE "projeto_engenharia"
      ADD CONSTRAINT "projeto_engenharia_projetoId_fkey"
      FOREIGN KEY ("projetoId") REFERENCES "projetos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projeto_engenharia_responsavelEngenhariaId_fkey'
  ) THEN
    ALTER TABLE "projeto_engenharia"
      ADD CONSTRAINT "projeto_engenharia_responsavelEngenhariaId_fkey"
      FOREIGN KEY ("responsavelEngenhariaId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "servicos_codigo_idx" ON "servicos"("codigo");

-- Backfill servicoId a partir de servicoNome (match por nome, case-insensitive)
UPDATE "orcamento_items" oi
SET "servicoId" = s.id
FROM "servicos" s
WHERE oi."tipo" = 'SERVICO'
  AND oi."servicoId" IS NULL
  AND oi."servicoNome" IS NOT NULL
  AND lower(trim(oi."servicoNome")) = lower(trim(s.nome));
