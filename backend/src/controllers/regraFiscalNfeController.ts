import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { carregarRegrasFiscais, type RegimeNfe } from '../services/nfe-regra-fiscal.service';

type DadosRegra = {
  empresaFiscalId: string | null;
  regime: RegimeNfe;
  cfop: string | null;
  ncm: string | null;
  origem: string;
  cstIcms: string;
  aliquotaIcms: number;
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
  cstIpi: string;
  aliquotaIpi: number;
  informarTotTrib: boolean;
};

function somenteDigitos(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '');
}

function codigoFiscal(valor: unknown, nome: string, maximo: number): string | { erro: string } {
  const texto = String(valor ?? '').trim();
  if (!/^\d+$/.test(texto) || texto.length < 1 || texto.length > maximo) {
    return { erro: `${nome} deve ter de 1 a ${maximo} dígitos` };
  }
  return texto;
}

function aliquota(valor: unknown, nome: string): number | { erro: string } {
  if (valor === undefined || valor === null || valor === '') {
    return { erro: `${nome} é obrigatória` };
  }
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
    return { erro: `${nome} deve ser um percentual entre 0 e 100` };
  }
  return Math.round(numero * 10000) / 10000;
}

function lerDados(body: Record<string, unknown>): DadosRegra | { erro: string } {
  const regimeBruto = body.regime;
  if (regimeBruto !== 'SimplesNacional' && regimeBruto !== 'RegimeNormal') {
    return { erro: 'Regime deve ser Simples Nacional ou Regime Normal' };
  }

  const cfopDigitos = somenteDigitos(body.cfop);
  if (cfopDigitos && cfopDigitos.length !== 4) {
    return { erro: 'CFOP deve ter 4 dígitos' };
  }

  const ncmDigitos = somenteDigitos(body.ncm);
  if (ncmDigitos && (ncmDigitos.length < 2 || ncmDigitos.length > 8)) {
    return { erro: 'NCM deve ter de 2 a 8 dígitos' };
  }

  const origem = codigoFiscal(body.origem ?? '0', 'Origem', 1);
  if (typeof origem !== 'string') return origem;

  const cstIcms = codigoFiscal(body.cstIcms, 'CST/CSOSN do ICMS', 3);
  if (typeof cstIcms !== 'string') return cstIcms;

  const cstPis = codigoFiscal(body.cstPis, 'CST do PIS', 3);
  if (typeof cstPis !== 'string') return cstPis;

  const cstCofins = codigoFiscal(body.cstCofins, 'CST do COFINS', 3);
  if (typeof cstCofins !== 'string') return cstCofins;

  const cstIpi = codigoFiscal(body.cstIpi ?? '99', 'CST do IPI', 3);
  if (typeof cstIpi !== 'string') return cstIpi;

  const aliquotaIcms = aliquota(body.aliquotaIcms ?? 0, 'Alíquota de ICMS');
  if (typeof aliquotaIcms !== 'number') return aliquotaIcms;

  const aliquotaPis = aliquota(body.aliquotaPis ?? 0, 'Alíquota de PIS');
  if (typeof aliquotaPis !== 'number') return aliquotaPis;

  const aliquotaCofins = aliquota(body.aliquotaCofins ?? 0, 'Alíquota de COFINS');
  if (typeof aliquotaCofins !== 'number') return aliquotaCofins;

  const aliquotaIpi = aliquota(body.aliquotaIpi ?? 0, 'Alíquota de IPI');
  if (typeof aliquotaIpi !== 'number') return aliquotaIpi;

  const regime = (regimeBruto === 'SimplesNacional' ? 'SimplesNacional' : 'RegimeNormal') as RegimeNfe;

  return {
    empresaFiscalId: body.empresaFiscalId ? String(body.empresaFiscalId) : null,
    regime,
    cfop: cfopDigitos || null,
    ncm: ncmDigitos || null,
    origem,
    cstIcms,
    aliquotaIcms,
    cstPis,
    aliquotaPis,
    cstCofins,
    aliquotaCofins,
    cstIpi,
    aliquotaIpi,
    informarTotTrib: Boolean(body.informarTotTrib),
  };
}

async function sincronizarCache(): Promise<void> {
  try {
    await carregarRegrasFiscais();
  } catch (error) {
    console.error('Erro ao recarregar cache de regras fiscais:', error);
  }
}

async function existeDuplicada(dados: DadosRegra, ignorarId?: string): Promise<boolean> {
  const existente = await prisma.regraFiscalNfe.findFirst({
    where: {
      ativo: true,
      regime: dados.regime,
      empresaFiscalId: dados.empresaFiscalId,
      cfop: dados.cfop,
      ncm: dados.ncm,
      ...(ignorarId ? { NOT: { id: ignorarId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existente);
}

export const listarRegrasFiscais = async (req: Request, res: Response): Promise<void> => {
  try {
    const incluirInativas = req.query.incluirInativas === 'true' || req.query.incluirInativas === '1';
    const empresaFiscalId = typeof req.query.empresaFiscalId === 'string' ? req.query.empresaFiscalId : undefined;
    const regime = typeof req.query.regime === 'string' ? req.query.regime : undefined;

    const regras = await prisma.regraFiscalNfe.findMany({
      where: {
        ...(incluirInativas ? {} : { ativo: true }),
        ...(empresaFiscalId ? { empresaFiscalId } : {}),
        ...(regime ? { regime } : {}),
      },
      orderBy: [{ regime: 'asc' }, { cfop: 'asc' }, { ncm: 'asc' }],
    });

    res.json(regras);
  } catch (error) {
    console.error('Erro ao listar regras fiscais:', error);
    res.status(500).json({ error: 'Erro ao listar regras fiscais' });
  }
};

export const criarRegraFiscal = async (req: Request, res: Response): Promise<void> => {
  try {
    const dados = lerDados((req.body ?? {}) as Record<string, unknown>);
    if ('erro' in dados) {
      res.status(400).json({ error: dados.erro });
      return;
    }

    if (dados.empresaFiscalId) {
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: dados.empresaFiscalId },
        select: { id: true },
      });
      if (!empresa) {
        res.status(400).json({ error: 'Empresa fiscal não encontrada' });
        return;
      }
    }

    if (await existeDuplicada(dados)) {
      res.status(409).json({ error: 'Já existe uma regra ativa com o mesmo regime, CFOP, NCM e empresa' });
      return;
    }

    const regra = await prisma.regraFiscalNfe.create({ data: { ...dados, ativo: true } });
    await sincronizarCache();
    res.status(201).json(regra);
  } catch (error) {
    console.error('Erro ao criar regra fiscal:', error);
    res.status(500).json({ error: 'Erro ao criar regra fiscal' });
  }
};

export const atualizarRegraFiscal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const atual = await prisma.regraFiscalNfe.findUnique({ where: { id } });
    if (!atual) {
      res.status(404).json({ error: 'Regra fiscal não encontrada' });
      return;
    }

    const dados = lerDados((req.body ?? {}) as Record<string, unknown>);
    if ('erro' in dados) {
      res.status(400).json({ error: dados.erro });
      return;
    }

    if (dados.empresaFiscalId) {
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: dados.empresaFiscalId },
        select: { id: true },
      });
      if (!empresa) {
        res.status(400).json({ error: 'Empresa fiscal não encontrada' });
        return;
      }
    }

    if (await existeDuplicada(dados, id)) {
      res.status(409).json({ error: 'Já existe uma regra ativa com o mesmo regime, CFOP, NCM e empresa' });
      return;
    }

    const regra = await prisma.regraFiscalNfe.update({
      where: { id },
      data: dados,
    });
    await sincronizarCache();
    res.json(regra);
  } catch (error) {
    console.error('Erro ao atualizar regra fiscal:', error);
    res.status(500).json({ error: 'Erro ao atualizar regra fiscal' });
  }
};

export const desativarRegraFiscal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const atual = await prisma.regraFiscalNfe.findUnique({ where: { id }, select: { id: true } });
    if (!atual) {
      res.status(404).json({ error: 'Regra fiscal não encontrada' });
      return;
    }

    const regra = await prisma.regraFiscalNfe.update({
      where: { id },
      data: { ativo: false },
    });
    await sincronizarCache();
    res.json(regra);
  } catch (error) {
    console.error('Erro ao desativar regra fiscal:', error);
    res.status(500).json({ error: 'Erro ao desativar regra fiscal' });
  }
};
