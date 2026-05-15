-- Adiciona timestamp de marcação como lida no provedor (✓✓ azul no celular do
-- cliente). Idempotência global do `markread` da Evolution Go — evita
-- re-marcar mensagens já marcadas quando outro operador abre o mesmo chat.
ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "provider_read_at" TIMESTAMP(3);
