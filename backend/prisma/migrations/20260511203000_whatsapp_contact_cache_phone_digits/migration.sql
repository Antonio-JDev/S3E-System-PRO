-- Dígitos do telefone por linha de cache (uma linha por chat_id).
ALTER TABLE "whatsapp_contact_cache" ADD COLUMN "phone_digits" TEXT;

CREATE INDEX "whatsapp_contact_cache_phone_digits_idx" ON "whatsapp_contact_cache" ("phone_digits");
