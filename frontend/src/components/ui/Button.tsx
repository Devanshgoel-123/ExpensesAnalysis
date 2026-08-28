import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "chip";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        variant === "primary" && "cta",
        variant === "ghost" && "ghost",
        variant === "chip" && "sort-chip",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
