import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, X, Smile } from 'lucide-react';
import {
  createChatLabel,
  updateChatLabel,
  setChatLabelChats,
  deleteChatLabel,
  type WhatsappChatLabelDto
} from '../../services/whatsappChatLabelsService';

export interface WhatsAppChatLabelEditDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Lista existente para editar; se ausente, é criação. */
  initialLabel?: WhatsappChatLabelDto | null;
  /** Chamado após salvar (criar/editar) — devolve a versão fresca. */
  onSaved: (label: WhatsappChatLabelDto) => void;
  /**
   * Quando o usuário clica em "Adicionar pessoas ou grupos" e quer abrir
   * o seletor de conversas. O parent fornece a UI da lista (com
   * checkboxes) e devolve o conjunto final via Promise.
   */
  onPickChats: (currentChatIds: string[]) => Promise<string[] | null>;
  /**
   * Função para resolver um label de exibição (nome do contato) a partir
   * de um chatId — usada para mostrar os chips das conversas já
   * incluídas. Se não vier, mostra o próprio chatId.
   */
  resolveChatTitle?: (chatId: string) => string;
}

const PALETTE = ['#00a884', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#ec4899'];

const WhatsAppChatLabelEditDrawer: React.FC<WhatsAppChatLabelEditDrawerProps> = ({
  open,
  onClose,
  initialLabel,
  onSaved,
  onPickChats,
  resolveChatTitle
}) => {
  const isEdit = !!initialLabel;
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState<string | null>('#00a884');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(initialLabel?.nome || '');
    setCor(initialLabel?.cor ?? '#00a884');
    setEmoji(initialLabel?.emoji ?? null);
    setChatIds(initialLabel?.chatIds ?? []);
  }, [open, initialLabel]);

  const canSave = nome.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) {
      toast.error('Informe um nome para a lista.');
      return;
    }
    setSaving(true);
    try {
      let resp;
      if (isEdit && initialLabel) {
        resp = await updateChatLabel(initialLabel.id, {
          nome: nome.trim(),
          cor: cor || null,
          emoji: emoji || null
        });
        if (resp.success && resp.data) {
          // Atualiza memberships só se mudou.
          const before = new Set(initialLabel.chatIds);
          const after = new Set(chatIds);
          const sameSize = before.size === after.size;
          const sameSet = sameSize && [...before].every((c) => after.has(c));
          if (!sameSet) {
            const r2 = await setChatLabelChats(initialLabel.id, chatIds);
            if (r2.success && r2.data) resp = r2;
          }
        }
      } else {
        resp = await createChatLabel({
          nome: nome.trim(),
          cor: cor || null,
          emoji: emoji || null,
          chatIds
        });
      }
      if (resp.success && resp.data) {
        toast.success(isEdit ? 'Lista atualizada.' : 'Lista criada.');
        onSaved(resp.data);
        onClose();
      } else {
        toast.error(resp.error || 'Erro ao salvar lista.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !initialLabel) return;
    if (!window.confirm(`Remover a lista "${initialLabel.nome}"?`)) return;
    setDeleting(true);
    try {
      const resp = await deleteChatLabel(initialLabel.id);
      if (resp.success) {
        toast.success('Lista removida.');
        onSaved({ ...initialLabel, id: '__deleted__' });
        onClose();
      } else {
        toast.error(resp.error || 'Falha ao remover.');
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handlePickChats() {
    const next = await onPickChats(chatIds);
    if (next) setChatIds(next);
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#161717]">
      <div className="flex h-14 shrink-0 items-center gap-2 bg-[#00a884] px-4 text-white">
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-white/15" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 truncate text-[15px] font-semibold">
          {isEdit ? 'Editar lista' : 'Criar nova lista'}
        </h2>
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full px-2 py-1 text-[12px] font-medium hover:bg-white/15 disabled:opacity-50"
            title="Excluir lista"
          >
            {deleting ? 'Removendo…' : 'Excluir'}
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-4 py-4 dark:bg-[#161717]">
        <label className="block">
          <span className="text-[12px] font-medium text-[#667781] dark:text-[#8696a0]">Nome da lista</span>
          <div className="mt-1 flex items-center gap-2 border-b-2 border-[#e9edef] py-1 focus-within:border-[#00a884] dark:border-[#2a3942]">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nova etiqueta"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-[#111b21] focus:outline-none dark:text-[#e9edef]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                // Toggle simples — em vez de abrir um picker pesado, mostra
                // um prompt nativo. O usuário pode colar qualquer emoji.
                const e = window.prompt('Emoji para o chip (deixe vazio para remover):', emoji || '');
                if (e === null) return;
                setEmoji(e.trim() || null);
              }}
              className="rounded-full p-1 text-[#54656f] hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/10"
              title="Emoji"
            >
              {emoji ? <span className="text-[18px] leading-none">{emoji}</span> : <Smile className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <div className="mt-4">
          <span className="text-[12px] font-medium text-[#667781] dark:text-[#8696a0]">Cor</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  cor === c ? 'border-[#111b21] dark:border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                title={c}
                aria-label={`Cor ${c}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setCor(null)}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                cor === null
                  ? 'border-[#111b21] dark:border-white'
                  : 'border-[#e9edef] dark:border-[#2a3942]'
              }`}
              title="Sem cor"
              aria-label="Sem cor"
            >
              <X className="h-3 w-3 text-[#667781]" />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[12px] font-medium text-[#667781] dark:text-[#8696a0]">Conversas incluídas</p>
          <button
            type="button"
            onClick={handlePickChats}
            className="mt-3 flex w-full items-center gap-3 rounded-lg border border-dashed border-[#00a884] p-3 text-left transition hover:bg-[#00a884]/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
              {chatIds.length === 0 ? 'Adicionar pessoas ou grupos' : `Editar conversas (${chatIds.length})`}
            </span>
          </button>
          {chatIds.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {chatIds.map((cid) => (
                <li
                  key={cid}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[13px] dark:border-[#2a3942] dark:bg-[#202c33]"
                >
                  <span className="truncate text-[#111b21] dark:text-[#e9edef]">
                    {resolveChatTitle ? resolveChatTitle(cid) : cid}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChatIds((arr) => arr.filter((x) => x !== cid))}
                    className="rounded-full p-1 text-[#8696a0] hover:bg-black/5 dark:hover:bg-white/10"
                    title="Remover desta lista"
                    aria-label="Remover desta lista"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-[#e9edef] bg-white px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-[13px] font-medium text-[#54656f] hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/10"
        >
          Cancelar
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-full bg-[#00a884] px-5 py-2 text-[14px] font-medium text-white hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar lista'}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppChatLabelEditDrawer;
