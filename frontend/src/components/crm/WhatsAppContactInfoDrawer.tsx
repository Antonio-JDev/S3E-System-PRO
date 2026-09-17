import React from 'react';
import {
  X,
  Pencil,
  Search,
  Star,
  Bell,
  Timer,
  Shield,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';

export type ContactMediaThumb = { id: string; src: string; alt: string };

interface WhatsAppContactInfoDrawerProps {
  name: string;
  phone: string;
  avatarUrl?: string | null;
  avatarLetter: string;
  mediaCount: number;
  mediaThumbs: ContactMediaThumb[];
  muted: boolean;
  muteUntilLabel?: string;
  onClose: () => void;
  onEdit?: () => void;
  onAvatarClick?: () => void;
  onSearch?: () => void;
  onStarred?: () => void;
  onToggleMute: () => void;
  onTemporary?: () => void;
  onPrivacy?: () => void;
  onEncryption?: () => void;
  children?: React.ReactNode;
}

export const WhatsAppContactInfoDrawer: React.FC<WhatsAppContactInfoDrawerProps> = ({
  name,
  phone,
  avatarUrl,
  avatarLetter,
  mediaCount,
  mediaThumbs,
  muted,
  muteUntilLabel,
  onClose,
  onEdit,
  onAvatarClick,
  onSearch,
  onStarred,
  onToggleMute,
  onTemporary,
  onPrivacy,
  onEncryption,
  children,
}) => {
  return (
    <aside className="wa-contact-drawer hidden h-full min-h-0 shrink-0 flex-col min-[780px]:flex" aria-label="Dados do contato">
      <header className="flex h-[60px] shrink-0 items-center gap-1 bg-[#202c33] px-2">
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/5"
        >
          <X className="h-6 w-6" strokeWidth={1.75} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-medium text-[var(--wa-text)]">Dados do contato</h2>
        <button
          type="button"
          aria-label="Editar contato"
          title="Editar"
          onClick={onEdit}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#aebac1] hover:bg-white/5"
        >
          <Pencil className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="wa-scroll min-h-0 flex-1 overflow-y-auto bg-[var(--wa-panel)]">
        <div className="flex flex-col items-center px-4 pb-5 pt-7">
          <button
            type="button"
            onClick={onAvatarClick}
            className="h-[200px] w-[200px] overflow-hidden rounded-full bg-[#2a3942]"
            aria-label={`Ver foto de ${name}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-5xl font-medium text-[var(--wa-text)]">
                {avatarLetter}
              </span>
            )}
          </button>
          <p className="mt-4 text-center text-[24px] font-normal leading-tight text-[var(--wa-text)]">{name}</p>
          <p className="mt-1 text-center text-[16px] text-[var(--wa-text-sec)]">{phone}</p>
          <div className="mt-6 flex items-start justify-center gap-8">
            <button type="button" className="wa-contact-action" onClick={onSearch}>
              <span className="wa-contact-action-circle">
                <Search className="h-5 w-5" strokeWidth={1.75} />
              </span>
              Pesquisar
            </button>
          </div>
        </div>

        <div className="mt-2 border-t border-[#222d34] px-6 py-4">
          <button
            type="button"
            onClick={onSearch}
            className="flex w-full items-center gap-3 text-left"
          >
            <ImageIcon className="h-5 w-5 shrink-0 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 text-[16px] text-[var(--wa-text)]">Mídia, links e docs</span>
            <span className="text-[14px] text-[var(--wa-text-sec)]">{mediaCount}</span>
          </button>
          {mediaThumbs.length > 0 ? (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {mediaThumbs.slice(0, 4).map((m) => (
                <a
                  key={m.id}
                  href={m.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-[74px] w-[74px] shrink-0 overflow-hidden rounded-[4px] bg-[#2a3942]"
                  title={m.alt}
                >
                  <img src={m.src} alt={m.alt} className="h-full w-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--wa-text-sec)]">Nenhuma mídia nesta conversa.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onStarred}
          className="flex w-full items-center gap-4 border-t border-[#222d34] px-6 py-4 text-left hover:bg-white/[0.03]"
        >
          <Star className="h-5 w-5 shrink-0 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
          <span className="text-[16px] text-[var(--wa-text)]">Mensagens favoritas</span>
        </button>

        <div className="flex items-center gap-4 border-t border-[#222d34] px-6 py-3.5">
          <Bell className="h-5 w-5 shrink-0 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] text-[var(--wa-text)]">Silenciada</p>
            {muted && muteUntilLabel ? (
              <p className="text-[13px] text-[var(--wa-text-sec)]">{muteUntilLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={muted}
            aria-label="Silenciar conversa"
            onClick={onToggleMute}
            className={`wa-toggle ${muted ? 'is-on' : ''}`}
          />
        </div>

        <button
          type="button"
          onClick={onTemporary}
          className="flex w-full items-start gap-4 border-t border-[#222d34] px-6 py-3.5 text-left hover:bg-white/[0.03]"
        >
          <Timer className="h-5 w-5 shrink-0 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
          <div>
            <p className="text-[16px] text-[var(--wa-text)]">Mensagens temporárias</p>
            <p className="text-[13px] text-[var(--wa-text-sec)]">Desativadas</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onPrivacy}
          className="flex w-full items-start gap-4 border-t border-[#222d34] px-6 py-3.5 text-left hover:bg-white/[0.03]"
        >
          <Shield className="h-5 w-5 shrink-0 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
          <div>
            <p className="text-[16px] text-[var(--wa-text)]">Privacidade avançada da conversa</p>
            <p className="text-[13px] text-[var(--wa-text-sec)]">Desativada</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onEncryption}
          className="flex w-full items-center gap-4 border-t border-[#222d34] px-6 py-3.5 text-left hover:bg-white/[0.03]"
        >
          <Lock className="h-5 w-5 shrink-0 text-[var(--wa-text-sec)]" strokeWidth={1.75} />
          <span className="text-[16px] text-[var(--wa-text)]">Criptografia</span>
        </button>

        {children ? <div className="border-t border-[#222d34] px-4 py-4">{children}</div> : null}
      </div>
    </aside>
  );
};

export default WhatsAppContactInfoDrawer;
