/**
 * Serviço de geração de DANFE em PDF - Layout Oficial MOC 7.0
 * Documento Auxiliar da Nota Fiscal Eletrônica
 * Estritamente Preto e Branco - Padrão SEFAZ
 */
import { XMLParser } from 'fast-xml-parser';
import PDFDocument = require('pdfkit');
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import configuracaoService from './configuracao.service';

const MARGIN = 20;
const LINEW = 0.5;
const FONT_LABEL = 6;
const FONT_DATA = 8;
const FONT_TITLE = 10;

/**
 * Serviço para geração de DANFE em PDF conforme MOC 7.0 - Anexo II
 * Layout clássico preto e branco
 */
export class NFeDanfeService {
  static async gerarDanfe(procNFeXml: string, numeroNota?: string): Promise<Buffer> {
    if (!procNFeXml) throw new Error('XML procNFe não informado');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true
    });

    let nfe: any, protocolo: any;
    try {
      const json = parser.parse(procNFeXml);
      const raiz = json.nfeProc || json['nfeProc'] || json;
      nfe = raiz.NFe || raiz['NFe'] || json.NFe || json['NFe'] || {};
      protocolo = raiz.protNFe || raiz['protNFe'] || json.protNFe || json['protNFe'] || {};
    } catch (e: any) {
      throw new Error(`Erro ao interpretar XML: ${e.message}`);
    }

    const infNFe = nfe.infNFe || nfe['infNFe'] || {};
    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest || {};
    const total = infNFe.total?.ICMSTot || {};
    const det = infNFe.det || [];
    const produtos = Array.isArray(det) ? det : det ? [det] : [];
    const transp = infNFe.transp || {};
    const cobr = infNFe.cobr || {};
    const infAdic = infNFe.infAdic || {};

    const emContingencia = !protocolo?.infProt?.nProt;
    const chaveAcesso =
      (infNFe['@_Id'] && String(infNFe['@_Id']).replace('NFe', '')) ||
      protocolo?.infProt?.chNFe ||
      '';

    const ambiente = ide.tpAmb === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO';
    const qrCodeUrl = this.gerarUrlQrCode(chaveAcesso, ambiente === 'PRODUÇÃO');

    let logoPath: string | null = null;
    try {
      const config = await configuracaoService.getConfiguracoes();
      const logoFonte = (config as any).logoDanfeUrl || config.logoUrl;
      if (logoFonte) {
        const logoFullPath = path.join(process.cwd(), 'uploads', 'logos', path.basename(logoFonte));
        if (fs.existsSync(logoFullPath)) logoPath = logoFullPath;
      }
    } catch (_) {}

    let qrCodeImage: Buffer | null = null;
    try {
      qrCodeImage = await QRCode.toBuffer(qrCodeUrl, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 100,
        margin: 1
      });
    } catch (_) {}

    let barcodeImage: Buffer | null = null;
    try {
      const bwipjs = await import('bwip-js');
      barcodeImage = await bwipjs.toBuffer({
        bcid: 'code128',
        text: chaveAcesso,
        scale: 2,
        height: 8,
        includetext: false
      });
    } catch (_) {}

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 0,
      autoFirstPage: false
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const cw = pageWidth - MARGIN * 2;
    let y = MARGIN;

    const stroke = () => {
      doc.strokeColor('#000000').lineWidth(LINEW).stroke();
    };

    const rect = (x: number, y: number, w: number, h: number) => {
      doc.rect(x, y, w, h);
      stroke();
    };

    const label = (text: string, x: number, y: number) => {
      doc.fillColor('#000000').fontSize(FONT_LABEL).font('Helvetica-Bold').text(text, x, y);
    };

    const data = (text: string, x: number, y: number, opts?: { width?: number }) => {
      doc.fontSize(FONT_DATA).font('Helvetica').text(String(text || ''), x, y, opts || {});
    };

    doc.addPage();
    doc.fillColor('#000000');

    // ========== CANHOTO ==========
    const canhotoH = 30;
    doc.rect(MARGIN, y, cw, canhotoH);
    stroke();

    label('RECEBEMOS DE', MARGIN + 5, y + 5);
    const emitNome = emit.xNome || '';
    data(emitNome.toUpperCase(), MARGIN + 5, y + 12, { width: cw * 0.6 });

    label('NF-e Nº', cw * 0.65 + MARGIN, y + 5);
    data(numeroNota || ide.nNF || '', cw * 0.65 + MARGIN + 25, y + 5);

    label('DATA DE RECEBIMENTO', MARGIN + 5, y + 22);
    label('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', MARGIN + 120, y + 22);

    // Linha serrilhada (simulada com traços)
    y += canhotoH;
    for (let i = 0; i < cw; i += 8) {
      doc.moveTo(MARGIN + i, y).lineTo(MARGIN + i + 4, y).stroke();
    }
    y += 8;

    // ========== CABEÇALHO: Emitente + DANFE + Código Barras ==========
    const cabH = 65;
    const emitW = cw * 0.45;
    const danfeW = cw - emitW - 5;

    // Quadro Emitente (esquerda)
    rect(MARGIN, y, emitW, cabH);
    if (logoPath) {
      try {
        doc.image(logoPath, MARGIN + 5, y + 5, { fit: [70, 30] });
      } catch (_) {}
    }
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text((emit.xNome || '').toUpperCase(), MARGIN + 5, logoPath ? y + 38 : y + 5, { width: emitW - 10 });
    doc.fontSize(FONT_DATA).font('Helvetica');
    const endEmit = emit.enderEmit || {};
    doc.text(
      `${endEmit.xLgr || ''}, ${endEmit.nro || ''} - ${endEmit.xBairro || ''} - ${endEmit.xMun || ''}/${endEmit.UF || ''} - CEP: ${this.formatarCEP(endEmit.CEP || '')}`,
      MARGIN + 5,
      (logoPath ? y + 48 : y + 18),
      { width: emitW - 10 }
    );
    doc.text(`Fone: ${emit.fone || '-'}`, MARGIN + 5, (logoPath ? y + 56 : y + 28));

    // Quadro DANFE + Código de Barras (direita)
    const danfeX = MARGIN + emitW + 5;
    rect(danfeX, y, danfeW, cabH);

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('DANFE', danfeX + 5, y + 5);
    doc.fontSize(FONT_DATA).font('Helvetica');
    doc.text('Documento Auxiliar da Nota Fiscal Eletrônica', danfeX + 5, y + 14, { width: 100 });

    const tpNF = ide.tpNF === '0' ? '0 - ENTRADA' : '1 - SAÍDA';
    doc.fontSize(FONT_LABEL).font('Helvetica-Bold').text(tpNF, danfeX + 5, y + 24);
    doc.fontSize(FONT_DATA).font('Helvetica-Bold');
    doc.text(`Nº ${numeroNota || ide.nNF || ''}`, danfeX + 5, y + 32);
    doc.text(`SÉRIE: ${ide.serie || ''}`, danfeX + 50, y + 32);
    doc.text('FOLHA 1/1', danfeX + 90, y + 32);

    if (barcodeImage) {
      try {
        doc.image(barcodeImage, danfeX + 5, y + 40, { width: 140, height: 18 });
      } catch (_) {}
    }

    doc.fontSize(FONT_LABEL).font('Helvetica-Bold').text('CHAVE DE ACESSO', danfeX + 5, y + 58);
    doc.fontSize(6).font('Helvetica-Bold');
    doc.text(this.formatarChave(chaveAcesso), danfeX + 5, y + 63, { width: danfeW - 10 });

    y += cabH + 5;

    // ========== Linha: Natureza, Protocolo, IE ==========
    const linhaIdH = 22;
    rect(MARGIN, y, cw, linhaIdH);

    label('NATUREZA DA OPERAÇÃO', MARGIN + 5, y + 3);
    data(ide.natOp || '', MARGIN + 5, y + 11, { width: cw * 0.4 });

    label('PROTOCOLO DE AUTORIZAÇÃO DE USO', MARGIN + cw * 0.45, y + 3);
    data(protocolo?.infProt?.nProt || (emContingencia ? 'CONTINGÊNCIA' : ''), MARGIN + cw * 0.45, y + 11, { width: 120 });

    label('INSCRIÇÃO ESTADUAL', MARGIN + cw * 0.72, y + 3);
    data(emit.IE || 'ISENTO', MARGIN + cw * 0.72, y + 11);
    label('CNPJ', MARGIN + cw * 0.85, y + 3);
    data(this.formatarCNPJ(emit.CNPJ || ''), MARGIN + cw * 0.85, y + 11);

    y += linhaIdH + 5;

    // ========== DESTINATÁRIO/REMETENTE ==========
    const destH = 45;
    rect(MARGIN, y, cw, destH);

    label('DESTINATÁRIO/REMETENTE', MARGIN + 5, y + 3);
    label('NOME/RAZÃO SOCIAL', MARGIN + 5, y + 12);
    data(dest.xNome || '', MARGIN + 5, y + 18, { width: cw * 0.45 });

    label('CNPJ/CPF', MARGIN + cw * 0.48, y + 12);
    data(
      dest.CNPJ ? this.formatarCNPJ(dest.CNPJ) : dest.CPF ? this.formatarCPF(dest.CPF) : '',
      MARGIN + cw * 0.48,
      y + 18
    );

    label('DATA DE EMISSÃO', MARGIN + cw * 0.7, y + 12);
    data(this.formatarData(ide.dhEmi || ide.dEmi || ''), MARGIN + cw * 0.7, y + 18);

    const endDest = dest.enderDest || {};
    label('ENDEREÇO', MARGIN + 5, y + 28);
    data(
      `${endDest.xLgr || ''}, ${endDest.nro || ''} - ${endDest.xBairro || ''}`,
      MARGIN + 5,
      y + 34,
      { width: cw * 0.5 }
    );

    label('MUNICÍPIO', MARGIN + cw * 0.52, y + 28);
    data(`${endDest.xMun || ''}/${endDest.UF || ''}`, MARGIN + cw * 0.52, y + 34);
    label('CEP', MARGIN + cw * 0.72, y + 28);
    data(this.formatarCEP(endDest.CEP || ''), MARGIN + cw * 0.72, y + 34);
    label('FONE', MARGIN + cw * 0.82, y + 28);
    data(dest.fone || '-', MARGIN + cw * 0.82, y + 34);

    y += destH + 5;

    // ========== FATURA/DUPLICATAS ==========
    const dup = cobr?.dup || [];
    const duplicatas = Array.isArray(dup) ? dup : dup ? [dup] : [];
    if (duplicatas.length > 0) {
      const fatH = Math.min(12 + duplicatas.length * 10, 50);
      rect(MARGIN, y, cw, fatH);
      label('FATURA/DUPLICATAS', MARGIN + 5, y + 3);
      duplicatas.slice(0, 4).forEach((d: any, i: number) => {
        data(`Nº ${d.nDup || ''} Venc: ${this.formatarData(d.dVenc || '')} Valor: R$ ${Number(d.vDup || 0).toFixed(2)}`, MARGIN + 5, y + 12 + i * 10, { width: cw - 10 });
      });
      y += fatH + 5;
    }

    // ========== CÁLCULO DO IMPOSTO (uma linha) ==========
    const calcH = 28;
    rect(MARGIN, y, cw, calcH);
    label('CÁLCULO DO IMPOSTO', MARGIN + 5, y + 2);

    const cols: Array<[string, number]> = [
      ['BASE ICMS', Number(total.vBC || 0)],
      ['V. ICMS', Number(total.vICMS || 0)],
      ['BASE ICMS ST', Number(total.vBCST || 0)],
      ['V. ICMS ST', Number(total.vST || 0)],
      ['V. PROD.', Number(total.vProd || 0)],
      ['FRETE', Number(total.vFrete || 0)],
      ['SEGURO', Number(total.vSeg || 0)],
      ['DESCONTO', Number(total.vDesc || 0)],
      ['OUTRAS', Number(total.vOutro || 0)],
      ['IPI', Number(total.vIPI || 0)],
      ['TOTAL NF', Number(total.vNF || 0)]
    ];

    const colW = cw / cols.length;
    cols.forEach(([nome, valor], i) => {
      const x = MARGIN + i * colW + 3;
      doc.fontSize(5).font('Helvetica').text(String(nome), x, y + 8, { width: colW - 4 });
      doc.fontSize(6).font(i === cols.length - 1 ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(`R$ ${Number(valor).toFixed(2)}`, x, y + 15, { width: colW - 4, align: 'right' });
    });

    y += calcH + 5;

    // ========== TRANSPORTADOR ==========
    const transpH = 35;
    rect(MARGIN, y, cw, transpH);
    label('TRANSPORTADOR/VOLUMES', MARGIN + 5, y + 3);

    const modFreteMap: Record<string, string> = {
      '0': '0-Emitente',
      '1': '1-Destinatário',
      '2': '2-Terceiros',
      '3': '3-Próprio Remetente',
      '4': '4-Próprio Destinatário',
      '9': '9-Sem Frete'
    };
    const transporta = transp.transporta || {};

    label('RAZÃO SOCIAL', MARGIN + 5, y + 12);
    data(transporta.xNome || '-', MARGIN + 5, y + 18, { width: cw * 0.35 });
    label('FRETE POR CONTA', MARGIN + cw * 0.38, y + 12);
    data(modFreteMap[transp.modFrete || '9'] || transp.modFrete || '9', MARGIN + cw * 0.38, y + 18);
    label('PLACA', MARGIN + cw * 0.52, y + 12);
    data((transp.veicTransp || {}).placa || '-', MARGIN + cw * 0.52, y + 18);
    label('UF', MARGIN + cw * 0.62, y + 12);
    data((transp.veicTransp || {}).UF || transporta.UF || '-', MARGIN + cw * 0.62, y + 18);
    label('CNPJ/CPF', MARGIN + cw * 0.68, y + 12);
    data(transporta.CNPJ ? this.formatarCNPJ(transporta.CNPJ) : transporta.CPF ? this.formatarCPF(transporta.CPF) : '-', MARGIN + cw * 0.68, y + 18);
    label('ENDEREÇO', MARGIN + 5, y + 26);
    data(transporta.xEnder || '-', MARGIN + 5, y + 32, { width: cw * 0.5 });
    label('MUNICÍPIO', MARGIN + cw * 0.52, y + 26);
    data(`${transporta.xMun || ''}/${transporta.UF || ''}`, MARGIN + cw * 0.52, y + 32);

    y += transpH + 5;

    // ========== TABELA PRODUTOS ==========
    const colWidths = [28, 120, 32, 18, 22, 18, 28, 38, 42, 36, 32, 28, 28, 28];
    const sumW = colWidths.reduce((a, b) => a + b, 0);
    const scale = (cw - 2) / sumW;
    const scaledWidths = colWidths.map((w) => Math.floor(w * scale));

    const headers = [
      'CÓDIGO',
      'DESCRIÇÃO',
      'NCM/SH',
      'CST',
      'CFOP',
      'UN',
      'QTD',
      'V.UNIT',
      'V.TOTAL',
      'BC.ICMS',
      'V.ICMS',
      'V.IPI',
      'ALIQ.ICMS',
      'ALIQ.IPI'
    ];

    rect(MARGIN, y, cw, 12);
    let xAcc = MARGIN + 2;
    doc.fontSize(5).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, xAcc, y + 3, { width: scaledWidths[i] - 2 });
      xAcc += scaledWidths[i];
    });
    y += 12;

    produtos.forEach((item: any) => {
      const prod = item.prod || {};
      const imposto = item.imposto || {};
      const icms = imposto.ICMS || {};
      const icmsTag = Object.keys(icms).find((k) => !k.startsWith('@'));
      const icmsData = icmsTag ? icms[icmsTag] || {} : {};
      const ipi = imposto.IPI || {};
      const ipiTag = Object.keys(ipi).find((k) => !k.startsWith('@'));
      const ipiData = ipiTag ? ipi[ipiTag] || {} : {};

      const lineH = 14;
      if (y + lineH > pageHeight - MARGIN - 80) {
        doc.addPage();
        y = MARGIN;
      }

      rect(MARGIN, y, cw, lineH);
      doc.fontSize(6).font('Helvetica');

      const vals = [
        (prod.cProd || '').substring(0, 10),
        (prod.xProd || '').substring(0, 35),
        prod.NCM || '',
        icmsData.CST || icmsData.CSOSN || '',
        prod.CFOP || '',
        prod.uCom || '',
        Number(prod.qCom || 0).toFixed(2),
        Number(prod.vUnCom || 0).toFixed(2),
        Number(prod.vProd || 0).toFixed(2),
        Number(icmsData.vBC || 0).toFixed(2),
        Number(icmsData.vICMS || 0).toFixed(2),
        Number(ipiData.vIPI || 0).toFixed(2),
        Number(icmsData.pICMS || 0).toFixed(2),
        Number(ipiData.pIPI || 0).toFixed(2)
      ];

      xAcc = MARGIN + 2;
      vals.forEach((v, i) => {
        doc.text(v, xAcc, y + 4, { width: scaledWidths[i] - 2, align: i >= 6 ? 'right' : 'left' });
        xAcc += scaledWidths[i];
      });

      if (prod.infAdProd) {
        doc.fontSize(5).text(prod.infAdProd, MARGIN + scaledWidths[0] + 4, y + 10, { width: scaledWidths[1] - 4 });
      }

      y += lineH;
    });

    y += 5;

    // ========== CÁLCULO ISSQN (opcional) ==========
    const totalIssqn = infNFe.total?.ISSQNtot || {};
    if (Number(totalIssqn.vServ || 0) > 0) {
      const issqnH = 18;
      rect(MARGIN, y, cw, issqnH);
      label('CÁLCULO DO ISSQN', MARGIN + 5, y + 3);
      doc.fontSize(FONT_DATA).font('Helvetica');
      doc.text(`VALOR SERV: R$ ${Number(totalIssqn.vServ || 0).toFixed(2)}`, MARGIN + 5, y + 10);
      doc.text(`BASE: R$ ${Number(totalIssqn.vBC || 0).toFixed(2)}`, MARGIN + 120, y + 10);
      doc.text(`ISSQN: R$ ${Number(totalIssqn.vISS || 0).toFixed(2)}`, MARGIN + 220, y + 10);
      y += issqnH + 5;
    }

    // ========== DADOS ADICIONAIS + QR CODE ==========
    const addH = 85;
    const addLeftW = cw * 0.58;
    const addRightW = cw - addLeftW - 5;

    rect(MARGIN, y, addLeftW, addH);
    label('DADOS ADICIONAIS', MARGIN + 5, y + 3);
    label('INFORMAÇÕES COMPLEMENTARES', MARGIN + 5, y + 12);

    if (ambiente === 'HOMOLOGAÇÃO') {
      doc.fontSize(8).font('Helvetica-Bold').text('SEM VALOR FISCAL', MARGIN + 5, y + 20);
    }
    if (infAdic.infCpl) {
      doc.fontSize(6).font('Helvetica').text(infAdic.infCpl, MARGIN + 5, infAdic.infCpl && ambiente === 'HOMOLOGAÇÃO' ? y + 28 : y + 20, {
        width: addLeftW - 10
      });
    }

    rect(MARGIN + addLeftW + 5, y, addRightW, addH);
    label('CONSULTA PELA CHAVE', MARGIN + addLeftW + 10, y + 3);
    if (qrCodeImage) {
      try {
        doc.image(qrCodeImage, MARGIN + addLeftW + 15, y + 12, { fit: [70, 70] });
      } catch (_) {}
    }
    doc.fontSize(5).font('Helvetica').text('www.nfe.fazenda.gov.br/portal', MARGIN + addLeftW + 10, y + 78, {
      width: addRightW - 10,
      align: 'center'
    });

    y += addH + 10;

    // Contingência
    if (emContingencia) {
      doc.rect(MARGIN, y, cw, 14);
      stroke();
      doc.fontSize(8).font('Helvetica-Bold').text('EMITIDO EM CONTINGÊNCIA - SEM AUTORIZAÇÃO SEFAZ', MARGIN + 5, y + 5, {
        width: cw - 10,
        align: 'center'
      });
      y += 18;
    }

    // Rodapé
    doc.fontSize(6).font('Helvetica').text(
      'Documento Auxiliar da NF-e - Não tem validade fiscal. Validar pelo XML assinado digitalmente.',
      MARGIN,
      pageHeight - MARGIN - 10,
      { width: cw, align: 'center' }
    );

    doc.end();
    return pdfPromise;
  }

  private static formatarChave(chave: string): string {
    if (!chave || chave.length < 44) return chave;
    const parts: string[] = [];
    for (let i = 0; i < 11; i++) parts.push(chave.substr(i * 4, 4));
    return parts.join(' ');
  }

  private static gerarUrlQrCode(chave: string, producao: boolean): string {
    const base = producao ? 'http://www.nfe.fazenda.gov.br/portal' : 'http://hom.nfe.fazenda.gov.br/portal';
    return `${base}/consulta.aspx?p=${chave}`;
  }

  private static formatarData(data: string): string {
    if (!data) return '';
    try {
      const d = new Date(data);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return data;
    }
  }

  private static formatarCNPJ(cnpj: string): string {
    if (!cnpj) return '';
    const d = cnpj.replace(/\D/g, '');
    if (d.length !== 14) return cnpj;
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private static formatarCPF(cpf: string): string {
    if (!cpf) return '';
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  private static formatarCEP(cep: string): string {
    if (!cep) return '';
    const d = cep.replace(/\D/g, '');
    if (d.length !== 8) return cep;
    return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }
}

export default NFeDanfeService;
