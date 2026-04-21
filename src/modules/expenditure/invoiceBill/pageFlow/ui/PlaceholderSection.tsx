/* Lightweight info panel used by the post-approval + setup views */
interface PlaceholderProps {
  tone: "emerald" | "rose" | "slate";
  tag: string;
  title: string;
  body: string;
  bullets: string[];
  onBack: () => void;
}

export function PlaceholderSection({ tone, tag, title, body, bullets, onBack }: PlaceholderProps) {
  const palette = {
    emerald: {
      border: "border-emerald-200",
      bg: "from-emerald-50/60 via-white to-white",
      chip: "text-emerald-700 bg-emerald-100",
      dot: "bg-emerald-500",
    },
    rose: {
      border: "border-rose-200",
      bg: "from-rose-50/60 via-white to-white",
      chip: "text-rose-700 bg-rose-100",
      dot: "bg-rose-500",
    },
    slate: {
      border: "border-slate-200",
      bg: "from-slate-50 via-white to-white",
      chip: "text-slate-700 bg-slate-100",
      dot: "bg-slate-500",
    },
  }[tone];

  return (
    <section
      className={`rounded-[24px] border ${palette.border} bg-gradient-to-br ${palette.bg} p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-7`}
    >
      <span
        className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${palette.chip}`}
      >
        {tag}
      </span>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{body}</p>

      <ul className="mt-5 grid gap-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${palette.dot}`} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Invoice &amp; Bill Dashboard
        </button>
        <p className="text-[11px] text-slate-500">
          This is the placement slot — the detailed form wires into the existing wizard steps.
        </p>
      </div>
    </section>
  );
}
