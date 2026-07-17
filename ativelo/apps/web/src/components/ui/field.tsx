import clsx from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Base = { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, className, id, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <label className={clsx("field", className)} htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <input
        className={clsx("field__control", error && "field__control--error")}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <span className="field__error" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function SelectField({ label, error, hint, children, id, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const inputId = id ?? props.name;
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <select
        className={clsx("field__control", error && "field__control--error")}
        id={inputId}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextareaField({ label, error, hint, id, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? props.name;
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <textarea
        className={clsx("field__control field__textarea", error && "field__control--error")}
        id={inputId}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}
