CREATE TABLE IF NOT EXISTS "comentarios_conferencia_ponto_rh" (
  "id" TEXT NOT NULL,
  "funcionarioId" TEXT NOT NULL,
  "dataReferencia" TIMESTAMP(3) NOT NULL,
  "comentario" TEXT,
  "decisaoRh" "StatusAprovacaoRh" NOT NULL DEFAULT 'PENDENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "comentarios_conferencia_ponto_rh_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "comentarios_conferencia_ponto_rh_funcionarioId_dataReferencia_key"
  ON "comentarios_conferencia_ponto_rh"("funcionarioId", "dataReferencia");

CREATE INDEX IF NOT EXISTS "comentarios_conferencia_ponto_rh_funcionarioId_dataReferencia_idx"
  ON "comentarios_conferencia_ponto_rh"("funcionarioId", "dataReferencia");

ALTER TABLE "comentarios_conferencia_ponto_rh"
  ADD CONSTRAINT "comentarios_conferencia_ponto_rh_funcionarioId_fkey"
  FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
