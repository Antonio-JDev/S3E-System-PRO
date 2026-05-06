import React, { useMemo, useRef, useState } from 'react';

interface AudioMessageProps {
  src: string;
  mimeType?: string | null;
  filename?: string | null;
}

function normalizeAudioMimeType(mimeType: string | null | undefined, filename: string | null | undefined): string {
  const mime = (mimeType || '').trim().toLowerCase();
  const lowName = (filename || '').trim().toLowerCase();
  if (mime.includes('ogg') || lowName.endsWith('.ogg') || lowName.endsWith('.oga') || lowName.endsWith('.opus')) {
    return 'audio/ogg';
  }
  if (mime.includes('webm') || lowName.endsWith('.webm')) {
    return 'audio/webm';
  }
  if (mime) return mime;
  return 'audio/ogg';
}

const AudioMessage: React.FC<AudioMessageProps> = ({ src, mimeType, filename }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolvedMime = useMemo(() => normalizeAudioMimeType(mimeType, filename), [mimeType, filename]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = useMemo(() => {
    const seed = `${filename || ''}-${src}`.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return Array.from({ length: 28 }, (_, idx) => {
      const v = Math.sin((seed + idx * 17) * 0.13);
      return 10 + Math.round(Math.abs(v) * 18);
    });
  }, [filename, src]);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const activeBars = Math.round(progress * bars.length);

  const formatTime = (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) return '0:00';
    const total = Math.max(0, Math.floor(value));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // ignore user interaction errors
      }
      return;
    }
    audio.pause();
  };

  return (
    <div className="mb-1 w-full max-w-[340px] rounded-xl border border-black/10 bg-[#f0f2f5] px-3 py-2 dark:border-white/10 dark:bg-[#202c33]">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-[#54656f] dark:text-[#8696a0]">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d9fdd3] text-[#00a884] dark:bg-[#103529]">
          🎧
        </span>
        <span className="truncate font-medium">{filename?.trim() || 'Mensagem de audio'}</span>
      </div>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(e) => setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime || 0)}
        onLoadedMetadata={(e) => setDuration((e.currentTarget as HTMLAudioElement).duration || 0)}
      >
        <source src={src} type={resolvedMime} />
        Seu navegador não suporta áudio.
      </audio>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008f6f]"
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-8 items-center gap-[2px] overflow-hidden rounded-md bg-white/70 px-2 dark:bg-[#111b21]/45">
            {bars.map((height, idx) => (
              <span
                key={`bar-${idx}`}
                className={`w-[3px] rounded-full ${idx < activeBars ? 'bg-[#00a884]' : 'bg-[#8696a0]/45'}`}
                style={{ height }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#54656f] dark:text-[#8696a0]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || currentTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioMessage;
