-- AlterTable
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "dados_cnpj_ws" JSONB;

-- Comentário: armazena o JSON completo da API CNPJ.ws (raw) para exibir no modal "Ver dados do cliente"
-- sem nova consulta à API (Quadro de Sócios, Atividades Econômicas, Regime Tributário, IE, etc.).
