"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { toastError, toastSuccess } from "@/components/toast";
import { Badge } from "@/components/ui";

export type Person = {
  id?: string;
  email: string;
  name: string | null;
  role?: string;
  invitePending?: boolean;
};

type NewPerson = { id: string; email: string; name: string | null };

/**
 * Search-to-add people picker. Type a name or email; matching people from the
 * directory drop down; click one to add it as a chip below the search box.
 * When nothing matches and `addPerson` is given, an inline "add someone new"
 * form (name + email) creates the person and selects them.
 *
 * Emits a hidden <input name={name}> per selected person (id or email, per
 * `emit`), plus one empty input so the field always submits.
 */
export default function PeoplePicker({
  directory,
  name = "memberIds",
  emit = "id",
  defaultSelected = [],
  placeholder = "Search people by name or email…",
  addPerson,
  addContextLabel = "your company",
  emptyHint,
  selectedLayout = "chips",
  leadRole = "owner",
}: {
  directory: Person[];
  name?: string;
  emit?: "id" | "email";
  defaultSelected?: string[];
  placeholder?: string;
  addPerson?: (input: { name: string; email: string }) => Promise<NewPerson>;
  addContextLabel?: string;
  emptyHint?: ReactNode;
  /** "chips" = compact pills (forms); "rows" = full-width list with a right-aligned remove button. */
  selectedLayout?: "chips" | "rows";
  /** Role value that gets the accent badge in "rows" layout. */
  leadRole?: string;
}) {
  const key = (p: Person) => (emit === "id" ? p.id ?? p.email : p.email);

  const [extra, setExtra] = useState<Person[]>([]);
  const pool = useMemo(() => {
    const seen = new Set(directory.map(key));
    return [...directory, ...extra.filter((p) => !seen.has(key(p)))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directory, extra]);

  const byKey = useMemo(() => new Map(pool.map((p) => [key(p), p])), [pool]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    defaultSelected.filter((k) => pool.some((p) => key(p) === k)),
  );
  const selected = selectedKeys.map((k) => byKey.get(k)).filter((p): p is Person => !!p);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pending, startAdd] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click outside; keep open while interacting inside (nested inputs).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const personLabel = (p: Person) => (p.name ? `${p.name} · ${p.email}` : p.email);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pool
      .filter((p) => !selectedKeys.includes(key(p)))
      .filter((p) => (needle ? `${p.name ?? ""} ${p.email}`.toLowerCase().includes(needle) : true))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, q, selectedKeys]);

  const add = (p: Person) => {
    setSelectedKeys((s) => (s.includes(key(p)) ? s : [...s, key(p)]));
    setQ("");
    setAdding(false);
    setOpen(false);
  };
  const remove = (k: string) => setSelectedKeys((s) => s.filter((x) => x !== k));

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());

  const runAdd = () => {
    if (!addPerson || !emailLooksValid) return;
    startAdd(async () => {
      try {
        const created = await addPerson({ name: newName.trim(), email: newEmail.trim() });
        const person: Person = {
          id: created.id,
          email: created.email,
          name: created.name,
          invitePending: true,
        };
        setExtra((e) => [...e, person]);
        setSelectedKeys((s) => [...s, key(person)]);
        setQ("");
        setNewName("");
        setNewEmail("");
        setAdding(false);
        setOpen(false);
        toastSuccess(`${created.name || created.email} added to ${addContextLabel}.`);
      } catch {
        toastError("Couldn't add that person. Check the email and try again.");
      }
    });
  };

  const openAddForm = () => {
    const looksEmail = q.includes("@");
    setNewEmail(looksEmail ? q.trim() : "");
    setNewName(looksEmail ? "" : q.trim());
    setAdding(true);
  };

  return (
    <div className="eos-people" ref={rootRef}>
      <input type="hidden" name={name} value="" />
      {selected.map((p) => (
        <input key={key(p)} type="hidden" name={name} value={key(p)} />
      ))}

      <div className="relative">
        <IconField iconPosition="left" className="block">
          <InputIcon className="pi pi-search" />
          <InputText
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setAdding(false);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full"
          />
        </IconField>

        {open ? (
          <div className="eos-people-pop">
            {matches.length > 0 && !adding ? (
              <ul>
                {matches.map((p) => (
                  <li key={key(p)}>
                    <button type="button" className="eos-people-opt" onClick={() => add(p)}>
                      <span className="truncate">{personLabel(p)}</span>
                      {p.invitePending ? <span className="text-xs text-rag-warn">not signed in</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {matches.length === 0 && !adding ? (
              <div className="eos-people-empty">
                <p className="text-xs text-ink-muted">
                  {q.trim() ? `No one in ${addContextLabel} matches "${q.trim()}".` : "Start typing a name or email."}
                </p>
                {addPerson && q.trim() ? (
                  <Button
                    type="button"
                    text
                    size="small"
                    icon="pi pi-plus"
                    label="Add someone new"
                    onClick={openAddForm}
                  />
                ) : null}
              </div>
            ) : null}

            {adding && addPerson ? (
              <div className="eos-people-add">
                <div className="mb-2 text-xs font-semibold text-ink">Add a new person</div>
                <div className="space-y-2">
                  <InputText
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name (optional)"
                    className="w-full"
                  />
                  <InputText
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Work email"
                    type="email"
                    className="w-full"
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    type="button"
                    size="small"
                    label="Add & select"
                    loading={pending}
                    disabled={!emailLooksValid}
                    onClick={runAdd}
                  />
                  <Button type="button" text size="small" label="Cancel" onClick={() => setAdding(false)} />
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  They become active the first time they sign in with this email.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selected.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">
          {emptyHint ?? "No one assigned yet — search above to add people."}
        </p>
      ) : selectedLayout === "rows" ? (
        <ul className="mt-2 divide-y divide-rule overflow-hidden rounded-control border border-rule">
          {selected.map((p) => (
            <li
              key={key(p)}
              className="flex flex-col items-start gap-1.5 py-2.5 pl-3 pr-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0 max-w-full truncate text-ink">{personLabel(p)}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {p.role ? <Badge tone={p.role === leadRole ? "blue" : "slate"}>{p.role}</Badge> : null}
                {p.invitePending ? <Badge tone="amber">Not signed in</Badge> : null}
                <button
                  type="button"
                  aria-label={`Remove ${personLabel(p)}`}
                  onClick={() => remove(key(p))}
                  className="eos-chip-x ml-0.5"
                >
                  <i className="pi pi-times text-[11px]" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <li key={key(p)} className="eos-chip">
              {personLabel(p)}
              {p.invitePending ? <span className="ml-1 text-[0.6875rem] font-bold uppercase tracking-wide text-rag-warn">pending</span> : null}
              <button
                type="button"
                aria-label={`Remove ${personLabel(p)}`}
                onClick={() => remove(key(p))}
                className="eos-chip-x"
              >
                <i className="pi pi-times text-[11px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
