import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { editorToWhatsappPlainText, plainTextToTiptapDoc } from '../../utils/whatsappComposerText';
import './WhatsappComposerEditor.css';

export type WhatsappComposerEditorHandle = {
  insertAtCursor: (text: string) => void;
  focus: () => void;
};

type WhatsappComposerEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
};

function syncComposerScrollClass(el: HTMLElement) {
  if (el.scrollHeight > el.clientHeight + 1) {
    el.classList.add('is-scrollable');
  } else {
    el.classList.remove('is-scrollable');
  }
}

function FormatSelectionBubble({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty || !editor.isEditable) {
      setVisible(false);
      return;
    }
    const { view } = editor;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const left = (start.left + end.right) / 2;
    const top = Math.min(start.top, end.top) - 8;
    setPos({ top, left });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('transaction', updatePosition);
    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('transaction', updatePosition);
    };
  }, [editor, updatePosition]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (!visible || typeof document === 'undefined') return null;

  const btnClass = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-md text-[13px] font-semibold transition ${
      active
        ? 'bg-[#00a884]/15 text-[#008069] dark:bg-[#00a884]/25 dark:text-[#25d366]'
        : 'text-[#54656f] hover:bg-black/5 dark:text-[#aebac1] dark:hover:bg-white/10'
    }`;

  return createPortal(
    <div
      ref={bubbleRef}
      role="toolbar"
      aria-label="Formatação de texto"
      className="whatsapp-composer-format-bubble fixed z-[500] flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-xl border border-[#e9edef]/90 bg-white px-1.5 py-1 shadow-[0_4px_24px_rgba(11,20,26,0.16)] dark:border-[#2a3942] dark:bg-[#233138]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className={btnClass(editor.isActive('bold'))}
        aria-label="Negrito"
        title="Negrito"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('italic'))}
        aria-label="Itálico"
        title="Itálico"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <span className="mx-0.5 h-5 w-px bg-[#e9edef] dark:bg-[#2a3942]" aria-hidden />
      <button
        type="button"
        className={btnClass(editor.isActive('bulletList'))}
        aria-label="Lista com marcadores"
        title="Lista com marcadores"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('orderedList'))}
        aria-label="Lista numerada"
        title="Lista numerada"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>,
    document.body
  );
}

export const WhatsappComposerEditor = forwardRef<WhatsappComposerEditorHandle, WhatsappComposerEditorProps>(
  function WhatsappComposerEditor(
    { value, onChange, onSubmit, placeholder = 'Digite uma mensagem', disabled = false },
    ref
  ) {
    const onChangeRef = useRef(onChange);
    const onSubmitRef = useRef(onSubmit);
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          code: false,
          strike: false,
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: '',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'whatsapp-composer-prosemirror',
          'data-placeholder': placeholder,
        },
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmitRef.current();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChangeRef.current(editorToWhatsappPlainText(ed));
        syncComposerScrollClass(ed.view.dom as HTMLElement);
      },
    });

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [editor, disabled]);

    useEffect(() => {
      if (!editor) return;
      const el = editor.view.dom as HTMLElement;
      const onResize = () => syncComposerScrollClass(el);
      syncComposerScrollClass(el);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [editor]);

    useEffect(() => {
      if (!editor) return;
      const current = editorToWhatsappPlainText(editor);
      if (value === current) return;
      if (!value.trim()) {
        editor.commands.clearContent(true);
        syncComposerScrollClass(editor.view.dom as HTMLElement);
        return;
      }
      editor.commands.setContent(plainTextToTiptapDoc(value), { emitUpdate: false });
      syncComposerScrollClass(editor.view.dom as HTMLElement);
    }, [value, editor]);

    const insertAtCursor = useCallback(
      (text: string) => {
        if (!editor || !text) return;
        editor.chain().focus().insertContent(text).run();
        onChangeRef.current(editorToWhatsappPlainText(editor));
        syncComposerScrollClass(editor.view.dom as HTMLElement);
      },
      [editor]
    );

    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor,
        focus: () => {
          requestAnimationFrame(() => editor?.commands.focus('end'));
        },
      }),
      [editor, insertAtCursor]
    );

    if (!editor) {
      return <div className="whatsapp-composer-shell min-h-[40px] min-w-0 flex-1" />;
    }

    return (
      <div className="whatsapp-composer-shell relative min-h-[40px] min-w-0 flex-1">
        <FormatSelectionBubble editor={editor} />
        <EditorContent editor={editor} className="whatsapp-composer-editor h-full min-h-[40px] w-full" />
      </div>
    );
  }
);
