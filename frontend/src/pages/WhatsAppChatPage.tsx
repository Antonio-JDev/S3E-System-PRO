import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WhatsAppChatPanel } from '../components/crm/WhatsAppChatPanel';
import { canonicalWhatsappChatId, formatPhoneForDisplay } from '../utils/whatsappChat';

const Bars3Icon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

export interface WhatsappChatSeed {
  chatId: string;
  title: string;
}

interface WhatsAppChatPageProps {
  toggleSidebar: () => void;
  initialWhatsappChat?: WhatsappChatSeed | null;
  onClearInitialWhatsappChat?: () => void;
}

/**
 * Página dedicada do chat (lista + conversa em largura total, estilo WhatsApp Web desktop).
 */
const WhatsAppChatPage: React.FC<WhatsAppChatPageProps> = ({
  toggleSidebar,
  initialWhatsappChat,
  onClearInitialWhatsappChat,
}) => {
  const [chatId, setChatId] = useState('');
  const [title, setTitle] = useState('');
  const seededInitialChatIdRef = useRef<string>('');

  useEffect(() => {
    if (initialWhatsappChat?.chatId) {
      const canon = canonicalWhatsappChatId(initialWhatsappChat.chatId);
      // Evita “vazar” o título inicial para outras conversas caso o pai recrie `onClearInitialWhatsappChat`
      // (o effect poderia reexecutar e re-seedar o título antigo).
      if (seededInitialChatIdRef.current === canon) return;
      seededInitialChatIdRef.current = canon;
      setChatId(canon);
      setTitle(initialWhatsappChat.title ?? '');
      onClearInitialWhatsappChat?.();
    }
  }, [initialWhatsappChat, onClearInitialWhatsappChat]);

  const handleNavigateChat = useCallback((cid: string, label: string) => {
    const canon = canonicalWhatsappChatId(cid);
    setChatId(canon);
    const trimmed = label?.trim() ?? '';
    setTitle(trimmed || formatPhoneForDisplay(canon));
  }, []);

  const handleCloseChat = useCallback(() => {
    setChatId('');
    setTitle('');
  }, []);

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-gray-50 dark:bg-dark-bg p-4 sm:p-6">
      <header className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden rounded-xl p-2 text-gray-600 hover:bg-white dark:text-dark-text-secondary dark:hover:bg-dark-card"
            aria-label="Abrir menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text sm:text-3xl">WhatsApp</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary">
              Conversas integradas ao CRM — use o funil para abrir um lead direto aqui.
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-[#111b21]">
        <WhatsAppChatPanel
          chatId={chatId}
          title={title}
          layout="full"
          onClose={handleCloseChat}
          onNavigateChat={handleNavigateChat}
        />
      </div>
    </div>
  );
};

export default WhatsAppChatPage;
