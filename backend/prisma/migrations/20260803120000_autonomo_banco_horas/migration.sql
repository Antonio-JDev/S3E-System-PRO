-- Novo tipo de contrato: Autônomo com regras de jornada/banco (CLT) + pagamento por diária.
ALTER TYPE "TipoContratoFuncionario" ADD VALUE IF NOT EXISTS 'AUTONOMO_BANCO_HORAS';
