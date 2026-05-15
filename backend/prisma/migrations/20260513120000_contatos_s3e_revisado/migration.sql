-- Marca contatos importados/cadastrados manualmente como "revisado=true" (default).
-- Quando um contato é criado automaticamente pelo webhook (mensagem recebida de número novo),
-- o backend grava revisado=false, para o operador revisar/ajustar o nome depois.
ALTER TABLE "contatos_s3e"
  ADD COLUMN IF NOT EXISTS "revisado" BOOLEAN NOT NULL DEFAULT true;

-- Origem do registro: 'import_csv', 'manual', 'inbound_message', 'pre_send', etc.
-- Útil pra auditoria/filtros na tela de gestão.
ALTER TABLE "contatos_s3e"
  ADD COLUMN IF NOT EXISTS "origem" TEXT;

CREATE INDEX IF NOT EXISTS "contatos_s3e_revisado_idx" ON "contatos_s3e"("revisado");
