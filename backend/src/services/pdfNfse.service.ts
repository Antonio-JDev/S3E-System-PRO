import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';
import qrcode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libxmljs = require('libxmljs2');

function fmtMoney(v?: number | string) {
  if (v == null) return '-';
  const n = typeof v === 'string' ? Number(v) : v;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function gerarPdfNfseBuffer(id: string): Promise<Buffer> {
  const nfse = await prisma.nfse.findUnique({
    where: { id },
    include: {
      empresaFiscal: {
        select: {
          razaoSocial: true,
          cnpj: true,
          inscricaoMunicipal: true,
          endereco: true,
          numero: true,
          bairro: true,
          cidade: true,
          estado: true,
          cep: true,
          email: true,
          telefone: true,
          nomeFantasia: true
        }
      }
    }
  });
  if (!nfse) throw new Error('NFS-e não encontrada');

  // Parse xmlEnvio if present to extract tomador and serviços
  let tomador: any = {};
  let servicoPrimeiro: any = {};
  if (nfse.xmlEnvio) {
    try {
      const xmlDoc = libxmljs.parseXml(nfse.xmlEnvio);
      const ns = { pub: 'http://www.publica.inf.br' };
      const prest = xmlDoc.get('//pub:Prestador', ns);
      const tom = xmlDoc.get('//pub:Tomador', ns);
      const serv = xmlDoc.get('//pub:Servico', ns);
      if (tom) {
        const cnpjNode = tom.get('.//pub:Cnpj', ns) || tom.get('.//pub:Cpf', ns);
        tomador.cnpj = cnpjNode ? cnpjNode.text() : undefined;
        const raz = tom.get('.//pub:RazaoSocial', ns);
        tomador.razaoSocial = raz ? raz.text() : nfse.tomadorRazaoSocial;
        const end = tom.get('.//pub:Endereco', ns);
        if (end) {
          tomador.endereco = end.get('./pub:Endereco', ns)?.text() || '';
          tomador.numero = end.get('./pub:Numero', ns)?.text() || '';
          tomador.bairro = end.get('./pub:Bairro', ns)?.text() || '';
          tomador.municipio = end.get('./pub:Municipio', ns)?.text() || '';
          tomador.codigoMunicipio = end.get('./pub:CodigoMunicipio', ns)?.text() || '';
          tomador.uf = end.get('./pub:Uf', ns)?.text() || '';
          tomador.cep = end.get('./pub:Cep', ns)?.text() || '';
        }
      }
      if (serv) {
        servicoPrimeiro.discriminacao = serv.get('./pub:Discriminacao', ns)?.text() || '';
        servicoPrimeiro.itemListaServico = serv.get('./pub:ItemListaServico', ns)?.text() || '';
        const valores = serv.get('./pub:Valores', ns);
        if (valores) {
          servicoPrimeiro.valorServicos = valores.get('./pub:ValorServicos', ns)?.text();
          servicoPrimeiro.baseCalculo = valores.get('./pub:BaseCalculo', ns)?.text();
          servicoPrimeiro.aliquota = valores.get('./pub:Aliquota', ns)?.text();
          servicoPrimeiro.valorIss = valores.get('./pub:ValorIss', ns)?.text();
          servicoPrimeiro.issRetido = valores.get('./pub:IssRetido', ns)?.text();
          servicoPrimeiro.valorLiquidoNfse = valores.get('./pub:ValorLiquidoNfse', ns)?.text();
        }
      }
    } catch (e) {
      // ignore parse errors, fallback to nfse fields
    }
  }

  const doc = new PDFDocument({ size: 'A4', margin: 28 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header: municipal crest left, title center, box right for number/date/competencia/codigo verif
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // Header layout sizes
  const headerHeight = 110;
  const leftLogoW = 70;
  const rightMetaW = 160;
  const qrSize = 64;

  // Brasão: prefer env var MUNICIPIO_BRASAO_BASE64; else fallback to file /app/uploads/pdf-customization/municipio.png
  const brasaoBuffer = (() => {
    try {
      const brasaoBase64 = process.env.MUNICIPIO_BRASAO_BASE64;
      if (brasaoBase64 && brasaoBase64.trim().length > 100) {
        return Buffer.from(brasaoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      }
    } catch (_) { /* ignore */ }
    const crestPath = '/app/uploads/pdf-customization/municipio.png';
    if (fs.existsSync(crestPath)) {
      return fs.readFileSync(crestPath);
    }
    return null;
  })();
  if (brasaoBuffer) {
    try {
      doc.image(brasaoBuffer, doc.x, doc.y, { width: leftLogoW });
    } catch (_) {
      doc.rect(doc.x, doc.y, leftLogoW, leftLogoW).stroke();
    }
  } else {
    doc.rect(doc.x, doc.y, leftLogoW, leftLogoW).stroke();
  }
  // Right metadata box background rectangle (will hold meta + QR)
  const rightBoxX = doc.page.margins.left + pageWidth - rightMetaW;
  const rightBoxY = doc.page.margins.top;
  doc.rect(rightBoxX, rightBoxY, rightMetaW, headerHeight - 0).stroke();
  // Title block
  doc.fontSize(14).font('Helvetica-Bold');
  doc.text('MUNICÍPIO DE ITAJAÍ', 100, doc.y - 50, { align: 'center', width: pageWidth - 220 });
  doc.fontSize(9).font('Helvetica');
  doc.text('SECRETARIA MUNICIPAL DA FAZENDA', 100, doc.y, { align: 'center', width: pageWidth - 220 });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e', 100, doc.y, { align: 'center', width: pageWidth - 220 });

  // Right box for meta data
  doc.fontSize(8);
  doc.text('Número e Série da NFS-e', rightBoxX + 6, rightBoxY + 6);
  doc.font('Helvetica-Bold').text(`${nfse.numeroNfse || '-'}`, rightBoxX + 6, rightBoxY + 18);
  doc.font('Helvetica').text('Data e Hora da Emissão', rightBoxX + 6, rightBoxY + 36);
  doc.text(nfse.createdAt ? new Date(nfse.createdAt).toLocaleString('pt-BR') : '-', rightBoxX + 6, rightBoxY + 48);
  // QR code linking to consulta pública (place at right within meta box)
  try {
    const consultaUrl = 'https://nfse.itajai.sc.gov.br/jsp/nfs/nfp/externo/consulta.jsp';
    const qrDataUrl = await qrcode.toDataURL(consultaUrl, { margin: 1, width: qrSize });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuf = Buffer.from(qrBase64, 'base64');
    doc.image(qrBuf, rightBoxX + rightMetaW - qrSize - 6, rightBoxY + 6, { width: qrSize, height: qrSize });
  } catch (_) {}

  doc.moveDown(1.5);

  // Boxes: Prestador and Tomador
  const boxWidth = pageWidth;
  const boxX = doc.page.margins.left;
  let cursorY = doc.y + 10;
  // Prestador box
  doc.rect(boxX, cursorY, boxWidth, 70).stroke();
  doc.fontSize(9).font('Helvetica-Bold').text('PRESTADOR DE SERVIÇOS', boxX + 6, cursorY + 6);
  doc.font('Helvetica').fontSize(9);
  const prest = nfse.empresaFiscal;
  // Company logo: try system configuration logoDanfeUrl or logoUrl
  try {
    const conf = await prisma.configuracaoSistema.findUnique({ where: { id: 'sistema-config' } });
    let logoUrl = conf?.logoDanfeUrl || conf?.logoUrl;
    if (logoUrl) {
      // Map uploads path to filesystem: /uploads/... => /app/uploads/...
      if (logoUrl.startsWith('/uploads') || logoUrl.startsWith('uploads')) {
        const p = path.join('/app', logoUrl.replace(/^\//, ''));
        if (fs.existsSync(p)) {
          doc.image(p, boxX + 6, cursorY + 6, { width: 80 });
        }
      } else if (fs.existsSync(logoUrl)) {
        doc.image(logoUrl, boxX + 6, cursorY + 6, { width: 80 });
      }
    }
  } catch (_) {}
  doc.text(`CNPJ: ${prest?.cnpj || '-'}`, boxX + 100, cursorY + 22);
  doc.text(`Inscrição Municipal: ${prest?.inscricaoMunicipal || '-'}`, boxX + 300, cursorY + 22);
  doc.text(`Nome fantasia: ${prest?.nomeFantasia || ''}`, boxX + 100, cursorY + 36);
  doc.text(`Razão social: ${prest?.razaoSocial || ''}`, boxX + 300, cursorY + 36);
  cursorY += 70 + 6;

  // Tomador box
  doc.rect(boxX, cursorY, boxWidth, 80).stroke();
  doc.font('Helvetica-Bold').text('TOMADOR DE SERVIÇOS', boxX + 6, cursorY + 6);
  doc.font('Helvetica').text(`Razão social: ${tomador.razaoSocial || nfse.tomadorRazaoSocial || '-'}`, boxX + 6, cursorY + 22);
  doc.text(`CNPJ/CPF: ${tomador.cnpj || '-'}`, boxX + 6, cursorY + 38);
  doc.text(`Endereço: ${tomador.endereco || '-'}`, boxX + 6, cursorY + 54);
  cursorY += 80 + 8;

  // Discriminação box (large)
  const discrimHeight = 140;
  doc.rect(boxX, cursorY, boxWidth, discrimHeight).stroke();
  doc.font('Helvetica-Bold').text('DISCRIMINAÇÃO DOS SERVIÇOS', boxX + 6, cursorY + 6);
  doc.font('Helvetica').fontSize(9);
  const discrText = servicoPrimeiro.discriminacao || '-';
  doc.text(discrText, boxX + 6, cursorY + 24, { width: boxWidth - 12, height: discrimHeight - 28 });
  cursorY += discrimHeight + 8;

  // Valores summary box
  doc.rect(boxX, cursorY, boxWidth, 90).stroke();
  doc.font('Helvetica-Bold').text('VALOR TOTAL DO SERVIÇO: R$ ' + fmtMoney(nfse.valorTotal ?? servicoPrimeiro.valorServicos), boxX + 6, cursorY + 6);
  // table headers - draw boxed grid for headers and values
  const tableY = cursorY + 28;
  const colWidths = [90, 90, 80, 80, 80];
  const tableHeaderHeight = 18;
  const valueRowHeight = 22;
  // Draw header cells
  let tx = boxX + 6;
  doc.fontSize(8).font('Helvetica-Bold');
  for (let i = 0; i < colWidths.length; i++) {
    const w = colWidths[i];
    doc.rect(tx - 2, tableY - 2, w, tableHeaderHeight).stroke();
    doc.text(['Valor Serviços', 'Base de Cálculo', 'Alíquota ISS', 'Valor ISS retido', 'Valor ISS'][i], tx, tableY, { width: w - 4, align: 'left' });
    tx += w;
  }
  // Draw values row boxes and values
  tx = boxX + 6;
  doc.font('Helvetica').fontSize(9);
  const valServ = Number(servicoPrimeiro.valorServicos || nfse.valorTotal || 0);
  const baseCalc = Number(servicoPrimeiro.baseCalculo || servicoPrimeiro.valorServicos || 0);
  const aliq = servicoPrimeiro.aliquota || '';
  const valIssRet = Number(servicoPrimeiro.valorIssRetido || 0);
  const valIss = Number(servicoPrimeiro.valorIss || 0);
  const vals = [valServ, baseCalc, aliq, valIssRet, valIss];
  for (let i = 0; i < colWidths.length; i++) {
    const w = colWidths[i];
    doc.rect(tx - 2, tableY + tableHeaderHeight - 2, w, valueRowHeight).stroke();
    const txt = typeof vals[i] === 'number' ? fmtMoney(vals[i]) : String(vals[i] || '-');
    doc.text(txt, tx, tableY + tableHeaderHeight + 2, { width: w - 4, align: 'left' });
    tx += w;
  }
  cursorY += 90 + 8;

  // Informações complementares box
  doc.rect(boxX, cursorY, boxWidth, 40).stroke();
  doc.font('Helvetica-Bold').text('INFORMAÇÕES COMPLEMENTARES', boxX + 6, cursorY + 6);
  doc.font('Helvetica').text(servicoPrimeiro.informacoesComplementares || '-', boxX + 6, cursorY + 22, { width: boxWidth - 12 });
  cursorY += 40 + 8;

  // Footer: outras informações
  doc.rect(boxX, cursorY, boxWidth, 40).stroke();
  doc.font('Helvetica-Bold').text('OUTRAS INFORMAÇÕES (USO EXCLUSIVO DO MUNICÍPIO)', boxX + 6, cursorY + 6);
  doc.end();

  return pdfPromise;
}

