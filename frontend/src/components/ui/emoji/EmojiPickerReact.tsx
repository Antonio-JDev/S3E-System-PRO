import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerReactProps {
  theme: 'light' | 'dark';
  onSelect: (emoji: string) => void;
  /** Altura do grid (px). Padrão 420. */
  height?: number;
}

export default function EmojiPickerReact({ theme, onSelect, height = 420 }: EmojiPickerReactProps) {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji || '');
  };

  return (
    <div className="emoji-picker-react-root [&_.EmojiPickerReact]:!w-full [&_.EmojiPickerReact]:max-w-full">
      <EmojiPicker
        open
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.APPLE}
        onEmojiClick={handleEmojiClick}
        searchPlaceholder="Buscar emojis"
        width="100%"
        height={height}
        lazyLoadEmojis
        autoFocusSearch={false}
        previewConfig={{
          showPreview: true,
          defaultCaption: 'Qual o humor?',
        }}
      />
    </div>
  );
}
