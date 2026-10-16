import React, { useEffect, useRef, useState } from 'react';
import { loadWhatsappProfilePictureObjectUrl } from '../../services/whatsappChatService';
import {
  isWhatsappProfilePictureMissing,
  markWhatsappProfilePictureMissing,
} from '../../utils/whatsappProfilePictureSessionCache';

/** Avatar da lista: baixa a foto só quando a linha entra na tela, com Authorization e cache em memória. */
export function WhatsAppLazyAvatar({
  chatId,
  hasPicture,
  className,
  fallback,
}: {
  chatId: string;
  hasPicture: boolean;
  className: string;
  fallback: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasPicture) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '160px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasPicture, chatId]);

  useEffect(() => {
    if (!visible || !hasPicture || isWhatsappProfilePictureMissing(chatId)) return;
    let cancel = false;
    loadWhatsappProfilePictureObjectUrl(chatId)
      .then((url) => {
        if (cancel) return;
        if (!url) markWhatsappProfilePictureMissing(chatId);
        setSrc(url);
      })
      .catch(() => {
        if (!cancel) markWhatsappProfilePictureMissing(chatId);
      });
    return () => {
      cancel = true;
    };
  }, [visible, hasPicture, chatId]);

  return (
    <span ref={ref} className={className}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : fallback}
    </span>
  );
}
