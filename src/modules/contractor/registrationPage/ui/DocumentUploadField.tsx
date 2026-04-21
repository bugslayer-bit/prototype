/* ═══════════════════════════════════════════════════════════════════
   DocumentUploadField — standalone file-upload field used in the
   "Documents" step of Contractor Registration.
   Preserves original behaviour including the auto-fill trio for
   nationalIdDoc / taxClearanceDoc / tradeLicenseDoc.
   ═══════════════════════════════════════════════════════════════════ */
import React from "react";

export function DocumentUploadField({
  ddRef,
  label,
  required,
  hint,
  fileKey,
  files,
  setFiles,
  multiple = false,
}: {
  ddRef: string;
  label: string;
  required: boolean;
  hint: string;
  fileKey: string;
  files: Record<string, File[]>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
  multiple?: boolean;
}) {
  const selectedFiles = files[fileKey] || [];
  const inputId = `contractor-doc-${fileKey}`;
  const hasFiles = selectedFiles.length > 0;
  const autoFillKeys = ["nationalIdDoc", "taxClearanceDoc", "tradeLicenseDoc"];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = e.target.files ? Array.from(e.target.files) : [];
    if (newFiles.length === 0) return;
    setFiles((cur) => {
      const next = {
        ...cur,
        [fileKey]: multiple ? [...(cur[fileKey] || []), ...newFiles] : newFiles,
      };
      if (!multiple && autoFillKeys.includes(fileKey)) {
        for (const key of autoFillKeys) {
          if (key !== fileKey && !(cur[key]?.length)) {
            next[key] = newFiles;
          }
        }
      }
      return next;
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((cur) => ({
      ...cur,
      [fileKey]: (cur[fileKey] || []).filter((_, i) => i !== index),
    }));
  }

  function clearFiles() {
    setFiles((cur) => ({ ...cur, [fileKey]: [] }));
  }

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.035)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <label htmlFor={inputId} className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
          <span className="ml-1.5 text-[10px] text-slate-400 normal-case tracking-normal font-normal">[{ddRef}]</span>
        </label>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${hasFiles ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {hasFiles ? `${selectedFiles.length} uploaded` : "No file"}
        </span>
      </div>

      <p className="mb-3 text-[11px] leading-5 text-slate-500">{hint}</p>

      <input id={inputId} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple={multiple} onChange={handleChange} className="hidden" />

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-3">
        <label htmlFor={inputId} className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/30">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition group-hover:bg-indigo-100 group-hover:text-indigo-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-slate-800">
              {hasFiles ? (multiple ? "Add or replace files" : "Replace file") : `Upload ${label.toLowerCase()}`}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {multiple ? "PDF, PNG, JPG · multiple files allowed" : "PDF, PNG, JPG · one file"}
            </span>
          </div>
          <span className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition group-hover:bg-indigo-600">
            Browse
          </span>
        </label>

        {hasFiles && (
          <div className="mt-3 space-y-2">
            {selectedFiles.map((f, i) => (
              <div key={`${fileKey}-${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="flex-1 truncate font-medium text-slate-700">{f.name}</span>
                <span className="text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="rounded-md px-1.5 py-0.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">&times;</button>
              </div>
            ))}
            {selectedFiles.length > 1 && (
              <div className="flex justify-end">
                <button type="button" onClick={clearFiles} className="text-xs font-semibold text-slate-500 transition hover:text-red-500">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
