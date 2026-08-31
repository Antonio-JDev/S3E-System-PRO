-- LEGADO: evogo_* no Postgres do ERP.
-- Stacks atuais criam estes bancos no serviço postgres-evogo
-- (docker/postgres/evogo-init/01-create-databases.sql).
SELECT 'CREATE DATABASE evogo_auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evogo_auth')\gexec
SELECT 'CREATE DATABASE evogo_users'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evogo_users')\gexec
