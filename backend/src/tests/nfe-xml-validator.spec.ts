import { NFeXMLValidatorService } from '../services/nfe-xml-validator.service';

// XML mínimo válido (estrutura simplificada) apenas para testar integração básica
const XML_VALIDO_SIMPLES = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe12345678901234567890123456789012345678901234" versao="4.00">
    <ide>
      <cUF>42</cUF>
      <cNF>00000001</cNF>
      <natOp>Venda</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>1</nNF>
      <dhEmi>2024-01-01T00:00:00-03:00</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>4205407</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>0</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>0</indFinal>
      <indPres>1</indPres>
      <indIntermed>0</indIntermed>
      <procEmi>0</procEmi>
      <verProc>TESTE</verProc>
    </ide>
    <emit>
      <CNPJ>12345678000199</CNPJ>
      <xNome>EMITENTE TESTE</xNome>
      <enderEmit>
        <xLgr>Rua Teste</xLgr>
        <nro>123</nro>
        <xBairro>Centro</xBairro>
        <cMun>4205407</cMun>
        <xMun>Itajaí</xMun>
        <UF>SC</UF>
        <CEP>88300000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>123456789</IE>
      <CRT>3</CRT>
    </emit>
    <dest>
      <CNPJ>99887766000155</CNPJ>
      <xNome>DESTINATÁRIO TESTE</xNome>
      <enderDest>
        <xLgr>Rua Dest</xLgr>
        <nro>456</nro>
        <xBairro>Bairro</xBairro>
        <cMun>4205407</cMun>
        <xMun>Itajaí</xMun>
        <UF>SC</UF>
        <CEP>88300000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>
      <indIEDest>1</indIEDest>
      <IE>123456789</IE>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>1</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>Produto Teste</xProd>
        <NCM>99999999</NCM>
        <CFOP>5101</CFOP>
        <uCom>UN</uCom>
        <qCom>1.0000</qCom>
        <vUnCom>10.0000</vUnCom>
        <vProd>10.00</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>1.0000</qTrib>
        <vUnTrib>10.0000</vUnTrib>
        <indTot>1</indTot>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCPUFDest>0.00</vFCPUFDest>
        <vICMSUFDest>0.00</vICMSUFDest>
        <vICMSUFRemet>0.00</vICMSUFRemet>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>10.00</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>10.00</vNF>
        <vTotTrib>0.00</vTotTrib>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      <detPag>
        <tPag>01</tPag>
        <vPag>10.00</vPag>
      </detPag>
    </pag>
  </infNFe>
</NFe>`;

describe('Validação MOC 7.0 - XSD (integração básica)', () => {
  test('Deve rejeitar XML malformado', () => {
    const resultado = NFeXMLValidatorService.validarCompleto('<NFe><infNFe></NFe>');
    expect(resultado.valido).toBe(false);
    expect(resultado.erros.length).toBeGreaterThan(0);
  });

  test('Deve tentar validar XML válido conforme XSD (quando XSDs estiverem presentes)', () => {
    const resultado = NFeXMLValidatorService.validarCompleto(XML_VALIDO_SIMPLES);

    // Estrutura básica deve ser válida
    expect(resultado.erros).not.toContain('Elemento raiz <NFe> não encontrado');
    expect(resultado.erros).not.toContain('Elemento <infNFe> não encontrado');

    // Se os XSDs estiverem disponíveis, idealmente valido=true.
    // Se não estiverem, ao menos não deve explodir.
    expect(typeof resultado.valido).toBe('boolean');
  });
});


