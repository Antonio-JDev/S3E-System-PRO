import * as forge from 'node-forge';
import * as fs from 'fs';
import { NFeEventoService } from './nfe-evento.service';
import { NFeSoapService } from './nfe-soap.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    empresaFiscal: { findUnique: jest.fn() },
    notaFiscal: { findUnique: jest.fn(), update: jest.fn() },
    nfeEvento: { findMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('../utils/crypto.util', () => ({
  CryptoUtil: {
    decrypt: jest.fn(() => 'senha-teste'),
    encrypt: jest.fn((valor: string) => valor),
  },
}));

jest.mock('../utils/certificadoPath.util', () => ({
  resolveCertificadoPath: () => 'C:/tmp/cert-teste.pfx',
}));

jest.mock('./nfe-signature.service', () => ({
  NFeSignatureService: {
    carregarCertificado: jest.fn(),
    assinarXML: jest.fn(() => {
      throw new Error('assinarXML de infNFe não deve assinar evento');
    }),
  },
}));

jest.mock('./nfe-audit.service', () => ({
  __esModule: true,
  default: { registrarEvento: jest.fn() },
}));

jest.mock('./nfe-fila.service', () => ({
  __esModule: true,
  default: { enfileirar: jest.fn() },
}));

jest.mock('./baixaMaterialOrcamento.service', () => ({
  baixarKitNaEmissaoNfe: jest.fn(),
  estornarBaixaKitDaNota: jest.fn(),
}));

jest.mock('./vendas.service', () => ({
  VendasService: class VendasService {},
}));

jest.mock('./nfe-xml-validator.service', () => ({
  NFeXMLValidatorService: { validarEstruturaBasica: jest.fn() },
}));

import { prisma } from '../lib/prisma';
import { NFeSignatureService } from './nfe-signature.service';
import nfeService from './nfe.service';

const CHAVE_SP = '35261079502563000138550010000000011000000010';
const CNPJ = '79502563000138';
const NPROT_AUTORIZACAO = '135260000000111';
const NPROT_EVENTO = '342260000000123';

function certificadoTeste(): { key: string; cert: string } {
  const chaves = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = chaves.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const attrs = [{ name: 'commonName', value: 'Teste Evento NF-e' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(chaves.privateKey, forge.md.sha256.create());
  return {
    key: forge.pki.privateKeyToPem(chaves.privateKey),
    cert: forge.pki.certificateToPem(cert),
  };
}

function xmlRetornoEvento(tpEvento: string, cStat: string, nProt?: string): string {
  const nProtXml = nProt ? `<nProt>${nProt}</nProt>` : '';
  return (
    `<retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
    `<idLote>1</idLote><tpAmb>1</tpAmb><cOrgao>35</cOrgao>` +
    `<cStat>128</cStat><xMotivo>Lote de Evento Processado</xMotivo>` +
    `<retEvento versao="1.00"><infEvento>` +
    `<cStat>${cStat}</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo>` +
    `<tpEvento>${tpEvento}</tpEvento>${nProtXml}` +
    `</infEvento></retEvento></retEnvEvento>`
  );
}

describe('XML de eventos de NF-e', () => {
  it('cancelamento tem infEvento, Id e tpEvento 110111 com a UF da chave', () => {
    expect(CHAVE_SP).toHaveLength(44);
    const xml = NFeEventoService.gerarXmlCancelamento({
      chaveAcesso: CHAVE_SP,
      justificativa: 'Cancelamento por erro de digitacao na nota',
      ambiente: '1',
      cnpj: '79.502.563/0001-38',
      nProt: NPROT_AUTORIZACAO,
      dhEvento: '2026-10-13T03:09:00-03:00',
    });

    expect(xml).toContain('<infEvento');
    expect(xml).toContain(`Id="ID110111${CHAVE_SP}01"`);
    expect(xml).toContain('<tpEvento>110111</tpEvento>');
    expect(xml).toContain('<cOrgao>35</cOrgao>');
    expect(xml).not.toContain('<cOrgao>42</cOrgao>');
    expect(xml).toContain('<tpAmb>1</tpAmb>');
    expect(xml).toContain(`<CNPJ>${CNPJ}</CNPJ>`);
    expect(xml).toContain(`<nProt>${NPROT_AUTORIZACAO}</nProt>`);
    expect(xml).not.toContain('MOCK');
    expect(xml).toMatch(/<dhEvento>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00<\/dhEvento>/);
  });

  it('CC-e tem infEvento, Id e tpEvento 110110', () => {
    const xml = NFeEventoService.gerarXmlCartaCorrecao({
      chaveAcesso: CHAVE_SP,
      textoCorrecao: 'Correcao da descricao do produto informado',
      sequencia: 2,
      ambiente: '2',
      cnpj: CNPJ,
      dhEvento: '2026-10-13T03:09:00-03:00',
    });

    expect(xml).toContain('<infEvento');
    expect(xml).toContain(`Id="ID110110${CHAVE_SP}02"`);
    expect(xml).toContain('<tpEvento>110110</tpEvento>');
    expect(xml).toContain('<nSeqEvento>2</nSeqEvento>');
    expect(xml).toContain('<cOrgao>35</cOrgao>');
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain('<descEvento>Carta de Correcao</descEvento>');
    expect(xml).not.toContain('eventoCCe');
    expect(xml).not.toContain('MOCK');
  });

  it('assinatura do evento referencia o Id do infEvento', () => {
    const pem = certificadoTeste();
    const xml = NFeEventoService.gerarXmlCancelamento({
      chaveAcesso: CHAVE_SP,
      justificativa: 'Cancelamento por erro de digitacao na nota',
      ambiente: '2',
      cnpj: CNPJ,
      nProt: NPROT_AUTORIZACAO,
    });
    const assinado = NFeEventoService.assinarEvento(xml, pem.key, pem.cert);

    expect(assinado).toContain('<infEvento');
    expect(assinado).toContain('<tpEvento>110111</tpEvento>');
    expect(assinado).toMatch(/<(?:\w+:)?Signature[\s>]/);
    expect(assinado).toContain(`URI="#ID110111${CHAVE_SP}01"`);
    expect(assinado).toContain('<X509Certificate>');
  });
});

describe('retorno da SEFAZ', () => {
  it('trata cStat 135 e 136 com o nProt real e ignora o 128 do lote', () => {
    const registrado = NFeEventoService.interpretarRetornoEvento(
      xmlRetornoEvento('110111', '135', NPROT_EVENTO)
    );
    expect(registrado.sucesso).toBe(true);
    expect(registrado.codigoStatus).toBe('135');
    expect(registrado.protocolo).toBe(NPROT_EVENTO);

    const semVinculo = NFeEventoService.interpretarRetornoEvento(
      xmlRetornoEvento('110110', '136', '342260000000124')
    );
    expect(semVinculo.sucesso).toBe(true);
    expect(semVinculo.codigoStatus).toBe('136');
    expect(semVinculo.protocolo).toBe('342260000000124');
  });

  it('não inventa protocolo quando o lote só devolve cStat 128 ou o evento vem sem nProt', () => {
    const lote = NFeEventoService.interpretarRetornoEvento(
      '<retEnvEvento><cStat>128</cStat><xMotivo>Lote de Evento Processado</xMotivo></retEnvEvento>'
    );
    expect(lote.sucesso).toBe(false);
    expect(lote.protocolo).toBeUndefined();
    expect(lote.codigoStatus).toBe('128');

    const semProt = NFeEventoService.interpretarRetornoEvento(xmlRetornoEvento('110110', '135'));
    expect(semProt.sucesso).toBe(false);
    expect(semProt.protocolo).toBeUndefined();
  });
});

describe('envio assinado à SEFAZ', () => {
  const pem = certificadoTeste();

  function clienteSoap(metodo: 'nfeRecepcaoEventoAsync' | 'nfeInutilizacaoNFAsync', xml: string) {
    const enviar = jest.fn().mockResolvedValue([{ nfeResultMsg: { _xml: xml } }]);
    jest.spyOn(NFeSoapService, 'criarClienteSOAP').mockResolvedValue({
      [metodo]: enviar,
      clearSoapHeaders: jest.fn(),
      addSoapHeader: jest.fn(),
    } as never);
    return enviar;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cancelarNFe assina o infEvento 110111 antes do SOAP', async () => {
    const enviar = clienteSoap('nfeRecepcaoEventoAsync', xmlRetornoEvento('110111', '135', NPROT_EVENTO));
    const xml = NFeEventoService.gerarXmlCancelamento({
      chaveAcesso: CHAVE_SP,
      justificativa: 'Cancelamento por erro de digitacao na nota',
      ambiente: '2',
      cnpj: CNPJ,
      nProt: NPROT_AUTORIZACAO,
    });

    const resultado = await NFeSoapService.cancelarNFe(xml, '2', pem.cert, pem.key);

    expect(resultado.sucesso).toBe(true);
    expect(resultado.protocolo).toBe(NPROT_EVENTO);
    expect(resultado.codigoStatus).toBe('135');
    const enviado = enviar.mock.calls[0][0].nfeDadosMsg.$xml as string;
    expect(enviado).toContain('<infEvento');
    expect(enviado).toContain(`Id="ID110111${CHAVE_SP}01"`);
    expect(enviado).toContain('<tpEvento>110111</tpEvento>');
    expect(enviado).toContain('<cOrgao>35</cOrgao>');
    expect(enviado).toMatch(/<(?:\w+:)?Signature[\s>]/);
    expect(enviado).toContain('<envEvento');
    expect(enviado).not.toContain('MOCK');
  });

  it('inutilização vai assinada e usa a UF do emitente', async () => {
    const enviar = clienteSoap(
      'nfeInutilizacaoNFAsync',
      '<retInutNFe><infInut><cStat>102</cStat><xMotivo>Inutilizacao de numero homologado</xMotivo><nProt>342260000000456</nProt></infInut></retInutNFe>'
    );

    const resultado = await NFeSoapService.inutilizarNumeracao(
      {
        cnpj: CNPJ,
        cUF: 'SP',
        ano: '2026',
        modelo: '55',
        serie: '1',
        numeroInicial: '8',
        numeroFinal: '8',
        justificativa: 'Numeracao pulada por falha de emissao',
        ambiente: '2',
      },
      pem.cert,
      pem.key
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.protocolo).toBe('342260000000456');
    expect(resultado.codigoStatus).toBe('102');
    const enviado = enviar.mock.calls[0][0].nfeDadosMsg.$xml as string;
    expect(enviado).toContain('<infInut');
    expect(enviado).toContain('<cUF>35</cUF>');
    expect(enviado).not.toContain('<cUF>42</cUF>');
    expect(enviado).toMatch(/<(?:\w+:)?Signature[\s>]/);
    expect(enviado).toContain('Id="ID35267950256300013855001000000008000000008"');
  });

  it('corrigirNFe devolve o protocolo da SEFAZ e não um número mock', async () => {
    const enviar = clienteSoap('nfeRecepcaoEventoAsync', xmlRetornoEvento('110110', '135', NPROT_EVENTO));
    (NFeSignatureService.carregarCertificado as jest.Mock).mockReturnValue(pem);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    (prisma.empresaFiscal.findUnique as jest.Mock).mockResolvedValue({
      id: 'emp-1',
      cnpj: `79.502.563/0001-38`,
      estado: 'SP',
      certificadoPath: 'cert.pfx',
      certificadoSenha: 'enc',
    });
    (prisma.notaFiscal.findUnique as jest.Mock).mockResolvedValue({ id: 'nota-1' });
    (prisma.nfeEvento.create as jest.Mock).mockResolvedValue({ id: 'evt-1' });

    const resultado = await nfeService.corrigirNFe(
      CHAVE_SP,
      'Correcao da descricao do produto informado',
      2,
      'emp-1',
      '1'
    );

    expect(resultado.protocolo).toBe(NPROT_EVENTO);
    expect(resultado.codigoStatus).toBe('135');
    expect(resultado.protocolo).not.toMatch(/^110\d{9}$/);
    const enviado = enviar.mock.calls[0][0].nfeDadosMsg.$xml as string;
    expect(enviado).toContain('<infEvento');
    expect(enviado).toContain(`Id="ID110110${CHAVE_SP}02"`);
    expect(enviado).toContain('<tpEvento>110110</tpEvento>');
    expect(enviado).toContain('<cOrgao>35</cOrgao>');
    expect(enviado).toContain('<tpAmb>1</tpAmb>');
    expect(enviado).toMatch(/<(?:\w+:)?Signature[\s>]/);
    expect(enviado).not.toContain('MOCK');
    expect(prisma.nfeEvento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ protocolo: NPROT_EVENTO, tpEvento: '110110' }),
        }),
      })
    );
  });
});
