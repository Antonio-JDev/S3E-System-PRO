-- Banco dedicado à Evolution API v2 (tabelas Prisma da Evolution, separadas do app S3E).
-- Executado pelo Postgres oficial apenas na primeira inicialização do volume de dados.
-- Se o volume já existir sem este banco: docker exec -it s3e-postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE evolution;"
SELECT 'CREATE DATABASE evolution'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution')\gexec
