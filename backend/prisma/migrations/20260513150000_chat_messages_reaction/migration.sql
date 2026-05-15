-- Reação aplicada à mensagem (vinda do cliente ou de nós mesmos via
-- `POST /api/whatsapp/messages/:id/react`). Modelo simples: 1 reação ativa
-- por mensagem, suficiente para WhatsApp 1:1.
ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "reaction" TEXT;
