/* PageHeader — Subscriptions & Contributions breadcrumb banner. */
export function PageHeader({
  showBack,
  onBack,
}: {
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50/70 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-7">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Expenditure
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            Subscriptions & Contributions
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              PRN 9.1
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Subscriptions & Contributions
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Register domestic and international subscription/contribution
              entities (UN agencies, SAARC, BIMSTEC, World Bank, IMF and
              others), capture bank + SWIFT routing details, raise periodic
              payment transactions, run the SRS validation rules (audit trail,
              budget and commitment checks), drive the Finance → Validator →
              Head approval chain, and manage the entity lifecycle. Every
              field — transaction type, scope, organisation category, currency,
              payment frequency, validation rules and workflow statuses — is
              driven by the LoVs held in master-data.
            </p>
          </div>
        </div>
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to Queue
          </button>
        )}
      </div>
    </section>
  );
}
