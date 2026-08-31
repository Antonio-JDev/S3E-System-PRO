import * as XLSX from 'xlsx';
import { TipoContratoFuncionario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { RhService } from './rh.service';
import {
  obterConfigExportacaoFolhaContabil,
  resolverEmpresaFiscalExportacao,
} from './folhaContabilidadeConfig.service';
import {
  competenciaParaSerialExcel,
  linhaTemDados,
  montarLinhaContabil,
  montarMatrizPlanilhaContabil,
  somarAjudaCustoBeneficios,
} from '../utils/folhaContabilidade.util';

export type ExportacaoFolhaContabilPreview = {
  ano: number;
  mes: number;
  totalColaboradores: number;
  colaboradoresComDados: number;
  avisos: string[];
  linhas: Array<{
    nome: string;
    matricula: number | string;
    heConfiguravel: number | '';
    he100: number | '';
    diasFaltas: number | '';
  }>;
};

function parseMesReferencia(mes: string): { ano: number; mes: number; dataReferencia: Date } {
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    throw new Error('Parâmetro mes inválido. Use YYYY-MM.');
  }
  const [anoStr, mesStr] = mes.split('-');
  const ano = parseInt(anoStr, 10);
  const mesNum = parseInt(mesStr, 10);
  if (!Number.isFinite(ano) || !Number.isFinite(mesNum) || mesNum < 1 || mesNum > 12) {
    throw new Error('Competência inválida');
  }
  const dataReferencia = new Date(Date.UTC(ano, mesNum - 1, 1, 12, 0, 0, 0));
  return { ano, mes: mesNum, dataReferencia };
}

async function mapComLimite<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const part = await Promise.all(chunk.map(fn));
    results.push(...part);
  }
  return results;
}

export async function gerarExportacaoFolhaContabil(mes: string): Promise<{
  buffer: Buffer;
  avisos: string[];
  preview: ExportacaoFolhaContabilPreview;
}> {
  const { ano, mes: mesNum, dataReferencia } = parseMesReferencia(mes);
  const config = await obterConfigExportacaoFolhaContabil();
  const empresa = await resolverEmpresaFiscalExportacao(config);

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      tipoContrato: TipoContratoFuncionario.REGISTRADO,
      status: 'Ativo',
    },
    include: {
      beneficios: { where: { ativo: true }, select: { nome: true, valorPadrao: true } },
      configuracaoPonto: { select: { inicioNoturno: true } },
    },
    orderBy: [{ codigoRelogio: 'asc' }, { nome: 'asc' }],
  });

  const avisos: string[] = [];
  const semMatricula = funcionarios.filter((f) => f.codigoRelogio == null);
  if (semMatricula.length > 0) {
    avisos.push(
      `${semMatricula.length} colaborador(es) CLT sem código do relógio (matrícula em branco na planilha): ${semMatricula.map((f) => f.nome).join(', ')}`,
    );
  }

  if (funcionarios.length === 0) {
    avisos.push('Nenhum colaborador REGISTRADO ativo encontrado.');
  }

  const linhasExport = await mapComLimite(funcionarios, 5, async (func) => {
    const folha = await RhService.calcularFolhaMes({
      funcionarioId: func.id,
      dataReferencia,
    });
    const ajudaBenef = somarAjudaCustoBeneficios(func.beneficios ?? []);
    return montarLinhaContabil(folha, {
      codigoRelogio: func.codigoRelogio,
      inicioNoturno: func.configuracaoPonto?.inicioNoturno ?? '18:00',
      ajudaCustoBeneficios: ajudaBenef,
    });
  });

  const linhasComDados = linhasExport.filter(linhaTemDados);
  const matriz = montarMatrizPlanilhaContabil(
    {
      codigoEmpresa: config.codigoEmpresaContabil ?? '329',
      razaoSocial: empresa.razaoSocial,
      cnpj: empresa.cnpj,
      competenciaSerial: competenciaParaSerialExcel(ano, mesNum),
      percentualHe: config.percentualHeFolhaContabil,
      rubricas: config.rubricasFolhaContabil,
    },
    linhasComDados.length > 0 ? linhasComDados : linhasExport,
  );

  const ws = XLSX.utils.aoa_to_sheet(matriz);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PLANILHA');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xls' }) as Buffer;

  const preview: ExportacaoFolhaContabilPreview = {
    ano,
    mes: mesNum,
    totalColaboradores: funcionarios.length,
    colaboradoresComDados: linhasComDados.length,
    avisos,
    linhas: linhasExport.slice(0, 50).map((l) => ({
      nome: l.nome,
      matricula: l.matricula,
      heConfiguravel: l.heConfiguravel,
      he100: l.he100,
      diasFaltas: l.diasFaltas,
    })),
  };

  return { buffer, avisos, preview };
}

export async function previewExportacaoFolhaContabil(mes: string): Promise<ExportacaoFolhaContabilPreview> {
  const { preview } = await gerarExportacaoFolhaContabil(mes);
  return preview;
}
