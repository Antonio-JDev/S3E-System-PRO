import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MessageCirclePlus, Plus } from 'lucide-react';
import {
  deleteContatoS3e,
  listContatosS3e,
  updateContatoS3e,
  type ContatoS3eDto,
  type ContatosS3eListParams
} from '../services/contatosS3eService';
import ImportarContatosCsvModal from '../components/contatos/ImportarContatosCsvModal';
import NovaConversaDrawer from '../components/crm/NovaConversaDrawer';

interface ContatosS3ePageProps {
  toggleSidebar: () => void;
  /**
   * Quando informado, "Abrir conversa" no contato dispara
   * `onNavigate('Chat WhatsApp', chatId, title)` para que o App
   * leve o operador direto para o chat já posicionado.
   */
  onNavigate?: (view: string, ...args: unknown[]) => void;
}

const PAGE_SIZE = 50;

const Bars3Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

function formatPhoneBR(numero: string): string {
  const d = numero.replace(/\D/g, '');
  if (d.startsWith('55') && d.length === 13) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.startsWith('55') && d.length === 12) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  return numero;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const ContatosS3ePage: React.FC<ContatosS3ePageProps> = ({ toggleSidebar, onNavigate }) => {
  const [items, setItems] = useState<ContatoS3eDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [revisado, setRevisado] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [orderBy, setOrderBy] = useState<'recentes' | 'nome' | 'criado'>('recentes');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ nomeAgenda: string; empresa: string }>({ nomeAgenda: '', empresa: '' });
  const [importOpen, setImportOpen] = useState(false);
  const [novaConversaOpen, setNovaConversaOpen] = useState(false);
  const [novaConversaInitialNumero, setNovaConversaInitialNumero] = useState<string | undefined>(undefined);

  const loadPage = useCallback(
    async (params: ContatosS3eListParams) => {
      setLoading(true);
      try {
        const resp = await listContatosS3e({
          search: params.search ?? search,
          revisado: params.revisado ?? revisado,
          page: params.page ?? page,
          pageSize: PAGE_SIZE,
          orderBy: params.orderBy ?? orderBy
        });
        if (resp.success && resp.data) {
          setItems(resp.data.items);
          setTotal(resp.data.total);
          setPage(resp.data.page);
        } else {
          toast.error(resp.error || 'Falha ao carregar contatos');
        }
      } finally {
        setLoading(false);
      }
    },
    [search, revisado, page, orderBy]
  );

  useEffect(() => {
    loadPage({ page: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      loadPage({ search: searchInput, page: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    loadPage({ revisado, page: 1, orderBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisado, orderBy]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const naoRevisadosCount = useMemo(() => items.filter((c) => !c.revisado).length, [items]);

  function startEdit(c: ContatoS3eDto) {
    setEditingId(c.id);
    setEditDraft({ nomeAgenda: c.nomeAgenda || '', empresa: c.empresa || '' });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    const resp = await updateContatoS3e(id, {
      nomeAgenda: editDraft.nomeAgenda.trim() || null,
      empresa: editDraft.empresa.trim() || null,
      revisado: true
    });
    if (resp.success && resp.data) {
      setItems((arr) => arr.map((it) => (it.id === id ? resp.data! : it)));
      setEditingId(null);
      toast.success('Contato atualizado.');
    } else {
      toast.error(resp.error || 'Falha ao salvar');
    }
  }

  async function markRevisado(c: ContatoS3eDto) {
    const resp = await updateContatoS3e(c.id, { revisado: true });
    if (resp.success && resp.data) {
      setItems((arr) => arr.map((it) => (it.id === c.id ? resp.data! : it)));
    } else {
      toast.error(resp.error || 'Falha ao marcar como revisado');
    }
  }

  async function removeContato(c: ContatoS3eDto) {
    if (!window.confirm(`Remover contato "${c.nomeAgenda || c.pushName || c.numero}"?`)) return;
    const resp = await deleteContatoS3e(c.id);
    if (resp.success) {
      setItems((arr) => arr.filter((it) => it.id !== c.id));
      toast.success('Contato removido.');
    } else {
      toast.error(resp.error || 'Falha ao remover');
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-xl p-2 text-gray-600 hover:bg-white lg:hidden dark:text-dark-text-secondary dark:hover:bg-dark-card"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text sm:text-3xl">
              Contatos S3E
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary">
              Agenda interna que prioriza o nome correto na lista do WhatsApp e elimina o "nome de cache" sendo replicado entre conversas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNovaConversaInitialNumero(undefined);
              setNovaConversaOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-md bg-[#00a884] px-3 py-2 text-sm font-medium text-white hover:bg-[#008f6f]"
          >
            <MessageCirclePlus className="h-4 w-4" />
            Nova conversa
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-md bg-brand-blue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="mr-1 inline h-4 w-4" />
            Importar CSV
          </button>
        </div>
      </header>

      <section className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-border dark:bg-dark-card sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar por nome, número ou empresa…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-dark-border dark:bg-dark-card-secondary"
        />
        <select
          value={revisado}
          onChange={(e) => setRevisado(e.target.value as typeof revisado)}
          className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-dark-border dark:bg-dark-card-secondary"
          title="Filtrar por status de revisão"
        >
          <option value="todos">Todos</option>
          <option value="nao">Apenas novos (não revisados)</option>
          <option value="sim">Apenas revisados</option>
        </select>
        <select
          value={orderBy}
          onChange={(e) => setOrderBy(e.target.value as typeof orderBy)}
          className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-dark-border dark:bg-dark-card-secondary"
          title="Ordenar"
        >
          <option value="recentes">Última interação</option>
          <option value="nome">Nome (A-Z)</option>
          <option value="criado">Adicionado recentemente</option>
        </select>
      </section>

      {revisado !== 'sim' && naoRevisadosCount > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Existem <strong>{naoRevisadosCount}</strong> contato(s) criado(s) automaticamente por mensagem recebida aguardando revisão.
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-dark-border dark:bg-dark-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-dark-card-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-dark-text-secondary">Nome (agenda)</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-dark-text-secondary">Empresa</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-dark-text-secondary">Telefone</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-dark-text-secondary">Push name (WhatsApp)</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-dark-text-secondary">Última interação</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-dark-text-secondary">Status</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-dark-text-secondary">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                    Nenhum contato encontrado. Importe um CSV para começar.
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const editing = editingId === c.id;
                  return (
                    <tr key={c.id} className={!c.revisado ? 'bg-amber-50/40 dark:bg-amber-950/20' : undefined}>
                      <td className="px-3 py-2 align-top">
                        {editing ? (
                          <input
                            autoFocus
                            value={editDraft.nomeAgenda}
                            onChange={(e) => setEditDraft((d) => ({ ...d, nomeAgenda: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 dark:border-dark-border dark:bg-dark-card-secondary"
                            placeholder="Nome da agenda"
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-left hover:text-brand-blue"
                            onClick={() => startEdit(c)}
                            title="Clique para editar"
                          >
                            {c.nomeAgenda || <span className="italic text-gray-400">Sem nome</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {editing ? (
                          <input
                            value={editDraft.empresa}
                            onChange={(e) => setEditDraft((d) => ({ ...d, empresa: e.target.value }))}
                            className="w-full rounded border border-gray-300 px-2 py-1 dark:border-dark-border dark:bg-dark-card-secondary"
                            placeholder="Empresa"
                          />
                        ) : (
                          <span>{c.empresa || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top font-mono">{formatPhoneBR(c.numero)}</td>
                      <td className="px-3 py-2 align-top text-gray-600 dark:text-dark-text-secondary">
                        {c.pushName || '—'}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-600 dark:text-dark-text-secondary">
                        {formatDate(c.ultimaInteracao)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {c.revisado ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            Revisado
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
                            Novo · {c.origem || 'desconhecido'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        {editing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => saveEdit(c.id)}
                              className="rounded bg-brand-blue px-2 py-1 text-xs text-white hover:opacity-90"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-card-secondary"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigate) {
                                  // Pula o drawer e vai direto para o chat — UX mais rápida
                                  // quando o operador já está olhando a agenda.
                                  const title = c.nomeAgenda || c.pushName || c.numero;
                                  onNavigate('Chat WhatsApp', `${c.numero}@c.us`, title);
                                } else {
                                  setNovaConversaInitialNumero(c.numero);
                                  setNovaConversaOpen(true);
                                }
                              }}
                              className="flex items-center gap-1 rounded border border-[#00a884] px-2 py-1 text-xs text-[#00a884] hover:bg-[#00a884]/10"
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageCirclePlus className="h-3 w-3" />
                              Conversa
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-card-secondary"
                            >
                              Editar
                            </button>
                            {!c.revisado && (
                              <button
                                type="button"
                                onClick={() => markRevisado(c)}
                                className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                              >
                                Marcar revisado
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeContato(c)}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/40"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-xs text-gray-600 dark:border-dark-border dark:text-dark-text-secondary">
          <span>
            {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}` : '0 contatos'}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadPage({ page: page - 1 })}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50 dark:border-dark-border"
            >
              Anterior
            </button>
            <span className="px-2 py-1">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => loadPage({ page: page + 1 })}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50 dark:border-dark-border"
            >
              Próxima
            </button>
          </div>
        </div>
      </section>

      <ImportarContatosCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportFinished={() => loadPage({ page: 1 })}
      />
      <NovaConversaDrawer
        open={novaConversaOpen}
        onClose={() => setNovaConversaOpen(false)}
        variant="fullscreen-modal"
        initialNumero={novaConversaInitialNumero}
        onOpenChat={(chatId, title) => {
          if (onNavigate) {
            onNavigate('Chat WhatsApp', chatId, title);
          } else {
            toast.message('Abrir conversa requer navegação — atualize o app.');
          }
        }}
        onContatoSalvo={() => {
          loadPage({ page });
        }}
      />
    </div>
  );
};

export default ContatosS3ePage;
