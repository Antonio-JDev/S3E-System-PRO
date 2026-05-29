-- Listas compartilhadas entre todos os usuários do CRM (filtro "Para todos").
ALTER TABLE "whatsapp_chat_labels" ADD COLUMN "is_global" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "whatsapp_chat_labels_global_nome_key"
  ON "whatsapp_chat_labels"("nome")
  WHERE "is_global" = true;
