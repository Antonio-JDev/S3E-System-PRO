-- CreateTable
CREATE TABLE "contatos_s3e" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "jid" TEXT,
    "nome_agenda" TEXT,
    "push_name" TEXT,
    "empresa" TEXT,
    "ultima_interacao" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contatos_s3e_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contatos_s3e_numero_key" ON "contatos_s3e"("numero");

-- CreateIndex
CREATE INDEX "contatos_s3e_jid_idx" ON "contatos_s3e"("jid");
