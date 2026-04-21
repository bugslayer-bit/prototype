/* ═══════════════════════════════════════════════════════════════════════════
   SelectedDonorSummary
   ────────────────────
   Dense, fully dynamic card that surfaces every attribute of the selected
   Donor / Creditor AND every DD 20.* header field the moment the user picks
   or saves a donor. All values are read live from the wizard's form state —
   nothing is hardcoded or assumed.

   SRS references:
     • Donor master  — PRN 6.1 Step 1
     • DD 20.1-20.12 — Debt Servicing Header
   ═══════════════════════════════════════════════════════════════════════════ */
import type { DebtFormState } from "../../../types";

interface Props {
  form: DebtFormState;
}

type Accent = "default" | "mono" | "money" | "status" | "pct";

interface Row {
  label: string;
  value: string;
  tag?: string;
  accent?: Accent;
}

export function SelectedDonorSummary({ form }: Props) {
  const donor = form.donor;
  const header = form.header;

  /* Donor master rows — only populate when a donor object exists. */
  const donorRows: Row[] = donor
    ? [
        { label: "Donor ID", value: donor.donorId, tag: "Donor Master", accent: "mono" },
        { label: "Name", value: donor.name },
        { label: "Creditor Type", value: donor.creditorType, tag: "LoV", accent: "status" },
        { label: "Unique ID No", value: donor.uniqueIdentificationNo, accent: "mono" },
        { label: "Origin Country", value: donor.originCountry, tag: "LoV" },
        { label: "Address", value: donor.address },
        { label: "Contact Name", value: donor.contactName },
        { label: "Contact Phone", value: donor.contactPhone, accent: "mono" },
        { label: "Contact Email", value: donor.contactEmail, accent: "mono" },
        { label: "Bank Name", value: donor.bankName },
        { label: "Bank Account", value: donor.bankAccountNumber, accent: "mono" },
        { label: "Routing Info", value: donor.routingInformation, accent: "mono" },
        { label: "SWIFT Code", value: donor.swiftCode, accent: "mono" },
        { label: "Data Source", value: donor.dataSource, tag: "LoV" },
        {
          label: "Meridian Linked",
          value: donor.meridianLinked ? "Yes — API integrated" : "No",
          accent: "status",
        },
        {
          label: "Created At",
          value: donor.createdAt ? new Date(donor.createdAt).toLocaleString() : "—",
          accent: "mono",
        },
      ]
    : [];

  /* Debt Servicing header rows — mirror every DD 20.* field the user has
     captured so far. Values that are still blank show "—". */
  const headerRows: Row[] = [
    { label: "Debt Servicing ID", value: header.debtServicingId, tag: "DD 20.1", accent: "mono" },
    { label: "Loan No (Gov)", value: header.loanInstrumentIdGov, tag: "DD 20.2", accent: "mono" },
    { label: "Loan No (Lender)", value: header.loanInstrumentIdLender, tag: "DD 20.2", accent: "mono" },
    { label: "Project ID", value: header.projectId, tag: "PRN 6.1", accent: "mono" },
    { label: "Creditor", value: header.creditorName, tag: "DD 20.3" },
    { label: "Debt Category", value: header.debtCategory, tag: "DD 20.4 / LoV" },
    { label: "Payment Type", value: header.paymentType, tag: "LoV" },
    { label: "Principal Amount", value: header.principalLoanAmount, tag: "DD 20.5", accent: "money" },
    { label: "Interest Rate", value: header.interestRate ? `${header.interestRate}% p.a.` : "", tag: "DD 20.6", accent: "pct" },
    { label: "Currency", value: header.paymentCurrencyId, tag: "DD 20.8 / LoV" },
    {
      label: "Loan Term",
      value: [header.loanTermValue, header.loanTermUnit].filter(Boolean).join(" "),
      tag: "DD 20.11",
    },
    { label: "Repayment Frequency", value: header.repaymentFrequency, tag: "DD 20.11 / LoV" },
    { label: "Amortization Schedule", value: header.amortizationSchedule, tag: "DD 21.11 / LoV" },
    { label: "Grace Period End", value: header.gracePeriodEnd, tag: "DD 20.12", accent: "mono" },
    { label: "Applicable Deduction", value: header.applicableDeduction, tag: "LoV" },
    { label: "Meridian Ref ID", value: header.meridianReferenceId, tag: "DD 20.10", accent: "mono" },
    { label: "Data Source", value: header.dataSource, tag: "LoV" },
    { label: "Payment Status", value: header.paymentStatus, tag: "DD 20.9 / LoV", accent: "status" },
    { label: "Loan Description", value: header.loanDescription, tag: "PRN 6.1" },
  ];

  /* Live repayment snapshot derived from the form's payment orders. */
  const totalRepayment = form.repayments.reduce(
    (s, r) => s + (parseFloat(r.amountToPay || "0") || 0),
    0,
  );
  const auto = form.repayments.filter((r) => !r.createdManually).length;
  const manual = form.repayments.length - auto;

  const repaymentRows: Row[] = [
    { label: "Payment Orders", value: `${form.repayments.length}`, accent: "mono" },
    { label: "Auto-Generated", value: `${auto}`, accent: "mono" },
    { label: "Manual", value: `${manual}`, accent: "mono" },
    {
      label: "Scheduled Total",
      value: totalRepayment ? totalRepayment.toLocaleString() : "",
      accent: "money",
    },
    { label: "Validation Checks", value: `${form.validationChecks.length}`, accent: "mono" },
    { label: "Meridian Actions Logged", value: `${form.meridianLog.length}`, accent: "mono" },
  ];

  if (!donor && !header.creditorId) return null;

  return (
    <section className="space-y-4 rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/60 via-white to-violet-50/60 p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            Selected Creditor Snapshot
          </span>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {donor?.name || header.creditorName || "Unresolved creditor"}
            {donor?.donorId && (
              <span className="ml-2 rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-white">
                {donor.donorId}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            Every field below is read live from the wizard form — no values are assumed.
          </p>
        </div>
      </header>

      {donorRows.length > 0 && (
        <SummaryGrid
          title="Donor / Lender Master"
          subtitle="PRN 6.1 Step 1 — sourced from the donor record"
          tone="sky"
          rows={donorRows}
        />
      )}

      <SummaryGrid
        title="Debt Servicing Header"
        subtitle="DD 20.1 → 20.12 — live from the Step 1 form"
        tone="violet"
        rows={headerRows}
      />

      {form.repayments.length > 0 && (
        <SummaryGrid
          title="Live Wizard Totals"
          subtitle="Computed from Step 2 / 3 / 4"
          tone="emerald"
          rows={repaymentRows}
        />
      )}
    </section>
  );
}

/* ── Grid helper ─────────────────────────────────────────────────────────── */
function SummaryGrid({
  title,
  subtitle,
  tone,
  rows,
}: {
  title: string;
  subtitle: string;
  tone: "sky" | "violet" | "emerald";
  rows: Row[];
}) {
  const toneMap: Record<"sky" | "violet" | "emerald", string> = {
    sky: "border-sky-200 bg-sky-50/40",
    violet: "border-violet-200 bg-violet-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
  };
  const badgeTone: Record<"sky" | "violet" | "emerald", string> = {
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{title}</p>
          <p className="text-[10px] text-slate-500">{subtitle}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${badgeTone[tone]}`}>
          {rows.length} fields
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <SummaryRow key={r.label} row={r} />
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ row }: { row: Row }) {
  const display = (row.value || "").toString().trim() || "—";
  const accent = row.accent ?? "default";
  const valueCls =
    accent === "mono"
      ? "font-mono text-[11px]"
      : accent === "money"
        ? "font-mono font-bold text-[11px] text-emerald-700"
        : accent === "pct"
          ? "font-mono text-[11px] text-sky-700"
          : accent === "status"
            ? "text-[11px] font-bold uppercase tracking-wider text-slate-800"
            : "text-[11px] text-slate-800";

  return (
    <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{row.label}</p>
        {row.tag && (
          <span className="rounded-sm bg-slate-100 px-1 text-[8px] font-bold uppercase tracking-wider text-slate-500">
            {row.tag}
          </span>
        )}
      </div>
      <p className={`mt-0.5 break-words ${valueCls}`}>{display}</p>
    </div>
  );
}
