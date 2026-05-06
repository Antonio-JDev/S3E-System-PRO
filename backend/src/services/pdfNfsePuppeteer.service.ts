import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import qrcode from 'qrcode';

function escapeHtml(s: string | undefined) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadCompanyLogoBase64(): Promise<string | null> {
  try {
    const conf = await prisma.configuracaoSistema.findUnique({ where: { id: 'sistema-config' } });
    const logoUrl = conf?.logoDanfeUrl || conf?.logoUrl;
    if (!logoUrl) return null;
    // map uploads path to absolute
    if (logoUrl.startsWith('/uploads') || logoUrl.startsWith('uploads')) {
      const p = path.join('/app', logoUrl.replace(/^\//, ''));
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        return 'data:image/png;base64,' + buf.toString('base64');
      }
    } else if (fs.existsSync(logoUrl)) {
      const buf = fs.readFileSync(logoUrl);
      return 'data:image/png;base64,' + buf.toString('base64');
    }
  } catch (_) {}
  return null;
}

export async function gerarPdfNfsePuppeteerBuffer(id: string): Promise<Buffer> {
  const nfse = await prisma.nfse.findUnique({
    where: { id },
    include: { empresaFiscal: true }
  });
  if (!nfse) throw new Error('NFS-e não encontrada');

  // parse xmlEnvio minimal info (tomador, servicos)
  let tomador: any = {};
  let servico: any = {};
  if (nfse.xmlEnvio) {
    try {
      const xml = nfse.xmlEnvio;
      const m = xml.match(/<Tomador[\s\S]*?>[\s\S]*?<\/Tomador>/i);
      if (m) {
        const t = m[0];
        const cnpj = t.match(/<Cnpj>([^<]+)<\/Cnpj>/i)?.[1];
        const razao = t.match(/<RazaoSocial>([^<]+)<\/RazaoSocial>/i)?.[1];
        const endereco = t.match(/<Endereco>\s*([^<]+)<\/Endereco>/i)?.[1];
        tomador = { cnpj, razaoSocial: razao, endereco };
      }
      const s = xml.match(/<Servico[\s\S]*?>[\s\S]*?<\/Servico>/i);
      if (s) {
        const sv = s[0];
        servico.discriminacao = sv.match(/<Discriminacao>([^<]*)<\/Discriminacao>/i)?.[1] || '';
        servico.itemLista = sv.match(/<ItemListaServico>([^<]+)<\/ItemListaServico>/i)?.[1] || '';
        servico.valorServicos = sv.match(/<ValorServicos>([^<]+)<\/ValorServicos>/i)?.[1] || nfse.valorTotal?.toString() || '0.00';
        servico.aliquota = sv.match(/<Aliquota>([^<]+)<\/Aliquota>/i)?.[1] || '';
      }
    } catch (_) {}
  }

  const logoBase64 = await loadCompanyLogoBase64();
  const brasaoBase64 = process.env.MUNICIPIO_BRASAO_BASE64 || null;
  const qrUrl = 'https://nfse.itajai.sc.gov.br/jsp/nfs/nfp/externo/consulta.jsp';

  // Handlebars template (based on provided HTML)
  const template = `
  <!DOCTYPE html>
  <html lang="pt-br">
  <head>
      <meta charset="UTF-8">
      <title>Modelo DANFE NFS-e Itajaí</title>
      <style>
          body { font-family: "Helvetica", "Arial", sans-serif; font-size: 8pt; margin: 0; padding: 10px; color: #000; }
          .nfs-container { width: 100%; max-width: 210mm; margin: auto; border: 1pt solid #000; }
          
          /* Auxiliares */
          .bold { font-weight: bold; }
          .center { text-align: center; }
          .bg-gray { background-color: #f2f2f2; }
          .border-b { border-bottom: 1pt solid #000; }
          .border-r { border-right: 1pt solid #000; }
          
          /* Cabeçalho Principal */
          .header { display: flex; height: 110px; }
          .header-logo-itajai { width: 15%; display: flex; align-items: center; justify-content: center; padding: 5px; }
          .header-logo-itajai img { max-width: 70px; height: auto; }
          .header-title { width: 55%; padding: 5px; display: flex; flex-direction: column; justify-content: center; }
          .header-qrcode { width: 10%; display: flex; align-items: center; justify-content: center; border-left: 1pt solid #000; }
          .header-meta { width: 20%; border-left: 1pt solid #000; display: flex; flex-direction: column; }
          
          .meta-box { flex: 1; border-bottom: 0.5pt solid #000; padding: 2px 4px; }
          .meta-box:last-child { border-bottom: none; }
          .label { font-size: 6.5pt; display: block; margin-bottom: 1px; text-transform: uppercase; }

          /* Blocos de Dados com Logo Lateral */
          .section-title { padding: 2px; font-size: 7.5pt; border-bottom: 1pt solid #000; text-align: center; }
          .data-container { display: flex; border-bottom: 1pt solid #000; min-height: 80px; }
          
          .logo-side { width: 15%; display: flex; align-items: center; justify-content: center; border-right: 1pt solid #000; padding: 5px; }
          .logo-side img { max-width: 100%; max-height: 70px; }
          
          .info-side { width: 85%; padding: 5px; display: flex; flex-direction: column; justify-content: space-between; }
          .info-row { display: flex; width: 100%; margin-bottom: 4px; }
          .info-cell { flex: 1; }

          /* Serviços e Valores */
          .desc-box { padding: 5px; min-height: 120px; border-bottom: 1pt solid #000; white-space: pre-wrap; }
          .service-code-box { padding: 5px; border-bottom: 1pt solid #000; font-size: 7.5pt; }
          
          .tax-grid { display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1pt solid #000; }
          .tax-cell { border-right: 0.5pt solid #000; border-bottom: 0.5pt solid #000; padding: 3px; min-height: 25px; }
          .tax-cell:nth-child(5n) { border-right: none; }

          /* Rodapé */
          .footer-block { padding: 4px; min-height: 30px; font-size: 7pt; }
      </style>
  </head>
  <body>
  
  <div class="nfs-container">
      <div class="header border-b">
          <div class="header-logo-itajai border-r">
              {{#if brasao}}<img src="{{brasao}}" alt="Brasão">{{else}}<div style="width:70px;height:70px;border:1px solid #000"></div>{{/if}}
          </div>
          <div class="header-title center">
              <div class="bold" style="font-size: 11pt;">MUNICÍPIO DE ITAJAÍ</div>
              <div class="bold">SECRETARIA MUNICIPAL DA FAZENDA</div>
              <div style="font-size: 7pt;">Rua Alberto Werner, 100, Vila Operária, CEP: 88304-053 - ITAJAÍ/SC</div>
              <div class="bold" style="font-size: 10pt; margin-top: 8px;">NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e</div>
          </div>
          <div class="header-qrcode">
              <img src="{{qrData}}" alt="QR" />
          </div>
          <div class="header-meta">
              <div class="meta-box"><span class="label">Número e Série da NFS-e</span><span class="bold">{{numeroNfse}}</span></div>
              <div class="meta-box"><span class="label">Data e Hora da Emissão</span><span class="bold">{{dataEmissao}}</span></div>
              <div class="meta-box"><span class="label">Competência</span><span class="bold">{{competencia}}</span></div>
              <div class="meta-box"><span class="label">Código de Verificação</span><span class="bold">{{codigoVerificacao}}</span></div>
          </div>
      </div>

      <div class="section-title bg-gray bold">PRESTADOR DE SERVIÇOS</div>
      <div class="data-container">
          <div class="logo-side">
              {{#if prestador.logo}}{{{prestador.logo}}}{{/if}}
          </div>
          <div class="info-side">
              <div class="info-row">
                  <div class="info-cell"><span class="label">CPF/CNPJ:</span> {{prestador.cnpj}}</div>
                  <div class="info-cell"><span class="label">Inscrição Municipal:</span> {{prestador.inscricaoMunicipal}}</div>
              </div>
              <div class="info-row">
                  <div class="info-cell"><span class="label">Nome empresarial:</span> <span class="bold">{{prestador.nomeFantasia}}</span></div>
              </div>
              <div class="info-row">
                  <div class="info-cell"><span class="label">Endereço:</span> {{prestador.endereco}}</div>
                  <div class="info-cell" style="flex: 0.3;"><span class="label">CEP:</span> {{prestador.cep}}</div>
              </div>
          </div>
      </div>

      <div class="section-title bg-gray bold">TOMADOR DE SERVIÇOS</div>
      <div class="data-container">
          <div class="logo-side">
              {{#if tomador.logo}}{{{tomador.logo}}}{{/if}}
          </div>
          <div class="info-side">
              <div class="info-row">
                  <div class="info-cell"><span class="label">CPF/CNPJ:</span> {{tomador.cnpj}}</div>
                  <div class="info-cell"><span class="label">Inscrição Municipal:</span> {{tomador.inscricaoMunicipal}}</div>
              </div>
              <div class="info-row">
                  <div class="info-cell"><span class="label">Nome/Razão Social:</span> <span class="bold">{{tomador.razaoSocial}}</span></div>
              </div>
              <div class="info-row">
                  <div class="info-cell"><span class="label">Endereço:</span> {{tomador.endereco}}</div>
                  <div class="info-cell" style="flex: 0.3;"><span class="label">CEP:</span> {{tomador.cep}}</div>
              </div>
          </div>
      </div>

      <div class="section-title bg-gray bold">DISCRIMINAÇÃO DOS SERVIÇOS</div>
      <div class="desc-box">
          {{servico.discriminacao}}
      </div>

      <div class="section-title bg-gray bold" style="text-align: left; padding-left: 10px;">VALOR TOTAL DO SERVIÇO: R$ {{valorTotal}}</div>
      
      <div class="service-code-box">
          <span class="label">Código do Serviço:</span> {{servico.itemLista}}
      </div>

      <div class="tax-grid">
          <div class="tax-cell"><span class="label">Valor Serviços</span>{{servico.valorServicos}}</div>
          <div class="tax-cell"><span class="label">Base de Cálculo</span>{{servico.baseCalculo}}</div>
          <div class="tax-cell"><span class="label">Alíquota ISS</span>{{servico.aliquota}}</div>
          <div class="tax-cell"><span class="label">Valor ISS Retido</span>{{servico.valorIssRetido}}</div>
          <div class="tax-cell"><span class="label">Valor ISS</span>{{servico.valorIss}}</div>
          <div class="tax-cell"><span class="label">Desconto Incond.</span>{{servico.descontoIncondicionado}}</div>
          <div class="tax-cell"><span class="label">Desconto Cond.</span>{{servico.descontoCondicionado}}</div>
          <div class="tax-cell"><span class="label">Valor PIS</span>{{servico.valorPis}}</div>
          <div class="tax-cell"><span class="label">Valor COFINS</span>{{servico.valorCofins}}</div>
          <div class="tax-cell"><span class="label">Valor INSS</span>{{servico.valorInss}}</div>
          <div class="tax-cell"><span class="label">Valor IR</span>{{servico.valorIr}}</div>
          <div class="tax-cell"><span class="label">Valor CSLL</span>{{servico.valorCsll}}</div>
          <div class="tax-cell"><span class="label">Outras Retenções</span>{{servico.outrasRetencoes}}</div>
          <div class="tax-cell"><span class="label">Valor Deduções</span>{{servico.valorDeducoes}}</div>
          <div class="tax-cell bg-gray bold"><span class="label">Valor Líquido</span>{{servico.valorLiquidoNfse}}</div>
      </div>

      <div class="section-title bg-gray bold">INFORMAÇÕES COMPLEMENTARES</div>
      <div class="footer-block border-b">{{servico.informacoesComplementares}}</div>

      <div class="section-title bg-gray bold" style="font-size: 7pt;">OUTRAS INFORMAÇÕES (USO EXCLUSIVO DO MUNICÍPIO)</div>
      <div class="footer-block center">-</div>
  </div>

  </body>
  </html>
  `;

  const templateFn = Handlebars.compile(template);

  // Prepare data
  // prepare brazao (municipio) base64 from known container path if available
  let brasaoBase64Local: string | null = null;
  try {
    const candidate1 = path.join(process.cwd(), 'uploads', 'pdf-customization', 'municipio.png');
    const candidate2 = path.join('/app', 'uploads', 'pdf-customization', 'municipio.png');
    const chosen = fs.existsSync(candidate1) ? candidate1 : fs.existsSync(candidate2) ? candidate2 : null;
    if (chosen) {
      const buf = fs.readFileSync(chosen);
      brasaoBase64Local = `data:image/png;base64,${buf.toString('base64')}`;
    }
  } catch (_) { brasaoBase64Local = null; }

  const data = {
    numeroNfse: nfse.numeroNfse || '-',
    dataEmissao: nfse.createdAt ? new Date(nfse.createdAt).toLocaleString('pt-BR') : '-',
    prestador: {
      cnpj: nfse.empresaFiscal?.cnpj || '',
      inscricaoMunicipal: nfse.empresaFiscal?.inscricaoMunicipal || '',
      nomeFantasia: nfse.empresaFiscal?.nomeFantasia || '',
      razaoSocial: nfse.empresaFiscal?.razaoSocial || ''
    },
    tomador: {
      cnpj: tomador.cnpj || nfse.tomadorRazaoSocial || '',
      razaoSocial: tomador.razaoSocial || nfse.tomadorRazaoSocial || '',
      endereco: tomador.endereco || ''
    },
    servico: {
      discriminacao: servico.discriminacao || '',
      valorServicos: servico.valorServicos || nfse.valorTotal?.toString() || '0.00',
      baseCalculo: servico.baseCalculo || '',
      aliquota: servico.aliquota || '',
      valorIssRetido: servico.valorIssRetido || '',
      valorIss: servico.valorIss || '',
      informacoesComplementares: servico.informacoesComplementares || ''
    },
    valorTotal: nfse.valorTotal ? Number(nfse.valorTotal).toFixed(2) : (servico.valorServicos || '0.00'),
    brasao: brasaoBase64Local || (brasaoBase64 ? `data:image/png;base64,${brasaoBase64}` : '') || '',
    qrData: ''
  };

  // QR image as base64 to embed
  try {
    const qrDataUrl = await qrcode.toDataURL(qrUrl, { width: 160 });
    data.qrData = qrDataUrl;
  } catch (_) { data.qrData = ''; }

  const html = templateFn(data);

  // Launch puppeteer and render pdf
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' } });
    await page.close();
    await browser.close();
    // page.pdf can return a Uint8Array depending on the environment/types, normalize to Buffer
    return Buffer.from(pdfBuffer as Uint8Array);
  } catch (e) {
    await browser.close();
    throw e;
  }
}

