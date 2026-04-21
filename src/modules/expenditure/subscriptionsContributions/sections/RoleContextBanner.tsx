/* ═══════════════════════════════════════════════════════════════════════════
   RoleContextBanner — Subscriptions & Contributions
   Persistent banner showing the "Acting as" persona, what they can do, and
   what is locked. Re-renders automatically on role switch.
   ═══════════════════════════════════════════════════════════════════════════ */
import {
  useScRoleCapabilities,
  scToneClasses,
} from "../state/useScRoleCapabilities";

export function RoleContextBanner() {
  const caps = useScRoleCapabilities();
  const tone = scToneClasses(caps.personaTone);

  return (
    <section
      className={`rounded-3xl border-2 ${tone.border} ${tone.bg} p-5 shadow-sm`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.pill}`}
            >
              Acting as
            </span>
            <h3 className={`text-base font-bold ${tone.text}`}>
              {caps.activeRoleName}
            </h3>
            {caps.isReadOnly && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                Read-only
              </span>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-xs text-slate-600">
            {caps.personaTagline}
          </p>
        </div>
        <div className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <p>Switch personas from the</p>
          <p>top-bar role chip</p>
        </div>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <CapabilityList
          title="What you can do here"
          tone="emerald"
          items={caps.capabilityList}
          emptyMessage="No write actions are enabled for this persona."
        />
        <CapabilityList
          title="What is locked"
          tone="slate"
          items={caps.blockedList}
          emptyMessage="Nothing is locked — full Subscriptions access."
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <FlagPill label="Register entity (Step 1)" enabled={caps.canCreate} />
        <FlagPill label="Attach documents (Step 1)" enabled={caps.canAttachDocs} />
        <FlagPill label="Create txn (Step 2)" enabled={caps.canCreateTxn} />
        <FlagPill label="Release payment (Step 2)" enabled={caps.canReleasePayment} />
        <FlagPill label="Validate (Step 3)" enabled={caps.canValidate} />
        <FlagPill label="Approve (Step 3)" enabled={caps.canApprove} />
        <FlagPill label="Lifecycle (Step 4)" enabled={caps.canLifecycle} />
        <FlagPill label="Delete record" enabled={caps.canDelete} />
      </div>
    </section>
  );
}

function CapabilityList({
  title,
  tone,
  items,
  emptyMessage,
}: {
  title: string;
  tone: "emerald" | "slate";
  items: string[];
  emptyMessage: string;
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/60"
      : "border-slate-200 bg-slate-50/60";
  const tcls = tone === "emerald" ? "text-emerald-800" : "text-slate-700";

  return (
    <div className={`rounded-2xl border ${cls} p-3`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] italic text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((it) => (
            <li
              key={it}
              className={`flex items-start gap-2 text-[11px] font-semibold ${tcls}`}
            >
              <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FlagPill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-400 line-through"
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          enabled ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {label}
    </span>
  );
}
