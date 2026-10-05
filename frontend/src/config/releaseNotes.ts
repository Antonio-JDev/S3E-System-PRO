/**
 * Notas de atualização exibidas no login (produção).
 * Ao publicar um novo pacote, incremente `RELEASE_NOTES_VERSION` e atualize `items`.
 */
export const RELEASE_NOTES_VERSION = '2026-10-05-deploy';

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
  dataLabel: '05/10/2026',
};

export const RELEASE_NOTES_ITEMS: ReleaseNoteItem[] = [
  {
    id: 'dashboard-periodo',
    area: 'Dashboard',
    tipo: 'novo',
    titulo: 'Períodos bimestral e trimestral',
    descricao:
      'O seletor de período agora atualiza os cards e os gráficos ao mesmo tempo e ganhou as opções Bimestral e Trimestral. Cada card compara o período atual com o anterior.',
  },
  {
    id: 'dashboard-cards',
    area: 'Dashboard',
    tipo: 'melhoria',
    titulo: 'Cards revisados',
    descricao:
      'Saem Obras Ativas e Equipes Ativas e entra Orçamentos aprovados. Quadros produzidos passa a contar só OS do tipo Quadros e Painéis, e Clientes atendidos considera o período selecionado.',
  },
  {
    id: 'dashboard-graficos',
    area: 'Dashboard',
    tipo: 'melhoria',
    titulo: 'Gráficos mais objetivos',
    descricao:
      'Saíram os gráficos de obras (Kanban), evolução de pedidos de venda e categorias de venda. O Comparativo agora mostra Orçamentos x Pedidos de venda, aparece só para admin e desenvolvedor e fica ao lado da rosca de pedidos.',
  },
  {
    id: 'os-card-horas',
    area: 'Ordens de Serviço',
    tipo: 'melhoria',
    titulo: 'Card da OS com horas previstas e executadas',
    descricao:
      'A listagem de OS mostra barras de horas previstas na agenda e horas apontadas, junto do prazo. O selo "Estouro de prazo" passa a indicar quando a data final do cronograma já passou.',
  },
  {
    id: 'os-horas-resultado',
    area: 'Ordens de Serviço',
    tipo: 'melhoria',
    titulo: 'Resultado e prazo estimado em horas',
    descricao:
      'As abas da OS mostram horas de engenharia e de execução (diária = 8 h) no lugar de diárias, com barras de previstas, executadas, faltantes e excedente.',
  },
  {
    id: 'os-previsao-chegada',
    area: 'Ordens de Serviço',
    tipo: 'novo',
    titulo: 'Previsão de chegada de materiais',
    descricao:
      'Na aba Materiais da OS, selecione um ou vários produtos e defina a data de chegada com a referência (pedido de compra, orçamento ou NF). Chegadas atrasadas ficam destacadas em vermelho.',
  },
  {
    id: 'calendario-horario-dia',
    area: 'Calendário',
    tipo: 'novo',
    titulo: 'Horário de cada dia na alocação',
    descricao:
      'No evento, ajuste o início e o fim de cada dia da alocação. Sem ajuste, vale o horário padrão de 07:30 às 17:30.',
  },
  {
    id: 'calendario-confirmar-executar',
    area: 'Calendário',
    tipo: 'novo',
    titulo: 'Confirmar alocação e Executar OS',
    descricao:
      '"Confirmar alocação" transforma a previsão em alocação confirmada no próprio evento, sem duplicar na agenda. "Executar OS" grava o apontamento da equipe nos dias até hoje e marca a alocação como executada.',
  },
  {
    id: 'orcamento-cronograma',
    area: 'Orçamentos',
    tipo: 'melhoria',
    titulo: 'Cronograma obrigatório',
    descricao:
      'Previsão de início e previsão de término passam a ser obrigatórias ao criar ou editar um orçamento, e o término não pode ser anterior ao início.',
  },
  {
    id: 'compras-conversao-unidade',
    area: 'Compras',
    tipo: 'novo',
    titulo: 'Conversão de cabos de km para metros',
    descricao:
      'Ao importar o XML, cabos vendidos em km são convertidos para metros automaticamente. Em compras já lançadas, o botão "Revisar unidades" sugere a conversão e ajusta preço, estoque e OS. Fica registrado quem converteu e quando.',
  },
  {
    id: 'estoque-sku-numerico',
    area: 'Estoque',
    tipo: 'melhoria',
    titulo: 'SKU numérico e sequencial',
    descricao:
      'Novos materiais recebem SKU só com números, a partir de 100001. Os SKUs antigos com letras foram renumerados e continuam aparecendo na busca.',
  },
  {
    id: 'estoque-movimentacao-os',
    area: 'Estoque',
    tipo: 'melhoria',
    titulo: 'Baixa e devolução vinculadas à OS',
    descricao:
      'Em Movimentações, a baixa por alocação, instalação ou serviço exige a OS de destino, com busca por número, título ou cliente. A devolução de OS permite informar a OS de origem.',
  },
  {
    id: 'sistema-telas-obras',
    area: 'Sistema',
    tipo: 'removido',
    titulo: 'Telas antigas de obras descontinuadas',
    descricao:
      'Saíram o hub de tarefas de obra, o calendário de alocações antigo, o Gantt de obras e o modal de equipes de obra. A alocação de equipes agora é feita pelo Calendário.',
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
