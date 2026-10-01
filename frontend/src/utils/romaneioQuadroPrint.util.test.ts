import { COMPANY_NAME } from '../config/constants';
import {
  montarDadosRomaneio,
  montarHtmlRomaneio,
  nomeArquivoRomaneioOs,
} from './romaneioQuadroPrint.util';

describe('romaneioQuadroPrint.util', () => {
  const entrega = {
    clienteNome: 'Cliente Teste',
    clienteTelefone: '47999990000',
    romaneio: {
      produtos: [{ nome: 'Quadro QGBT', codigo: 'Q-1', quantidade: 1 }],
      volumes: [{ identificacao: 'Caixa 01', marcacao: 'S3E', tipo: 'caixa' }],
      qtdVolumes: 1,
      pesoLiquidoKg: 10,
      pesoBrutoKg: 12,
      dimensoes: '80x60x30',
      geradoEm: '2026-09-16T12:00:00.000Z',
    },
  };
  const ctx = {
    numeroOs: 2659,
    tituloOs: 'OS Quadro',
    clienteNome: 'Cliente Teste',
    remetente: { nome: COMPANY_NAME },
  };

  it('normaliza produtos, volumes e destinatário', () => {
    const d = montarDadosRomaneio(entrega, ctx);
    expect(d.destinatarioNome).toBe('Cliente Teste');
    expect(d.produtos[0]?.nome).toBe('Quadro QGBT');
    expect(d.volumes[0]?.identificacao).toBe('Caixa 01');
    expect(d.rem.nome).toBe(COMPANY_NAME);
    expect(d.pesoLiquidoKg).toBe(10);
  });

  it('nome do arquivo PDF usa o número da OS', () => {
    expect(nomeArquivoRomaneioOs(2659)).toBe('Romaneio-OS-2659.pdf');
    expect(nomeArquivoRomaneioOs('2659')).toBe('Romaneio-OS-2659.pdf');
    expect(nomeArquivoRomaneioOs(null)).toBe('Romaneio-OS.pdf');
  });

  it('montarHtmlRomaneio (compat) inclui campos principais', () => {
    const html = montarHtmlRomaneio(entrega, ctx);
    expect(html).toMatch(/Romaneio de transporte/);
    expect(html).toMatch(COMPANY_NAME);
    expect(html).toMatch(/Cliente Teste/);
    expect(html).toMatch(/Quadro QGBT/);
    expect(html).toMatch(/Caixa 01/);
  });
});
