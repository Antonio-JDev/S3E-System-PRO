-- CreateTable
CREATE TABLE "whatsapp_chat_read_states" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_chat_read_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chat_read_states_user_id_chat_id_key" ON "whatsapp_chat_read_states"("user_id", "chat_id");

-- CreateIndex
CREATE INDEX "whatsapp_chat_read_states_user_id_idx" ON "whatsapp_chat_read_states"("user_id");

-- AddForeignKey
ALTER TABLE "whatsapp_chat_read_states" ADD CONSTRAINT "whatsapp_chat_read_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
