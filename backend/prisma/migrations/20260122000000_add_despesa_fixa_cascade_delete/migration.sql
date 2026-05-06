-- AddCascadeDeleteToDespesaFixa
-- Adiciona a relação de foreign key com cascade delete entre ContaPagar e DespesaFixa

-- Adicionar índice para melhor performance na busca por despesaFixaId
CREATE INDEX IF NOT EXISTS "ContaPagar_despesaFixaId_idx" ON "contas_pagar"("despesaFixaId");

-- Remover constraint antiga se existir (com verificação)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ContaPagar_despesaFixaId_fkey'
    ) THEN
        ALTER TABLE "contas_pagar" DROP CONSTRAINT "ContaPagar_despesaFixaId_fkey";
    END IF;
END $$;

-- Adicionar constraint de foreign key com cascade delete
-- Quando uma DespesaFixa for deletada, todas as ContaPagar relacionadas também serão deletadas automaticamente
-- Verifica se a constraint já não existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ContaPagar_despesaFixaId_fkey'
    ) THEN
        ALTER TABLE "contas_pagar"
        ADD CONSTRAINT "ContaPagar_despesaFixaId_fkey" 
        FOREIGN KEY ("despesaFixaId") 
        REFERENCES "despesas_fixas"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;
