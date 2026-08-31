import { prisma } from '../lib/prisma';
import {
  normalizarRubricasFolhaContabil,
  PERCENTUAIS_HE_FOLHA_CONTABIL,
  RUBRICAS_FOLHA_CONTABIL_DEFAULT,
  type PercentualHeFolhaContabil,
  type RubricasFolhaContabil,
} from '../utils/folhaContabilidade.util';

const CONFIG_ID = 'sistema-config';

export type FolhaContabilidadeConfigDto = {
  codigoEmpresaContabil: string | null;
  empresaFiscalIdFolha: string | null;
  percentualHeFolhaContabil: PercentualHeFolhaContabil;
  rubricasFolhaContabil: RubricasFolhaContabil;
  empresaFiscal: {
    id: string;
    razaoSocial: string;
    cnpj: string;
  } | null;
};

export type FolhaContabilidadeConfigInput = {
  codigoEmpresaContabil?: string | null;
  empresaFiscalIdFolha?: string | null;
  percentualHeFolhaContabil?: number;
  rubricasFolhaContabil?: Partial<RubricasFolhaContabil>;
};

function normalizarPercentualHe(v: unknown): PercentualHeFolhaContabil {
  const n = Number(v);
  if (PERCENTUAIS_HE_FOLHA_CONTABIL.includes(n as PercentualHeFolhaContabil)) {
    return n as PercentualHeFolhaContabil;
  }
  return 70;
}

async function ensureConfigRow() {
  return prisma.configuracaoSistema.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID },
    update: {},
  });
}

export async function obterConfigExportacaoFolhaContabil(): Promise<FolhaContabilidadeConfigDto> {
  await ensureConfigRow();
  const row = await prisma.configuracaoSistema.findUnique({
    where: { id: CONFIG_ID },
    include: {
      empresaFiscalFolha: {
        select: { id: true, razaoSocial: true, cnpj: true },
      },
    },
  });

  return {
    codigoEmpresaContabil: row?.codigoEmpresaContabil ?? null,
    empresaFiscalIdFolha: row?.empresaFiscalIdFolha ?? null,
    percentualHeFolhaContabil: normalizarPercentualHe(row?.percentualHeFolhaContabil),
    rubricasFolhaContabil: normalizarRubricasFolhaContabil(row?.rubricasFolhaContabil),
    empresaFiscal: row?.empresaFiscalFolha ?? null,
  };
}

export async function salvarConfigExportacaoFolhaContabil(
  input: FolhaContabilidadeConfigInput,
): Promise<FolhaContabilidadeConfigDto> {
  await ensureConfigRow();

  const prev = await obterConfigExportacaoFolhaContabil();
  const rubricasMerged = normalizarRubricasFolhaContabil({
    ...prev.rubricasFolhaContabil,
    ...(input.rubricasFolhaContabil ?? {}),
  });

  if (input.empresaFiscalIdFolha) {
    const ef = await prisma.empresaFiscal.findUnique({
      where: { id: input.empresaFiscalIdFolha },
      select: { id: true },
    });
    if (!ef) {
      throw new Error('Empresa fiscal não encontrada');
    }
  }

  await prisma.configuracaoSistema.update({
    where: { id: CONFIG_ID },
    data: {
      ...(input.codigoEmpresaContabil !== undefined && {
        codigoEmpresaContabil:
          input.codigoEmpresaContabil != null && String(input.codigoEmpresaContabil).trim() !== ''
            ? String(input.codigoEmpresaContabil).trim()
            : null,
      }),
      ...(input.empresaFiscalIdFolha !== undefined && {
        empresaFiscalIdFolha: input.empresaFiscalIdFolha || null,
      }),
      ...(input.percentualHeFolhaContabil !== undefined && {
        percentualHeFolhaContabil: normalizarPercentualHe(input.percentualHeFolhaContabil),
      }),
      rubricasFolhaContabil: rubricasMerged as object,
    },
  });

  return obterConfigExportacaoFolhaContabil();
}

export async function resolverEmpresaFiscalExportacao(config: FolhaContabilidadeConfigDto) {
  if (config.empresaFiscal) return config.empresaFiscal;

  const fallback = await prisma.empresaFiscal.findFirst({
    where: { ativo: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, razaoSocial: true, cnpj: true },
  });

  if (!fallback) {
    throw new Error(
      'Configure uma empresa fiscal para exportação (RH → configuração contábil) ou cadastre Empresa Fiscal.',
    );
  }
  return fallback;
}

export function rubricasDefault(): RubricasFolhaContabil {
  return { ...RUBRICAS_FOLHA_CONTABIL_DEFAULT };
}

export async function listarEmpresasFiscaisAtivas() {
  return prisma.empresaFiscal.findMany({
    where: { ativo: true },
    orderBy: { razaoSocial: 'asc' },
    select: { id: true, razaoSocial: true, cnpj: true, nomeFantasia: true },
  });
}
