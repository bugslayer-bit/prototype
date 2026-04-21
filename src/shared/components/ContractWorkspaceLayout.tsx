import type { ReactNode } from "react";

interface ContractWorkspaceLayoutProps {
  eyebrow: string;
  title: string;
  summary?: string;
  actions?: ReactNode;
  stats: { label: string; value: string; tone?: "default" | "good" | "warn" }[];
  process: { title: string; summary: string }[];
  children: ReactNode;
  minimalHero?: boolean;
}

export function ContractWorkspaceLayout({
  eyebrow,
  title,
  summary,
  actions,
  stats,
  process,
  children,
  minimalHero = false
}: ContractWorkspaceLayoutProps) {
  return (
    <div className="grid gap-6">
      <section className={`grid gap-4 ${minimalHero ? "" : "xl:grid-cols-[minmax(0,1.45fr)_360px]"}`}>
        <div className="rounded-[30px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_28%),linear-gradient(155deg,rgba(255,255,255,0.96),rgba(249,240,231,0.9))] p-5 shadow-[0_18px_48px_rgba(39,57,64,0.12)] sm:p-6 lg:p-7">
          {!minimalHero ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700">{eyebrow}</p>
              <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight text-slate-900 sm:text-[2.35rem] lg:text-5xl">{title}</h2>
              {summary ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{summary}</p> : null}
              {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
            </>
          ) : (
            <h2 className="text-[1.9rem] font-semibold leading-tight text-slate-900 sm:text-[2.35rem] lg:text-5xl">{title}</h2>
          )}
        </div>
        {!minimalHero && stats.length > 0 ? (
          <div className="grid gap-4 rounded-[28px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_48px_rgba(39,57,64,0.12)] backdrop-blur">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className={`rounded-[24px] border border-slate-200/70 p-5 shadow-sm ${
                  stat.tone === "good"
                    ? "bg-emerald-50"
                    : stat.tone === "warn"
                      ? "bg-amber-50"
                      : "bg-white"
                }`}
              >
                <p className="text-sm text-slate-500">{stat.label}</p>
                <strong className="mt-2 block text-[1.7rem] font-semibold text-slate-900 sm:text-[2rem] lg:text-3xl">{stat.value}</strong>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {process.map((item, index) => (
          <article
            key={item.title}
            className="grid grid-cols-[52px_1fr] gap-4 rounded-[24px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_48px_rgba(39,57,64,0.08)] backdrop-blur"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 font-extrabold text-teal-800">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
            </div>
          </article>
        ))}
      </section>

      {children}
    </div>
  );
}
