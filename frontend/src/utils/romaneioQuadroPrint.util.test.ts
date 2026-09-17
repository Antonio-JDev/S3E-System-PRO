import { montarHtmlRomaneio } from './romaneioQuadroPrint.util';

describe('romaneioQuadroPrint.util', () => {
  it('gera HTML com remetente S3E e destinatário', () => {
    const html = montarHtmlRomaneio(
      {
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
      },
      {
        numeroOs: 42,
        tituloOs: 'OS Quadro',
        clienteNome: 'Cliente Teste',
      },
    );
    expect(html).toMatch(/Romaneio de transporte/);
    expect(html).toMatch(/S3E/);
    expect(html).toMatch(/Cliente Teste/);
    expect(html).toMatch(/Quadro QGBT/);
    expect(html).toMatch(/Caixa 01/);
  });
});
