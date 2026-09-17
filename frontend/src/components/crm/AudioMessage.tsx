import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectAudioContainerMime, extractAudioWaveformPeaks } from '../../utils/whatsappVoiceAudio.util';

export type AudioMessageVariant = 'outgoing' | 'incoming';

interface AudioMessageProps {
  src: string;
  mimeType?: string | null;
  filename?: string | null;
  /** Balão enviado (verde) vs recebido — define paleta como no WhatsApp Web. */
  variant?: AudioMessageVariant;
  /** Nota de voz (PTT): selo de microfone no avatar (sem linha de nome de arquivo). */
  isVoiceNote?: boolean;
  /** Rodapé à direita (ex.: horário da mensagem + ✓✓), como no WhatsApp Web na mesma linha da duração. */
  footerRight?: React.ReactNode;
}

function MicBadgeIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.99.99 0 0 0-.98-.85c-.61 0-1.09.54-1 1.14.49 3.41 3.4 5.86 6.91 5.86s6.42-2.45 6.91-5.86a1.004 1.004 0 0 0-1-1.14zM11 24h2v-2h-2v2z" />
    </svg>
  );
}

function PlayTriangleIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseBarsIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  );
}

function placeholderBars(seedKey: string, n = 40): number[] {
  const seed = seedKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return Array.from({ length: n }, (_, idx) => {
    const v = Math.sin((seed + idx * 19) * 0.11);
    return 0.15 + Math.abs(v) * 0.75;
  });
}

const AudioMessage: React.FC<AudioMessageProps> = ({
  src,
  mimeType,
  filename,
  variant = 'incoming',
  isVoiceNote = false,
  footerRight,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [playSrc, setPlaySrc] = useState<string | null>(null);
  const [peakBars, setPeakBars] = useState<number[]>(() => placeholderBars(`${filename || ''}-${src}`));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const prevUrl = objectUrlRef.current;
    objectUrlRef.current = null;
    if (prevUrl) URL.revokeObjectURL(prevUrl);

    (async () => {
      try {
        setLoadError(false);
        const resp = await fetch(src, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        if (cancelled) return;
        const bytes = new Uint8Array(buf);
        const detected = detectAudioContainerMime(bytes, mimeType || 'audio/ogg');
        const blob = new Blob([buf], { type: detected.split(';')[0].trim() });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPlaySrc(url);

        const { peaks, durationSec } = await extractAudioWaveformPeaks(buf, 40);
        if (cancelled) return;
        setPeakBars(peaks);
        if (durationSec > 0) setDuration(durationSec);
      } catch {
        if (cancelled) return;
        // Fallback: toca direto da URL original (áudios recebidos via CDN costumam funcionar).
        setPlaySrc(src);
        setPeakBars(placeholderBars(`${filename || ''}-${src}`));
        setLoadError(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src, mimeType, filename]);

  const barsPx = useMemo(
    () => peakBars.map((amp) => 8 + Math.round(Math.max(0, Math.min(1, amp)) * 22)),
    [peakBars]
  );

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const activeBars = Math.round(progress * barsPx.length);

  const formatTime = (value: number): string => {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const total = Math.max(0, Math.floor(value));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !playSrc) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setLoadError(true);
      }
      return;
    }
    audio.pause();
  };

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = waveRef.current;
      const audio = audioRef.current;
      if (!el || !audio || !Number.isFinite(duration) || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      audio.currentTime = (x / rect.width) * duration;
    },
    [duration]
  );

  const onWavePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const onWavePointerMove = (e: React.PointerEvent) => {
    if (!e.pressure && e.buttons !== 1) return;
    seekFromClientX(e.clientX);
  };

  const outgoing = variant === 'outgoing';

  const playBtnClass = outgoing
    ? 'inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
    : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#25d366] text-white transition hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/50 dark:border-white/15';

  const barInactive = outgoing ? 'bg-[#b0ceae] dark:bg-[#b0ceae]' : 'bg-[#ced0d1] dark:bg-white/18';
  const barActive = outgoing ? 'bg-[#728977] dark:bg-[#728977]' : 'bg-[#858a8d] dark:bg-[#53bdeb]';
  const thumbClass = outgoing
    ? 'bg-[#4fc3f7] shadow-[0_0_0_2px_rgba(0,0,0,0.12)]'
    : 'bg-[#4fc3f7] shadow-[0_0_0_2px_rgba(255,255,255,0.35)]';
  const timeMuted = outgoing ? 'text-white/85' : 'text-[#54656f] dark:text-[#a9b4ba]';
  const footerMetaClass = outgoing ? 'text-[#667781] dark:text-white/80' : 'text-[#667781] dark:text-[#8696a0]';
  const avatarRing = outgoing ? 'ring-2 ring-white/25' : 'ring-2 ring-black/8 dark:ring-white/15';
  const avatarBg = outgoing ? 'bg-white/20 text-white' : 'bg-[#dfe5e7] text-[#54656f] dark:bg-[#2a3942] dark:text-[#e9edef]';

  const label = (filename || '').trim() || 'Áudio';
  const isGenericFileLabel = /^arquivo$/i.test(label) || /^audio$/i.test(label) || /^untitled$/i.test(label);
  const initial = isGenericFileLabel ? '♪' : label.replace(/\W/g, '').charAt(0).toUpperCase() || '♪';

  return (
    <div className="mb-0.5 w-full max-w-[min(100%,320px)] sm:max-w-[340px]">
      {playSrc ? (
        <audio
          ref={audioRef}
          key={playSrc}
          preload="metadata"
          src={playSrc}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={(e) => setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime || 0)}
          onLoadedMetadata={(e) => {
            const d = (e.currentTarget as HTMLAudioElement).duration || 0;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onError={() => setLoadError(true)}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0">
          <div
            className={`flex h-full w-full items-center justify-center rounded-full text-[15px] font-semibold ${avatarBg} ${avatarRing}`}
            aria-hidden
          >
            {initial}
          </div>
          {isVoiceNote ? (
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 text-[#4fc3f7] ${
                outgoing
                  ? 'border-[#d9fdd3] bg-white dark:border-[#005c4b] dark:bg-[#054740]'
                  : 'border-white bg-[#f0f2f5] dark:border-[#202c33] dark:bg-[#111b21]'
              }`}
              title="Mensagem de voz"
            >
              <MicBadgeIcon className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={!playSrc}
          className={playBtnClass}
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? (
            <PauseBarsIcon className={outgoing ? 'h-[18px] w-[18px]' : 'h-4 w-4'} />
          ) : (
            <PlayTriangleIcon className={outgoing ? 'h-6 w-6 translate-x-[2px]' : 'h-4 w-4 translate-x-[1px]'} />
          )}
        </button>

        <div
          ref={waveRef}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="Posição no áudio"
          className="relative flex min-h-[34px] min-w-0 flex-1 cursor-pointer select-none items-center gap-[2px] rounded-md px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#53bdeb]/80"
          onPointerDown={onWavePointerDown}
          onPointerMove={onWavePointerMove}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              audio.currentTime = Math.min(duration, audio.currentTime + 5);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              audio.currentTime = Math.max(0, audio.currentTime - 5);
            }
          }}
        >
          {barsPx.map((height, idx) => (
            <span
              key={`bar-${idx}`}
              className={`w-[2.5px] shrink-0 self-center rounded-full transition-colors duration-150 ${idx < activeBars ? barActive : barInactive}`}
              style={{ height }}
            />
          ))}
          <span
            className={`pointer-events-none absolute top-1/2 z-[1] h-2.5 w-2.5 rounded-full ${thumbClass}`}
            style={{ left: `${progress * 100}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>

      <div
        className={`mt-1 flex min-h-[17px] items-center justify-between gap-2 text-[11px] tabular-nums ${timeMuted}`}
        style={{ paddingLeft: 'calc(2.75rem + 0.75rem + 2.25rem)' }}
      >
        <span className="font-medium" title="Duração">
          {loadError ? 'Erro' : formatTime(Number.isFinite(duration) && duration > 0 ? (isPlaying || currentTime > 0 ? currentTime : duration) : 0)}
        </span>
        {footerRight ? (
          <div className={`ml-auto flex shrink-0 items-center gap-0.5 leading-none ${footerMetaClass}`}>{footerRight}</div>
        ) : null}
      </div>
    </div>
  );
};

export default AudioMessage;
