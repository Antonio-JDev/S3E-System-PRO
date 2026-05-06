-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "has_media" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_messages" ADD COLUMN "media_url" TEXT;
ALTER TABLE "chat_messages" ADD COLUMN "media_mimetype" TEXT;
ALTER TABLE "chat_messages" ADD COLUMN "media_filename" TEXT;
