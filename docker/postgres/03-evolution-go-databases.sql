-- Bancos dedicados ao Evolution Go (GORM: auth + users), separados do app S3E e do banco `evolution` da API Node.
-- Executado na primeira inicialização do volume do Postgres (initdb).
SELECT 'CREATE DATABASE evogo_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evogo_auth')\gexec
SELECT 'CREATE DATABASE evogo_users'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evogo_users')\gexec
