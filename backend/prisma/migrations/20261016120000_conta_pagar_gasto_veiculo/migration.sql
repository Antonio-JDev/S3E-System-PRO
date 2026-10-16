-- Conta a pagar gerada pelo gasto do veículo. Excluir o gasto remove a conta.
ALTER TABLE "contas_pagar" ADD COLUMN "gastoVeiculoId" TEXT;

CREATE UNIQUE INDEX "contas_pagar_gastoVeiculoId_key" ON "contas_pagar"("gastoVeiculoId");

ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_gastoVeiculoId_fkey" FOREIGN KEY ("gastoVeiculoId") REFERENCES "gastos_veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
