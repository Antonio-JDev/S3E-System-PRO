-- Bancos exclusivos da Evolution Go (GORM: auth + users).
-- Rodado apenas na 1ª inicialização do volume `postgres_evogo_data`.
-- Conversas do CRM ficam em s3e_producao (Postgres do ERP), não aqui.

SELECT 'CREATE DATABASE evogo_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evogo_auth')\gexec

SELECT 'CREATE DATABASE evogo_users'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evogo_users')\gexec
