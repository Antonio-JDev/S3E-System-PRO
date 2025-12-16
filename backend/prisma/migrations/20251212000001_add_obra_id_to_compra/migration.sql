-- Adicionar coluna obraId na tabela compras para vincular compras avulsas a obras em andamento
ALTER TABLE "compras" ADD COLUMN IF NOT EXISTS "obraId" TEXT;

-- Adicionar foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'compras_obraId_fkey'
    ) THEN
        ALTER TABLE "compras" 
        ADD CONSTRAINT "compras_obraId_fkey" 
        FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS "compras_obraId_idx" ON "compras"("obraId");
