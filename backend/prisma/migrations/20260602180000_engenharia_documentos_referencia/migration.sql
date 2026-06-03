CREATE TABLE IF NOT EXISTS "engenharia_documentos_referencia" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL DEFAULT 'PDF',
  "nome" TEXT NOT NULL,
  "nomeArquivo" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "tamanho" INTEGER,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "engenharia_documentos_referencia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "engenharia_documentos_referencia_userId_idx" ON "engenharia_documentos_referencia"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'engenharia_documentos_referencia_userId_fkey'
  ) THEN
    ALTER TABLE "engenharia_documentos_referencia"
      ADD CONSTRAINT "engenharia_documentos_referencia_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
