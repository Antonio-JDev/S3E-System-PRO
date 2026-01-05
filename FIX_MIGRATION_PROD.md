# Correção de Migration - Produção

## Problema

A migration `20251210182632_add_ncm_orcamento_and_agendamento_pagamento` está falhando porque tenta adicionar a coluna `usuarioId` que já existe na tabela `registros_atividade`.

## Solução

Execute os seguintes comandos SQL diretamente no banco de dados de produção para resolver:

```sql
-- 1. Verificar se a coluna já existe e se a foreign key já existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'registros_atividade' AND column_name = 'usuarioId';

SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'registros_atividade' AND constraint_name = 'registros_atividade_usuarioId_fkey';

-- 2. Se a coluna já existe, marcar a migration como resolvida manualmente
-- Conectar ao banco e executar:

-- Primeiro, remover o registro de migration falha da tabela _prisma_migrations
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251210182632_add_ncm_orcamento_and_agendamento_pagamento';

-- Depois, inserir como aplicada (apenas se a coluna e foreign key já existem)
-- Verifique antes executando:
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'registros_atividade' AND column_name = 'usuarioId'
) AS coluna_existe;

SELECT EXISTS (
  SELECT 1 FROM information_schema.table_constraints 
  WHERE table_name = 'registros_atividade' 
  AND constraint_name = 'registros_atividade_usuarioId_fkey'
) AS fk_existe;

-- Se ambos retornarem true, então execute:
INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, applied_steps_count)
VALUES ('20251210182632_add_ncm_orcamento_and_agendamento_pagamento', '', NOW(), 1)
ON CONFLICT DO NOTHING;

-- 3. Ou, se preferir, corrigir a migration diretamente no arquivo e reaplicar
-- Mas isso requer rebuild da imagem Docker
```

## Alternativa Mais Simples (Recomendada)

Como a coluna já existe, vamos marcar apenas essa parte da migration como já aplicada. 

Execute no banco de dados:

```sql
-- Verificar o que já existe
\dt registros_atividade
\d registros_atividade

-- Se a coluna usuarioId já existe, precisamos apenas marcar a migration como resolvida
-- A melhor forma é usar o comando do Prisma:
```

## Comando Prisma para Resolver

No servidor, dentro do container do backend, execute:

```bash
# Entrar no container
docker exec -it s3e-backend-prod sh

# Dentro do container, executar:
npx prisma migrate resolve --applied 20251210182632_add_ncm_orcamento_and_agendamento_pagamento

# Ou, se isso não funcionar, editar diretamente a migration para usar IF NOT EXISTS
```
