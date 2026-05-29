import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WhatsAppChatPanel } from '../components/crm/WhatsAppChatPanel';
import { useMatchMedia, WA_MOBILE_MEDIA } from '../hooks/useMatchMedia';
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

  const isWaMobile = useMatchMedia(WA_MOBILE_MEDIA);

  useEffect(() => {
    if (isWaMobile && chatId) {
      document.body.setAttribute('data-wa-mobile-chat', 'open');
    } else {
      document.body.removeAttribute('data-wa-mobile-chat');
    }
    return () => document.body.removeAttribute('data-wa-mobile-chat');
  }, [isWaMobile, chatId]);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-gray-50 dark:bg-dark-bg ${
        isWaMobile ? 'fixed inset-0 z-[35] bg-white dark:bg-[#161717]' : ''
      }`}
    >
      {/* Header removido para o chat ocupar toda a área útil (estilo WhatsApp Web). */}
      <div className="min-h-0 flex-1 overflow-hidden">
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
