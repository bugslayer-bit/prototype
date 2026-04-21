interface DeleteConfirmModalProps {
  open: boolean;
  value: string;
  groupTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  open,
  value,
  groupTitle,
  onCancel,
  onConfirm
}: DeleteConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-[28px] border border-rose-200 bg-white p-6 shadow-[0_25px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-2xl text-rose-600">
            🗑
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-rose-600">Delete Value</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Do you want to delete this value?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This will remove <span className="font-semibold text-slate-900">{value}</span> under{" "}
              <span className="font-semibold text-slate-900">{groupTitle}</span>, and the related dropdowns will update dynamically.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700"
            onClick={onConfirm}
          >
            Delete Value
          </button>
        </div>
      </div>
    </div>
  );
}
