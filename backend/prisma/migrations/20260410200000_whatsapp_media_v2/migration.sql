ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "media_type" TEXT;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "file_size" INTEGER;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "waha_media_id" TEXT;
