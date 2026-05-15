-- Add pinned/favorite flags to Whatsapp chat read states (per user).
ALTER TABLE "whatsapp_chat_read_states"
  ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "favorite" BOOLEAN NOT NULL DEFAULT FALSE;

