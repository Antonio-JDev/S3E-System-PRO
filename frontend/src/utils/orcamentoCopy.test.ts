import { describe, it, expect } from 'vitest';
import { mapItensOrcamentoParaCopia } from './orcamentoCopy';

describe('mapItensOrcamentoParaCopia (Copiar Orçamento)', () => {
    it('deve preservar nome e NCM via relacionamento de material e normalizar campos numéricos', () => {
        const itemsEntrada = [
            {
                tipo: 'MATERIAL',
                materialId: 'mat-1',
                material: { nome: 'Cabo Cobre 70mm', ncm: '8544.49.00', unidadeMedida: 'm' },
                quantidade: '2',
                custoUnit: '10',
                precoUnit: '15',
                subtotal: '30',
                // alguns payloads não vêm com unidadeMedida no item
                unidadeVenda: 'cm',
            },
        ];

        const mapped = mapItensOrcamentoParaCopia(itemsEntrada);
        expect(mapped).toHaveLength(1);
        expect(mapped[0].tipo).toBe('MATERIAL');
        expect(mapped[0].materialId).toBe('mat-1');
        expect(mapped[0].nome).toBe('Cabo Cobre 70mm');
        expect(mapped[0].ncm).toBe('8544.49.00');
        expect(mapped[0].unidadeMedida).toBe('cm');
        expect(mapped[0].quantidade).toBe(2);
        expect(mapped[0].custoUnit).toBe(10);
        expect(mapped[0].precoUnit).toBe(15);
        expect(mapped[0].subtotal).toBe(30);
    });

    it('deve copiar data de atualização da cotação para o badge (dataAtualizacaoCotacao)', () => {
        const itemsEntrada = [
            {
                tipo: 'COTACAO',
                cotacaoId: 'cot-1',
                cotacao: { nome: 'Tomada 20A', ncm: '8536.69.90', dataAtualizacao: '2020-01-02T00:00:00.000Z' },
                quantidade: 3,
                custoUnit: 5,
                precoUnit: 8,
                subtotal: 24,
                unidadeVenda: 'un',
            },
        ];

        const mapped = mapItensOrcamentoParaCopia(itemsEntrada);
        expect(mapped[0].nome).toBe('Tomada 20A');
        expect(mapped[0].ncm).toBe('8536.69.90');
        expect(mapped[0].dataAtualizacaoCotacao).toBe('2020-01-02T00:00:00.000Z');
    });

    it('deve preservar composição de kit unificado em itensDoKit e manter kitId indefinido', () => {
        const itensDoKit = [
            { nome: 'Material A', quantidade: 2 },
            { nome: 'Serviço B', quantidade: 1 },
        ];

        const itemsEntrada = [
            {
                tipo: 'KIT',
                kitId: null,
                itensDoKit,
                quantidade: 1,
                custoUnit: 100,
                precoUnit: 180,
                subtotal: 180,
                unidadeMedida: 'un',
            },
        ];

        const mapped = mapItensOrcamentoParaCopia(itemsEntrada);
        expect(mapped).toHaveLength(1);
        expect(mapped[0].tipo).toBe('KIT');
        expect(mapped[0].kitId).toBeUndefined();
        expect(mapped[0].itensDoKit).toEqual(itensDoKit);
        expect(mapped[0].precoUnit).toBe(180);
        expect(mapped[0].subtotal).toBe(180);
    });
});

