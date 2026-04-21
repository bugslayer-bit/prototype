/* PageHeader — Social Benefits & Stipend Management breadcrumb banner. */
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
            Social Benefits & Stipend Management
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              PRN 8.1
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Social Benefits & Stipend Management
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Register social benefit and stipend programs, onboard beneficiary
              rosters (individuals or institutions), capture deductions for
              stipend payments, run the SRS validation rules, drive the
              Coordinator → Finance → Head approval chain, and generate and
              release payment orders to beneficiary bank accounts. Every field
              — beneficiary category, student level, expenditure type, payment
              account, validation rules and workflow statuses — is driven by
              the LoVs held in master-data.
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
