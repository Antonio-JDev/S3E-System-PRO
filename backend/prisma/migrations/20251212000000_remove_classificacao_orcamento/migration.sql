-- Remove coluna classificacao da tabela orcamentos
ALTER TABLE "orcamentos" DROP COLUMN IF EXISTS "classificacao";

-- Remove enum ClassificacaoOrcamento se não estiver sendo usado
-- Nota: PostgreSQL não permite remover enums facilmente, então deixamos o enum no schema
-- mas não o usamos mais. Se necessário, pode ser removido manualmente depois.
