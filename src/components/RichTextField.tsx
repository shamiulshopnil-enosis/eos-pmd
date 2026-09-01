"use client";

import { useRef, useState } from "react";

/**
 * Minimal rich-text editor for milestone descriptions: bold + bulleted list only.
 * Stores HTML in a hidden input so it submits with the surrounding form; the
 * server re-sanitizes on save (src/lib/richtext.ts).
 */
export function RichTextField({
  name,
  defaultValue = "",
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);

  function sync() {
    setHtml(editorRef.current?.innerHTML ?? "");
  }

  function exec(command: "bold" | "insertUnorderedList") {
    editorRef.current?.focus();
    document.execCommand(command, false);
    sync();
  }

  const isEmpty = html.replace(/<[^>]*>/g, "").trim() === "";

  return (
    <div className="rounded-lg border border-slate-300 dark:border-slate-700">
      <div className="flex gap-1 border-b border-slate-200 p-1.5 dark:border-slate-700">
        <ToolbarButton onClick={() => exec("bold")} label="Bold">
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertUnorderedList")} label="Bulleted list">
          &#8226; List
        </ToolbarButton>
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          className="prose-sm min-h-[120px] max-w-none px-3 py-2 text-sm text-slate-900 focus:outline-none dark:text-slate-100 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: defaultValue }}
        />
        {isEmpty && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">{placeholder}</span>
        ) : null}
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}
