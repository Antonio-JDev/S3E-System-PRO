import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

export interface EmojiMartNative {
  native?: string;
}

interface EmojiMartPickerProps {
  theme: 'light' | 'dark';
  onSelect: (emoji: string) => void;
}

export default function EmojiMartPicker({ theme, onSelect }: EmojiMartPickerProps) {
  return (
    <Picker
      data={data}
      theme={theme}
      locale="pt"
      previewPosition="none"
      skinTonePosition="none"
      onEmojiSelect={(value: EmojiMartNative) => onSelect(value?.native || '')}
    />
  );
}
