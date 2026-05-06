# 🔧 Aplicar Migration: valorVendaM e valorVendaCM

## ✅ Migration já aplicada no banco de dados local

A migration foi aplicada com sucesso no banco de dados local.

## 🐳 Para Produção (Docker)

Se você está rodando em produção via Docker, você precisa:

### Opção 1: Executar SQL diretamente no banco

Conecte-se ao banco de dados PostgreSQL e execute:

```sql
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "valorVendaM" DOUBLE PRECISION;
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "valorVendaCM" DOUBLE PRECISION;
```

### Opção 2: Via Docker Exec

```bash
# Entrar no container do backend
docker exec -it s3e-backend-prod sh

# Aplicar migration
npx prisma migrate deploy

# Regenerar Prisma Client
npx prisma generate
```

### Opção 3: Reconstruir a imagem Docker

Se você precisa reconstruir a imagem com o Prisma Client atualizado:

```bash
# Reconstruir a imagem
docker-compose -f docker-compose.prod.yml build backend

# Reiniciar o container
docker-compose -f docker-compose.prod.yml up -d backend
```

## ✅ Verificação

Após aplicar a migration, verifique se as colunas foram criadas:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'materiais'
AND column_name IN ('valorVendaM', 'valorVendaCM');
```

Você deve ver as duas colunas listadas.

## 📝 Nota

A migration está localizada em:
`backend/prisma/migrations/20260119000000_add_valor_venda_m_cm_to_materiais/migration.sql`
