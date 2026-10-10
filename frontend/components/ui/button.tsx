import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong",
  secondary: "border border-line-strong bg-surface-2 text-ink hover:bg-surface-3",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/60 bg-danger/10 text-danger hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function buttonClass({ variant = "primary", size = "md" }: StyleProps = {}, extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = "button",
  ...props
}: StyleProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass({ variant, size }, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: StyleProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size }, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
