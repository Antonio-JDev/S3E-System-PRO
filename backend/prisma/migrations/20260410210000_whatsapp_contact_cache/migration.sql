-- CreateTable
CREATE TABLE "whatsapp_contact_cache" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "display_name" TEXT,
    "profile_picture_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contact_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_cache_chat_id_key" ON "whatsapp_contact_cache"("chat_id");
