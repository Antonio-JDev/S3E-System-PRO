-- Configuração da tela DEV: chave do MCP de debug e chave Gemini.
-- Os segredos ficam só nesta tabela, nunca em arquivo versionado.

CREATE TABLE IF NOT EXISTS "configuracao_dev_mcp" (
    "id" TEXT NOT NULL DEFAULT 'dev-mcp',
    "mcp_api_key" TEXT NOT NULL,
    "gemini_api_key" TEXT,
    "usar_gemini" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "configuracao_dev_mcp_pkey" PRIMARY KEY ("id")
);
