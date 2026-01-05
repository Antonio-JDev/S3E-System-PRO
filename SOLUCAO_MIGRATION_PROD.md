# Solução para Migration Falhando em Produção

## Problema
A migration `20251210182632_add_ncm_orcamento_and_agendamento_pagamento` está falhando porque a coluna `usuarioId` já existe na tabela `registros_atividade`.

## Solução Rápida (Execute no servidor TrueNAS)

### Opção 1: Marcar Migration como Resolvida (Recomendado)

Conecte-se ao banco de dados e execute:

```bash
# No servidor TrueNAS, conecte ao container do postgres
docker exec -it s3e-postgres-prod psql -U s3e_user -d s3e_producao
```

Depois, dentro do PostgreSQL, execute:

```sql
-- 1. Remover o registro de migration falha
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251210182632_add_ncm_orcamento_and_agendamento_pagamento'
AND finished_at IS NULL;

-- 2. Marcar como aplicada
INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, applied_steps_count)
VALUES ('20251210182632_add_ncm_orcamento_and_agendamento_pagamento', '', NOW(), 1)
ON CONFLICT DO NOTHING;
```

### Opção 2: Usar comando Prisma (Alternativa)

```bash
# Entrar no container do backend
docker exec -it s3e-backend-prod sh

# Dentro do container
npx prisma migrate resolve --applied 20251210182632_add_ncm_orcamento_and_agendamento_pagamento
```

### Opção 3: Corrigir Migration e Rebuild (Se necessário)

Se a opção 1 ou 2 não funcionar, será necessário:

1. Corrigir a migration no código (já foi feito)
2. Rebuild da imagem Docker
3. Atualizar no servidor

**Mas primeiro tente as opções 1 ou 2!**

## Verificação

Após executar, verifique se funcionou:

```bash
# Ver logs do backend
docker logs s3e-backend-prod --tail 50

# Verificar status dos containers
docker compose -f docker-compose.prod.yml ps
```

O backend deve parar de reiniciar e ficar com status "Up" ao invés de "Restarting".
