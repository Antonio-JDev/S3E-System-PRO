-- CreateTable
CREATE TABLE "whatsapp_chat_identities" (
    "id" TEXT NOT NULL,
    "phone_digits" TEXT NOT NULL,
    "primary_chat_id" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_chat_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chat_identities_phone_digits_key" ON "whatsapp_chat_identities"("phone_digits");

-- CreateIndex
CREATE INDEX "whatsapp_chat_identities_primary_chat_id_idx" ON "whatsapp_chat_identities"("primary_chat_id");
