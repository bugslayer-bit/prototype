/* DetailField — one label/value row used in the dynamic snapshot.
   Handles the various SnapshotFieldKind values consistently. */
import type { SnapshotFieldKind } from "../types";
import { fmt } from "./styleTokens";

interface DetailFieldProps {
  label: string;
  value: unknown;
  kind?: SnapshotFieldKind;
}

function formatValue(value: unknown, kind?: SnapshotFieldKind): { display: string; isEmpty: boolean } {
  if (value === null || value === undefined) return { display: "—", isEmpty: true };
  if (kind === "bool") {
    return { display: value ? "Yes" : "No", isEmpty: false };
  }
  if (Array.isArray(value)) {
    const joined = value.filter((v) => v !== null && v !== undefined && v !== "").join(", ");
    return joined ? { display: joined, isEmpty: false } : { display: "—", isEmpty: true };
  }
  const s = String(value).trim();
  if (!s) return { display: "—", isEmpty: true };
  if (kind === "money") {
    const n = parseFloat(s);
    if (!Number.isNaN(n)) return { display: `BTN ${fmt(n)}`, isEmpty: false };
  }
  return { display: s, isEmpty: false };
}

function tagClass(value: string): string {
  const v = value.toLowerCase();
  if (/approved|active|on[- ]track|paid|completed|verified/.test(v))
    return "bg-emerald-100 text-emerald-700";
  if (/reject|debar|fail|breach|overdue|critical|delayed/.test(v))
    return "bg-rose-100 text-rose-700";
  if (/review|pending|submitted|progress|at[- ]risk|warning/.test(v))
    return "bg-amber-100 text-amber-700";
  if (/draft|locked/.test(v)) return "bg-slate-200 text-slate-700";
  return "bg-sky-100 text-sky-700";
}

export function DetailField({ label, value, kind = "text" }: DetailFieldProps) {
  const { display, isEmpty } = formatValue(value, kind);

  /* multiline — full-width paragraph card */
  if (kind === "multiline") {
    return (
      <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-1 text-sm leading-6 ${isEmpty ? "italic text-slate-400" : "text-slate-800"}`}>
          {display}
        </p>
      </div>
    );
  }

  /* list — chips */
  if (kind === "list" && Array.isArray(value)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {isEmpty ? (
          <p className="mt-1 text-sm italic text-slate-400">—</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(value as unknown[])
              .filter((v) => v !== null && v !== undefined && v !== "")
              .map((v, i) => (
                <span
                  key={i}
                  className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700"
                >
                  {String(v)}
                </span>
              ))}
          </div>
        )}
      </div>
    );
  }

  /* tag / badge — pill */
  if ((kind === "tag" || kind === "badge") && !isEmpty) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <span
          className={`mt-1.5 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${tagClass(display)}`}
        >
          {display.replace(/[-_]/g, " ")}
        </span>
      </div>
    );
  }

  /* bool — tick / cross */
  if (kind === "bool") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-1 text-sm font-bold ${value ? "text-emerald-700" : "text-slate-400"}`}>
          {value ? "✓ Yes" : "— No"}
        </p>
      </div>
    );
  }

  /* default — plain text / money / date */
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 break-words text-sm font-semibold ${
          isEmpty ? "italic text-slate-400" : kind === "money" ? "text-slate-900" : "text-slate-800"
        }`}
      >
        {display}
      </p>
    </div>
  );
}
