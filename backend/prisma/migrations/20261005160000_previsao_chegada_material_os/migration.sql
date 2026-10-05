-- Previsão de chegada de compras por linha da BOM da OS (aba Materiais).
CREATE TABLE IF NOT EXISTS "previsoes_chegada_material_os" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "descricao" TEXT,
    "materialId" TEXT,
    "dataChegada" DATE NOT NULL,
    "tipoReferencia" TEXT,
    "referencia" TEXT,
    "definidoPorId" TEXT,
    "definidoPorNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "previsoes_chegada_material_os_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "previsoes_chegada_material_os_projetoId_itemKey_key"
    ON "previsoes_chegada_material_os"("projetoId", "itemKey");

CREATE INDEX IF NOT EXISTS "previsoes_chegada_material_os_projetoId_idx"
    ON "previsoes_chegada_material_os"("projetoId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'previsoes_chegada_material_os_projetoId_fkey'
    ) THEN
        ALTER TABLE "previsoes_chegada_material_os"
            ADD CONSTRAINT "previsoes_chegada_material_os_projetoId_fkey"
            FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
