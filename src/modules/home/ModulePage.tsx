import { Navigate, useParams } from "react-router-dom";
import { ModuleCardGrid } from "../../shared/components/ModuleCardGrid";
import { ProcessFlow } from "../../shared/components/ProcessFlow";
import { moduleMap } from "../../shared/data/modules";

export function ModulePage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();

  if (!moduleSlug) {
    return <Navigate to="/" replace />;
  }

  const module = moduleMap.get(moduleSlug);

  if (!module) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="rounded-[30px] border border-slate-200/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(255,245,236,0.82))] p-5 shadow-[0_18px_48px_rgba(39,57,64,0.12)] sm:p-6 lg:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700">{module.category}</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight text-slate-900 sm:text-[2.35rem] lg:text-5xl">{module.title}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{module.summary}</p>
        </div>
        <div className="grid content-center gap-2 rounded-[24px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_48px_rgba(39,57,64,0.08)]">
          <span className="text-sm text-slate-500">Readable route</span>
          <strong className="text-lg font-semibold text-slate-900">{module.routeLabel}</strong>
          <small className="text-sm text-slate-500">Source inspiration: {module.sourceFile}</small>
        </div>
      </section>

      <ModuleCardGrid items={module.metrics} />

      <section className="rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_48px_rgba(39,57,64,0.08)]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700">Route + UI Pattern</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Dynamic module steps</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {module.steps.map((step, index) => (
            <article key={step.title} className="grid grid-cols-[52px_1fr] gap-4 rounded-[24px] border border-slate-200/70 bg-slate-50 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                <small className="mt-3 block text-sm text-slate-500">{step.owner}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {module.sections.map((section) => (
          <article key={section.title} className="rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_48px_rgba(39,57,64,0.08)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700">Study Notes</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">{section.title}</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{section.description}</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="rounded-2xl bg-slate-50 px-4 py-3">{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <ProcessFlow stages={module.process} />
    </div>
  );
}
