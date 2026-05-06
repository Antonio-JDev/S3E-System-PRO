-- Adiciona participante (autor) para mensagens de grupos
ALTER TABLE "chat_messages"
ADD COLUMN IF NOT EXISTS "participant" TEXT;

CREATE INDEX IF NOT EXISTS "chat_messages_participant_idx" ON "chat_messages"("participant");

