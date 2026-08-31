import { describe, expect, it } from 'vitest';
import {
  classificacaoVaiParaEstoque,
  itemPrecisaVinculoEstoque,
  rotuloVinculoItem,
} from './compraMaterialMatch';

describe('compraMaterialMatch', () => {
  it('exige vínculo só em classificações de estoque', () => {
    expect(classificacaoVaiParaEstoque('COMPOSICAO_ESTOQUE')).toBe(true);
    expect(classificacaoVaiParaEstoque('LIMPEZA_INSUMOS')).toBe(true);
    expect(classificacaoVaiParaEstoque('DESPESAS_VARIADAS')).toBe(false);
    expect(classificacaoVaiParaEstoque('FERRAMENTAS')).toBe(false);
  });

  it('considera pendente quando não há material nem criação explícita', () => {
    expect(itemPrecisaVinculoEstoque({})).toBe(true);
    expect(itemPrecisaVinculoEstoque({ materialId: 'm1' })).toBe(false);
    expect(itemPrecisaVinculoEstoque({ criarNovoMaterial: true })).toBe(false);
  });

  it('rotula match por alias como automático confiável e nome como sugestão', () => {
    const porAlias = rotuloVinculoItem({
      materialId: 'm1',
      materialVinculado: { nome: 'Cabo Flex 2,5mm' },
      matchAutomatico: true,
      matchTipo: 'ALIAS_NOME',
    });
    expect(porAlias.tom).toBe('ok');
    expect(porAlias.texto).toContain('vínculo já cadastrado');

    const porNome = rotuloVinculoItem({
      materialId: 'm1',
      materialVinculado: { nome: 'Cabo Flex 2,5mm' },
      matchAutomatico: true,
      matchTipo: 'NOME_MATERIAL',
    });
    expect(porNome.tom).toBe('sugestao');
  });
});
