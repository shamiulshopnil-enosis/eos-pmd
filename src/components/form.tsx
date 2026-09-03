"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dropdown } from "primereact/dropdown";
import { RadioButton } from "primereact/radiobutton";
import { Button } from "primereact/button";

/* ------------------------------------------------------------------ *
 * Form controls — PrimeReact widgets with Jira-style field ergonomics:
 * a labelled, filled input with a visible border, help text below (not
 * inside), width that hints at the expected input length, an error
 * slot, and ≥40px touch targets. Server-action forms still read plain
 * FormData; controlled widgets mirror their value into a hidden input.
 * ------------------------------------------------------------------ */

// Constrained widths apply from `sm` up; on a phone every field fills its row.
const FIELD_WIDTH: Record<string, string> = {
  xs: "w-full sm:w-auto sm:max-w-[7rem]",
  sm: "w-full sm:w-auto sm:max-w-[12rem]",
  md: "w-full sm:w-auto sm:max-w-[20rem]",
  lg: "w-full sm:w-auto sm:max-w-[28rem]",
  full: "",
};

export function Field({
  label,
  required,
  optional,
  hint,
  error,
  width = "full",
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  width?: "xs" | "sm" | "md" | "lg" | "full";
  children: ReactNode;
}) {
  const hintId = useId();
  return (
    <div className={`${FIELD_WIDTH[width]} ${error ? "eos-field-error" : ""}`}>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-ink">
          {label}
          {required ? <span className="text-rag-bad"> *</span> : null}
          {optional ? <span className="ml-1 font-normal text-ink-muted">(optional)</span> : null}
        </span>
        {children}
      </label>
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs text-rag-bad" role="alert">
          <i className="pi pi-exclamation-circle text-[11px]" aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="mt-1.5 block text-xs text-ink-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = "", ...rest }: ComponentProps<typeof InputText>) {
  return <InputText {...rest} className={`w-full ${className}`} />;
}

export function TextArea({ className = "", rows, ...rest }: ComponentProps<typeof InputTextarea>) {
  return <InputTextarea {...rest} rows={rows ?? 3} className={`w-full ${className}`} />;
}

type Option = { label: string; value: string };

function toOptions(options: Array<[string, string] | Option>): Option[] {
  return options.map((o) => (Array.isArray(o) ? { value: o[0], label: o[1] } : o));
}

/** PrimeReact <Dropdown> that posts its value through a hidden input. */
export function Select({
  name,
  defaultValue = "",
  options,
  required,
  placeholder,
  className = "",
}: {
  name: string;
  defaultValue?: string;
  options: Array<[string, string] | Option>;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const opts = toOptions(options);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Dropdown
        value={value}
        onChange={(e) => setValue(e.value ?? "")}
        options={opts}
        placeholder={placeholder}
        required={required}
        className={`w-full ${className}`}
      />
    </>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  icon,
}: {
  children: ReactNode;
  variant?: "primary" | "outlined" | "text";
  icon?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      icon={icon}
      outlined={variant === "outlined"}
      text={variant === "text"}
      severity={variant === "primary" ? undefined : "secondary"}
      label={typeof children === "string" ? children : undefined}
    >
      {typeof children === "string" ? null : children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      {...props}
      outlined
      severity="secondary"
      className={className}
      label={typeof children === "string" ? children : undefined}
    >
      {typeof children === "string" ? null : children}
    </Button>
  );
}

/** Inline text input with a leading search glyph, for list filters. */
export function SearchInput({ className = "", ...rest }: ComponentProps<typeof InputText>) {
  return (
    <IconField iconPosition="left" className="block">
      <InputIcon className="pi pi-search" />
      <InputText {...rest} className={`w-full ${className}`} />
    </IconField>
  );
}

/** Right-aligned action bar above a hairline — the close of a form. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-rule pt-5">
      {children}
    </div>
  );
}

/** A radio group rendered as tappable rows, on PrimeReact <RadioButton>. */
export function RadioCards({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string; description?: string }[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const groupId = useId();
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => {
        const checked = value === o.value;
        const id = `${groupId}-${o.value}`;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={`flex cursor-pointer gap-3 rounded-[6px] border p-3 transition-colors ${
              checked
                ? "border-link bg-[var(--link-subtle-bg)]"
                : "border-rule hover:border-[var(--input-border)] hover:bg-hover"
            }`}
          >
            <RadioButton inputId={id} checked={checked} onChange={() => setValue(o.value)} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-medium text-ink">{o.label}</span>
              {o.description ? (
                <span className="mt-0.5 block text-xs text-ink-muted">{o.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Native file input (server actions read it from FormData), themed via
 *  globals.css `.eos-file` to read as a field with a button. */
export function FileInput({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      {...rest}
      className={`eos-file block w-full text-sm text-ink-muted file:cursor-pointer ${className}`}
    />
  );
}
