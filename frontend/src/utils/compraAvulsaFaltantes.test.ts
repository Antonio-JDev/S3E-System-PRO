/**
 * Épico 5 — Atalho "Comprar faltantes" (agregação + preset compra avulsa OS)
 * Rodar: npm run test:run -- compraAvulsaFaltantes.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  agregarItensFaltantesParaCompra,
  montarPresetCompraAvulsaOs,
} from './compraAvulsaFaltantes';
import type { ComposicaoDisponibilidadeData } from '../components/KitComposicaoDisponibilidadeModal';

describe('compraAvulsaFaltantes', () => {
  describe('agregarItensFaltantesParaCompra', () => {
    it('agrega faltantes do cache de kit (estoque insuficiente)', () => {
      const kitCache: Record<string, ComposicaoDisponibilidadeData> = {
        'kit-1': {
          kitId: 'kit-1',
          nomeKit: 'Quadro',
          quantidadeKit: 1,
          completo: false,
          faltantes: [
            {
              tipo: 'MATERIAL',
              materialId: 'mat-a',
              nome: 'Disjuntor 32A',
              necessario: 4,
              disponivel: 1,
              possuiEstoque: false,
              precisaComprar: true,
              precisaVincularBancoFrio: false,
            },
          ],
          itensEstoque: [],
          itensBancoFrio: [],
          itensServicos: [],
        },
      };

      const items = agregarItensFaltantesParaCompra(kitCache, [], {
        vinculacoesBancoFrio: {},
        materiaisEstoque: [],
      });

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        productName: 'Disjuntor 32A',
        quantity: 3,
        materialId: 'mat-a',
      });
    });

    it('ignora serviços e banco frio não vinculado no cache de kit', () => {
      const kitCache: Record<string, ComposicaoDisponibilidadeData> = {
        k: {
          kitId: 'k',
          nomeKit: 'K',
          quantidadeKit: 1,
          completo: false,
          faltantes: [
            {
              tipo: 'SERVICO',
              nome: 'Mão de obra',
              necessario: 1,
              disponivel: 0,
              possuiEstoque: true,
              precisaComprar: false,
              precisaVincularBancoFrio: false,
            },
            {
              tipo: 'COTACAO',
              nome: 'Medidor',
              necessario: 1,
              disponivel: 0,
              possuiEstoque: false,
              precisaComprar: true,
              precisaVincularBancoFrio: true,
            },
          ],
          itensEstoque: [],
          itensBancoFrio: [],
          itensServicos: [],
        },
      };
      expect(
        agregarItensFaltantesParaCompra(kitCache, [], {
          vinculacoesBancoFrio: {},
          materiaisEstoque: [],
        }),
      ).toHaveLength(0);
    });

    it('inclui material BOM com estoque insuficiente e ignora kit catálogo recolhido', () => {
      const items = agregarItensFaltantesParaCompra(
        {},
        [
          {
            item: {
              id: 'item-kit',
              tipo: 'KIT',
              kitId: 'kit-cat',
              quantidade: 1,
            },
            kitExpanded: false,
          },
          {
            item: {
              id: 'item-mat',
              tipo: 'MATERIAL',
              quantidade: 10,
              material: { id: 'mat-x', nome: 'Cabo 2,5mm', estoque: 3 },
            },
          },
        ],
        { vinculacoesBancoFrio: {}, materiaisEstoque: [] },
      );

      expect(items).toHaveLength(1);
      expect(items[0].productName).toBe('Cabo 2,5mm');
      expect(items[0].quantity).toBe(7);
    });

    it('inclui banco frio não vinculado da BOM com quantidade total necessária', () => {
      const items = agregarItensFaltantesParaCompra(
        {},
        [
          {
            item: {
              id: 'bf-1',
              tipo: 'COTACAO',
              cotacao: { nome: 'Caixa QDC' },
              quantidade: 2,
            },
          },
        ],
        { vinculacoesBancoFrio: {}, materiaisEstoque: [] },
      );
      expect(items[0]).toEqual({ productName: 'Caixa QDC', quantity: 2, materialId: undefined });
    });
  });

  describe('montarPresetCompraAvulsaOs', () => {
    it('monta preset PROJETO com itens destinoEstoque false', () => {
      const preset = montarPresetCompraAvulsaOs({
        projetoId: 'p1',
        projetoTitulo: 'Instalação',
        clienteNome: 'ACME',
        numeroSequencial: 2670,
        items: [{ productName: 'Parafuso', quantity: 50, materialId: 'm1' }],
      });
      expect(preset.destinoTipo).toBe('PROJETO');
      expect(preset.projetoId).toBe('p1');
      expect(preset.projetoLabel).toContain('OS-2670');
      expect(preset.projetoLabel).toContain('ACME');
      expect(preset.items[0].destinoEstoque).toBe(false);
    });
  });
});
