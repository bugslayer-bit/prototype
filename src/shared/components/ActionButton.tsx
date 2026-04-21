import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "danger-soft"
  | "info-soft"
  | "violet-soft"
  | "ghost";

type ActionButtonSize = "xs" | "sm" | "md";

const BASE_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

const SIZE_CLASS: Record<ActionButtonSize, string> = {
  xs: "px-3 py-1.5 text-[11px]",
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
};

const VARIANT_CLASS: Record<ActionButtonVariant, string> = {
  primary: "border border-sky-300 bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-300/40",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300/40",
  success: "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/30",
  danger: "border border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30",
  "danger-soft": "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-300/30",
  "info-soft": "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-300/30",
  "violet-soft": "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 focus:ring-violet-300/30",
  ghost: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:ring-slate-300/30",
};

export function actionButtonClass(
  variant: ActionButtonVariant = "primary",
  size: ActionButtonSize = "md",
  extra = "",
) {
  return [BASE_CLASS, SIZE_CLASS[size], VARIANT_CLASS[variant], extra].filter(Boolean).join(" ");
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  icon?: ReactNode;
}

export function ActionButton({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button className={actionButtonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export type { ActionButtonSize, ActionButtonVariant };
