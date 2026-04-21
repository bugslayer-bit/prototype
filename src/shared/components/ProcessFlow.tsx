import type { ProcessStage } from "../types";

interface ProcessFlowProps {
  stages: ProcessStage[];
}

export function ProcessFlow({ stages }: ProcessFlowProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_48px_rgba(39,57,64,0.08)]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700">Process Study</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">How the route-driven screen works</h2>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage, index) => (
          <article key={stage.title} className="rounded-[24px] border border-slate-200/70 bg-slate-50 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
              {index + 1}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{stage.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{stage.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
