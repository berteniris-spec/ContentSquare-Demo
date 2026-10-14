import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, Ref } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 select-none disabled:cursor-not-allowed";

const SIZES: Record<ButtonSize, string> = {
  md: "h-12 px-6 text-base",
  sm: "h-11 px-4 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover disabled:bg-sunken disabled:text-muted",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink hover:bg-sunken disabled:text-muted disabled:border-line",
  ghost:
    "h-11 px-2 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  const sizeClass = variant === "ghost" ? "" : SIZES[size];
  return [BASE, sizeClass, VARIANTS[variant], className].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...rest} />;
}
