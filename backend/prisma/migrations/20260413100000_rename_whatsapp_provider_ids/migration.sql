-- Rename WAHA-prefixed columns to neutral provider-prefixed columns.
-- This preserves existing data (ALTER TABLE ... RENAME COLUMN).

ALTER TABLE "chat_messages" RENAME COLUMN "waha_message_id" TO "provider_message_id";
ALTER TABLE "chat_messages" RENAME COLUMN "waha_media_id" TO "provider_media_id";

