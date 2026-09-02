"use client";

import { useRef, useState } from "react";
import { Button } from "primereact/button";

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
    <div className="rounded-ledger border border-rule">
      <div className="flex gap-1 border-b border-rule p-1.5">
        <Button
          type="button"
          text
          severity="secondary"
          size="small"
          aria-label="Bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
        >
          <span className="font-bold">B</span>
        </Button>
        <Button
          type="button"
          text
          severity="secondary"
          size="small"
          aria-label="Bulleted list"
          label="• List"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
        />
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          className="prose-sm min-h-[120px] max-w-none px-3 py-2 text-sm text-ink focus:outline-none [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: defaultValue }}
        />
        {isEmpty && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-ink-muted">{placeholder}</span>
        ) : null}
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
