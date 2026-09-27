"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/server/forms/action-state";

const initial: ActionState = { ok: false, error: null, fieldErrors: {} };
/** Form state plus a per-form id prefix so several forms on one page never share element ids. */
const FormStateContext = createContext<ActionState & { idPrefix: string }>({ ...initial, idPrefix: "" });

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Form bound to a server action; shows field and form errors from ActionState. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  successMessage = "Saved.",
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState(action, initial);
  const ref = useRef<HTMLFormElement>(null);
  const idPrefix = useId();

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state.savedAt, state.ok, resetOnSuccess]);

  return (
    <FormStateContext.Provider value={{ ...state, idPrefix }}>
      <form ref={ref} action={formAction} className={className ?? "space-y-4"} noValidate>
        {state.error ? (
          <p role="alert" className="rounded-md border border-signal-red/40 bg-signal-red/5 px-3 py-2 text-sm text-signal-red">
            {state.error}
          </p>
        ) : state.ok ? (
          <p role="status" className="text-sm text-signal-green">
            {successMessage}
          </p>
        ) : null}
        {children}
      </form>
    </FormStateContext.Provider>
  );
}

const inputClass =
  "w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-bone-100 placeholder:text-ink-500 focus:border-signal-gold focus:outline-none aria-[invalid=true]:border-signal-red";

function useFieldId(name: string) {
  const { idPrefix } = useContext(FormStateContext);
  return `${idPrefix}${name}`;
}

function FieldShell({ name, label, hint, children }: { name: string; label: string; hint?: string; children: ReactNode }) {
  const { fieldErrors } = useContext(FormStateContext);
  const id = useFieldId(name);
  const error = fieldErrors[name];
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium tracking-wide text-bone-300 uppercase">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-signal-red">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-bone-400">{hint}</p>
      ) : null}
    </div>
  );
}

function useInvalid(name: string) {
  const { fieldErrors } = useContext(FormStateContext);
  const id = useFieldId(name);
  return fieldErrors[name] ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};
}

export function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  hint,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: "text" | "email" | "url" | "date" | "tel";
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const invalid = useInvalid(name);
  const id = useFieldId(name);
  return (
    <FieldShell name={name} label={required ? `${label} *` : label} hint={hint}>
      <input id={id} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={inputClass} {...invalid} />
    </FieldShell>
  );
}

export function TextArea({ name, label, defaultValue, rows = 3, hint, required }: { name: string; label: string; defaultValue?: string | null; rows?: number; hint?: string; required?: boolean }) {
  const invalid = useInvalid(name);
  const id = useFieldId(name);
  return (
    <FieldShell name={name} label={required ? `${label} *` : label} hint={hint}>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} className={inputClass} {...invalid} />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
  hint,
  placeholder,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string | null;
  hint?: string;
  placeholder?: string;
}) {
  const invalid = useInvalid(name);
  const id = useFieldId(name);
  return (
    <FieldShell name={name} label={label} hint={hint}>
      <select id={id} name={name} defaultValue={defaultValue ?? ""} className={inputClass} {...invalid}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function SubmitButton({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const cls =
    tone === "primary"
      ? "bg-signal-red-fill text-white hover:bg-[#9d1d23]"
      : "border border-ink-700 text-bone-100 hover:border-bone-400";
  return (
    <button type="submit" disabled={pending} className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${cls}`}>
      {pending ? "Saving…" : children}
    </button>
  );
}
