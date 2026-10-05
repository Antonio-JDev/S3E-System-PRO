import { describe, expect, it } from 'vitest';
import {
  linhaBomAceitaChegada,
  rotuloReferenciaChegada,
  statusPrevisaoChegada,
} from './previsaoChegadaBom.util';

describe('linhaBomAceitaChegada', () => {
  it('aceita material de estoque e banco frio', () => {
    expect(linhaBomAceitaChegada({ tipo: 'MATERIAL' })).toBe(true);
    expect(linhaBomAceitaChegada({ tipo: 'COTACAO' })).toBe(true);
  });

  it('recusa serviços', () => {
    expect(linhaBomAceitaChegada({ tipo: 'SERVICO' })).toBe(false);
    expect(linhaBomAceitaChegada({ tipo: 'MATERIAL', servico: { nome: 'ART' } })).toBe(false);
    expect(linhaBomAceitaChegada({ tipo: '', servicoId: 's1' })).toBe(false);
  });

  it('recusa kits (precisam ser expandidos)', () => {
    expect(linhaBomAceitaChegada({ tipo: 'KIT' })).toBe(false);
    expect(linhaBomAceitaChegada({ tipo: 'kit' })).toBe(false);
  });
});

describe('statusPrevisaoChegada', () => {
  it('classifica pela data civil', () => {
    expect(statusPrevisaoChegada('2026-10-04', '2026-10-05')).toBe('atrasada');
    expect(statusPrevisaoChegada('2026-10-05T00:00:00.000Z', '2026-10-05')).toBe('hoje');
    expect(statusPrevisaoChegada('2026-10-10', '2026-10-05')).toBe('futura');
  });
});

describe('rotuloReferenciaChegada', () => {
  it('prefixa o tipo de documento', () => {
    expect(rotuloReferenciaChegada('NF', '12345')).toBe('NF 12345');
    expect(rotuloReferenciaChegada('PEDIDO_COMPRA', 'PC-9')).toBe('Pedido PC-9');
    expect(rotuloReferenciaChegada(null, 'abc')).toBe('abc');
    expect(rotuloReferenciaChegada('NF', '  ')).toBeNull();
  });
});
