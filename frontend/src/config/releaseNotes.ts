/**
 * Notas de atualização exibidas no login (produção).
 * Ao publicar um novo pacote, incremente `RELEASE_NOTES_VERSION` e atualize `items`.
 */
export const RELEASE_NOTES_VERSION = '2026-10-08-deploy';

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
  dataLabel: '08/10/2026',
};

export const RELEASE_NOTES_ITEMS: ReleaseNoteItem[] = [
  {
    id: 'dre-gerencial',
    area: 'Financeiro',
    tipo: 'novo',
    titulo: 'DRE gerencial do período',
    descricao:
      'O CMV passa a vir da baixa de material, e não da compra. Entram imposto, outras receitas, despesas por classificação e o resultado financeiro. Não há depreciação nem IR/CSLL. O que aparece é o resultado do período.',
  },
  {
    id: 'dashboard-caixa-realizado',
    area: 'Dashboard',
    tipo: 'melhoria',
    titulo: 'Card Caixa realizado',
    descricao:
      'O card do dashboard que se chamava Lucro líquido passou a se chamar Caixa realizado.',
  },
  {
    id: 'os-cmv-materiais',
    area: 'Ordens de Serviço',
    tipo: 'novo',
    titulo: 'CMV de materiais no resultado da OS',
    descricao: 'A aba Resultado da OS mostra o CMV de materiais.',
  },
  {
    id: 'venda-nao-baixa-estoque',
    area: 'Vendas',
    tipo: 'melhoria',
    titulo: 'Venda não baixa estoque',
    descricao: 'Registrar a venda não tira material do estoque.',
  },
  {
    id: 'kit-baixa-nfe',
    area: 'Estoque',
    tipo: 'melhoria',
    titulo: 'Kit reservado até a NF-e',
    descricao: 'O kit fica reservado e só é baixado quando a NF-e é autorizada.',
  },
  {
    id: 'material-obra-baixa',
    area: 'Estoque',
    tipo: 'melhoria',
    titulo: 'Baixa de material de obra',
    descricao: 'Material de obra baixa em Iniciar obra ou em Sem obra.',
  },
  {
    id: 'folha-acrescimo-desconto',
    area: 'Folha',
    tipo: 'novo',
    titulo: 'Acréscimo e desconto na folha',
    descricao:
      'Dá para editar acréscimo e desconto, com valor e descrição, e salvar. O total da folha atualiza o salário pendente em Contas a pagar.',
  },
  {
    id: 'banco-horas-manual',
    area: 'RH',
    tipo: 'novo',
    titulo: 'Horas manuais no mês do pagamento',
    descricao:
      'No banco de horas, dá para lançar horas manuais com justificativa no mês em que serão pagas. Exemplo: setembro já fechado e o pagamento em outubro. Na lista de funcionários, o botão Ações abre o menu.',
  },
  {
    id: 'contas-bancarias',
    area: 'Financeiro',
    tipo: 'novo',
    titulo: 'Contas bancárias, transferência e extrato',
    descricao:
      'Dá para cadastrar contas bancárias, transferir entre bancos e ver o extrato de cada banco com filtro de período. A transferência não entra como receita e não entra no DRE.',
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
