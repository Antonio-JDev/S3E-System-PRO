/**
 * Notas de atualização exibidas no login (produção).
 * Ao publicar um novo pacote, incremente `RELEASE_NOTES_VERSION` e atualize `items`.
 */
export const RELEASE_NOTES_VERSION = '2026-07-27-deploy';

export type ReleaseNoteItem = {
  id: string;
  titulo: string;
  descricao: string;
  area: string;
};

export const RELEASE_NOTES_META = {
  titulo: 'Notas de Atualização',
  subtitulo: 'O que chegou nesta versão — checklist das últimas implementações',
  dataLabel: '27/07/2026',
};

export const RELEASE_NOTES_ITEMS: ReleaseNoteItem[] = [
  {
    id: 'financeiro-cartao',
    area: 'Financeiro',
    titulo: 'Cartão de crédito e faturas',
    descricao:
      'Nova aba no Financeiro para cadastrar cartões, acompanhar faturas por competência e vincular despesas em Contas a Pagar.',
  },
  {
    id: 'os-vistoria-celesc',
    area: 'Ordens de Serviço',
    titulo: 'Vistoria CELESC',
    descricao:
      'Nova aba Vistorias no hub de OS, flag “Exige Vistoria CELESC”, protocolo, status e histórico de reprovação com motivos.',
  },
  {
    id: 'os-validado',
    area: 'Ordens de Serviço',
    titulo: 'Status Validado removido do fluxo',
    descricao:
      'OS que estavam em Validado migram automaticamente para Aprovado — o estágio Validado deixa de existir no kanban.',
  },
  {
    id: 'rh-abpd',
    area: 'RH / Ponto',
    titulo: 'Avaliação A/B/P/D na conferência',
    descricao:
      'Camada de avaliação rápida na conferência de ponto, com tratamento de débito/crédito para a folha.',
  },
  {
    id: 'rh-feriado',
    area: 'RH / Ponto',
    titulo: 'Override manual de feriados',
    descricao:
      'Na conferência da folha, admin/RH pode marcar ou desmarcar um dia como feriado no calendário da empresa.',
  },
  {
    id: 'rh-folha-pdf',
    area: 'RH / Ponto',
    titulo: 'Melhorias na folha e PDF de conferência',
    descricao:
      'Ajustes de jornada, demonstrativo e geração do PDF de conferência de ponto.',
  },
  {
    id: 'orcamento-dnd',
    area: 'Orçamentos',
    titulo: 'Reordenar itens por arrastar e soltar',
    descricao:
      'Nas telas de novo e editar orçamento, use o ícone ≡ ao lado de cada item para reposicionar na listagem.',
  },
  {
    id: 'bi-dashboards',
    area: 'BI / Dashboards',
    titulo: 'Gráficos e tema visual',
    descricao:
      'Tema compartilhado de gráficos, melhorias no BI e refinamentos de dark mode nos dashboards.',
  },
  {
    id: 'whatsapp',
    area: 'CRM WhatsApp',
    titulo: 'Sync de não lidas e chat',
    descricao:
      'Melhorias no sync de mensagens não lidas, identidade e painel de conversas.',
  },
  {
    id: 'compras-pagar',
    area: 'Compras / Contas a Pagar',
    titulo: 'Ajustes em compras e contas a pagar',
    descricao:
      'Melhorias de fluxo e vínculo com cartão/fatura nas telas de compra e contas a pagar.',
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
