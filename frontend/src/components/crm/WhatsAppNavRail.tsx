import React from 'react';
import { MessageSquare, Sparkles, Settings } from 'lucide-react';
import type { WaNavId } from '../../theme/whatsappWebTokens';

type NavItem = {
  id: WaNavId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

interface WhatsAppNavRailProps {
  active: WaNavId;
  chatsBadge?: number;
  profileUrl?: string | null;
  profileLetter: string;
  onSelect: (id: WaNavId) => void;
  onProfile: () => void;
}

export const WhatsAppNavRail: React.FC<WhatsAppNavRailProps> = ({
  active,
  chatsBadge = 0,
  profileUrl,
  profileLetter,
  onSelect,
  onProfile,
}) => {
  const items: NavItem[] = [
    {
      id: 'chats',
      label: 'Conversas',
      icon: <MessageSquare className="h-[22px] w-[22px]" strokeWidth={2.4} />,
      badge: chatsBadge,
    },
    {
      id: 'ai',
      label: 'Meta AI',
      icon: <Sparkles className="h-[22px] w-[22px] text-[#c084fc]" strokeWidth={2.4} />,
    },
  ];

  return (
    <nav
      className="wa-nav-rail hidden h-full shrink-0 flex-col items-center py-3 min-[780px]:flex"
      aria-label="Navegação do WhatsApp"
    >
      <div className="flex flex-1 flex-col items-center gap-1.5 pt-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-current={active === item.id ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
            className={`wa-nav-btn ${active === item.id ? 'is-active' : ''}`}
          >
            {item.icon}
            {item.badge && item.badge > 0 ? (
              <span className="wa-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 pb-1">
        <button
          type="button"
          title="Configurações"
          aria-label="Configurações"
          aria-current={active === 'settings' ? 'page' : undefined}
          onClick={() => onSelect('settings')}
          className={`wa-nav-btn ${active === 'settings' ? 'is-active' : ''}`}
        >
          <Settings className="h-[22px] w-[22px]" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          title="Meu perfil"
          aria-label="Meu perfil"
          onClick={onProfile}
          className="mt-1 flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#2a3942]"
        >
          {profileUrl ? (
            <img src={profileUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[13px] font-medium text-[var(--wa-text)]">{profileLetter}</span>
          )}
        </button>
      </div>
    </nav>
  );
};

export default WhatsAppNavRail;
