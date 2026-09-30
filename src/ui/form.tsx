"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/server/forms/action-state";

const initial: ActionState = { ok: false, error: null, fieldErrors: {} };
/** Form state, pending flag, and a per-form id prefix so several forms on one page never share element ids. */
const FormStateContext = createContext<ActionState & { idPrefix: string; pending: boolean }>({ ...initial, idPrefix: "", pending: false });

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
  const [state, formAction, pending] = useActionState(action, initial);
  const ref = useRef<HTMLFormElement>(null);
  const idPrefix = useId();

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state.savedAt, state.ok, resetOnSuccess]);

  // Submitting through onSubmit (not the `action` prop) stops React 19 from
  // clearing every field after the action returns — including after a
  // validation error, which would throw away the operator's input.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <FormStateContext.Provider value={{ ...state, idPrefix, pending }}>
      <form ref={ref} onSubmit={onSubmit} className={className ?? "space-y-4"} noValidate>
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
  // ActionForm submits via onSubmit, so useFormStatus would never report pending.
  const { pending } = useContext(FormStateContext);
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

export function CheckboxField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  const id = useFieldId(name);
  return (
    <div className="flex items-start gap-2">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-[var(--color-signal-gold)]" />
      <div>
        <label htmlFor={id} className="text-sm text-bone-100">
          {label}
        </label>
        {hint ? <p className="text-xs text-bone-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export function FileField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const id = useFieldId(name);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium tracking-wide text-bone-300 uppercase">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="block w-full text-sm text-bone-300 file:mr-3 file:rounded-md file:border file:border-ink-700 file:bg-ink-850 file:px-3 file:py-1.5 file:text-bone-100"
      />
      {hint ? <p className="text-xs text-bone-400">{hint}</p> : null}
    </div>
  );
}

/** A button-only form for one-click actions (delete, move) that still shows rule errors. */
export function ActionButton({
  action,
  children,
  tone = "secondary",
  confirm,
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  tone?: "secondary" | "danger";
  confirm?: string;
}) {
  const [state, formAction] = useActionState(async () => action(), initial);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline"
    >
      <InlineSubmit tone={tone}>{children}</InlineSubmit>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-signal-red">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function InlineSubmit({ children, tone }: { children: ReactNode; tone: "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  const cls = tone === "danger" ? "border-signal-red/50 text-signal-red hover:border-signal-red" : "border-ink-700 text-bone-300 hover:border-bone-400";
  return (
    <button type="submit" disabled={pending} className={`rounded border px-2 py-1 text-xs disabled:opacity-60 ${cls}`}>
      {children}
    </button>
  );
}
