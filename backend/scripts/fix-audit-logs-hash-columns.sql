-- Script para adicionar colunas de hash na tabela audit_logs
-- Execute este script se a migration não foi aplicada corretamente

DO $$ 
BEGIN
    -- Adicionar coluna hash se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'hash') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "hash" TEXT;
        RAISE NOTICE 'Coluna hash adicionada';
    ELSE
        RAISE NOTICE 'Coluna hash já existe';
    END IF;

    -- Adicionar coluna previousHash se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'previousHash') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "previousHash" TEXT;
        RAISE NOTICE 'Coluna previousHash adicionada';
    ELSE
        RAISE NOTICE 'Coluna previousHash já existe';
    END IF;

    -- Adicionar coluna chainId se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'chainId') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "chainId" TEXT;
        RAISE NOTICE 'Coluna chainId adicionada';
    ELSE
        RAISE NOTICE 'Coluna chainId já existe';
    END IF;

    -- Adicionar coluna sequence se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_logs' AND column_name = 'sequence') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "sequence" INTEGER;
        RAISE NOTICE 'Coluna sequence adicionada';
    ELSE
        RAISE NOTICE 'Coluna sequence já existe';
    END IF;
END $$;

-- Criar índices se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_chainId_idx') THEN
        CREATE INDEX "audit_logs_chainId_idx" ON "audit_logs"("chainId");
        RAISE NOTICE 'Índice audit_logs_chainId_idx criado';
    ELSE
        RAISE NOTICE 'Índice audit_logs_chainId_idx já existe';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_entity_entityId_idx') THEN
        CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
        RAISE NOTICE 'Índice audit_logs_entity_entityId_idx criado';
    ELSE
        RAISE NOTICE 'Índice audit_logs_entity_entityId_idx já existe';
    END IF;
END $$;
