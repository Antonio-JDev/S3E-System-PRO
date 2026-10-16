/**
 * Gerador da DPS (Sistema Nacional NFS-e, leiaute v1.01). Não chama a prefeitura.
 */

import {
  CODIGO_MUNICIPIO_ITAJAI,
  NFSE_NACIONAL_NAMESPACE,
  codigoTributacaoNacional,
  extrairNumeroNfseDaChave,
  gerarXmlDps,
  gerarXmlPedidoCancelamento,
  montarIdDps,
  serieDpsNumerica
} from './nfse-nacional-xml.service';

const cnpj = '12345678000199';

function dpsBase(overrides: Partial<Parameters<typeof gerarXmlDps>[0]> = {}) {
  return gerarXmlDps({
    ambiente: '2',
    dataEmissao: new Date('2026-10-13T11:00:00Z'),
    serie: '1',
    nDps: 42,
    naturezaOperacao: 501,
    prestador: {
      cnpj,
      inscricaoMunicipal: '12345',
      razaoSocial: 'S3E Engenharia & Serviços',
      optanteSimplesNacional: 1,
      logradouro: 'Rua das Flores',
      numero: '100',
      bairro: 'Centro',
      cep: '88301-000',
      codigoMunicipio: CODIGO_MUNICIPIO_ITAJAI
    },
    tomador: {
      cpf: '123.456.789-01',
      razaoSocial: 'Cliente <Teste>',
      endereco: 'Av. Brasil',
      numero: '50',
      bairro: 'Fazenda',
      cep: '88302000',
      codigoMunicipio: '4208203',
      email: 'cliente@example.com'
    },
    servicos: [
      {
        itemListaServico: '14.01.01',
        discriminacao: 'Manutenção elétrica',
        valorServicos: 80.5,
        issRetido: 2
      },
      {
        itemListaServico: '070201',
        discriminacao: 'Empreitada & montagem',
        valorServicos: 19.5,
        issRetido: 1
      }
    ],
    ...overrides
  });
}

describe('DPS nacional (leiaute v1.01)', () => {
  it('monta o identificador com município de Itajaí, CNPJ e paddings do manual', () => {
    const { idXml, idApi } = montarIdDps({
      cLocEmi: CODIGO_MUNICIPIO_ITAJAI,
      documentoPrestador: cnpj,
      serie: '1',
      nDps: 42
    });
    expect(idApi).toHaveLength(42);
    expect(idXml).toBe(`DPS${idApi}`);
    expect(idApi.startsWith('42082032')).toBe(true);
    expect(idApi.slice(7, 8)).toBe('2');
    expect(idApi.slice(8, 22)).toBe(cnpj);
    expect(idApi.slice(22, 27)).toBe('00001');
    expect(idApi.slice(27)).toBe('000000000000042');
  });

  it('gera XML com namespace, prestador, tomador, serviço e valores somados', () => {
    const gerada = dpsBase();
    expect(gerada.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(gerada.xml).toContain(`xmlns="${NFSE_NACIONAL_NAMESPACE}"`);
    expect(gerada.xml).toContain('versao="1.01"');
    expect(gerada.xml).toContain(`<infDPS Id="${gerada.idXml}">`);
    expect(gerada.xml).toContain('<cLocEmi>4208203</cLocEmi>');
    expect(gerada.xml).toContain(`<CNPJ>${cnpj}</CNPJ>`);
    expect(gerada.xml).toContain('<IM>12345</IM>');
    expect(gerada.xml).toContain('<xNome>S3E Engenharia &amp; Serviços</xNome>');
    expect(gerada.xml).toContain('<opSimpNac>3</opSimpNac>');
    expect(gerada.xml).toContain('<regApTribSN>1</regApTribSN>');
    expect(gerada.xml).toContain('<CPF>12345678901</CPF>');
    expect(gerada.xml).toContain('<xNome>Cliente &lt;Teste&gt;</xNome>');
    expect(gerada.xml).toContain('<cTribNac>140101</cTribNac>');
    expect(gerada.xml).toContain('140101: Manutenção elétrica | 070201: Empreitada &amp; montagem');
    expect(gerada.xml).toContain('<vServ>100.00</vServ>');
    expect(gerada.xml).toContain('<tribISSQN>1</tribISSQN>');
    expect(gerada.xml).toContain('<tpRetISSQN>2</tpRetISSQN>');
    expect(gerada.xml).toContain('<cLocPrestacao>4208203</cLocPrestacao>');
    expect(gerada.xml).toContain('<tpAmb>2</tpAmb>');
    expect(gerada.idApi).toHaveLength(42);
    expect(gerada.valorTotal).toBe(100);
    expect(codigoTributacaoNacional('14.06.01')).toBe('140601');
  });

  it('recusa série alfanumérica da Pública e lê o número da NFS-e na chave', () => {
    expect(() => serieDpsNumerica('A1')).toThrow(/série da DPS/);
    const chave = `420820322${cnpj}000000000001526101234567890`;
    expect(chave).toHaveLength(50);
    expect(extrairNumeroNfseDaChave(chave)).toBe('15');
  });

  it('mapeia imunidade e monta o pedido de cancelamento com a chave', () => {
    const gerada = dpsBase({
      naturezaOperacao: 602,
      ambiente: '1',
      servicos: [
        { itemListaServico: '140101', discriminacao: 'Serviço único', valorServicos: 10, issRetido: 2 }
      ]
    });
    expect(gerada.xml).toContain('<tribISSQN>2</tribISSQN>');
    expect(gerada.xml).toContain('<tpRetISSQN>1</tpRetISSQN>');
    expect(gerada.xml).toContain('<tpAmb>1</tpAmb>');
    expect(gerada.xml).not.toContain('140101:');

    const chave = `420820322${cnpj}000000000001226101234567890`;
    const pedido = gerarXmlPedidoCancelamento({
      chaveAcesso: chave,
      cnpjAutor: cnpj,
      justificativa: 'Serviço lançado em duplicidade no pedido.',
      ambiente: '2',
      dataEvento: new Date('2026-10-13T15:00:00Z')
    });
    expect(pedido).toContain(`<infPedReg Id="PRE${chave}101101">`);
    expect(pedido).toContain('<e101101>');
    expect(pedido).toContain('<cMotivo>9</cMotivo>');
    expect(pedido).toContain(`<chNFSe>${chave}</chNFSe>`);
  });
});
