import {
  conteudoRomaneio,
  formatarDocumento,
  montarModeloRomaneio,
  montarParteCliente,
  montarParteEmpresa,
  nomeArquivoRomaneioOs,
} from './pdfRomaneioQuadro.layout';

function textos(node: unknown, acc: string[] = []): string[] {
  if (node == null) return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => textos(item, acc));
    return acc;
  }
  if (typeof node === 'object') {
    const record = node as { text?: unknown; stack?: unknown; columns?: unknown };
    if (record.text != null) textos(record.text, acc);
    if (record.stack != null) textos(record.stack, acc);
    if (record.columns != null) textos(record.columns, acc);
  }
  return acc;
}

const empresa = {
  razaoSocial: 'S3E Serviços de Manutenção Elétrica Ltda',
  endereco: 'Rua Blumenau',
  numero: '1622',
  bairro: 'Barra do Rio',
  cidade: 'Itajaí',
  estado: 'SC',
  cep: '88305104',
  cnpj: '16625927000157',
  inscricaoEstadual: '256792518',
  telefone: '(47) 3083-8361',
};

const cliente = {
  nome: 'Empresa Tal',
  endereco: 'Rua do Cliente',
  numero: '10',
  bairro: 'Centro',
  cidade: 'Itajaí',
  estado: 'SC',
  cep: '88301000',
  cpfCnpj: '12345678000199',
  inscricaoEstadual: '123456789',
  telefone: '(47) 99999-0000',
};

describe('pdfRomaneioQuadro.layout', () => {
  it('formata CNPJ e nome do arquivo', () => {
    expect(formatarDocumento('16625927000157')).toBe('16.625.927/0001-57');
    expect(nomeArquivoRomaneioOs(2661)).toBe('Romaneio-OS-2661.pdf');
  });

  it('remetente vem da empresa do orçamento e destinatário do cliente', () => {
    const remetente = montarParteEmpresa(empresa);
    const destinatario = montarParteCliente(cliente);
    expect(remetente?.nome).toBe(empresa.razaoSocial);
    expect(remetente?.documento).toBe('16.625.927/0001-57');
    expect(remetente?.ie).toBe('256792518');
    expect(remetente?.cep).toBe('88305-104');
    expect(remetente?.municipio).toBe('Itajaí/SC');
    expect(remetente?.endereco).toContain('Rua Blumenau');
    expect(destinatario.nome).toBe('Empresa Tal');
    expect(destinatario.documento).toBe('12.345.678/0001-99');
    expect(destinatario.telefone).toBe('(47) 99999-0000');
  });

  it('deixa o recebedor em branco para anotação no local', () => {
    const model = montarModeloRomaneio({
      numeroOs: 2661,
      tituloOs: 'QM 3 MEDIDORES',
      empresa,
      cliente,
      entrega: {
        produto: 'QM 3 MEDIDORES',
        volume: '1',
        dataRomaneio: '2026-10-16',
        responsavelEntregaNome: 'Gabriel Palhano',
      },
    });
    expect(model.recebedorNome).toBe('');
    expect(model.remetente?.nome).toContain('S3E Serviços');
    expect(model.data).toBe('16/10/2026');

    const texto = textos(conteudoRomaneio(model)).join(' ');
    expect(texto).toContain('OS 2661');
    expect(texto).toContain('S3E Serviços de Manutenção Elétrica Ltda');
    expect(texto).toContain('Empresa Tal');
    expect(texto).toContain('QM 3 MEDIDORES');
    expect(texto).toContain('Gabriel Palhano');
    expect(texto).toContain('________________');
  });

  it('imprime o recebedor quando o retorno já foi registrado', () => {
    const model = montarModeloRomaneio({
      numeroOs: 2661,
      tituloOs: 'QM',
      empresa,
      cliente,
      entrega: {
        recebedorNome: 'Eletricista',
        recebidoEm: '2026-10-16T15:30:00.000Z',
        responsavelEntregaNome: 'Gabriel Palhano',
      },
    });
    const texto = textos(conteudoRomaneio(model)).join(' ');
    expect(texto).toContain('Eletricista');
    expect(texto).not.toContain('________________');
  });

  it('segue sem remetente quando o orçamento não tem empresa fiscal', () => {
    const model = montarModeloRomaneio({
      numeroOs: 10,
      tituloOs: 'Quadro',
      empresa: null,
      cliente,
    });
    expect(model.remetente).toBeNull();
    expect(model.produto).toBe('Quadro');
    expect(model.volume).toBe('1');
    const texto = textos(conteudoRomaneio(model)).join(' ');
    expect(texto).toContain('Remetente');
    expect(texto).toContain('—');
  });
});
