-- Quote metadata for reply references in chat bubbles
ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "quoted_provider_message_id" TEXT,
  ADD COLUMN IF NOT EXISTS "quoted_content" TEXT,
  ADD COLUMN IF NOT EXISTS "quoted_from_me" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "quoted_author_name" TEXT;
