-- Conta protegida (desenvolvedor seed) — não editável por admin/gerente
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "conta_protegida" BOOLEAN NOT NULL DEFAULT false;

-- Marcar o desenvolvedor criado pelo seed (produção)
UPDATE "users"
SET "conta_protegida" = true
WHERE LOWER("email") = 'antoniojrtech@gmail.com';
