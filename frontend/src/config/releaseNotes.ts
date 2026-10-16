/**
 * Notas de atualização exibidas no login (produção).
 * Ao publicar um novo pacote, incremente `RELEASE_NOTES_VERSION` e atualize `items`.
 */
export const RELEASE_NOTES_VERSION = '2026-10-16-deploy';

export type ReleaseNoteTipo = 'novo' | 'melhoria' | 'correcao' | 'removido';

export type ReleaseNoteItem = {
  id: string;
  titulo: string;
  descricao: string;
  area: string;
  tipo: ReleaseNoteTipo;
};

export const RELEASE_NOTES_META = {
  titulo: 'Novidades do sistema',
  subtitulo: 'Confira o que mudou nesta versão e marque os itens conforme for revisando.',
  dataLabel: '16/10/2026',
};

export const RELEASE_NOTES_ITEMS: ReleaseNoteItem[] = [
  {
    id: 'cotacoes-banco-frio-removido',
    area: 'Orçamentos',
    tipo: 'removido',
    titulo: 'Cotações / banco frio fora do sistema',
    descricao:
      'Não dá mais para incluir itens do banco frio em orçamentos, kits ou quadros. Orçamentos antigos que ainda tenham esses itens aparecem só como legado. A API de cotações foi desligada.',
  },
  {
    id: 'modal-adicionar-item-orcamento',
    area: 'Orçamentos',
    tipo: 'melhoria',
    titulo: 'Modal Adicionar item mais rápido e maior',
    descricao:
      'O modal abre mais leve (lista paginada), usa melhor a tela no desktop e mantém materiais, serviços, kits e quadros.',
  },
  {
    id: 'condicao-pagamento-pdf',
    area: 'Orçamentos',
    tipo: 'melhoria',
    titulo: 'Texto de condição de pagamento',
    descricao:
      'Opção e observação no PDF: “Pagamentos conforme condições a serem acordadas.”',
  },
  {
    id: 'pdf-orcamento-pdfmake',
    area: 'Orçamentos',
    tipo: 'melhoria',
    titulo: 'PDF do orçamento (pdfmake)',
    descricao:
      'Geração e envio do PDF (incluindo WhatsApp) pelo caminho pdfmake, com ajustes de layout e descrição.',
  },
  {
    id: 'config-fiscais-dark',
    area: 'Fiscal',
    tipo: 'correcao',
    titulo: 'Configurações fiscais no tema escuro',
    descricao:
      'Cards das empresas e regras fiscais da NF-e ficam legíveis no dark mode (fundos e textos ajustados).',
  },
  {
    id: 'regras-fiscais-nfe',
    area: 'Fiscal',
    tipo: 'novo',
    titulo: 'Regras fiscais da NF-e',
    descricao:
      'Cadastro de CFOP, CST/CSOSN e alíquotas por regime, NCM e empresa, usados na emissão.',
  },
  {
    id: 'empresa-fiscal-receita',
    area: 'Fiscal',
    tipo: 'melhoria',
    titulo: 'Preenchimento por CNPJ na empresa fiscal',
    descricao: 'Consulta à Receita preenche dados da empresa ao cadastrar/editar configuração fiscal.',
  },
  {
    id: 'nfse-nacional',
    area: 'Fiscal',
    tipo: 'melhoria',
    titulo: 'NFS-e nacional e chave de acesso',
    descricao: 'Evolução na integração NFS-e (XML, assinatura e chave de acesso) e fluxo de emissão.',
  },
  {
    id: 'query-modulos',
    area: 'Sistema',
    tipo: 'melhoria',
    titulo: 'Listas mais rápidas (TanStack Query)',
    descricao:
      'Orçamentos, clientes, serviços, compras, fornecedores, dashboard, funil, emissão NF-e e outros módulos passam a cachear e pré-carregar dados ao navegar.',
  },
  {
    id: 'orcamento-voltar-dialog',
    area: 'Orçamentos',
    tipo: 'melhoria',
    titulo: 'Confirmação ao descartar orçamento',
    descricao: 'Ao voltar com alterações não salvas, o sistema pede confirmação em vez de só um aviso rápido.',
  },
  {
    id: 'backup-agendado',
    area: 'Sistema',
    tipo: 'novo',
    titulo: 'Backup do banco',
    descricao: 'Rotinas de backup do PostgreSQL (serviço e agenda) para proteção dos dados.',
  },
  {
    id: 'fornecedores-cnpj',
    area: 'Suprimentos',
    tipo: 'melhoria',
    titulo: 'Fornecedores por CNPJ',
    descricao: 'Normalização e unificação de fornecedores com o mesmo CNPJ, evitando cadastros duplicados.',
  },
];

const STORAGE_KEY_PREFIX = 's3e_release_notes_seen_';

/** Chave por usuário + versão — cada usuário vê o modal só 1 vez nesta release. */
export function releaseNotesStorageKey(
  userId: string,
  version = RELEASE_NOTES_VERSION
): string {
  return `${STORAGE_KEY_PREFIX}${version}_${userId}`;
}

export function hasSeenReleaseNotes(
  userId: string,
  version = RELEASE_NOTES_VERSION
): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(releaseNotesStorageKey(userId, version)) === '1';
  } catch {
    return true;
  }
}

export function markReleaseNotesSeen(
  userId: string,
  version = RELEASE_NOTES_VERSION
): void {
  if (!userId) return;
  try {
    localStorage.setItem(releaseNotesStorageKey(userId, version), '1');
  } catch {
    // ignore quota / private mode
  }
}

/** Só em produção (app.s3eengenharia.com.br). Dev: ?showReleaseNotes=1 para testar. */
export function shouldOfferReleaseNotes(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (host === 'app.s3eengenharia.com.br') {
    return true;
  }
  try {
    return new URLSearchParams(window.location.search).get('showReleaseNotes') === '1';
  } catch {
    return false;
  }
}
