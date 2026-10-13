"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { useId, useState, type ReactNode } from "react";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { normalizeUrl, plainToHtml } from "@/lib/richText";

type Props = {
  /** HTML (or plain text, which is converted). Read once on mount; remount with a `key` to reset. */
  value: string;
  onChange: (html: string) => void;
  label: string;
  placeholder?: string;
  hint?: string;
  minHeightClass?: string;
};

export function RichTextEditor({ value, onChange, label, placeholder, hint, minHeightClass = "min-h-40" }: Props) {
  const labelId = useId();

  const editor = useEditor({
    // Required for server rendering: the editor mounts in the browser only.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto", "tel"] },
        // Not offered in the toolbar, so don't let markdown shortcuts create them either.
        code: false,
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
    ],
    content: plainToHtml(value),
    editorProps: {
      attributes: {
        class: `rich-text ${minHeightClass} px-4 py-3 focus:outline-none`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
      },
    },
    // Trailing empty paragraphs (a stray Enter at the end) are not worth saving.
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML().replace(/(<p>(<br[^>]*>)?<\/p>)+$/, "")),
  });

  return (
    <div>
      <span id={labelId} className="mb-2 block text-xs font-bold text-muted">
        {label}
      </span>
      <div className="overflow-hidden rounded-lg border border-line bg-surface focus-within:border-gold">
        {editor ? <Toolbar editor={editor} /> : <div className="h-[49px] border-b border-line bg-surface-2" aria-hidden />}
        <EditorContent editor={editor} />
        <Footer editor={editor} hint={hint} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string>();

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  // A fresh chain per click: chains are consumed when run.
  const run = () => editor.chain().focus();

  function openLink() {
    setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setUrlError(undefined);
    setLinkOpen(true);
  }

  function applyLink() {
    const href = normalizeUrl(url);
    if (!href) {
      setUrlError("Enter a web address like example.com, an email or a phone number (tel:).");
      return;
    }
    const { from, to } = editor.state.selection;
    if (from === to && !editor.isActive("link")) {
      // Nothing selected: insert the address itself as the link text.
      editor.chain().focus().insertContent({ type: "text", text: url.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  return (
    <div className="border-b border-line bg-surface-2">
      <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 p-2">
        <Btn label="Bold" shortcut="Ctrl+B" active={s.bold} onClick={() => run().toggleBold().run()}>
          <Bold size={15} />
        </Btn>
        <Btn label="Italic" shortcut="Ctrl+I" active={s.italic} onClick={() => run().toggleItalic().run()}>
          <Italic size={15} />
        </Btn>
        <Btn label="Underline" shortcut="Ctrl+U" active={s.underline} onClick={() => run().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </Btn>
        <Btn label="Strikethrough" active={s.strike} onClick={() => run().toggleStrike().run()}>
          <Strikethrough size={15} />
        </Btn>
        <Sep />
        <Btn label="Heading" active={s.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </Btn>
        <Btn label="Bullet list" active={s.bullet} onClick={() => run().toggleBulletList().run()}>
          <List size={15} />
        </Btn>
        <Btn label="Numbered list" active={s.ordered} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </Btn>
        <Btn label="Quote" active={s.quote} onClick={() => run().toggleBlockquote().run()}>
          <Quote size={15} />
        </Btn>
        <Sep />
        <Btn label="Add link" active={s.link || linkOpen} onClick={openLink}>
          <Link2 size={15} />
        </Btn>
        <Btn label="Remove link" disabled={!s.link} onClick={() => run().extendMarkRange("link").unsetLink().run()}>
          <Link2Off size={15} />
        </Btn>
        <Btn label="Clear formatting" onClick={() => run().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting size={15} />
        </Btn>
        <Sep />
        <Btn label="Undo" disabled={!s.canUndo} onClick={() => run().undo().run()}>
          <Undo2 size={15} />
        </Btn>
        <Btn label="Redo" disabled={!s.canRedo} onClick={() => run().redo().run()}>
          <Redo2 size={15} />
        </Btn>
      </div>

      {linkOpen && (
        <div className="border-t border-line p-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="rte-link-url">
              Link address
            </label>
            <input
              id="rte-link-url"
              autoFocus
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") setLinkOpen(false);
              }}
              placeholder="https://example.com"
              aria-invalid={!!urlError}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-text placeholder:text-dim focus:border-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={applyLink}
              className="h-10 rounded-lg bg-gradient-to-b from-gold to-amber px-4 text-xs font-bold text-ink hover:brightness-110 focus-visible:focus-ring"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="h-10 rounded-lg px-3 text-xs font-bold text-muted hover:text-text focus-visible:focus-ring"
            >
              Cancel
            </button>
          </div>
          {urlError && <p className="mt-2 text-xs text-danger">{urlError}</p>}
        </div>
      )}
    </div>
  );
}

function Footer({ editor, hint }: { editor: Editor | null; hint?: string }) {
  const count = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? e.getText().length : 0),
  });
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-4 py-2 text-[11px] text-dim">
      <span>{hint ?? "Select text to format it."}</span>
      <span aria-live="off">{count ?? 0} characters</span>
    </div>
  );
}

function Btn({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection: don't let the button steal focus from the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-md border transition-colors focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-gold/60 bg-gold/15 text-gold" : "border-transparent text-muted hover:bg-white/5 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}
