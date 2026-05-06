-- Alter table projeto: adicionar sem_obra, justificativa_sem_obra, enderecoObra, cidade, estado, responsavelObra
ALTER TABLE "projetos"
ADD COLUMN IF NOT EXISTS "semObra" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "justificativaSemObra" text,
ADD COLUMN IF NOT EXISTS "enderecoObra" text,
ADD COLUMN IF NOT EXISTS "cidade" text,
ADD COLUMN IF NOT EXISTS "estado" text,
ADD COLUMN IF NOT EXISTS "responsavelObra" text;

-- Alter table orcamentos: adicionar pedido_faturado
ALTER TABLE "orcamentos"
ADD COLUMN IF NOT EXISTS "pedidoFaturado" boolean DEFAULT false;

-- Observação: nomes de colunas seguem a convenção do Prisma (camelCase) e o mapeamento para o banco usa os nomes gerados automaticamente.

