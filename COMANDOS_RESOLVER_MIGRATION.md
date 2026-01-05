# Comandos para Resolver Migration no TrueNAS

## Execute estes comandos no servidor TrueNAS:

### Passo 1: Conectar ao Banco de Dados

```bash
docker exec -it s3e-postgres-prod psql -U s3e_user -d s3e_producao
```

### Passo 2: Executar SQL para Resolver

Dentro do PostgreSQL, execute estes comandos:

```sql
-- 1. Verificar se a coluna já existe (deve retornar true)
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'registros_atividade' 
  AND column_name = 'usuarioId'
);

-- 2. Remover o registro de migration falha
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251210182632_add_ncm_orcamento_and_agendamento_pagamento'
AND finished_at IS NULL;

-- 3. Marcar migration como aplicada
INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, applied_steps_count)
VALUES ('20251210182632_add_ncm_orcamento_and_agendamento_pagamento', '', NOW(), 1);

-- 4. Verificar se foi inserido corretamente
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations" 
WHERE migration_name = '20251210182632_add_ncm_orcamento_and_agendamento_pagamento';

-- 5. Sair do PostgreSQL
\q
```

### Passo 3: Reiniciar o Backend

```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Passo 4: Verificar Logs

```bash
docker logs s3e-backend-prod --tail 50
```

O backend deve iniciar normalmente agora!
