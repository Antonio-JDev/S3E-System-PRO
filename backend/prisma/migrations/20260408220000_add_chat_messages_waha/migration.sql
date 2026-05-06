-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "from_me" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "chat_id" TEXT NOT NULL,
    "waha_message_id" TEXT,
    "session" TEXT,
    "cliente_id" TEXT,
    "contato_lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_waha_message_id_key" ON "chat_messages"("waha_message_id");

-- CreateIndex
CREATE INDEX "chat_messages_chat_id_timestamp_idx" ON "chat_messages"("chat_id", "timestamp");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_contato_lead_id_fkey" FOREIGN KEY ("contato_lead_id") REFERENCES "contato_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
