import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Search,
  TriangleAlert,
  UserRound,
  KeyRound,
  Lock,
  MessageSquare,
  Bell,
  Keyboard,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import type { WaSettingsPage } from '../../theme/whatsappWebTokens';

interface WhatsAppAccountSettingsPanelProps {
  displayName: string;
  avatarUrl?: string | null;
  avatarLetter: string;
  connected: boolean;
  page: WaSettingsPage;
  onPageChange: (page: WaSettingsPage) => void;
  onAvatarClick?: () => void;
  onShareThought?: () => void;
  /** Nome da conta WhatsApp conectada (empresa / sessão). */
  accountWhatsappName?: string | null;
  /** Nome do operador no CRM (prefixo das mensagens). */
  operatorDisplayName?: string;
  onSaveOperatorDisplayName?: (name: string) => Promise<void> | void;
  operatorNameSaving?: boolean;
  profileSection?: React.ReactNode;
  accountSection?: React.ReactNode;
  privacySection?: React.ReactNode;
  chatsSection?: React.ReactNode;
}

const ITEMS: Array<{
  id: Exclude<WaSettingsPage, 'home'>;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'profile',
    title: 'Perfil',
    subtitle: 'Nome, foto do perfil, nome de usuário',
    icon: <UserRound className="h-6 w-6" strokeWidth={1.6} />,
  },
  {
    id: 'account',
    title: 'Conta',
    subtitle: 'Notificações de segurança, dados da conta',
    icon: <KeyRound className="h-6 w-6" strokeWidth={1.6} />,
  },
  {
    id: 'privacy',
    title: 'Privacidade',
    subtitle: 'Contatos bloqueados, mensagens temporárias',
    icon: <Lock className="h-6 w-6" strokeWidth={1.6} />,
  },
  {
    id: 'chats',
    title: 'Conversas',
    subtitle: 'Tema, papel de parede, configurações de conversas',
    icon: <MessageSquare className="h-6 w-6" strokeWidth={1.6} />,
  },
  {
    id: 'notifications',
    title: 'Notificações',
    subtitle: 'Mensagens, grupos, sons',
    icon: <Bell className="h-6 w-6" strokeWidth={1.6} />,
  },
  {
    id: 'shortcuts',
    title: 'Atalhos do teclado',
    subtitle: 'Ações rápidas',
    icon: <Keyboard className="h-6 w-6" strokeWidth={1.6} />,
  },
];

function EditableTitleValueRow(props: {
  title: string;
  value: string;
  editable?: boolean;
  saving?: boolean;
  onSave?: (next: string) => Promise<void> | void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.value);

  useEffect(() => {
    if (!editing) setDraft(props.value);
  }, [props.value, editing]);

  const commit = async () => {
    const next = draft.trim();
    if (!props.onSave) {
      setEditing(false);
      return;
    }
    await props.onSave(next);
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-[#e9edef] bg-white px-4 py-3 dark:border-[#2a3942] dark:bg-[#202c33]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wide text-[#667781] dark:text-[var(--wa-text-sec)]">
            {props.title}
          </p>
          {editing && props.editable ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commit();
                }
                if (e.key === 'Escape') {
                  setDraft(props.value);
                  setEditing(false);
                }
              }}
              placeholder={props.placeholder}
              disabled={props.saving}
              className="mt-1.5 w-full rounded-lg border border-[#25d366] bg-transparent px-2.5 py-1.5 text-[16px] text-[#111b21] outline-none ring-1 ring-[#25d366]/35 dark:text-[var(--wa-text)]"
            />
          ) : (
            <p className="mt-1 truncate text-[16px] text-[#111b21] dark:text-[var(--wa-text)]">
              {props.value.trim() || props.placeholder || '—'}
            </p>
          )}
        </div>
        {props.editable ? (
          editing ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={props.saving}
                onClick={() => void commit()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#25d366] hover:bg-[#25d366]/10 disabled:opacity-50"
                aria-label="Salvar"
                title="Salvar"
              >
                <Check className="h-5 w-5" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                disabled={props.saving}
                onClick={() => {
                  setDraft(props.value);
                  setEditing(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--wa-text-sec)] hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Cancelar"
                title="Cancelar"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--wa-text-sec)] hover:bg-black/5 hover:text-[#25d366] dark:hover:bg-white/5"
              aria-label={`Editar ${props.title}`}
              title="Editar"
            >
              <Pencil className="h-4 w-4" strokeWidth={2.2} />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

export const WhatsAppAccountSettingsPanel: React.FC<WhatsAppAccountSettingsPanelProps> = ({
  displayName,
  avatarUrl,
  avatarLetter,
  connected,
  page,
  onPageChange,
  onAvatarClick,
  onShareThought,
  accountWhatsappName,
  operatorDisplayName = '',
  onSaveOperatorDisplayName,
  operatorNameSaving,
  profileSection,
  accountSection,
  privacySection,
  chatsSection,
}) => {
  const [search, setSearch] = useState('');

  const title =
    page === 'home'
      ? displayName
      : ITEMS.find((i) => i.id === page)?.title || displayName;

  const identityBlock = (
    <div className="space-y-3 px-4 py-4">
      <EditableTitleValueRow
        title="Conta WhatsApp"
        value={accountWhatsappName?.trim() || displayName}
        editable={false}
      />
      <EditableTitleValueRow
        title="Seu nome no chat"
        value={operatorDisplayName}
        editable={Boolean(onSaveOperatorDisplayName)}
        saving={operatorNameSaving}
        placeholder="Nome que aparece no prefixo das mensagens"
        onSave={onSaveOperatorDisplayName}
      />
      <p className="px-1 text-[12px] leading-snug text-[#667781] dark:text-[var(--wa-text-sec)]">
        A foto e o nome da conta vêm da sessão WhatsApp conectada. O nome do chat é o seu como
        operador neste CRM — você pode personalizar.
      </p>
    </div>
  );

  const section =
    page === 'profile'
      ? (
          <>
            {identityBlock}
            {profileSection}
          </>
        )
      : page === 'account'
        ? accountSection
        : page === 'privacy'
          ? privacySection
          : page === 'chats'
            ? chatsSection
            : page === 'notifications'
              ? (
                  <p className="px-6 py-4 text-[14px] text-[var(--wa-text-sec)]">
                    Sons e alertas seguem as notificações do navegador. Permita notificações neste site para novas mensagens.
                  </p>
                )
              : page === 'shortcuts'
                ? (
                    <ul className="space-y-2 px-6 py-4 text-[14px] text-[var(--wa-text)]">
                      <li>
                        <kbd className="rounded bg-[#2a3942] px-1.5 py-0.5 text-[12px]">Esc</kbd> fecha painéis e a conversa
                      </li>
                      <li>
                        <kbd className="rounded bg-[#2a3942] px-1.5 py-0.5 text-[12px]">Enter</kbd> envia a mensagem
                      </li>
                      <li>
                        <kbd className="rounded bg-[#2a3942] px-1.5 py-0.5 text-[12px]">Shift + Enter</kbd> quebra de linha
                      </li>
                    </ul>
                  )
                : null;

  return (
    <div className="absolute inset-0 z-40 flex min-h-0 flex-col bg-[var(--wa-panel)]">
      <header className="flex h-[60px] shrink-0 items-center gap-2 px-4">
        {page !== 'home' ? (
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => onPageChange('home')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/5"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={1.75} />
          </button>
        ) : null}
        <h2 className="truncate text-[22px] font-normal text-[var(--wa-text)]">{title}</h2>
      </header>

      {page === 'home' ? (
        <>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar"
                className="wa-search-pill w-full border-0 py-2 pl-10 pr-3 text-[14px] outline-none"
              />
            </div>
          </div>
          <div className="wa-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="relative mx-auto mt-8 mb-4 flex w-fit flex-col items-center pt-4">
              <button
                type="button"
                onClick={onShareThought}
                className="wa-thought cursor-pointer"
              >
                Share a thought
              </button>
              <button
                type="button"
                onClick={onAvatarClick}
                className="h-[160px] w-[160px] overflow-hidden rounded-full bg-[#2a3942]"
                aria-label="Foto do perfil"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-4xl font-medium text-[var(--wa-text)]">
                    {avatarLetter}
                  </span>
                )}
              </button>
              <p className="mt-3 max-w-[260px] truncate text-center text-[18px] font-medium text-[var(--wa-text)]">
                {accountWhatsappName?.trim() || displayName}
              </p>
            </div>

            {identityBlock}

            {!connected ? (
              <div className="wa-sync-warn">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#ffd279]" strokeWidth={1.75} />
                <div>
                  <p className="text-[16px] font-medium text-[var(--wa-text)]">Sincronização pausada</p>
                  <p className="text-[14px] text-[var(--wa-text-sec)]">Abra o WhatsApp no seu celular.</p>
                </div>
              </div>
            ) : null}

            {ITEMS.filter((item) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              return `${item.title} ${item.subtitle}`.toLowerCase().includes(q);
            }).map((item) => (
              <button
                key={item.id}
                type="button"
                className="wa-settings-item w-full text-left"
                onClick={() => onPageChange(item.id)}
              >
                {item.icon}
                <span>
                  <span className="block text-[16px] leading-snug">{item.title}</span>
                  <span className="mt-0.5 block text-[14px] text-[var(--wa-text-sec)]">{item.subtitle}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="wa-scroll min-h-0 flex-1 overflow-y-auto">{section}</div>
      )}
    </div>
  );
};

export default WhatsAppAccountSettingsPanel;
