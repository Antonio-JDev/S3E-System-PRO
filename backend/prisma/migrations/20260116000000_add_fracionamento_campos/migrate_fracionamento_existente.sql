-- Script de migração para detectar e atualizar materiais existentes com fracionamento
-- Este script detecta materiais que têm informações de fracionamento na descrição
-- e atualiza os campos de fracionamento automaticamente

-- Função auxiliar para extrair número de unidades de uma descrição
-- Padrões: "PACOTE COM X UNIDADES", "CAIXA COM X UN", "X UNIDADES", etc.
DO $$
DECLARE
    material_record RECORD;
    quantidade_extraida INTEGER;
    tipo_embalagem_detectado TEXT;
    preco_embalagem NUMERIC;
    preco_unitario_calculado NUMERIC;
    descricao_upper TEXT;
BEGIN
    -- Iterar sobre todos os materiais
    FOR material_record IN 
        SELECT id, descricao, nome, preco, "precoEmbalagem", "precoUnitario", "quantidadePorEmbalagem", "tipoEmbalagem"
        FROM materiais
        WHERE descricao IS NOT NULL
    LOOP
        descricao_upper := UPPER(material_record.descricao || ' ' || COALESCE(material_record.nome, ''));
        
        -- Tentar detectar padrões de fracionamento
        -- Padrão 1: "PACOTE COM X UNIDADES" ou "PACOTE COM X UN"
        IF descricao_upper ~ 'PACOTE.*?(\d+)\s*(?:UNIDADES?|UN\.?)' THEN
            quantidade_extraida := (regexp_match(descricao_upper, 'PACOTE.*?(\d+)\s*(?:UNIDADES?|UN\.?)'))[1]::INTEGER;
            tipo_embalagem_detectado := 'PACOTE';
        -- Padrão 2: "CAIXA COM X UNIDADES" ou "CAIXA COM X UN"
        ELSIF descricao_upper ~ 'CAIXA.*?(\d+)\s*(?:UNIDADES?|UN\.?)' THEN
            quantidade_extraida := (regexp_match(descricao_upper, 'CAIXA.*?(\d+)\s*(?:UNIDADES?|UN\.?)'))[1]::INTEGER;
            tipo_embalagem_detectado := 'CAIXA';
        -- Padrão 3: "FARDO COM X UNIDADES" ou "FARDO COM X UN"
        ELSIF descricao_upper ~ 'FARDO.*?(\d+)\s*(?:UNIDADES?|UN\.?)' THEN
            quantidade_extraida := (regexp_match(descricao_upper, 'FARDO.*?(\d+)\s*(?:UNIDADES?|UN\.?)'))[1]::INTEGER;
            tipo_embalagem_detectado := 'FARDO';
        -- Padrão 4: "(PACOTE COM X UNIDADES)" ou "(CAIXA COM X UNIDADES)" - entre parênteses
        ELSIF descricao_upper ~ '\(.*?(?:PACOTE|CAIXA|FARDO).*?(\d+)\s*(?:UNIDADES?|UN\.?)' THEN
            quantidade_extraida := (regexp_match(descricao_upper, '\(.*?(?:PACOTE|CAIXA|FARDO).*?(\d+)\s*(?:UNIDADES?|UN\.?)'))[1]::INTEGER;
            IF descricao_upper ~ 'PACOTE' THEN
                tipo_embalagem_detectado := 'PACOTE';
            ELSIF descricao_upper ~ 'FARDO' THEN
                tipo_embalagem_detectado := 'FARDO';
            ELSE
                tipo_embalagem_detectado := 'CAIXA';
            END IF;
        ELSE
            quantidade_extraida := NULL;
            tipo_embalagem_detectado := NULL;
        END IF;
        
        -- Se detectou fracionamento e o material ainda não tem esses campos preenchidos
        IF quantidade_extraida IS NOT NULL AND quantidade_extraida > 1 THEN
            -- Se o material não tem quantidadePorEmbalagem definida, atualizar
            IF material_record."quantidadePorEmbalagem" IS NULL THEN
                preco_embalagem := COALESCE(material_record."precoEmbalagem", material_record.preco);
                
                -- Se não tem precoEmbalagem, assumir que o preco atual é da embalagem
                IF material_record."precoEmbalagem" IS NULL THEN
                    preco_embalagem := material_record.preco;
                END IF;
                
                -- Calcular preço unitário
                IF preco_embalagem IS NOT NULL AND preco_embalagem > 0 THEN
                    preco_unitario_calculado := preco_embalagem / quantidade_extraida;
                ELSE
                    preco_unitario_calculado := NULL;
                END IF;
                
                -- Atualizar o material
                UPDATE materiais
                SET 
                    "quantidadePorEmbalagem" = quantidade_extraida,
                    "tipoEmbalagem" = tipo_embalagem_detectado,
                    "precoEmbalagem" = preco_embalagem,
                    "precoUnitario" = preco_unitario_calculado
                WHERE id = material_record.id;
                
                RAISE NOTICE 'Material atualizado: % (ID: %) - % % com % unidades', 
                    material_record.nome, 
                    material_record.id,
                    tipo_embalagem_detectado,
                    quantidade_extraida,
                    quantidade_extraida;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migração de fracionamento concluída!';
END $$;
