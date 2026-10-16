/**
 * Orquestração da NFS-e de Itajaí/SC no Sistema Nacional (DPS, leiaute v1.01).
 *
 * Canal ativo desde 01/07/2026: API REST da Sefin Nacional (mTLS + XML da DPS em GZip).
 * A prefeitura deixou de receber emissão nova pelo SOAP da Pública. O código Pública
 * permanece em nfse-publica-*.service.ts só como referência; este serviço não o chama.
 *
 * Fluxo: montar DPS -> assinar infDPS (XMLDSIG RSA-SHA256) -> POST /nfse.
 * Consulta: GET /dps/{id} ou GET /nfse/{chave}. Cancelamento: evento 101101.
 */

import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeSignatureService } from './nfe-signature.service';
import { type EnviarLoteRpsEnvioInput } from './nfse-publica-xml.service';
import { VendasService } from './vendas.service';
import { NfseFilaService } from './nfse-fila.service';
import {
  CODIGO_MUNICIPIO_ITAJAI,
  codigoTributacaoNacional,
  gerarXmlDps,
  gerarXmlPedidoCancelamento,
  serieDpsDaEmpresa,
  serieDpsNumerica
} from './nfse-nacional-xml.service';
import { assinarXmlNfseNacional } from './nfse-nacional-signature.service';
import {
  consultarDpsOuChave,
  enviarDpsAssinada,
  registrarEventoNfse
} from './nfse-nacional-api.service';
import { extrairCodigoMunicipioInformado } from '../utils/nfe-emissao.util';


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

  const codigoMunicipioCliente =
    (cliente as { codigoMunicipio?: string }).codigoMunicipio ||
    extrairCodigoMunicipioInformado(cliente);
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
  // Só serviço avulso vira NFS-e. Serviço dentro do kit é custo do produto e não entra aqui.
  const itensServico = (itensOrcamento as any[])
    .filter((item) => item.tipo === 'SERVICO' && !item.vendaDiretaFornecedor)
    .map((item) => ({
      itemListaServico: codigoTributacaoNacional('140101'),
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
  // Série da DPS é numérica. "A1" (Pública) não entra no identificador nacional.
  const serieRps = serieDpsDaEmpresa((empresa as any).serieRps as string | null);

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

async function carregarCertificadoEmpresa(
  empresaId: string,
  empresa: { certificadoPath: string | null; certificadoSenha: string | null }
): Promise<{ keyPem: string; certPem: string } | { erro: string }> {
  if (!empresa.certificadoPath || !empresa.certificadoSenha) {
    return { erro: 'Certificado digital não configurado para esta empresa' };
  }
  const certPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
  if (!certPathResolvido || !fs.existsSync(certPathResolvido)) {
    return {
      erro: 'Certificado: arquivo não encontrado no servidor. Verifique o volume/caminho no Docker ou reenvie o certificado pela interface.'
    };
  }
  try {
    const senha = CryptoUtil.decrypt(empresa.certificadoSenha);
    const cert = NFeSignatureService.carregarCertificado(certPathResolvido, senha);
    if (!cert.key || cert.key.length < 50 || !cert.cert || cert.cert.length < 50) {
      return { erro: 'Certificado: chave ou certificado extraídos do PFX estão vazios. Verifique o arquivo e a senha.' };
    }
    return { keyPem: cert.key, certPem: cert.cert };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('LOG: Falha ao carregar certificado para a empresa', empresaId, '| Erro:', msg);
    return { erro: `Certificado: ${msg}` };
  }
}

/**
 * Emite NFS-e nacional (síncrona) a partir dos dados que a tela ainda chama de lote/RPS.
 * O número da DPS é o número do RPS informado. O retorno traz a chave de acesso.
 */
export async function enviarLoteRps(
  empresaId: string,
  input: EnviarLoteRpsEnvioInput,
  ambiente: AmbienteNfse
): Promise<{
  sucesso: boolean;
  protocolo?: string;
  chaveAcesso?: string;
  numeroNfse?: string;
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

  const cnpjEmpresa = empresa.cnpj.replace(/\D/g, '');
  const cnpjPrestador = input.prestador.cnpj.replace(/\D/g, '');
  if (cnpjPrestador !== cnpjEmpresa) {
    return {
      sucesso: false,
      erro: `CNPJ do prestador (${input.prestador.cnpj}) não corresponde ao CNPJ da empresa selecionada (${empresa.cnpj}). Utilize a empresa fiscal correta para este CNPJ.`
    };
  }
  if ((input.prestador.inscricaoMunicipal || '').trim() !== (empresa.inscricaoMunicipal || '').trim()) {
    return {
      sucesso: false,
      erro: 'Inscrição Municipal do prestador deve ser a mesma da empresa selecionada.'
    };
  }

  const cert = await carregarCertificadoEmpresa(empresaId, empresa);
  if ('erro' in cert) return { sucesso: false, erro: cert.erro };

  const rps = input.listaRps[0];
  if (!rps) return { sucesso: false, erro: 'Informe o serviço a emitir.' };
  if (input.listaRps.length > 1) {
    return {
      sucesso: false,
      erro: 'A NFS-e nacional emite uma DPS por vez. Envie um único conjunto de serviços da venda.'
    };
  }
  const nDps = Number.isInteger(rps.numero) && rps.numero > 0 ? rps.numero : input.numeroLote;

  let xmlAssinado: string;
  let idApi: string;
  let valorTotal: number;
  try {
    const regAp = (process.env.NFSE_NACIONAL_REG_AP_TRIB_SN || '1').trim();
    const gerada = gerarXmlDps({
      ambiente,
      dataEmissao: rps.dataEmissao instanceof Date ? rps.dataEmissao : new Date(rps.dataEmissao),
      serie: rps.serie,
      nDps,
      cLocEmi: CODIGO_MUNICIPIO_ITAJAI,
      naturezaOperacao: rps.naturezaOperacao,
      prestador: {
        cnpj: cnpjEmpresa,
        inscricaoMunicipal: empresa.inscricaoMunicipal,
        razaoSocial: empresa.razaoSocial,
        telefone: empresa.telefone || undefined,
        email: empresa.email || undefined,
        logradouro: empresa.endereco,
        numero: empresa.numero,
        complemento: empresa.complemento || undefined,
        bairro: empresa.bairro,
        codigoMunicipio: CODIGO_MUNICIPIO_ITAJAI,
        cep: empresa.cep,
        optanteSimplesNacional: rps.optanteSimplesNacional,
        regimeTributario: empresa.regimeTributario,
        regApTribSN: regAp === '2' || regAp === '3' ? regAp : '1'
      },
      tomador: rps.tomador,
      servicos: rps.servicos
    });
    idApi = gerada.idApi;
    valorTotal = gerada.valorTotal;
    xmlAssinado = assinarXmlNfseNacional(gerada.xml, cert.keyPem, cert.certPem, 'infDPS');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sucesso: false, erro: msg };
  }

  const envio = await enviarDpsAssinada(xmlAssinado, ambiente, cert.certPem, cert.keyPem);
  const tomadorRazaoSocial = rps.tomador?.razaoSocial || undefined;
  const tomadorEmail = rps.tomador?.email || undefined;

  if (!envio.sucesso) {
    const erroAmigavel = envio.erro || 'A Sefin Nacional recusou a DPS.';
    if (envio.reenviar) {
      await NfseFilaService.enfileirar({
        empresaFiscalId: empresaId,
        ambiente,
        numeroLote: nDps,
        xmlEnvio: xmlAssinado,
        motivo: erroAmigavel
      });
    }
    const nfseReg = await prisma.nfse.create({
      data: {
        empresaFiscalId: empresaId,
        numeroLote: nDps,
        protocolo: idApi,
        situacao: 'Erro',
        ambiente,
        xmlEnvio: xmlAssinado,
        xmlResposta: envio.xmlRetorno,
        erro: envio.reenviar ? `${erroAmigavel} (Enfileirado para reenvio)` : erroAmigavel,
        tomadorRazaoSocial,
        tomadorEmail,
        valorTotal: valorTotal > 0 ? valorTotal : undefined
      }
    });
    return { sucesso: false, erro: erroAmigavel, nfseId: nfseReg.id, protocolo: idApi };
  }

  const nfseReg = await prisma.nfse.create({
    data: {
      empresaFiscalId: empresaId,
      numeroLote: nDps,
      protocolo: envio.idDps || idApi,
      chaveAcesso: envio.chaveAcesso,
      numeroNfse: envio.numeroNfse,
      situacao: 'Processado',
      ambiente,
      xmlEnvio: xmlAssinado,
      xmlResposta: envio.xmlRetorno,
      tomadorRazaoSocial,
      tomadorEmail,
      valorTotal: valorTotal > 0 ? valorTotal : undefined
    }
  });

  let serieSalva = serieDpsDaEmpresa(rps.serie);
  try {
    serieSalva = serieDpsNumerica(rps.serie);
  } catch {
    serieSalva = '1';
  }
  await prisma.empresaFiscal.update({
    where: { id: empresaId },
    data: {
      ultimoRpsEnviado: Math.max(nDps, empresa.ultimoRpsEnviado ?? 0),
      serieRps: serieSalva
    }
  });

  return {
    sucesso: true,
    protocolo: envio.idDps || idApi,
    chaveAcesso: envio.chaveAcesso,
    numeroNfse: envio.numeroNfse,
    nfseId: nfseReg.id
  };
}

/**
 * Consulta a NFS-e nacional pelo id da DPS (42 dígitos, gravado em protocolo) ou pela chave (50).
 */
export async function consultarProtocolo(
  empresaId: string,
  numeroProtocolo: string,
  ambiente: AmbienteNfse
): Promise<{
  sucesso: boolean;
  situacao?: string;
  listaNfse?: Array<{ numero: string; codigoVerificacao?: string; chaveAcesso?: string }>;
  erro?: string;
}> {
  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa || !empresa.inscricaoMunicipal) {
    return { sucesso: false, erro: 'Empresa não encontrada ou sem inscrição municipal' };
  }
  const cert = await carregarCertificadoEmpresa(empresaId, empresa);
  if ('erro' in cert) return { sucesso: false, erro: cert.erro };

  const resultado = await consultarDpsOuChave(numeroProtocolo, ambiente, cert.certPem, cert.keyPem);
  if (!resultado.sucesso) {
    return { sucesso: false, erro: resultado.erro };
  }

  const numero = resultado.numeroNfse;
  const identificador = numeroProtocolo.replace(/\D/g, '');
  if (numero || resultado.chaveAcesso) {
    await prisma.nfse.updateMany({
      where: {
        empresaFiscalId: empresaId,
        OR: [
          { protocolo: identificador },
          { chaveAcesso: resultado.chaveAcesso || identificador },
          ...(numero ? [{ numeroNfse: numero }] : [])
        ]
      },
      data: {
        situacao: 'Processado',
        numeroNfse: numero,
        chaveAcesso: resultado.chaveAcesso,
        protocolo: resultado.idDps || undefined,
        xmlResposta: resultado.xmlRetorno
      }
    });
  }

  return {
    sucesso: true,
    situacao: 'Processado',
    listaNfse: [
      {
        numero: numero || '',
        chaveAcesso: resultado.chaveAcesso,
        codigoVerificacao: resultado.chaveAcesso
      }
    ]
  };
}

/**
 * Cancela NFS-e nacional pelo evento 101101. O número informado pode ser o da nota ou a chave de 50 dígitos.
 */
export async function cancelarNfsePorNumero(
  empresaId: string,
  numeroNfse: string,
  justificativa: string,
  ambiente: AmbienteNfse
): Promise<{ sucesso: boolean; erro?: string }> {
  if (!justificativa || justificativa.trim().length < 15) {
    return { sucesso: false, erro: 'Justificativa obrigatória com no mínimo 15 caracteres' };
  }

  const empresa = await prisma.empresaFiscal.findUnique({
    where: { id: empresaId }
  });
  if (!empresa) return { sucesso: false, erro: 'Empresa ou certificado não encontrado' };
  const cert = await carregarCertificadoEmpresa(empresaId, empresa);
  if ('erro' in cert) return { sucesso: false, erro: cert.erro };

  const informado = numeroNfse.replace(/\D/g, '');
  let chave = informado.length === 50 ? informado : '';
  if (!chave) {
    const nota = await prisma.nfse.findFirst({
      where: { empresaFiscalId: empresaId, numeroNfse: numeroNfse.trim() },
      orderBy: { createdAt: 'desc' }
    });
    chave = nota?.chaveAcesso || '';
  }
  if (chave.length !== 50) {
    return {
      sucesso: false,
      erro: 'Esta NFS-e não tem chave de acesso do Sistema Nacional. Notas antigas da Pública precisam ser canceladas no portal municipal.'
    };
  }

  let xmlAssinado: string;
  try {
    const xmlPedido = gerarXmlPedidoCancelamento({
      chaveAcesso: chave,
      cnpjAutor: empresa.cnpj,
      justificativa: justificativa.trim(),
      ambiente
    });
    xmlAssinado = assinarXmlNfseNacional(xmlPedido, cert.keyPem, cert.certPem, 'infPedReg');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sucesso: false, erro: msg };
  }

  const resultado = await registrarEventoNfse(chave, xmlAssinado, ambiente, cert.certPem, cert.keyPem);
  if (resultado.sucesso) {
    await prisma.nfse.updateMany({
      where: { empresaFiscalId: empresaId, chaveAcesso: chave },
      data: { situacao: 'Cancelada', xmlResposta: resultado.xmlRetorno }
    });
  }

  return { sucesso: resultado.sucesso, erro: resultado.erro };
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
  chaveAcesso: string | null;
  numeroNfse: string | null;
  situacao: string;
  ambiente: string;
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
      chaveAcesso: true,
      numeroNfse: true,
      situacao: true,
      ambiente: true,
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
 * Usado para sincronizar a numeração da DPS: o próximo número emitido será ultimo + 1.
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
    const s = (dados.serieRps || '').trim();
    if (!/^[1-9][0-9]{0,4}$/.test(s)) {
      return {
        sucesso: false,
        erro: 'A série da DPS nacional é numérica, de 1 a 5 dígitos, sem zero à esquerda.'
      };
    }
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
