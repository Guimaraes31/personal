import Link from "next/link";
import clsx from "clsx";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={clsx("brand-mark", className)}
      viewBox="0 0 48 48"
      fill="none"
    >
      <rect width="48" height="48" rx="14" fill="currentColor" />
      <path
        d="M14.2 30.7 22 17.2c.9-1.6 3.2-1.6 4.1 0l7.7 13.5"
        stroke="var(--mark-ink, #0b1220)"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m18.1 28.6 5.9 3.5 5.9-3.5"
        stroke="var(--mark-ink, #0b1220)"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link className="logo" href={href} aria-label="Ativelo — página inicial">
      <BrandMark />
      {!compact && <span>ativelo</span>}
    </Link>
  );
}
