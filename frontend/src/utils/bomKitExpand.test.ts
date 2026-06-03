import { describe, expect, it } from 'vitest';
import {
  buildKitExpandKey,
  createVirtualCatalogKitHeader,
  expandItensDoKitHierarquia,
  flattenKitEntityToComposicao,
  parseKitIdFromExpandKey,
  resolveComposicaoCatalogoKit,
} from './bomKitExpand';

describe('bomKitExpand', () => {
  it('buildKitExpandKey monta chave estável', () => {
    expect(buildKitExpandKey('orc-1', 'kit-a')).toBe('orc-1::kit::kit-a');
  });

  it('flattenKitEntityToComposicao inclui materiais e kits filhos', () => {
    const composicao = flattenKitEntityToComposicao(
      {
        id: 'pai',
        items: [
          {
            quantidade: 2,
            material: { id: 'm1', nome: 'Parafuso', sku: 'P1' },
            materialId: 'm1',
          },
          {
            quantidade: 1,
            kitFilhoId: 'filho',
            kitFilho: {
              id: 'filho',
              nome: 'Kit filho',
              items: [
                {
                  quantidade: 3,
                  materialId: 'm2',
                  material: { id: 'm2', nome: 'Porca' },
                },
              ],
            },
          },
        ],
      },
      'pai',
    );

    const materiais = composicao.filter((c) => c.tipo === 'MATERIAL');
    const kits = composicao.filter((c) => c.tipo === 'KIT');
    expect(materiais.some((m) => m.materialId === 'm1' && m.parentKitId === 'pai')).toBe(true);
    expect(kits.some((k) => k.kitId === 'filho' && k.parentKitId === 'pai')).toBe(true);
    expect(materiais.some((m) => m.materialId === 'm2' && m.parentKitId === 'filho')).toBe(true);
  });

  it('parseKitIdFromExpandKey extrai kitId da chave', () => {
    expect(parseKitIdFromExpandKey('orc-1::kit::abc-123')).toBe('abc-123');
    expect(parseKitIdFromExpandKey('item-id')).toBeNull();
  });

  it('resolveComposicaoCatalogoKit usa cache quando sub não tem itensDoKit', () => {
    const cache = {
      k1: [{ tipo: 'MATERIAL', nome: 'Parafuso', quantidade: 2, parentKitId: 'k1', materialId: 'm1' }],
    };
    expect(resolveComposicaoCatalogoKit({ kitId: 'k1' }, 'k1', [], cache)).toHaveLength(1);
  });

  it('resolveComposicaoCatalogoKit prioriza itensDoKit do sub', () => {
    const sub = {
      kitId: 'k1',
      itensDoKit: [{ tipo: 'MATERIAL', nome: 'A', quantidade: 1, parentKitId: 'k1' }],
    };
    expect(resolveComposicaoCatalogoKit(sub, 'k1', [])).toHaveLength(1);
  });

  it('expandItensDoKitHierarquia só aninha quando expandKey está no set', () => {
    const composicao = [
      { tipo: 'KIT', kitId: 'filho', nome: 'Filho', quantidade: 1, parentKitId: 'avô' },
      { tipo: 'MATERIAL', materialId: 'm1', nome: 'Peça', quantidade: 2, parentKitId: 'filho' },
    ];
    const parent = { id: 'orc-99' };
    const kitsDesunificados = new Set<string>();

    const recolhido = expandItensDoKitHierarquia({
      composicao,
      rootKitId: 'avô',
      parentOrcamentoItem: parent,
      parentKitForRows: parent,
      qtdKitMult: 1,
      kitsDesunificados,
      materiaisEstoque: [{ id: 'm1', estoque: 10, nome: 'Peça' }],
      idPrefix: 'pfx',
    });
    expect(recolhido).toHaveLength(1);
    expect(recolhido[0].expandKey).toBe('orc-99::kit::filho');

    kitsDesunificados.add('orc-99::kit::filho');
    const expandido = expandItensDoKitHierarquia({
      composicao,
      rootKitId: 'avô',
      parentOrcamentoItem: parent,
      parentKitForRows: parent,
      qtdKitMult: 1,
      kitsDesunificados,
      materiaisEstoque: [{ id: 'm1', estoque: 10, nome: 'Peça' }],
      idPrefix: 'pfx',
    });
    expect(expandido).toHaveLength(2);
    expect(expandido[1].item.tipo).toBe('MATERIAL');
  });

  it('createVirtualCatalogKitHeader preserva kitId para UI', () => {
    const { item, expandKey } = createVirtualCatalogKitHeader({
      parentItemId: 'unif-1',
      sub: { nome: 'Caixa DPS', quantidade: 1 },
      subKitId: 'kit-dps',
      qtdKitMult: 2,
    });
    expect(expandKey).toBe('unif-1::kit::kit-dps');
    expect(item.kitId).toBe('kit-dps');
    expect(item.quantidade).toBe(2);
  });
});
