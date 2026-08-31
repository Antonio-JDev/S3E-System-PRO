-- LEGADO: Evolution API v2 (Node). Em stacks atuais (Evolution Go) este script
-- NÃO é mais montado no Postgres do ERP. Mantido só para referência / volumes antigos.
-- EvoGo usa docker/postgres/evogo-init/ no serviço postgres-evogo.
SELECT 'CREATE DATABASE evolution'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution')\gexec
