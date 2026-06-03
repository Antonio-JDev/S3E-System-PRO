export const STATUS_ENGENHARIA_OPCOES = [
  'A fazer',
  'Andamento',
  'Parado',
  'Protocolado',
  'Concluído',
] as const;
export type StatusEngenharia = (typeof STATUS_ENGENHARIA_OPCOES)[number];

export const PRIORIDADE_OPCOES = ['Alta', 'Média', 'Baixa'] as const;
export type PrioridadeEngenharia = (typeof PRIORIDADE_OPCOES)[number];

export const TIPOS_PROJETO_OPCOES = ['Entrada', 'Interno'] as const;
export type TipoProjetoEngenharia = (typeof TIPOS_PROJETO_OPCOES)[number];

export const STATUS_CELESC_OPCOES = [
  'ENROLADO',
  'PEGAR DOCUMENTOS',
  'AGUARDANDO CLIENTE',
  'AGUARDANDO CELESC',
  'ENVIADO',
  'APROVADO',
  'REPROVADO',
] as const;
export type StatusCelesc = (typeof STATUS_CELESC_OPCOES)[number];

const badgeDark =
  'dark:ring-opacity-60 dark:ring-1';

export function getStatusEngenhariaStyle(status: string) {
  switch (status) {
    case 'A fazer':
      return `bg-slate-100 text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-600 ${badgeDark}`;
    case 'Andamento':
      return `bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:ring-blue-700 ${badgeDark}`;
    case 'Parado':
      return `bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:ring-amber-700 ${badgeDark}`;
    case 'Protocolado':
      return `bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-200 dark:ring-cyan-700 ${badgeDark}`;
    case 'Concluído':
      return `bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:ring-emerald-700 ${badgeDark}`;
    default:
      return `bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-600 ${badgeDark}`;
  }
}

export function getPrioridadeStyle(prioridade: string) {
  switch (prioridade) {
    case 'Alta':
      return `bg-red-100 text-red-800 ring-1 ring-red-200 dark:bg-red-900/50 dark:text-red-200 dark:ring-red-700 ${badgeDark}`;
    case 'Média':
      return `bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:ring-yellow-700 ${badgeDark}`;
    case 'Baixa':
      return `bg-green-100 text-green-800 ring-1 ring-green-200 dark:bg-green-900/50 dark:text-green-200 dark:ring-green-700 ${badgeDark}`;
    default:
      return `bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-600 ${badgeDark}`;
  }
}

export function getTipoProjetoStyle(tipo: string) {
  switch (tipo) {
    case 'Entrada':
      return `bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:ring-blue-700 ${badgeDark}`;
    case 'Interno':
      return `bg-sky-100 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-900/50 dark:text-sky-200 dark:ring-sky-700 ${badgeDark}`;
    default:
      return `bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-600 ${badgeDark}`;
  }
}

export function getStatusCelescStyle(status: string) {
  switch (status) {
    case 'ENROLADO':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
    case 'PEGAR DOCUMENTOS':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
    case 'AGUARDANDO CLIENTE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'AGUARDANDO CELESC':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'ENVIADO':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200';
    case 'APROVADO':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
    case 'REPROVADO':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200';
  }
}
