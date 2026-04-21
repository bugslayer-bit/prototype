/* Sanctioning Auto-Validator — sequential animation component */
import { useState, useEffect, useRef } from "react";
import type { SanctionValidation } from "../types";

interface Props {
  category: string;
  isMobilization: boolean;
  isMaterial: boolean;
  isSecured: boolean;
  validations: SanctionValidation[];
  onComplete: () => void;
  isComplete: boolean;
}

export function SanctioningAutoValidator({ category, isMobilization, isMaterial, isSecured, validations, onComplete, isComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const triggered = useRef(false);

  const categoryLabel = isMobilization ? "Mobilization Advance" : isSecured ? "Secured Advance" : isMaterial ? "Material Advance" : category;
  const categoryIcon = isMobilization ? "\uD83C\uDFD7\uFE0F" : isSecured ? "\uD83D\uDD12" : isMaterial ? "\uD83E\uDDF1" : "\uD83D\uDCCB";
  const borderColor = isMobilization ? "border-amber-200" : isSecured ? "border-indigo-200" : isMaterial ? "border-blue-200" : "border-slate-200";
  const bgColor = isMobilization ? "bg-amber-50" : isSecured ? "bg-indigo-50" : isMaterial ? "bg-blue-50" : "bg-slate-50";
  const titleColor = isMobilization ? "text-amber-900" : isSecured ? "text-indigo-900" : isMaterial ? "text-blue-900" : "text-slate-900";

  useEffect(() => {
    if (triggered.current || validations.length === 0 || isComplete) return;
    triggered.current = true;
    setRunning(true);
    setCurrentIdx(0);
    let idx = 0;
    const runNext = () => {
      if (idx >= validations.length) {
        setRunning(false);
        onComplete();
        return;
      }
      setCurrentIdx(idx);
      idx++;
      setTimeout(runNext, 600 + Math.random() * 500);
    };
    setTimeout(runNext, 500);
  }, [validations, onComplete, isComplete]);

  /* Reset when category changes */
  useEffect(() => {
    triggered.current = false;
    setCurrentIdx(-1);
    setRunning(false);
  }, [category]);

  if (!category) return null;

  const srcBadge = (src: string) => {
    if (src === "e-CMS") return "bg-sky-100 text-sky-700";
    if (src === "e-GP") return "bg-indigo-100 text-indigo-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} px-5 py-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-bold ${titleColor}`}>
          {categoryIcon} {categoryLabel} — Sanctioning Validation
        </p>
        {running && (
          <span className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold text-sky-700 animate-pulse">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-ping" /> VALIDATING...
          </span>
        )}
        {isComplete && (
          <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${validations.every(v => v.pass) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {validations.every(v => v.pass) ? `ALL ${validations.length} PASSED` : `${validations.filter(v => !v.pass).length} FAILED`}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {running && (
        <div className="h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-500 transition-all duration-500" style={{ width: `${((currentIdx + 1) / validations.length) * 100}%` }} />
        </div>
      )}

      {/* Validation rows — appear one by one */}
      <div className="space-y-1.5">
        {validations.map((v, idx) => {
          const isDone = idx <= currentIdx || isComplete;
          const isCurrent = idx === currentIdx && running;
          return (
            <div key={v.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-500 ${
              isDone && !isCurrent ? (v.pass ? "bg-emerald-50/80 border border-emerald-200" : "bg-red-50 border border-red-200") :
              isCurrent ? "bg-white border-2 border-sky-300 shadow-md" :
              "border border-transparent opacity-30"
            }`}>
              <span className="w-5 text-center text-base">
                {isCurrent ? <span className="inline-block animate-spin">{"\u23F3"}</span> :
                 isDone ? (v.pass ? "\u2705" : "\u274C") : "\u23F8\uFE0F"}
              </span>
              <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${srcBadge(v.source)}`}>{v.source}</span>
              <span className={`font-medium flex-1 ${isDone && !isCurrent ? (v.pass ? "text-emerald-700" : "text-red-700 font-bold") : isCurrent ? "text-sky-900" : "text-slate-400"}`}>
                {v.check}
              </span>
              <span className={`rounded px-1 py-0.5 text-[7px] font-bold ${isCurrent ? "bg-sky-100 text-sky-600" : isDone ? (v.pass ? "bg-emerald-200/60 text-emerald-700" : "bg-red-200/60 text-red-700") : "bg-slate-100 text-slate-400"}`}>
                {isCurrent ? "CHECKING..." : isDone ? (v.pass ? "PASS" : "FAIL") : v.ref}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
