import {
  avaliarChecklistEntregaQuadro,
  extrairEntregaQuadro,
  mensagemBloqueioConclusaoQuadros,
  podeConcluirOsQuadros,
  validarEntregaQuadro,
  type EntregaQuadroMetadados,
} from './osEntregaQuadro.util';

function entregaCompleta(overrides: Partial<EntregaQuadroMetadados> = {}): EntregaQuadroMetadados {
  return {
    fotoProduto: 'data:image/png;base64,aaaaaaaaaaaaaaaaaaaa',
    materiaisConferidos: true,
    romaneio: {
      geradoEm: '2026-09-16T12:00:00.000Z',
      produtos: [{ nome: 'Quadro QGBT', codigo: 'Q-01' }],
      qtdVolumes: 1,
      volumes: [{ identificacao: 'Caixa 01', marcacao: 'S3E' }],
      pesoLiquidoKg: 10,
      pesoBrutoKg: 12,
      dimensoes: '80x60x30 cm',
    },
    clienteNome: 'Maria Cliente',
    clienteTelefone: '47999990000',
    dataEntrega: '2026-09-16',
    assinaturaCliente: 'data:image/png;base64,bbbbbbbbbbbbbbbbbbbb',
    fotoProdutoEntregue: 'data:image/png;base64,cccccccccccccccccccc',
    entregadorNome: 'João',
    localRecebimento: 'Obra',
    recebidoNoLocal: true,
    ...overrides,
  };
}

describe('osEntregaQuadro.util', () => {
  it('extrai metadados aninhados ou diretos', () => {
    expect(extrairEntregaQuadro({ entregaQuadro: { clienteNome: 'Ana' } })?.clienteNome).toBe('Ana');
    expect(extrairEntregaQuadro({ clienteNome: 'Bia' })?.clienteNome).toBe('Bia');
  });

  it('checklist completo → ok', () => {
    const r = avaliarChecklistEntregaQuadro(entregaCompleta());
    expect(r.ok).toBe(true);
    expect(r.pendencias).toEqual([]);
  });

  it('lista pendências quando incompleto', () => {
    const r = avaliarChecklistEntregaQuadro({
      dataEntrega: '2026-09-01',
      clienteNome: 'X',
    });
    expect(r.ok).toBe(false);
    expect(r.pendencias.join(' ')).toMatch(/Foto do produto/);
    expect(r.pendencias.join(' ')).toMatch(/materiais/i);
    expect(r.pendencias.join(' ')).toMatch(/Romaneio/);
    expect(r.pendencias.join(' ')).toMatch(/Telefone/);
    expect(r.pendencias.join(' ')).toMatch(/Assinatura/);
    expect(r.pendencias.join(' ')).toMatch(/Foto do produto entregue/);
  });

  it('podeConcluirOsQuadros libera outros tipos sem checklist', () => {
    expect(podeConcluirOsQuadros('LAUDO_TECNICO', null).ok).toBe(true);
    expect(podeConcluirOsQuadros('QUADROS_PAINEIS', null).ok).toBe(false);
    expect(podeConcluirOsQuadros('QUADROS_PAINEIS', entregaCompleta()).ok).toBe(true);
  });

  it('mensagem de bloqueio e validarEntregaQuadro', () => {
    const falha = podeConcluirOsQuadros('QUADROS_PAINEIS', {});
    expect(mensagemBloqueioConclusaoQuadros(falha)).toMatch(/Não é possível concluir/);
    expect(() => validarEntregaQuadro({ entregaQuadro: entregaCompleta() })).not.toThrow();
    expect(() => validarEntregaQuadro(null)).toThrow(/Checklist de entrega incompleto/);
  });
});
