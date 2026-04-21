/* ═══════════════════════════════════════════════════════════════════════════
   FormalProcessFlow
   ────────────────────────────────────────────────────────────────────────
   Swimlane-style renderer for an SRS-defined process. Reads from the SRS
   registry (shared/data/srs) so every screen stays aligned with the
   current clause list rather than shipping bespoke copy.

   Features:
     • Actor swimlanes  — one row per actor in the process
     • Clause badges    — every step shows its DDi/PRN clause ref
     • System callouts  — external systems (e-DATS, RMA, MCP) rendered
                           as pill chips
     • Objective block  — verbatim SRS objective sentence at the top
     • Tone-aware       — tone="cs"|"ops"|"expenditure" switches palette

   Usage:
     <FormalProcessFlow processId="cs-travel-claim" tone="cs" />
     <FormalProcessFlow processId="ops-travel-claim" tone="ops" />
     <FormalProcessFlow processId="utility-payment" tone="expenditure" />
   ═══════════════════════════════════════════════════════════════════════════ */
import React, { useMemo } from "react";
import {
  PAYROLL_PROCESSES,
  PAYROLL_ACTORS,
  EXPENDITURE_PROCESSES,
  EXPENDITURE_ACTORS,
  type SrsProcess,
  type SrsActor,
} from "../data/srs";

type Tone = "cs" | "ops" | "expenditure" | "neutral";

interface FormalProcessFlowProps {
  /** SRS process id from PAYROLL_PROCESSES or EXPENDITURE_PROCESSES. */
  processId: string;
  /** Colour palette — should match the active stream/module. */
  tone?: Tone;
  /** Optional override title (defaults to the SRS title). */
  title?: string;
  /** Hide the objective paragraph, e.g. in compact contexts. */
  hideObjective?: boolean;
}

const TONES: Record<Tone, {
  border: string;
  header: string;
  chip: string;
  lane: string;
  stepBorder: string;
  stepBg: string;
  actor: string;
  system: string;
  number: string;
}> = {
  cs: {
    border: "border-blue-200",
    header: "text-blue-700",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    lane: "bg-blue-50/40",
    stepBorder: "border-blue-200",
    stepBg: "bg-white",
    actor: "bg-blue-600 text-white",
    system: "bg-indigo-100 text-indigo-800",
    number: "bg-blue-600 text-white",
  },
  ops: {
    border: "border-amber-200",
    header: "text-amber-700",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    lane: "bg-amber-50/40",
    stepBorder: "border-amber-200",
    stepBg: "bg-white",
    actor: "bg-amber-600 text-white",
    system: "bg-orange-100 text-orange-800",
    number: "bg-amber-600 text-white",
  },
  expenditure: {
    border: "border-emerald-200",
    header: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lane: "bg-emerald-50/40",
    stepBorder: "border-emerald-200",
    stepBg: "bg-white",
    actor: "bg-emerald-600 text-white",
    system: "bg-teal-100 text-teal-800",
    number: "bg-emerald-600 text-white",
  },
  neutral: {
    border: "border-slate-200",
    header: "text-slate-700",
    chip: "bg-slate-50 text-slate-700 border-slate-200",
    lane: "bg-slate-50/40",
    stepBorder: "border-slate-200",
    stepBg: "bg-white",
    actor: "bg-slate-700 text-white",
    system: "bg-slate-100 text-slate-800",
    number: "bg-slate-700 text-white",
  },
};

function lookupProcess(processId: string): SrsProcess | undefined {
  return PAYROLL_PROCESSES[processId] || EXPENDITURE_PROCESSES[processId];
}

function lookupActor(id: string): SrsActor | undefined {
  return PAYROLL_ACTORS[id] || EXPENDITURE_ACTORS[id];
}

export const FormalProcessFlow: React.FC<FormalProcessFlowProps> = ({
  processId,
  tone = "neutral",
  title,
  hideObjective = false,
}) => {
  const proc = lookupProcess(processId);
  const palette = TONES[tone];

  /* Actor order for swimlanes — first-appearance order in the steps list. */
  const laneActors = useMemo(() => {
    if (!proc) return [] as SrsActor[];
    const seen = new Set<string>();
    const ordered: SrsActor[] = [];
    proc.steps.forEach((s) => {
      if (!seen.has(s.actorId)) {
        const a = lookupActor(s.actorId);
        if (a) {
          ordered.push(a);
          seen.add(s.actorId);
        }
      }
    });
    return ordered;
  }, [proc]);

  if (!proc) {
    return (
      <section className={`rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700`}>
        Unknown SRS process id: <code>{processId}</code>
      </section>
    );
  }

  return (
    <section className={`rounded-[24px] border ${palette.border} bg-white/95 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]`}>
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-[0.3em] ${palette.header}`}>
            SRS Process · {proc.ref}
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
            {title ?? proc.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${palette.chip}`}>
            {proc.stream === "civil-servant"
              ? "Civil Servant"
              : proc.stream === "other-public-servant"
              ? "Other Public Servant"
              : "Cross-stream"}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${palette.chip}`}>
            {laneActors.length} actors · {proc.steps.length} steps
          </span>
        </div>
      </header>

      {/* Objective */}
      {!hideObjective && (
        <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-600">
          <span className={`mr-2 font-bold uppercase tracking-wider text-[10px] ${palette.header}`}>Objective:</span>
          {proc.objective}
        </p>
      )}

      {/* Swimlane grid */}
      <div className={`overflow-x-auto rounded-2xl border ${palette.border}`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-48 px-3 py-2 text-left font-semibold">Actor</th>
              <th className="px-3 py-2 text-left font-semibold">Action</th>
              <th className="w-28 px-3 py-2 text-left font-semibold">Clause</th>
              <th className="w-28 px-3 py-2 text-left font-semibold">System</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proc.steps.map((step, i) => {
              const actor = lookupActor(step.actorId);
              return (
                <tr key={`${step.clauseRef}-${i}`} className={palette.lane}>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${palette.number}`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${palette.actor}`}>
                          {actor?.label ?? step.actorId}
                        </div>
                        {actor?.org && (
                          <div className="mt-0.5 text-[10px] text-slate-500">{actor.org}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-slate-700">
                    <div className="font-semibold text-slate-800">{step.action}</div>
                    {(step.inputs?.length || step.outputs?.length) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.inputs?.map((x) => (
                          <span
                            key={`in-${x}`}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                          >
                            ← {x}
                          </span>
                        ))}
                        {step.outputs?.map((x) => (
                          <span
                            key={`out-${x}`}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                          >
                            → {x}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${palette.chip}`}>
                      {step.clauseRef}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {step.system ? (
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${palette.system}`}>
                        {step.system}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actor legend */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {laneActors.map((a) => (
          <span
            key={a.id}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${palette.chip}`}
            title={a.org}
          >
            {a.label}
          </span>
        ))}
      </div>
    </section>
  );
};
