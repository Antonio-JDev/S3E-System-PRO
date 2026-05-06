-- ============================================
-- Fix: Adicionar Cascade Delete para DespesaFixa -> ContaPagar
-- ============================================
-- Este script adiciona a relação de foreign key com cascade delete
-- entre ContaPagar e DespesaFixa para que quando uma despesa fixa
-- for deletada, as contas a pagar relacionadas sejam removidas automaticamente
-- ============================================

-- 1. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS "ContaPagar_despesaFixaId_idx" ON "contas_pagar"("despesaFixaId");

-- 2. Remover constraint antiga se existir
ALTER TABLE "contas_pagar" 
DROP CONSTRAINT IF EXISTS "ContaPagar_despesaFixaId_fkey";

-- 3. Adicionar nova constraint com CASCADE DELETE
ALTER TABLE "contas_pagar"
ADD CONSTRAINT "ContaPagar_despesaFixaId_fkey" 
FOREIGN KEY ("despesaFixaId") 
REFERENCES "despesas_fixas"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- 4. Verificar se a constraint foi criada corretamente
SELECT 
    conname AS constraint_name,
    confdeltype AS delete_action,
    confupdtype AS update_action
FROM pg_constraint 
WHERE conname = 'ContaPagar_despesaFixaId_fkey';

-- Resultado esperado:
-- delete_action: 'c' (cascade)
-- update_action: 'c' (cascade)

-- ============================================
-- Fim do script
-- ============================================
