"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  label,
  title,
  active = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-green-700 bg-green-700 text-white"
          : "border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the answer guide here...",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,

      TableKit.configure({
        table: {
          resizable: true,
        },
      }),
    ],

    content: value,

    editorProps: {
      attributes: {
        class:
          "rich-text-editor min-h-[320px] px-4 py-4 text-gray-950 outline-none",
        "data-placeholder": placeholder,
      },
    },

    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="rounded-xl border border-gray-300 bg-white p-5 text-gray-700">
        Loading editor...
      </div>
    );
  }

  function insertTable() {
    editor
      .chain()
      .focus()
      .insertTable({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      })
      .run();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-gray-300 bg-gray-50 p-3">
        <ToolbarButton
          label="B"
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        />

        <ToolbarButton
          label="I"
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        />

        <ToolbarButton
          label="Strike"
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() =>
            editor.chain().focus().toggleStrike().run()
          }
        />

        <ToolbarButton
          label="H2"
          title="Heading level 2"
          active={editor.isActive("heading", {
            level: 2,
          })}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 2,
              })
              .run()
          }
        />

        <ToolbarButton
          label="H3"
          title="Heading level 3"
          active={editor.isActive("heading", {
            level: 3,
          })}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 3,
              })
              .run()
          }
        />

        <ToolbarButton
          label="• List"
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
        />

        <ToolbarButton
          label="1. List"
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
        />

        <ToolbarButton
          label="Quote"
          title="Block quote"
          active={editor.isActive("blockquote")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run()
          }
        />

        <ToolbarButton
          label="Table"
          title="Insert a 3 × 3 table"
          onClick={insertTable}
        />

        <ToolbarButton
          label="+ Row"
          title="Add table row"
          disabled={!editor.can().addRowAfter()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .addRowAfter()
              .run()
          }
        />

        <ToolbarButton
          label="- Row"
          title="Delete table row"
          disabled={!editor.can().deleteRow()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .deleteRow()
              .run()
          }
        />

        <ToolbarButton
          label="+ Column"
          title="Add table column"
          disabled={!editor.can().addColumnAfter()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .addColumnAfter()
              .run()
          }
        />

        <ToolbarButton
          label="- Column"
          title="Delete table column"
          disabled={!editor.can().deleteColumn()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .deleteColumn()
              .run()
          }
        />

        <ToolbarButton
          label="Delete Table"
          title="Delete the selected table"
          disabled={!editor.can().deleteTable()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .deleteTable()
              .run()
          }
        />

        <ToolbarButton
          label="Undo"
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() =>
            editor.chain().focus().undo().run()
          }
        />

        <ToolbarButton
          label="Redo"
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() =>
            editor.chain().focus().redo().run()
          }
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}