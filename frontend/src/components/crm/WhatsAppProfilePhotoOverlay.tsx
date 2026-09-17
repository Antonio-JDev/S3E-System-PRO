import React from 'react';
import { X } from 'lucide-react';

interface WhatsAppProfilePhotoOverlayProps {
  open: boolean;
  name: string;
  avatarUrl?: string | null;
  thumbUrl?: string | null;
  onClose: () => void;
}

export const WhatsAppProfilePhotoOverlay: React.FC<WhatsAppProfilePhotoOverlayProps> = ({
  open,
  name,
  avatarUrl,
  thumbUrl,
  onClose,
}) => {
  if (!open) return null;
  const src = avatarUrl || thumbUrl || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto de ${name}`}
      className="wa-photo-overlay absolute inset-0 z-[70] flex flex-col"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 px-4">
        {thumbUrl || avatarUrl ? (
          <img src={thumbUrl || avatarUrl || ''} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a3942] text-[12px] text-[#e9edef]">
            {name.trim().charAt(0).toUpperCase() || '?'}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-[16px] font-medium text-[#e9edef]">{name}</p>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#e9edef] hover:bg-white/10"
        >
          <X className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 pb-10">
        {src ? (
          <img
            src={src}
            alt={name}
            className="max-h-[min(72vh,640px)] max-w-[min(72vw,640px)] object-cover shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
          />
        ) : (
          <div className="flex h-[min(72vw,420px)] w-[min(72vw,420px)] items-center justify-center bg-[#2a3942] text-6xl text-[#e9edef]">
            {name.trim().charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppProfilePhotoOverlay;
