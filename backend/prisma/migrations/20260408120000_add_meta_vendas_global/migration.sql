-- Meta de vendas global (fallback) e metas por mês (YYYY-MM -> valor)
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "metaMensalVendas" DECIMAL(18,2) NOT NULL DEFAULT 100000;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "metasVendasPorMes" JSONB;
