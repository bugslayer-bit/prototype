import type { StatItem } from "../types";

interface ModuleCardGridProps {
  items: StatItem[];
}

export function ModuleCardGrid({ items }: ModuleCardGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Module metrics">
      {items.map((item) => (
        <article
          key={item.label}
          className={`rounded-[24px] border border-slate-200/70 p-5 shadow-[0_18px_48px_rgba(39,57,64,0.08)] ${
            item.tone === "good" ? "bg-emerald-50" : item.tone === "warn" ? "bg-amber-50" : "bg-white/80"
          }`}
        >
          <p className="text-sm text-slate-500">{item.label}</p>
          <strong className="mt-2 block text-3xl font-semibold text-slate-900">{item.value}</strong>
        </article>
      ))}
    </section>
  );
}
