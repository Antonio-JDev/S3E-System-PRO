import { XMLParser } from 'fast-xml-parser';
import PDFDocument = require('pdfkit');
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import configuracaoService from './configuracao.service';

const prisma = new PrismaClient();

/**
 * Serviço para geração de DANFE em PDF com layout oficial conforme legislação
 * Baseado na Portaria CAT 42/2018 e atualizações da Receita Federal
 */
export class NFeDanfeService {
  /**
   * Gera um PDF de DANFE a partir do XML procNFe (NFe + protocolo)
   * Layout oficial conforme legislação vigente
   */
  static async gerarDanfe(procNFeXml: string): Promise<Buffer> {
    if (!procNFeXml) {
      throw new Error('XML procNFe não informado para geração de DANFE');
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTrueNumberOnly: false
    });

    let nfe: any;
    let protocolo: any;

    try {
      const json = parser.parse(procNFeXml);

      // procNFe padrão: <nfeProc><NFe>...</NFe><protNFe>...</protNFe></nfeProc>
      const raiz = json.nfeProc || json['nfeProc'] || json;
      nfe = raiz.NFe || raiz['NFe'] || {};
      protocolo = raiz.protNFe || raiz['protNFe'] || {};
    } catch (error: any) {
      throw new Error(`Erro ao interpretar XML procNFe para DANFE: ${error.message}`);
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

    const emContingencia = !protocolo || !protocolo.infProt || !protocolo.infProt.nProt;

    const chaveAcesso =
      (infNFe['@_Id'] && String(infNFe['@_Id']).replace('NFe', '')) ||
      protocolo.infProt?.chNFe ||
      '';

    // Determinar ambiente (1=Produção, 2=Homologação)
    const ambiente = ide.tpAmb === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO';

    // Gerar URL do QR Code
    const qrCodeUrl = this.gerarUrlQrCode(chaveAcesso, ambiente === 'PRODUÇÃO');

    // Buscar logo da empresa
    let logoPath: string | null = null;
    try {
      const config = await configuracaoService.getConfiguracoes();
      const logoFonte = config.logoDanfeUrl || config.logoUrl;
      if (logoFonte) {
        const cwd = process.cwd();
        const logoFilename = path.basename(logoFonte);
        const logoFullPath = path.join(cwd, 'uploads', 'logos', logoFilename);
        if (fs.existsSync(logoFullPath)) {
          logoPath = logoFullPath;
        }
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível carregar logo da empresa:', error);
    }

    // Gerar QR Code como imagem
    let qrCodeImage: Buffer | null = null;
    try {
      qrCodeImage = await QRCode.toBuffer(qrCodeUrl, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 150,
        margin: 1
      });
    } catch (error) {
      console.warn('⚠️ Erro ao gerar QR Code:', error);
    }

    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: false
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });

    // Dimensões da página
    const pageWidth = 595.28; // A4 width em pontos
    const pageHeight = 841.89; // A4 height em pontos
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Função auxiliar para adicionar nova página se necessário
    let currentY = margin;
    const addPageIfNeeded = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // ============================================
    // CABEÇALHO - Retângulo superior
    // ============================================
    doc.addPage();
    currentY = margin;

    // Retângulo azul do cabeçalho
    doc.rect(0, 0, pageWidth, 60)
      .fillColor('#1E40AF')
      .fill();

    // Logo (se disponível)
    if (logoPath) {
      try {
        doc.image(logoPath, margin, 10, {
          fit: [80, 40],
          align: 'left'
        });
      } catch (error) {
        console.warn('⚠️ Erro ao adicionar logo:', error);
      }
    }

    // Título DANFE
    doc.fillColor('#FFFFFF')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('DANFE', margin + (logoPath ? 90 : 0), 15, {
        width: contentWidth - (logoPath ? 90 : 0),
        align: 'left'
      });

    doc.fontSize(10)
      .font('Helvetica')
      .text('Documento Auxiliar da Nota Fiscal Eletrônica', margin + (logoPath ? 90 : 0), 35, {
        width: contentWidth - (logoPath ? 90 : 0),
        align: 'left'
      });

    // Aviso de contingência (se aplicável)
    if (emContingencia) {
      doc.fillColor('#DC2626')
        .rect(margin, 60, contentWidth, 20)
        .fill();
      doc.fillColor('#FFFFFF')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EMITIDO EM CONTINGÊNCIA OFFLINE - SEM AUTORIZAÇÃO SEFAZ', margin + 5, 68, {
          width: contentWidth - 10,
          align: 'center'
        });
      currentY = 90;
    } else {
      currentY = 70;
    }

    // ============================================
    // QUADRO 1: IDENTIFICAÇÃO DA NF-e
    // ============================================
    addPageIfNeeded(50);
    doc.fillColor('#000000')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('IDENTIFICAÇÃO DA NF-e', margin, currentY);

    currentY += 10;

    // Borda do quadro
    const quadro1Height = 40;
    doc.rect(margin, currentY, contentWidth, quadro1Height)
      .strokeColor('#000000')
      .lineWidth(0.5)
      .stroke();

    // Conteúdo do quadro 1
    const linha1Y = currentY + 5;
    doc.fontSize(7)
      .font('Helvetica')
      .text(`Nº: ${ide.nNF || ''}`, margin + 5, linha1Y)
      .text(`Série: ${ide.serie || ''}`, margin + 80, linha1Y)
      .text(`Data Emissão: ${this.formatarData(ide.dhEmi || ide.dEmi || '')}`, margin + 150, linha1Y)
      .text(`Ambiente: ${ambiente}`, margin + 300, linha1Y);

    const linha2Y = linha1Y + 8;
    doc.text(`Chave de Acesso:`, margin + 5, linha2Y);
    doc.font('Helvetica-Bold')
      .text(chaveAcesso, margin + 60, linha2Y, { width: 400 });

    const linha3Y = linha2Y + 8;
    if (protocolo.infProt?.nProt) {
      doc.font('Helvetica')
        .text(`Protocolo de Autorização: ${protocolo.infProt.nProt}`, margin + 5, linha3Y)
        .text(`Data/Hora Autorização: ${this.formatarData(protocolo.infProt.dhRecbto || '')}`, margin + 250, linha3Y);
    }

    currentY += quadro1Height + 10;

    // ============================================
    // QUADRO 2: DADOS DO EMITENTE
    // ============================================
    addPageIfNeeded(60);
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('DADOS DO EMITENTE', margin, currentY);

    currentY += 10;

    const quadro2Height = 50;
    doc.rect(margin, currentY, contentWidth * 0.5, quadro2Height)
      .stroke();

    const emitY = currentY + 5;
    doc.fontSize(7)
      .font('Helvetica')
      .text(emit.xNome || '', margin + 5, emitY, { width: contentWidth * 0.5 - 10 })
      .text(`CNPJ: ${this.formatarCNPJ(emit.CNPJ || '')}`, margin + 5, emitY + 8)
      .text(`Inscrição Estadual: ${emit.IE || 'ISENTO'}`, margin + 5, emitY + 16);

    const endEmit = emit.enderEmit || {};
    doc.text(
      `${endEmit.xLgr || ''}, ${endEmit.nro || ''} - ${endEmit.xBairro || ''} - ${endEmit.xMun || ''}/${endEmit.UF || ''} - CEP: ${this.formatarCEP(endEmit.CEP || '')}`,
      margin + 5,
      emitY + 24,
      { width: contentWidth * 0.5 - 10 }
    );

    // ============================================
    // QUADRO 3: DADOS DO DESTINATÁRIO
    // ============================================
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('DADOS DO DESTINATÁRIO', margin + contentWidth * 0.5 + 5, currentY);

    doc.rect(margin + contentWidth * 0.5 + 5, currentY + 10, contentWidth * 0.5 - 5, quadro2Height)
      .stroke();

    const destY = currentY + 15;
    doc.fontSize(7)
      .font('Helvetica')
      .text(dest.xNome || '', margin + contentWidth * 0.5 + 10, destY, { width: contentWidth * 0.5 - 15 })
      .text(
        `CPF/CNPJ: ${dest.CNPJ ? this.formatarCNPJ(dest.CNPJ) : dest.CPF ? this.formatarCPF(dest.CPF) : ''}`,
        margin + contentWidth * 0.5 + 10,
        destY + 8
      );

    if (dest.IE) {
      doc.text(`Inscrição Estadual: ${dest.IE}`, margin + contentWidth * 0.5 + 10, destY + 16);
    }

    const endDest = dest.enderDest || {};
    doc.text(
      `${endDest.xLgr || ''}, ${endDest.nro || ''} - ${endDest.xBairro || ''} - ${endDest.xMun || ''}/${endDest.UF || ''} - CEP: ${this.formatarCEP(endDest.CEP || '')}`,
      margin + contentWidth * 0.5 + 10,
      destY + (dest.IE ? 24 : 16),
      { width: contentWidth * 0.5 - 15 }
    );

    currentY += quadro2Height + 10;

    // ============================================
    // QUADRO 4: DADOS DOS PRODUTOS/SERVIÇOS
    // ============================================
    addPageIfNeeded(100);
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('DADOS DOS PRODUTOS / SERVIÇOS', margin, currentY);

    currentY += 10;

    // Cabeçalho da tabela
    const tabelaHeaderY = currentY;
    doc.rect(margin, tabelaHeaderY, contentWidth, 15)
      .fillColor('#E5E7EB')
      .fill()
      .stroke();

    doc.fillColor('#000000')
      .fontSize(6)
      .font('Helvetica-Bold')
      .text('CÓDIGO', margin + 5, tabelaHeaderY + 4, { width: 50 })
      .text('DESCRIÇÃO', margin + 60, tabelaHeaderY + 4, { width: 180 })
      .text('NCM', margin + 245, tabelaHeaderY + 4, { width: 50 })
      .text('CFOP', margin + 300, tabelaHeaderY + 4, { width: 40 })
      .text('UN', margin + 345, tabelaHeaderY + 4, { width: 25 })
      .text('QTDE', margin + 375, tabelaHeaderY + 4, { width: 50 })
      .text('VL. UNIT', margin + 430, tabelaHeaderY + 4, { width: 60 })
      .text('VL. TOTAL', margin + 495, tabelaHeaderY + 4, { width: 60 });

    currentY = tabelaHeaderY + 15;

    // Itens da tabela
    produtos.forEach((item: any, index: number) => {
      addPageIfNeeded(20);
      const prod = item.prod || {};
      const imposto = item.imposto || {};
      const icms = imposto.ICMS || {};
      const icmsTag = Object.keys(icms)[0] || '';
      const icmsData = icms[icmsTag] || {};

      const itemY = currentY;
      doc.rect(margin, itemY, contentWidth, 18)
        .fillColor(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB')
        .fill()
        .stroke();

      doc.fontSize(6)
        .font('Helvetica')
        .text(prod.cProd || '', margin + 5, itemY + 2, { width: 50 })
        .text((prod.xProd || '').substring(0, 40), margin + 60, itemY + 2, { width: 180 })
        .text(prod.NCM || '', margin + 245, itemY + 2, { width: 50 })
        .text(prod.CFOP || '', margin + 300, itemY + 2, { width: 40 })
        .text(prod.uCom || '', margin + 345, itemY + 2, { width: 25 })
        .text(Number(prod.qCom || 0).toFixed(2), margin + 375, itemY + 2, { width: 50, align: 'right' })
        .text(`R$ ${Number(prod.vUnCom || 0).toFixed(2)}`, margin + 430, itemY + 2, { width: 60, align: 'right' })
        .text(`R$ ${Number(prod.vProd || 0).toFixed(2)}`, margin + 495, itemY + 2, { width: 60, align: 'right' });

      // Segunda linha com impostos
      const itemY2 = itemY + 9;
      doc.text(`ICMS: ${icmsData.CST || icmsData.CSOSN || 'N/A'} | `, margin + 60, itemY2, { width: 200 })
        .text(`Base: R$ ${Number(icmsData.vBC || 0).toFixed(2)} | `, { continued: true })
        .text(`Alíq: ${Number(icmsData.pICMS || 0).toFixed(2)}% | `, { continued: true })
        .text(`Valor: R$ ${Number(icmsData.vICMS || 0).toFixed(2)}`, { continued: true });

      currentY += 18;
    });

    // ============================================
    // QUADRO 5: CÁLCULO DO IMPOSTO
    // ============================================
    addPageIfNeeded(80);
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('CÁLCULO DO IMPOSTO', margin, currentY);

    currentY += 10;

    const quadro5Height = 70;
    doc.rect(margin, currentY, contentWidth, quadro5Height)
      .stroke();

    const calcY = currentY + 5;
    doc.fontSize(7)
      .font('Helvetica')
      .text(`Base de Cálculo do ICMS: R$ ${Number(total.vBC || 0).toFixed(2)}`, margin + 5, calcY)
      .text(`Valor do ICMS: R$ ${Number(total.vICMS || 0).toFixed(2)}`, margin + 200, calcY)
      .text(`Base de Cálculo do ICMS ST: R$ ${Number(total.vBCST || 0).toFixed(2)}`, margin + 350, calcY);

    doc.text(`Valor do ICMS ST: R$ ${Number(total.vST || 0).toFixed(2)}`, margin + 5, calcY + 10)
      .text(`Valor Total dos Produtos: R$ ${Number(total.vProd || 0).toFixed(2)}`, margin + 200, calcY + 10)
      .text(`Valor do Frete: R$ ${Number(total.vFrete || 0).toFixed(2)}`, margin + 350, calcY + 10);

    doc.text(`Valor do Seguro: R$ ${Number(total.vSeg || 0).toFixed(2)}`, margin + 5, calcY + 20)
      .text(`Desconto: R$ ${Number(total.vDesc || 0).toFixed(2)}`, margin + 200, calcY + 20)
      .text(`Valor do II: R$ ${Number(total.vII || 0).toFixed(2)}`, margin + 350, calcY + 20);

    doc.text(`Valor do IPI: R$ ${Number(total.vIPI || 0).toFixed(2)}`, margin + 5, calcY + 30)
      .text(`Valor do PIS: R$ ${Number(total.vPIS || 0).toFixed(2)}`, margin + 200, calcY + 30)
      .text(`Valor da COFINS: R$ ${Number(total.vCOFINS || 0).toFixed(2)}`, margin + 350, calcY + 30);

    doc.font('Helvetica-Bold')
      .fontSize(8)
      .text(`VALOR TOTAL DA NF-e: R$ ${Number(total.vNF || 0).toFixed(2)}`, margin + 5, calcY + 45, { width: contentWidth - 10 });

    currentY += quadro5Height + 10;

    // ============================================
    // QUADRO 6: DADOS ADICIONAIS / QR CODE
    // ============================================
    addPageIfNeeded(100);
    const quadro6LeftWidth = contentWidth * 0.6;
    const quadro6RightWidth = contentWidth * 0.4;

    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('DADOS ADICIONAIS', margin, currentY);

    currentY += 10;

    const quadro6Height = 100;
    doc.rect(margin, currentY, quadro6LeftWidth, quadro6Height)
      .stroke();

    // Informações adicionais
    if (infAdic.infCpl) {
      doc.fontSize(7)
        .font('Helvetica')
        .text(infAdic.infCpl, margin + 5, currentY + 5, {
          width: quadro6LeftWidth - 10,
          align: 'left'
        });
    }

    // QR Code
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('CONSULTA PELA CHAVE DE ACESSO', margin + quadro6LeftWidth + 5, currentY);

    doc.rect(margin + quadro6LeftWidth + 5, currentY + 10, quadro6RightWidth - 5, quadro6Height - 10)
      .stroke();

    if (qrCodeImage) {
      try {
        doc.image(qrCodeImage, margin + quadro6LeftWidth + 10, currentY + 15, {
          fit: [100, 100],
          align: 'center'
        });
      } catch (error) {
        console.warn('⚠️ Erro ao adicionar QR Code:', error);
      }
    }

    doc.fontSize(6)
      .font('Helvetica')
      .text('Consulte pela chave de acesso em:', margin + quadro6LeftWidth + 10, currentY + 120, {
        width: quadro6RightWidth - 15,
        align: 'center'
      })
      .text('www.nfe.fazenda.gov.br/portal', margin + quadro6LeftWidth + 10, currentY + 128, {
        width: quadro6RightWidth - 15,
        align: 'center'
      });

    currentY += quadro6Height + 10;

    // ============================================
    // RODAPÉ
    // ============================================
    addPageIfNeeded(30);
    doc.rect(0, pageHeight - 30, pageWidth, 30)
      .fillColor('#1E40AF')
      .fill();

    doc.fillColor('#FFFFFF')
      .fontSize(7)
      .font('Helvetica')
      .text(
        'Este documento é uma representação gráfica da NF-e e não tem validade fiscal. ' +
          'A validade da NF-e está no XML assinado digitalmente.',
        margin,
        pageHeight - 20,
        {
          width: contentWidth,
          align: 'center'
        }
      );

    doc.end();

    return pdfPromise;
  }

  /**
   * Gera URL do QR Code para consulta pública da NF-e
   * Formato: http://www.nfe.fazenda.gov.br/portal/consulta.aspx?p=CHAVE_ACESSO
   */
  private static gerarUrlQrCode(chaveAcesso: string, producao: boolean): string {
    if (producao) {
      return `http://www.nfe.fazenda.gov.br/portal/consulta.aspx?p=${chaveAcesso}`;
    } else {
      return `http://hom.nfe.fazenda.gov.br/portal/consulta.aspx?p=${chaveAcesso}`;
    }
  }

  /**
   * Formata data no padrão brasileiro
   */
  private static formatarData(data: string): string {
    if (!data) return '';
    try {
      const date = new Date(data);
      return date.toLocaleString('pt-BR', {
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

  /**
   * Formata CNPJ
   */
  private static formatarCNPJ(cnpj: string): string {
    if (!cnpj) return '';
    const limpo = cnpj.replace(/\D/g, '');
    if (limpo.length !== 14) return cnpj;
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Formata CPF
   */
  private static formatarCPF(cpf: string): string {
    if (!cpf) return '';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return cpf;
    return limpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  /**
   * Formata CEP
   */
  private static formatarCEP(cep: string): string {
    if (!cep) return '';
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) return cep;
    return limpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }
}

export default NFeDanfeService;
