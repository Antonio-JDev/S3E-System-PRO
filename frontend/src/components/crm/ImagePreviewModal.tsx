import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface ImagePreviewModalProps {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

type Point = { x: number; y: number };

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ open, imageUrl, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const scrollFreezeRef = useRef<{ y: number; prevOverflow: string; prevPosition: string; prevTop: string; prevLeft: string; prevRight: string; prevWidth: string } | null>(null);
  const draggingRef = useRef<{ active: boolean; start: Point; base: Point }>({
    active: false,
    start: { x: 0, y: 0 },
    base: { x: 0, y: 0 },
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canInteract = open && Boolean(imageUrl);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    setMounted(true);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    // Mantém a posição e evita “pulo” ao ocultar scrollbar do body.
    lastActiveElementRef.current =
      (document.activeElement && document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const y = window.scrollY || 0;
    const st = document.body.style;
    scrollFreezeRef.current = {
      y,
      prevOverflow: st.overflow,
      prevPosition: st.position,
      prevTop: st.top,
      prevLeft: st.left,
      prevRight: st.right,
      prevWidth: st.width,
    };

    st.overflow = 'hidden';
    st.position = 'fixed';
    st.top = `-${y}px`;
    st.left = '0';
    st.right = '0';
    st.width = '100%';

    return () => {
      const snap = scrollFreezeRef.current;
      if (snap) {
        const st2 = document.body.style;
        st2.overflow = snap.prevOverflow;
        st2.position = snap.prevPosition;
        st2.top = snap.prevTop;
        st2.left = snap.prevLeft;
        st2.right = snap.prevRight;
        st2.width = snap.prevWidth;
        window.scrollTo(0, snap.y);
      }

      // Restaura foco onde o usuário estava no chat.
      const el = lastActiveElementRef.current;
      if (el && typeof el.focus === 'function') {
        try {
          el.focus({ preventScroll: true } as any);
        } catch {
          try {
            el.focus();
          } catch {
            // ignore
          }
        }
      }
    };
  }, [open]);

  const transform = useMemo(() => {
    const s = clamp(scale, 1, 4);
    const x = Number.isFinite(offset.x) ? offset.x : 0;
    const y = Number.isFinite(offset.y) ? offset.y : 0;
    return { s, x, y };
  }, [scale, offset.x, offset.y]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!canInteract) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const step = Math.abs(delta) > 20 ? 0.18 : 0.08;
    setScale((prev) => clamp(prev + (delta > 0 ? step : -step), 1, 4));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canInteract) return;
    if (transform.s <= 1) return;
    draggingRef.current.active = true;
    draggingRef.current.start = { x: e.clientX, y: e.clientY };
    draggingRef.current.base = { x: transform.x, y: transform.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canInteract) return;
    if (!draggingRef.current.active) return;
    const dx = e.clientX - draggingRef.current.start.x;
    const dy = e.clientY - draggingRef.current.start.y;
    setOffset({ x: draggingRef.current.base.x + dx, y: draggingRef.current.base.y + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!canInteract) return;
    if (!draggingRef.current.active) return;
    draggingRef.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleDoubleClick = () => {
    if (!canInteract) return;
    setScale((prev) => (prev <= 1 ? 2 : 1));
    setOffset({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const resp = await fetch(imageUrl, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp_image_${Date.now()}.png`;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível baixar a imagem');
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de imagem"
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-black/85 transition-opacity duration-150 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={containerRef} className="relative h-full w-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#2a3942] bg-[#202c33]/90 text-[#e9edef] hover:bg-[#2a3942]"
          aria-label="Fechar visualizador"
          title="Fechar"
        >
          <CloseXIcon className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 rounded-lg bg-[#00a884] px-4 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-[#008f6f]"
          aria-label="Baixar imagem"
          title="Baixar imagem"
        >
          <DownloadIcon className="h-4 w-4" />
          Baixar imagem
        </button>

        <div
          className="flex h-full w-full items-center justify-center"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: transform.s > 1 ? 'none' : 'pan-x pan-y' }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Imagem"
              draggable={false}
              onDoubleClick={handleDoubleClick}
              className="max-h-[92vh] max-w-[92vw] select-none object-contain"
              style={{
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.s})`,
                transition: draggingRef.current.active ? 'none' : 'transform 120ms ease-out',
                cursor: transform.s > 1 ? (draggingRef.current.active ? 'grabbing' : 'grab') : 'default',
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CloseXIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const DownloadIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export default ImagePreviewModal;

