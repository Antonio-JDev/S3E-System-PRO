jest.mock('../lib/prisma', () => ({ prisma: {}, default: {} }));
jest.mock('../services/nfe-xml-validator.service', () => ({
  NFeXMLValidatorService: {},
}));
jest.mock('../services/nfe-soap.service', () => ({ NFeSoapService: {} }));
jest.mock('../services/nfe-signature.service', () => ({ NFeSignatureService: {} }));
jest.mock('../services/nfe-audit.service', () => ({ __esModule: true, default: {} }));
jest.mock('../services/nfe-fila.service', () => ({ __esModule: true, default: {} }));
jest.mock('../services/baixaMaterialOrcamento.service', () => ({
  baixarKitNaEmissaoNfe: jest.fn(),
  estornarBaixaKitDaNota: jest.fn(),
}));
jest.mock('../services/vendas.service', () => ({ VendasService: {} }));

import nfeService from '../services/nfe.service';
import { NFeChaveAcessoUtil } from './nfe-chave-acesso.util';
import {
  calcularProximoNumeroNFe,
  exigirNcmOitoDigitos,
  resolverCodigoMunicipioIbge,
  resolverIdDest,
} from './nfe-emissao.util';

function dadosNfe(parcial: {
  cUF: string;
  ufEmitente: string;
  ufDestinatario: string;
  cfop?: string;
  ncm?: string;
  descricao?: string;
  numero?: number;
  pais?: string;
  codigoPais?: string;
}) {
  return {
    emitente: {
      cnpj: '12345678000199',
      razaoSocial: 'Emitente Teste',
      nomeFantasia: 'Emitente',
      inscricaoEstadual: '123456789',
      regimeTributario: 'SimplesNacional',
      codigoEstado: parcial.cUF,
      endereco: {
        logradouro: 'Rua A',
        numero: '10',
        complemento: '',
        bairro: 'Centro',
        codigoMunicipio: '4208203',
        municipio: 'Itajai',
        uf: parcial.ufEmitente,
        cep: '88300000',
        telefone: '4730000000',
      },
    },
    destinatario: {
      cnpj: '99888777000166',
      razaoSocial: 'Destinatario Teste',
      inscricaoEstadual: '',
      indIEDest: 9,
      endereco: {
        logradouro: 'Rua B',
        numero: '20',
        complemento: '',
        bairro: 'Centro',
        codigoMunicipio: parcial.ufDestinatario === 'EX' ? '9999999' : '3550308',
        municipio: 'Cidade',
        uf: parcial.ufDestinatario,
        cep: '01001000',
        pais: parcial.pais,
        codigoPais: parcial.codigoPais,
      },
    },
    produtos: [
      {
        codigo: 'SKU1',
        descricao: parcial.descricao || 'Painel solar',
        ncm: parcial.ncm === undefined ? '85044090' : parcial.ncm,
        cfop: parcial.cfop || '5101',
        unidade: 'UN',
        quantidade: 1,
        valorUnitario: 100,
        valorTotal: 100,
        impostos: {
          icms: { origem: '0', cst: '102', aliquota: 0, valor: 0 },
          ipi: { cst: '99', aliquota: 0, valor: 0 },
          pis: { cst: '49', aliquota: 0, valor: 0 },
          cofins: { cst: '49', aliquota: 0, valor: 0 },
          vTotTrib: 0,
        },
      },
    ],
    totais: {
      valorProdutos: 100,
      valorNF: 100,
      baseICMS: 0,
      valorICMS: 0,
      valorIPI: 0,
      valorPIS: 0,
      valorCOFINS: 0,
      valorTotTrib: 0,
    },
    naturezaOperacao: 'Venda de Mercadoria',
    serie: '1',
    numero: parcial.numero ?? 15,
    dataEmissao: new Date('2026-10-13T12:00:00Z'),
    ambiente: '2' as const,
  };
}

describe('NF-e fase 1 — rejeições mecânicas', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('grava na chave a mesma UF do cUF', () => {
    const xml = nfeService.generateNFeXML(dadosNfe({ cUF: '35', ufEmitente: 'SP', ufDestinatario: 'SP' }));
    const cUF = xml.match(/<cUF>(\d{2})<\/cUF>/)?.[1];
    const chave = xml.match(/Id="NFe(\d{44})"/)?.[1];

    expect(cUF).toBe('35');
    expect(chave).toBeDefined();
    expect(chave!.slice(0, 2)).toBe(cUF);
    expect(NFeChaveAcessoUtil.extrairInformacoes(chave!).uf).toBe('35');
    expect(NFeChaveAcessoUtil.extrairInformacoes(chave!).numero).toBe('000000015');
    expect(xml).toContain('<nNF>15</nNF>');
  });

  it('define idDest pela UF e mantém o CFOP informado quando ele contradiz', () => {
    const interna = nfeService.generateNFeXML(
      dadosNfe({ cUF: '42', ufEmitente: 'SC', ufDestinatario: 'SC', cfop: '6101' })
    );
    expect(interna).toContain('<idDest>1</idDest>');
    expect(interna).toContain('<CFOP>6101</CFOP>');
    expect(interna).not.toContain('<CFOP>5101</CFOP>');

    const interestadual = nfeService.generateNFeXML(
      dadosNfe({ cUF: '42', ufEmitente: 'SC', ufDestinatario: 'SP', cfop: '5102' })
    );
    expect(interestadual).toContain('<idDest>2</idDest>');
    expect(interestadual).toContain('<CFOP>5102</CFOP>');

    const exterior = nfeService.generateNFeXML(
      dadosNfe({
        cUF: '42',
        ufEmitente: 'SC',
        ufDestinatario: 'EX',
        pais: 'Argentina',
        codigoPais: '0639',
        cfop: '7101',
      })
    );
    expect(exterior).toContain('<idDest>3</idDest>');
    expect(exterior).toContain('<CFOP>7101</CFOP>');
    expect(exterior).toContain('<cPais>0639</cPais>');
  });

  it('idDest interno, interestadual e exterior seguem UF e país', () => {
    expect(resolverIdDest({ ufEmitente: 'SC', ufDestinatario: 'sc' })).toBe('1');
    expect(resolverIdDest({ ufEmitente: 'SC', ufDestinatario: 'SP' })).toBe('2');
    expect(resolverIdDest({ ufEmitente: 'SC', ufDestinatario: 'EX', paisDestinatario: 'Argentina' })).toBe('3');
    expect(resolverIdDest({
      ufEmitente: 'SC',
      ufDestinatario: 'SP',
      paisDestinatario: 'Brasil',
      codigoPaisDestinatario: '0639',
    })).toBe('3');
  });

  it('município desconhecido pede código IBGE e não usa Itajaí', () => {
    expect(resolverCodigoMunicipioIbge({ cidade: 'Itajaí', estado: 'SC' })).toBe('4208203');
    expect(resolverCodigoMunicipioIbge({ cidade: 'São Paulo', estado: 'SP' })).toBe('3550308');
    expect(
      resolverCodigoMunicipioIbge({ cidade: 'Campinas', estado: 'SP', codigoInformado: '3509502' })
    ).toBe('3509502');

    expect(() => resolverCodigoMunicipioIbge({ cidade: 'Campinas', estado: 'SP' })).toThrow(
      /Campinas\/SP[\s\S]*código IBGE/
    );
    expect(() => resolverCodigoMunicipioIbge({ cidade: 'Blumenau', estado: 'SC' })).toThrow(/Blumenau/);
  });

  it('NCM vazio ou incompleto bloqueia e cita o nome do item', () => {
    expect(() => exigirNcmOitoDigitos('Kit estrutura', '')).toThrow(/Kit estrutura/);
    expect(() => exigirNcmOitoDigitos('Kit estrutura', '00000000')).toThrow(/8 dígitos/);
    expect(() => exigirNcmOitoDigitos('Inversor', '1234567')).toThrow(/Inversor/);
    expect(exigirNcmOitoDigitos('Inversor', '8504.40.90')).toBe('85044090');

    expect(() =>
      nfeService.generateNFeXML(
        dadosNfe({
          cUF: '42',
          ufEmitente: 'SC',
          ufDestinatario: 'SC',
          ncm: '',
          descricao: 'Kit estrutura metálica',
        })
      )
    ).toThrow(/Kit estrutura metálica/);
  });

  it('calcula o próximo número pelo maior valor numérico, não pela ordem de texto', () => {
    const numeros = ['9', '10', '8'];
    const ultimoNaOrdemDeTexto = [...numeros].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))[0];
    expect(ultimoNaOrdemDeTexto).toBe('9');
    expect(parseInt(ultimoNaOrdemDeTexto, 10) + 1).toBe(10);

    expect(calcularProximoNumeroNFe(10, 0)).toBe(11);
    expect(calcularProximoNumeroNFe(9, 10)).toBe(11);
    expect(calcularProximoNumeroNFe(0, 0)).toBe(1);
    expect(calcularProximoNumeroNFe(Number.NaN, 4)).toBe(5);
  });
});
