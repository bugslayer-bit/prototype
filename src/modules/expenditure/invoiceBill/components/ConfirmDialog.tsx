/* ═══════════════════════════════════════════════════════════════════════════
   ConfirmDialog
   ─────────────
   Reusable, accessible confirmation modal. Used by the Invoice & Bill queue
   for delete confirmations and any other irreversible action. Designed with
   the same visual language as the rest of the IFMIS workspace (rounded
   panels, slate palette, gradient header strip).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";

export type ConfirmTone = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneStyles: Record<ConfirmTone, { ring: string; icon: string; iconBg: string; button: string; chip: string }> = {
  danger: {
    ring: "ring-rose-200",
    icon: "✕",
    iconBg: "bg-gradient-to-br from-rose-500 to-rose-600 text-white",
    button: "bg-rose-600 hover:bg-rose-700",
    chip: "bg-rose-50 text-rose-700",
  },
  warning: {
    ring: "ring-amber-200",
    icon: "!",
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600 text-white",
    button: "bg-amber-600 hover:bg-amber-700",
    chip: "bg-amber-50 text-amber-700",
  },
  info: {
    ring: "ring-sky-200",
    icon: "i",
    iconBg: "bg-gradient-to-br from-sky-500 to-sky-600 text-white",
    button: "bg-sky-600 hover:bg-sky-700",
    chip: "bg-sky-50 text-sky-700",
  },
};

export function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = toneStyles[tone];

  /* Close on ESC */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ${styles.ring} animate-[fadeInUp_180ms_ease-out]`}
      >
        {/* Decorative gradient strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900" />

        <div className="px-6 pt-6 pb-2">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-lg ${styles.iconBg}`}
            >
              {styles.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles.chip}`}>
                Confirm Action
              </span>
              <h3 id="confirm-dialog-title" className="mt-1 text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
              {detail && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {detail}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      {/* Pop-in animation (Tailwind doesn't ship a custom keyframe — inline) */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
