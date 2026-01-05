-- Script para resolver problema de migration no banco de produção
-- Execute este script conectado ao banco de dados s3e_producao

-- 1. Verificar se a coluna usuarioId já existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'registros_atividade' 
  AND column_name = 'usuarioId'
) AS coluna_usuarioId_existe;

-- 2. Verificar se o índice já existe
SELECT EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE schemaname = 'public'
  AND tablename = 'registros_atividade' 
  AND indexname = 'registros_atividade_usuarioId_idx'
) AS indice_usuarioId_existe;

-- 3. Verificar se a foreign key já existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.table_constraints 
  WHERE table_schema = 'public'
  AND table_name = 'registros_atividade' 
  AND constraint_name = 'registros_atividade_usuarioId_fkey'
) AS fk_usuarioId_existe;

-- 4. Se a coluna, índice e FK já existem, precisamos apenas remover o registro de migration falha
-- e marcar como aplicada manualmente

-- Primeiro, remover o registro de migration falha
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251210182632_add_ncm_orcamento_and_agendamento_pagamento'
AND finished_at IS NULL;

-- Depois, inserir como aplicada (apenas se tudo já existe)
-- NOTA: Ajuste o checksum baseado no que você vê na tabela _prisma_migrations para outras migrations
INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, applied_steps_count)
SELECT 
  '20251210182632_add_ncm_orcamento_and_agendamento_pagamento',
  '',
  NOW(),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" 
  WHERE migration_name = '20251210182632_add_ncm_orcamento_and_agendamento_pagamento'
  AND finished_at IS NOT NULL
);

-- 5. Verificar outras colunas que a migration deveria adicionar
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'orcamento_items' 
  AND column_name = 'ncm'
) AS coluna_ncm_existe;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'contas_pagar' 
  AND column_name = 'dataAgendamento'
) AS coluna_dataAgendamento_existe;

-- Se essas colunas não existirem, precisamos adicioná-las manualmente:
-- ALTER TABLE "orcamento_items" ADD COLUMN IF NOT EXISTS "ncm" TEXT;
-- ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "dataAgendamento" TIMESTAMP(3);

-- 6. Verificar foreign key de kits_ferramenta
SELECT EXISTS (
  SELECT 1 FROM information_schema.table_constraints 
  WHERE table_schema = 'public'
  AND table_name = 'kits_ferramenta' 
  AND constraint_name = 'kits_ferramenta_eletricistaId_fkey'
) AS fk_eletricistaId_existe;
