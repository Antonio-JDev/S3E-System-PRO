-- CreateTable
CREATE TABLE "whatsapp_chat_labels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "emoji" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_chat_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chat_labels_user_id_nome_key" ON "whatsapp_chat_labels"("user_id", "nome");

-- CreateIndex
CREATE INDEX "whatsapp_chat_labels_user_id_idx" ON "whatsapp_chat_labels"("user_id");

-- CreateTable
CREATE TABLE "whatsapp_chat_label_memberships" (
    "id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_chat_label_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chat_label_memberships_label_id_chat_id_key" ON "whatsapp_chat_label_memberships"("label_id", "chat_id");

-- CreateIndex
CREATE INDEX "whatsapp_chat_label_memberships_chat_id_idx" ON "whatsapp_chat_label_memberships"("chat_id");

-- AddForeignKey
ALTER TABLE "whatsapp_chat_label_memberships"
    ADD CONSTRAINT "whatsapp_chat_label_memberships_label_id_fkey"
    FOREIGN KEY ("label_id") REFERENCES "whatsapp_chat_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
