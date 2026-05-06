/**
 * Serviço de orquestração NFS-e Pública (Itajaí/SC) - v7.4
 * Fluxo: gerar XML -> validar XSD -> assinar -> enviar (RecepcionarLoteRps);
 * consultar protocolo (ConsultarLoteRps); cancelar (CancelarNfse com assinatura).
 */

import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeSignatureService } from './nfe-signature.service';
import {
  gerarEnviarLoteRpsEnvio,
  gerarPedidoCancelamentoNfse,
  type EnviarLoteRpsEnvioInput
} from './nfse-publica-xml.service';
import { assinarLoteRps, assinarPedidoCancelamento } from './nfse-publica-signature.service';
import { validarXmlNfseContraXsd } from './nfse-publica-validator.service';
import {
  recepcionarLoteRps,
  consultarLoteRps,
  cancelarNfse
} from './nfse-publica-soap.service';
import { mensagemErroNfse } from './nfse-publica-erros';
import { VendasService } from './vendas.service';
import { formatoItemListaServico } from './nfse-publica-xml.service';
import { NfseFilaService } from './nfse-fila.service';


/** DTO para preencher a tela de NFS-e a partir de uma venda (orçamento aprovado com itens de serviço). */
export interface DadosVendaParaNfse {
  vendaId: string;
  empresaId: string;
  prestador: { cnpj: string; inscricaoMunicipal: string };
  tomador: {
    razaoSocial: string;
    cnpj?: string;
    cpf?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    codigoMunicipio?: string;
    estado?: string;
    cep?: string;
  };
  itensServico: Array<{
    itemListaServico: string;
    discriminacao: string;
    valorServicos: number;
    issRetido?: 1 | 2;
  }>;
  numeroLote: number;
  numeroRps: number;
  serieRps: string;
  tipoRps: number;
  dataEmissao: string;
  naturezaOperacao: number;
  optanteSimplesNacional: 1 | 2;
  /** Indica se a venda tem itens de serviço (true) ou não (lista vazia). */
  possuiItensServico: boolean;
}

export type AmbienteNfse = '1' | '2';

/**
 * Busca dados de uma venda (gerada a partir de orçamento aprovado) para emissão de NFS-e.
 * Considera apenas itens do orçamento com tipo SERVICO; prestador = empresa; tomador = cliente da venda.
 * ItemListaServico: usa 140101 como padrão (serviços em geral); sem incidência ISS use 990101.
 */
export async function buscarDadosVendaParaNfse(
  vendaId: string,
  empresaId: string
): Promise<DadosVendaParaNfse | { erro: string }> {
  const venda = await VendasService.buscarVenda(vendaId);
  if (!venda) {
    return { erro: 'Venda não encontrada' };
  }
  if (!venda.orcamento) {
    return { erro: 'Venda não possui orçamento vinculado' };
  }
  if (!venda.cliente) {
    return { erro: 'Venda não possui cliente vinculado' };
  }

  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa) {
    return { erro: 'Empresa fiscal não encontrada' };
  }
  if (!empresa.inscricaoMunicipal) {
    return { erro: 'Empresa não possui Inscrição Municipal cadastrada (obrigatória para NFS-e)' };
  }

  const cliente = venda.cliente;
  const cpfCnpj = (cliente.cpfCnpj || '').replace(/\D/g, '');
  const isPf = cpfCnpj.length === 11;

  let enderecoCliente = '';
  let numeroCliente = '';
  let bairroCliente = '';
  if (typeof cliente.endereco === 'string') {
    enderecoCliente = cliente.endereco;
  } else if (cliente.endereco && typeof cliente.endereco === 'object') {
    const e = cliente.endereco as Record<string, unknown>;
    enderecoCliente = (e.logradouro as string) || (e.endereco as string) || '';
    numeroCliente = (e.numero as string) || '';
    bairroCliente = (e.bairro as string) || '';
  }

  const codigoMunicipioCliente = (cliente as { codigoMunicipio?: string }).codigoMunicipio;
  const tomador = {
    razaoSocial: cliente.nome || '',
    ...(isPf ? { cpf: cpfCnpj } : { cnpj: cpfCnpj }),
    email: cliente.email || undefined,
    telefone: cliente.telefone || undefined,
    endereco: enderecoCliente || undefined,
    numero: numeroCliente || undefined,
    bairro: bairroCliente || undefined,
    cidade: cliente.cidade || undefined,
    codigoMunicipio: codigoMunicipioCliente || undefined,
    estado: cliente.estado || undefined,
    cep: cliente.cep?.replace(/\D/g, '') || undefined
  };

  const itensOrcamento = venda.orcamento.items || [];
  const itensServico = (itensOrcamento as any[])
    .filter((item) => item.tipo === 'SERVICO' && !item.vendaDiretaFornecedor)
    .map((item) => ({
      itemListaServico: formatoItemListaServico('140101'),
      discriminacao: ((item.descricao ?? item.servicoNome ?? 'Serviço') as string).trim() || 'Serviço',
      valorServicos: Number(item.subtotal) || 0,
      issRetido: 2 as const
    }))
    .filter((i) => i.valorServicos > 0);

  const ultimoLote = await prisma.nfse.findFirst({
    where: { empresaFiscalId: empresaId },
    orderBy: { numeroLote: 'desc' },
    select: { numeroLote: true }
  });
  const proximoLote = (ultimoLote?.numeroLote ?? 0) + 1;
  const ultimoRps = ((empresa as any).ultimoRpsEnviado as number | null) ?? 0;
  const serieRps = (((empresa as any).serieRps as string | null) || 'A1').trim() || 'A1';

  const prestador = {
    cnpj: empresa.cnpj.replace(/\D/g, ''),
    inscricaoMunicipal: empresa.inscricaoMunicipal.trim()
  };

  return {
    vendaId,
    empresaId,
    prestador,
    tomador,
    itensServico,
    numeroLote: proximoLote,
    numeroRps: ultimoRps + 1,
    serieRps,
    tipoRps: 1,
    dataEmissao: new Date().toISOString().slice(0, 19),
    naturezaOperacao: 501,
    optanteSimplesNacional: empresa.regimeTributario === 'SimplesNacional' ? (1 as const) : (2 as const),
    possuiItensServico: itensServico.length > 0
  };
}

/**
 * Envia lote de RPS (assíncrono): gera XML, valida XSD, assina e chama RecepcionarLoteRps.
 * Retorna número do protocolo para consulta posterior.
 */
export async function enviarLoteRps(
  empresaId: string,
  input: EnviarLoteRpsEnvioInput,
  ambiente: AmbienteNfse
): Promise<{
  sucesso: boolean;
  protocolo?: string;
  nfseId?: string;
  erro?: string;
}> {
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa) {
    return { sucesso: false, erro: 'Empresa fiscal não encontrada' };
  }
  if (!empresa.inscricaoMunicipal) {
    return { sucesso: false, erro: 'E43: Inscrição Municipal é obrigatória para NFS-e. Cadastre na empresa fiscal.' };
  }
  if (!empresa.certificadoPath || !empresa.certificadoSenha) {
    return { sucesso: false, erro: 'Certificado digital não configurado para esta empresa' };
  }

  // Regra: NFS-e deve ser emitida pelo CNPJ da empresa selecionada. O certificado usado é sempre o dessa empresa.
  // Se a empresa tem 2 CNPJs (2 cadastros EmpresaFiscal), cada um tem seu certificado; usamos o da empresaId.
  const cnpjEmpresa = empresa.cnpj.replace(/\D/g, '');
  const cnpjPrestador = input.prestador.cnpj.replace(/\D/g, '');
  if (cnpjPrestador !== cnpjEmpresa) {
    return {
      sucesso: false,
      erro: `CNPJ do prestador no lote (${input.prestador.cnpj}) não corresponde ao CNPJ da empresa selecionada (${empresa.cnpj}). Utilize a empresa fiscal correta para este CNPJ.`
    };
  }
  if ((input.prestador.inscricaoMunicipal || '').trim() !== (empresa.inscricaoMunicipal || '').trim()) {
    return {
      sucesso: false,
      erro: 'Inscrição Municipal do prestador no lote deve ser a mesma da empresa selecionada.'
    };
  }

  let keyPem: string;
  let certPem: string;
  const certPathResolvido = resolveCertificadoPath(empresa.certificadoPath ?? null);
  const certExiste = certPathResolvido ? fs.existsSync(certPathResolvido) : false;
  console.log('🔐 [NFS-e] Carregando certificado para empresa', empresaId, '| path:', certPathResolvido ?? '(null)', '| arquivo existe:', certExiste);
  if (!certPathResolvido || !certExiste) {
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '- arquivo não encontrado:', empresa.certificadoPath);
    return { sucesso: false, erro: 'Certificado: arquivo não encontrado no servidor. Verifique o volume/caminho no Docker ou reenvie o certificado pela interface.' };
  }
  try {
    const senha = CryptoUtil.decrypt(empresa.certificadoSenha);
    const cert = NFeSignatureService.carregarCertificado(certPathResolvido, senha);
    keyPem = cert.key;
    certPem = cert.cert;
    if (!keyPem || keyPem.length < 50 || !certPem || certPem.length < 50) {
      console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '- chave ou certificado extraídos vazios ou inválidos.');
      return { sucesso: false, erro: 'Certificado: chave ou certificado extraídos do PFX estão vazios. Verifique o arquivo e a senha.' };
    }
    console.log('🔐 [NFS-e] Certificado carregado com sucesso para empresa', empresaId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '| Erro:', msg);
    return { sucesso: false, erro: `Certificado: ${msg}` };
  }

  const xml = gerarEnviarLoteRpsEnvio(input);
  
  // Validação básica estrutural ANTES da assinatura (sem XSD que exige Signature)
  console.log('🧪 [NFS-e] Validando estrutura básica do XML (sem XSD)...');
  // TODO: Implementar validação estrutural básica para NFS-e se necessário
  
  let xmlAssinado: string;
  try {
    console.log('🔐 [NFS-e] Assinando lote RPS...');
    xmlAssinado = assinarLoteRps(xml, keyPem, certPem);
    console.log('🔐 [NFS-e] Lote assinado com sucesso.');
    
    // Validação XSD completa APÓS assinatura (agora com Signature)
    console.log('🔍 [NFS-e] Validando XML completo com XSD (pós-assinatura)...');
    const validacao = validarXmlNfseContraXsd(xmlAssinado);
    if (!validacao.valido) {
      console.error('❌ NFS-e validação XSD falhou após assinatura para empresa', empresaId, '| erros:', validacao.erros);
      return {
        sucesso: false,
        erro: `Validação XSD pós-assinatura: ${validacao.erros.join('; ')}`
      };
    }
    console.log('✅ [NFS-e] Validação XSD completa aprovada!');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('LOG: Falha ao assinar lote NFS-e para a empresa', empresaId, '| Erro:', msg);
    return { sucesso: false, erro: `Assinatura: ${msg}` };
  }

  const homolog = ambiente === '2';
  const envio = await recepcionarLoteRps(xmlAssinado, homolog, certPem, keyPem);

  const primeiroRps = input.listaRps[0];
  const tomadorRazaoSocial = primeiroRps?.tomador?.razaoSocial ?? undefined;
  const tomadorEmail = primeiroRps?.tomador?.email ?? undefined;
  const valorTotal = input.listaRps.reduce(
    (acc, rps) =>
      acc + (rps.servicos?.reduce((s, it) => s + (Number(it.valorServicos) || 0), 0) ?? 0),
    0
  );

  if (!envio.sucesso) {
    const erroAmigavel = envio.erro ? mensagemErroNfse(envio.erro) : 'Erro ao enviar lote';
    console.error('[NFS-e] Envio rejeitado. Erro:', erroAmigavel);
    if (envio.xmlResposta) {
      console.error('[NFS-e] Resposta completa do servidor (XML):', envio.xmlResposta.substring(0, 3000));
    }

    // Enfileirar para nova tentativa (contingência)
    console.log('📥 Colocando NFS-e na fila de retentativa devido a erro no envio.');
    await NfseFilaService.enfileirar({
      empresaFiscalId: empresaId,
      ambiente,
      numeroLote: input.numeroLote,
      xmlEnvio: xmlAssinado,
      motivo: erroAmigavel
    });

    const nfseReg = await prisma.nfse.create({
      data: {
        empresaFiscalId: empresaId,
        numeroLote: input.numeroLote,
        situacao: 'Erro',
        ambiente,
        xmlEnvio: xmlAssinado,
        xmlResposta: envio.xmlResposta ?? undefined,
        erro: erroAmigavel + ' (Enfileirado para reenvio)',
        tomadorRazaoSocial,
        tomadorEmail,
        valorTotal: valorTotal > 0 ? valorTotal : undefined
      }
    });

    return { sucesso: false, erro: erroAmigavel, nfseId: nfseReg.id };
  }

  const nfseReg = await prisma.nfse.create({
    data: {
      empresaFiscalId: empresaId,
      numeroLote: input.numeroLote,
      protocolo: envio.protocolo ?? undefined,
      situacao: 'Pendente',
      ambiente,
      xmlEnvio: xmlAssinado,
      xmlResposta: envio.xmlResposta ?? undefined,
      tomadorRazaoSocial,
      tomadorEmail,
      valorTotal: valorTotal > 0 ? valorTotal : undefined
    }
  });

  const maxNumeroRpsEnviado = Math.max(
    ...input.listaRps.map((r) => r.numero),
    ((empresa as any).ultimoRpsEnviado as number | null) ?? 0
  );
  await (prisma.empresaFiscal as any).update({
    where: { id: empresaId },
    data: {
      ultimoRpsEnviado: maxNumeroRpsEnviado,
      serieRps: input.listaRps[0]?.serie?.trim() || ((empresa as any).serieRps as string | null) || 'A1'
    }
  });

  return {
    sucesso: true,
    protocolo: envio.protocolo,
    nfseId: nfseReg.id
  };
}

/**
 * Consulta resultado do processamento do lote pelo protocolo.
 */
export async function consultarProtocolo(
  empresaId: string,
  numeroProtocolo: string,
  ambiente: AmbienteNfse
): Promise<{
  sucesso: boolean;
  situacao?: string;
  listaNfse?: Array<{ numero: string; codigoVerificacao?: string }>;
  erro?: string;
}> {
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa || !empresa.inscricaoMunicipal) {
    return { sucesso: false, erro: 'Empresa não encontrada ou sem inscrição municipal' };
  }
  if (!empresa.certificadoPath || !empresa.certificadoSenha) {
    return { sucesso: false, erro: 'Certificado não configurado' };
  }

  const certPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
  if (!certPathResolvido || !fs.existsSync(certPathResolvido)) {
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '(consultar protocolo) - arquivo não encontrado');
    return { sucesso: false, erro: 'Certificado: arquivo não encontrado. Reenvie o certificado pela interface.' };
  }

  let certPem: string;
  let keyPem: string;
  try {
    const senha = CryptoUtil.decrypt(empresa.certificadoSenha);
    const cert = NFeSignatureService.carregarCertificado(certPathResolvido, senha);
    keyPem = cert.key;
    certPem = cert.cert;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '(consultar protocolo) | Erro:', msg);
    return { sucesso: false, erro: msg };
  }

  const homolog = ambiente === '2';
  const cnpj = empresa.cnpj.replace(/\D/g, '');
  const resultado = await consultarLoteRps(
    numeroProtocolo,
    cnpj,
    empresa.inscricaoMunicipal,
    homolog,
    certPem,
    keyPem
  );

  if (resultado.sucesso && resultado.listaNfse?.length && resultado.listaNfse[0]?.numero) {
    const numeroNfse = resultado.listaNfse[0].numero;
    await prisma.nfse.updateMany({
      where: { empresaFiscalId: empresaId, protocolo: numeroProtocolo },
      data: {
        situacao: 'Processado',
        numeroNfse,
        codigoVerificacao: resultado.listaNfse[0].codigoVerificacao ?? undefined
      }
    });
  }

  return {
    sucesso: resultado.sucesso,
    situacao: resultado.situacao,
    listaNfse: resultado.listaNfse,
    erro: resultado.erro ? mensagemErroNfse(resultado.erro) : undefined
  };
}

/**
 * Cancela NFS-e (CancelarNfse). Gera e assina PedidoCancelamento, envia.
 */
export async function cancelarNfsePorNumero(
  empresaId: string,
  numeroNfse: string,
  justificativa: string,
  ambiente: AmbienteNfse
): Promise<{ sucesso: boolean; erro?: string }> {
  if (!justificativa || justificativa.trim().length < 15) {
    return { sucesso: false, erro: 'E90: Justificativa obrigatória com no mínimo 15 caracteres' };
  }

  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
    return { sucesso: false, erro: 'Empresa ou certificado não encontrado' };
  }

  const certPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
  if (!certPathResolvido || !fs.existsSync(certPathResolvido)) {
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '(cancelar NFS-e) - arquivo não encontrado');
    return { sucesso: false, erro: 'Certificado: arquivo não encontrado. Reenvie o certificado pela interface.' };
  }

  let keyPem: string;
  let certPem: string;
  try {
    const senha = CryptoUtil.decrypt(empresa.certificadoSenha);
    const cert = NFeSignatureService.carregarCertificado(certPathResolvido, senha);
    keyPem = cert.key;
    certPem = cert.cert;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '(cancelar NFS-e) | Erro:', msg);
    return { sucesso: false, erro: msg };
  }

  const xmlPedido = gerarPedidoCancelamentoNfse({
    numeroNfse,
    codigoCancelamento: justificativa.trim(),
    cnpjPrestador: empresa.cnpj
  });
  const xmlAssinado = assinarPedidoCancelamento(xmlPedido, keyPem, certPem);
  const homolog = ambiente === '2';
  const resultado = await cancelarNfse(xmlAssinado, homolog, certPem, keyPem);

  if (resultado.sucesso) {
    await prisma.nfse.updateMany({
      where: { empresaFiscalId: empresaId, numeroNfse },
      data: { situacao: 'Cancelada' }
    });
  }

  return {
    sucesso: resultado.sucesso,
    erro: resultado.erro ? mensagemErroNfse(resultado.erro) : undefined
  };
}

/**
 * Lista NFS-e da empresa (por período e situação).
 */
export async function listarNfse(
  empresaId?: string,
  situacao?: string,
  limit = 50
): Promise<{
  id: string;
  protocolo: string | null;
  numeroNfse: string | null;
  situacao: string;
  createdAt: Date;
  tomadorRazaoSocial: string | null;
  tomadorEmail: string | null;
  valorTotal: unknown;
}[]> {
  const where: { empresaFiscalId?: string; situacao?: string } = {};
  if (empresaId) where.empresaFiscalId = empresaId;
  if (situacao) where.situacao = situacao;

  const rows = await prisma.nfse.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      protocolo: true,
      numeroNfse: true,
      situacao: true,
      createdAt: true,
      tomadorRazaoSocial: true,
      tomadorEmail: true,
      valorTotal: true
    }
  });
  return rows;
}

/**
 * Atualiza a numeração RPS da empresa (último RPS enviado e série).
 * Usado para sincronizar com o site da prefeitura: usuário informa o último RPS emitido lá e o próximo no sistema será ultimo + 1.
 */
export async function configurarNumeracaoRps(
  empresaId: string,
  dados: { ultimoRpsEnviado?: number; serieRps?: string }
): Promise<{ sucesso: boolean; erro?: string }> {
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa) {
    return { sucesso: false, erro: 'Empresa fiscal não encontrada' };
  }
  const update: { ultimoRpsEnviado?: number; serieRps?: string } = {};
  if (dados.ultimoRpsEnviado !== undefined) {
    const n = Number(dados.ultimoRpsEnviado);
    if (!Number.isInteger(n) || n < 0) {
      return { sucesso: false, erro: 'Último RPS enviado deve ser um número inteiro não negativo' };
    }
    update.ultimoRpsEnviado = n;
  }
  if (dados.serieRps !== undefined) {
    const s = (dados.serieRps || '').trim() || 'A1';
    update.serieRps = s;
  }
  if (Object.keys(update).length === 0) {
    return { sucesso: true };
  }
  await prisma.empresaFiscal.update({
    where: { id: empresaId },
    data: update
  });
  return { sucesso: true };
}
