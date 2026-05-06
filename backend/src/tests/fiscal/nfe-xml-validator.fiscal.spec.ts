/**
 * Testes do módulo fiscal - Validador XML NF-e
 * Rodar: npm test -- nfe-xml-validator.fiscal.spec.ts
 */

jest.mock('libxmljs2', () => ({
  parseXmlString: jest.fn(() => ({
    validate: jest.fn(() => true),
    get: jest.fn(() => ''),
    root: jest.fn(() => ({ get: jest.fn(() => '') })),
  })),
  parseXml: jest.fn(() => ({ validate: jest.fn(() => true) })),
}));

import { NFeXMLValidatorService } from '../../services/nfe-xml-validator.service';

const XML_MINIMO_VALIDO = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
    <ide><cUF>42</cUF><cNF>00000001</cNF><natOp>Venda</natOp><mod>55</mod><serie>1</serie><nNF>1</nNF>
    <dhEmi>2024-01-01T00:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>4205407</cMunFG>
    <tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>0</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>0</indFinal>
    <indPres>1</indPres><indIntermed>0</indIntermed><procEmi>0</procEmi><verProc>TESTE</verProc></ide>
    <emit><CNPJ>12345678000199</CNPJ><xNome>EMITENTE</xNome><enderEmit><xLgr>Rua</xLgr><nro>123</nro>
    <xBairro>Centro</xBairro><cMun>4205407</cMun><xMun>Cidade</xMun><UF>SC</UF><CEP>88300000</CEP>
    <cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE>123456789</IE><CRT>3</CRT></emit>
    <dest><CNPJ>99887766000155</CNPJ><xNome>DEST</xNome><enderDest><xLgr>Rua</xLgr><nro>456</nro>
    <xBairro>B</xBairro><cMun>4205407</cMun><xMun>Cidade</xMun><UF>SC</UF><CEP>88300000</CEP>
    <cPais>1058</cPais><xPais>BRASIL</xPais></enderDest><indIEDest>1</indIEDest><IE>123</IE></dest>
    <det nItem="1"><prod><cProd>1</cProd><cEAN>SEM GTIN</cEAN><xProd>Prod</xProd><NCM>99999999</NCM>
    <CFOP>5101</CFOP><uCom>UN</uCom><qCom>1</qCom><vUnCom>10</vUnCom><vProd>10</vProd>
    <cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>1</qTrib><vUnTrib>10</vUnTrib><indTot>1</indTot></prod></det>
    <total><ICMSTot><vBC>0</vBC><vICMS>0</vICMS><vICMSDeson>0</vICMSDeson><vFCPUFDest>0</vFCPUFDest>
    <vICMSUFDest>0</vICMSUFDest><vICMSUFRemet>0</vICMSUFRemet><vFCP>0</vFCP><vBCST>0</vBCST><vST>0</vST>
    <vFCPST>0</vFCPST><vFCPSTRet>0</vFCPSTRet><vProd>10</vProd><vFrete>0</vFrete><vSeg>0</vSeg><vDesc>0</vDesc>
    <vII>0</vII><vIPI>0</vIPI><vIPIDevol>0</vIPIDevol><vPIS>0</vPIS><vCOFINS>0</vCOFINS><vOutro>0</vOutro>
    <vNF>10</vNF><vTotTrib>0</vTotTrib></ICMSTot></total>
    <transp><modFrete>9</modFrete></transp>
    <pag><detPag><tPag>01</tPag><vPag>10</vPag></detPag></pag>
  </infNFe>
</NFe>`;

describe('Módulo Fiscal - NFeXMLValidatorService', () => {
  describe('validarEstruturaBasica', () => {
    it('deve retornar valido, erros e avisos (avisos é array)', () => {
      const r = NFeXMLValidatorService.validarEstruturaBasica(XML_MINIMO_VALIDO);
      expect(r).toHaveProperty('valido');
      expect(r).toHaveProperty('erros');
      expect(r).toHaveProperty('avisos');
      expect(Array.isArray(r.avisos)).toBe(true);
      expect(Array.isArray(r.erros)).toBe(true);
    });

    it('deve rejeitar XML malformado', () => {
      const r = NFeXMLValidatorService.validarEstruturaBasica('<NFe></infNFe>');
      expect(r.valido).toBe(false);
      expect(r.erros.length).toBeGreaterThan(0);
      expect(r.avisos).toEqual([]);
    });

    it('deve rejeitar quando falta elemento raiz NFe', () => {
      const r = NFeXMLValidatorService.validarEstruturaBasica('<?xml version="1.0"?><Outro></Outro>');
      expect(r.valido).toBe(false);
      expect(r.erros.some((e: string) => e.includes('NFe'))).toBe(true);
    });

    it('em caso de exceção deve retornar avisos como array vazio', () => {
      const r = NFeXMLValidatorService.validarEstruturaBasica('');
      expect(r.avisos).toEqual([]);
      expect(r.valido).toBe(false);
    });
  });

  describe('validarCompleto', () => {
    it('deve retornar objeto com valido, erros e avisos', () => {
      const r = NFeXMLValidatorService.validarCompleto(XML_MINIMO_VALIDO);
      expect(typeof r.valido).toBe('boolean');
      expect(Array.isArray(r.erros)).toBe(true);
      expect(Array.isArray(r.avisos)).toBe(true);
    });

    it('deve rejeitar XML inválido', () => {
      const r = NFeXMLValidatorService.validarCompleto('<NFe><infNFe></NFe>');
      expect(r.valido).toBe(false);
      expect(r.erros.length).toBeGreaterThan(0);
    });
  });
});
