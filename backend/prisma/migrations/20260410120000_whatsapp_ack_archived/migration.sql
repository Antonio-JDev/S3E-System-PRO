-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "ack" INTEGER;

-- AlterTable
ALTER TABLE "whatsapp_chat_read_states" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
