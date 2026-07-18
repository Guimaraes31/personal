import Link from "next/link";
import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  busy?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  busy = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx("button", `button--${variant}`, `button--${size}`, className)}
      disabled={disabled || busy}
      aria-busy={busy}
      {...props}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <Link
      className={clsx("button", `button--${variant}`, `button--${size}`, className)}
      href={href}
    >
      {children}
    </Link>
  );
}
