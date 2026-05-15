import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Delete, Phone, Search, Users, UserPlus, MessageCirclePlus } from 'lucide-react';
import {
  listContatosS3e,
  createContatoS3e,
  updateContatoS3e,
  type ContatoS3eDto
} from '../../services/contatosS3eService';
import { fetchWhatsappResolveOpenChat } from '../../services/whatsappChatService';
import {
  toWhatsappChatId,
  canonicalWhatsappChatId,
  chatIdToDisplayLabel,
  formatPhoneForDisplay
} from '../../utils/whatsappChat';

export interface NovaConversaDrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Chamado quando o operador escolhe abrir uma conversa.
   * `chatId` já vem canonicalizado e `title` é a melhor sugestão de
   * nome conhecida (nome da agenda > pushname > número formatado).
   */
  onOpenChat: (chatId: string, title: string) => void;
  /**
   * Chamado após salvar/criar um contato — usado pela página de
   * Contatos S3E para reagir e recarregar a tabela.
   */
  onContatoSalvo?: (c: ContatoS3eDto) => void;
  /**
   * `panel-overlay`: drawer absoluto que ocupa o container parent
   *   (precisa de `relative` no parent). Usado no `WhatsAppChatPanel`.
   * `fullscreen-modal`: ocupa a tela inteira com overlay escuro. Usado
   *   na página de Contatos S3E ou em outras telas sem o panel pronto.
   */
  variant?: 'panel-overlay' | 'fullscreen-modal';
  /**
   * Quando vier preenchido, o drawer abre direto no modo digit-pad com
   * esse número (útil ao clicar em "Abrir conversa" na linha da página
   * de Contatos S3E).
   */
  initialNumero?: string;
}

type Mode = 'list' | 'phone' | 'details';

const PAGE_SIZE = 100;

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function formatPhoneBR(numero: string): string {
  const d = onlyDigits(numero);
  if (d.startsWith('55') && d.length === 13) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.startsWith('55') && d.length === 12) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return numero;
}

/** Initials para o avatar quando não há foto. */
function initials(name?: string | null): string {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || n.charAt(0).toUpperCase();
}

const DIAL_KEYS = [
  ['1', '', ''],
  ['2', 'ABC', ''],
  ['3', 'DEF', ''],
  ['4', 'GHI', ''],
  ['5', 'JKL', ''],
  ['6', 'MNO', ''],
  ['7', 'PQRS', ''],
  ['8', 'TUV', ''],
  ['9', 'WXYZ', ''],
  ['+', '', ''],
  ['0', '', ''],
  ['<', '', ''] // backspace
];

const NovaConversaDrawer: React.FC<NovaConversaDrawerProps> = ({
  open,
  onClose,
  onOpenChat,
  onContatoSalvo,
  variant = 'panel-overlay',
  initialNumero
}) => {
  const [mode, setMode] = useState<Mode>('list');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [contatos, setContatos] = useState<ContatoS3eDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [detailsContato, setDetailsContato] = useState<ContatoS3eDto | null>(null);
  const [draftNome, setDraftNome] = useState('');
  const [draftEmpresa, setDraftEmpresa] = useState('');
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  // Sempre que o drawer abre, volta para o modo "list" — ou para "phone"
  // se chegou já com um número pré-preenchido (rota da página de contatos).
  useEffect(() => {
    if (!open) return;
    if (initialNumero && initialNumero.trim()) {
      setPhoneDraft(initialNumero.trim());
      setMode('phone');
    } else {
      setMode('list');
    }
    setSearchInput('');
    setSearch('');
    setPage(1);
    // Próximo tick foca o input apropriado.
    setTimeout(() => {
      if (initialNumero) phoneInputRef.current?.focus();
      else searchRef.current?.focus();
    }, 30);
  }, [open, initialNumero]);

  // Debounce da busca.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadContatos = useCallback(
    async (opts: { search: string; page: number; replace: boolean }) => {
      setLoading(true);
      try {
        const resp = await listContatosS3e({
          search: opts.search,
          page: opts.page,
          pageSize: PAGE_SIZE,
          orderBy: 'nome'
        });
        if (resp.success && resp.data) {
          setTotal(resp.data.total);
          setPage(resp.data.page);
          setContatos((prev) => (opts.replace ? resp.data!.items : [...prev, ...resp.data!.items]));
        } else if (!resp.success) {
          toast.error(resp.error || 'Falha ao carregar contatos.');
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reload sempre que a busca muda OU o drawer abre no modo `list`.
  useEffect(() => {
    if (!open || mode !== 'list') return;
    loadContatos({ search, page: 1, replace: true });
  }, [open, mode, search, loadContatos]);

  const hasMore = useMemo(() => contatos.length < total, [contatos.length, total]);

  /** Abre a conversa e fecha o drawer. Sempre passa pelo backend para
   * resolver LID quando o número existe na Evolution — assim a sidebar
   * já lista o JID canônico (mesmo padrão do Funil/Agenda). */
  const handleOpenConversa = useCallback(
    async (numero: string, title: string) => {
      const digits = onlyDigits(numero);
      if (digits.length < 10) {
        toast.error('Informe DDD + número (mínimo 10 dígitos).');
        return;
      }
      setOpening(true);
      try {
        const r = await fetchWhatsappResolveOpenChat(digits);
        if (r.success && r.data?.chatId) {
          const canon = canonicalWhatsappChatId(r.data.chatId);
          onOpenChat(canon, title || formatPhoneForDisplay(canon));
          if (!r.data.numberExists) {
            toast.warning('Número não consta como registrado no WhatsApp', {
              description:
                'A conversa abrirá no formato cadastrado; se o envio falhar, confira o número ou aguarde o contato aparecer.'
            });
          }
          onClose();
          return;
        }
      } catch {
        // fallback abaixo
      }
      const fallback = canonicalWhatsappChatId(toWhatsappChatId(digits));
      onOpenChat(fallback, title || chatIdToDisplayLabel(fallback));
      onClose();
    },
    [onClose, onOpenChat]
  );

  /** Vai do modo phone → details, preenchendo o form. */
  const handleOpenDetails = useCallback(async () => {
    const digits = onlyDigits(phoneDraft);
    if (digits.length < 10) {
      toast.error('Informe DDD + número (mínimo 10 dígitos).');
      return;
    }
    // Tenta achar um ContatoS3e existente por número (busca pelo dígito).
    setLoading(true);
    try {
      const resp = await listContatosS3e({ search: digits, page: 1, pageSize: 5 });
      const found =
        resp.success && resp.data
          ? resp.data.items.find((c) => onlyDigits(c.numero) === digits) ?? resp.data.items[0] ?? null
          : null;
      setDetailsContato(found);
      setDraftNome(found?.nomeAgenda || '');
      setDraftEmpresa(found?.empresa || '');
    } finally {
      setLoading(false);
    }
    setMode('details');
  }, [phoneDraft]);

  /** Cria/atualiza o ContatoS3e e (opcionalmente) abre a conversa. */
  const handleSaveContato = useCallback(
    async (alsoOpen: boolean) => {
      const digits = onlyDigits(detailsContato?.numero || phoneDraft);
      if (digits.length < 10) {
        toast.error('Telefone inválido.');
        return;
      }
      const nomeAgendaTrim = draftNome.trim();
      const empresaTrim = draftEmpresa.trim();
      setSaving(true);
      try {
        let resp;
        if (detailsContato?.id) {
          resp = await updateContatoS3e(detailsContato.id, {
            nomeAgenda: nomeAgendaTrim || null,
            empresa: empresaTrim || null,
            revisado: true
          });
        } else {
          resp = await createContatoS3e({
            numero: digits,
            nomeAgenda: nomeAgendaTrim || null,
            empresa: empresaTrim || null
          });
        }
        if (resp.success && resp.data) {
          setDetailsContato(resp.data);
          onContatoSalvo?.(resp.data);
          toast.success(detailsContato?.id ? 'Contato atualizado.' : 'Contato salvo.');
          if (alsoOpen) {
            const title = nomeAgendaTrim || resp.data.pushName || formatPhoneBR(digits);
            await handleOpenConversa(digits, title);
          }
        } else {
          toast.error(resp.error || 'Falha ao salvar.');
        }
      } finally {
        setSaving(false);
      }
    },
    [detailsContato, draftEmpresa, draftNome, handleOpenConversa, onContatoSalvo, phoneDraft]
  );

  if (!open) return null;

  const wrapperClass =
    variant === 'panel-overlay'
      ? 'absolute inset-0 z-[60] flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#161717]'
      : 'fixed inset-0 z-[60] flex min-h-0 items-stretch bg-black/40 backdrop-blur-sm';

  const innerClass =
    variant === 'panel-overlay'
      ? 'flex min-h-0 flex-1 flex-col'
      : 'flex min-h-0 w-full max-w-md flex-col bg-[#f0f2f5] shadow-2xl dark:bg-[#161717] ml-auto';

  return (
    <div className={wrapperClass}>
      <div className={innerClass}>
        {/* HEADER */}
        <div className="flex h-14 shrink-0 items-center gap-2 bg-[#00a884] px-4 text-white">
          <button
            type="button"
            onClick={() => {
              if (mode === 'details') {
                setMode('phone');
                return;
              }
              if (mode === 'phone') {
                setMode('list');
                return;
              }
              onClose();
            }}
            className="rounded-full p-1 hover:bg-white/15"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="flex-1 truncate text-[15px] font-semibold">
            {mode === 'list' ? 'Nova conversa' : mode === 'phone' ? 'Telefone' : 'Dados do contato'}
          </h2>
          {mode === 'list' ? (
            <button
              type="button"
              onClick={() => {
                setMode('phone');
                setTimeout(() => phoneInputRef.current?.focus(), 30);
              }}
              className="rounded-full p-1.5 hover:bg-white/15"
              title="Inserir número manualmente"
              aria-label="Inserir número manualmente"
            >
              <Phone className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {/* BODY */}
        {mode === 'list' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-[#e9edef] bg-white p-2 dark:border-[#2a3942] dark:bg-[#202c33]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
                <input
                  ref={searchRef}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Pesquisar nome ou número"
                  className="w-full rounded-full border border-[#e9edef] bg-[#f7f5f3] py-2 pl-9 pr-3 text-[13px] text-[#111b21] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => toast.message('Para criar um grupo, use o WhatsApp do aparelho.')}
                className="flex items-center gap-3 border-b border-[#e9edef] bg-white px-4 py-3 text-left hover:bg-[#f7f5f3] dark:border-[#2a3942] dark:bg-[#202c33] dark:hover:bg-[#2a3942]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">Novo grupo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('phone');
                  setPhoneDraft('');
                  setTimeout(() => phoneInputRef.current?.focus(), 30);
                }}
                className="flex items-center gap-3 border-b border-[#e9edef] bg-white px-4 py-3 text-left hover:bg-[#f7f5f3] dark:border-[#2a3942] dark:bg-[#202c33] dark:hover:bg-[#2a3942]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
                  Novo contato (digitar número)
                </span>
              </button>
            </div>
            <div className="wa-scroll min-h-0 flex-1 overflow-y-auto bg-white dark:bg-[#202c33]">
              {loading && contatos.length === 0 ? (
                <div className="flex justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                </div>
              ) : contatos.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-[#667781] dark:text-[#8696a0]">
                  {search
                    ? 'Nenhum contato com esse termo na agenda S3E.'
                    : 'Nenhum contato salvo ainda. Importe um CSV ou crie usando o telefone.'}
                </p>
              ) : (
                <ul className="divide-y divide-[#e9edef] dark:divide-[#2a3942]">
                  {contatos.map((c) => {
                    const primary =
                      c.nomeAgenda?.trim() ||
                      c.pushName?.trim() ||
                      formatPhoneBR(c.numero);
                    const secondary = [c.empresa, formatPhoneBR(c.numero)]
                      .filter((x) => x && x !== primary)
                      .join(' · ');
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenConversa(c.numero, primary)}
                          disabled={opening}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f7f5f3] disabled:opacity-50 dark:hover:bg-[#2a3942]"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6b7280] text-[12px] font-semibold text-white">
                            {initials(primary)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
                              {primary}
                            </span>
                            {secondary ? (
                              <span className="truncate text-[12px] text-[#667781] dark:text-[#8696a0]">
                                {secondary}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {hasMore ? (
                <div className="flex justify-center py-3">
                  <button
                    type="button"
                    onClick={() => loadContatos({ search, page: page + 1, replace: false })}
                    disabled={loading}
                    className="rounded-full border border-[#00a884] px-4 py-1 text-[12px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
                  >
                    {loading ? 'Carregando…' : 'Carregar mais'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : mode === 'phone' ? (
          <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#161717]">
            <div className="border-b border-[#e9edef] px-4 py-3 dark:border-[#2a3942]">
              <p className="text-center text-[13px] text-[#667781] dark:text-[#8696a0]">
                Insira um número de telefone para iniciar uma conversa
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 px-6 pt-6">
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOpenConversa(phoneDraft, formatPhoneBR(phoneDraft));
                  }
                }}
                placeholder="+55 (DDD) 9xxxx-xxxx"
                className="w-full max-w-sm border-b-2 border-[#e9edef] bg-transparent pb-1 text-center text-[22px] font-medium tracking-wider text-[#111b21] focus:border-[#00a884] focus:outline-none dark:border-[#2a3942] dark:text-[#e9edef]"
              />
              <div className="grid w-full max-w-xs grid-cols-3 gap-2 pb-4">
                {DIAL_KEYS.map(([k, sub]) => {
                  const isBackspace = k === '<';
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (isBackspace) {
                          setPhoneDraft((p) => p.slice(0, -1));
                        } else {
                          setPhoneDraft((p) => p + k);
                        }
                      }}
                      className="flex h-14 flex-col items-center justify-center rounded-full transition hover:bg-[#f7f5f3] dark:hover:bg-[#2a3942]"
                    >
                      {isBackspace ? (
                        <Delete className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
                      ) : (
                        <>
                          <span className="text-[20px] font-medium text-[#111b21] dark:text-[#e9edef]">{k}</span>
                          {sub ? (
                            <span className="text-[9px] uppercase tracking-wider text-[#8696a0]">{sub}</span>
                          ) : null}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <button
                type="button"
                onClick={() => handleOpenConversa(phoneDraft, formatPhoneBR(phoneDraft))}
                disabled={opening || onlyDigits(phoneDraft).length < 10}
                className="flex items-center justify-center gap-2 rounded-full bg-[#00a884] py-2 text-[14px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
              >
                <MessageCirclePlus className="h-4 w-4" />
                {opening ? 'Abrindo…' : 'Abrir conversa'}
              </button>
              <button
                type="button"
                onClick={handleOpenDetails}
                disabled={loading || onlyDigits(phoneDraft).length < 10}
                className="rounded-full border border-[#00a884] py-2 text-[14px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
              >
                Ver dados do contato
              </button>
            </div>
          </div>
        ) : (
          // mode === 'details'
          <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#161717]">
            <div className="space-y-3 border-b border-[#e9edef] px-4 py-4 text-center dark:border-[#2a3942]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#6b7280] text-2xl font-semibold text-white">
                {initials(draftNome || detailsContato?.pushName || phoneDraft)}
              </div>
              <p className="font-mono text-[14px] text-[#111b21] dark:text-[#e9edef]">
                {formatPhoneBR(detailsContato?.numero || phoneDraft)}
              </p>
              {detailsContato?.pushName ? (
                <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                  Nome no WhatsApp: <strong>{detailsContato.pushName}</strong>
                </p>
              ) : null}
              {detailsContato ? (
                <p
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    detailsContato.revisado
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100'
                  }`}
                >
                  {detailsContato.revisado ? 'Revisado' : `Novo · ${detailsContato.origem || 'desconhecido'}`}
                </p>
              ) : (
                <p className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
                  Não cadastrado — preencha para salvar
                </p>
              )}
            </div>
            <div className="space-y-3 px-4 py-4">
              <label className="block">
                <span className="text-[12px] font-medium text-[#111b21] dark:text-[#e9edef]">Nome (agenda)</span>
                <input
                  value={draftNome}
                  onChange={(e) => setDraftNome(e.target.value)}
                  placeholder="Ex.: João Silva"
                  className="mt-1 w-full rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[14px] text-[#111b21] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef]"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-[#111b21] dark:text-[#e9edef]">Empresa</span>
                <input
                  value={draftEmpresa}
                  onChange={(e) => setDraftEmpresa(e.target.value)}
                  placeholder="Ex.: Acme LTDA"
                  className="mt-1 w-full rounded-lg border border-[#d1d7db] bg-white px-3 py-2 text-[14px] text-[#111b21] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef]"
                />
              </label>
            </div>
            <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
              <button
                type="button"
                onClick={() => handleSaveContato(true)}
                disabled={saving || opening}
                className="rounded-full bg-[#00a884] py-2 text-[14px] font-medium text-white hover:bg-[#008f6f] disabled:opacity-50"
              >
                {saving ? 'Salvando…' : opening ? 'Abrindo…' : 'Salvar e abrir conversa'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveContato(false)}
                disabled={saving}
                className="rounded-full border border-[#00a884] py-2 text-[14px] font-medium text-[#00a884] hover:bg-[#00a884]/10 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar contato'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovaConversaDrawer;
