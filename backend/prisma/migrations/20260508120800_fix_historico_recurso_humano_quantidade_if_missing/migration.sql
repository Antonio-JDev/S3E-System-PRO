-- Garante compatibilidade com bancos que marcaram migrations antigas como "applied"
-- sem executar (dev-bootstrap). Sem essa coluna, o POST /api/recursos-humanos falha com P2022.

ALTER TABLE "historico_recurso_humano"
  ADD COLUMN IF NOT EXISTS "quantidade" double precision;

