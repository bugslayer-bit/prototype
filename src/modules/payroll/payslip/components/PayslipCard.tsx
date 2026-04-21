/* ═══════════════════════════════════════════════════════════════════════════
   PayslipCard — the printable payslip itself
   ───────────────────────────────────────────────────────────────────
   Renders a single PayslipDocument as a professionally-styled card.
   Sections: header (agency/period/ref), employee info, earnings table,
   deductions table, net pay callout, bank details, footer. Supports
   `print:` utilities so window.print() produces a clean output.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import type { PayslipDocument, PayslipLine } from "../helpers/buildPayslip";
import { nu, todayLong } from "../helpers/payslipFormatters";

export interface PayslipCardProps {
  doc: PayslipDocument | null;
}

function LineTable({
  title,
  rows,
  totalLabel,
  totalAmount,
  totalTone,
}: {
  title: string;
  rows: PayslipLine[];
  totalLabel: string;
  totalAmount: number;
  totalTone: "earnings" | "deductions";
}) {
  const totalClass =
    totalTone === "earnings"
      ? "border-t-2 border-teal-200 bg-teal-50/50 text-teal-700"
      : "border-t-2 border-rose-200 bg-rose-50/50 text-rose-700";
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-600">
        {title}
      </h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.label}
              className={`border-b border-slate-100 ${
                idx % 2 === 0 ? "bg-slate-50/50" : ""
              }`}
            >
              <td className="px-4 py-2 font-medium text-slate-700">
                {row.label}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                {nu(row.amount)}
              </td>
            </tr>
          ))}
          <tr className={totalClass}>
            <td className="px-4 py-2.5 font-bold text-slate-900">
              {totalLabel}
            </td>
            <td className="px-4 py-2.5 text-right font-bold tabular-nums">
              {nu(totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EmployeeMeta({ doc }: { doc: PayslipDocument }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
      <div>
        <div className="text-[11px] uppercase text-slate-500">Employee</div>
        <div className="font-semibold text-slate-900">{doc.employee.name}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase text-slate-500">Position</div>
        <div className="font-semibold text-slate-900">
          {doc.employee.positionTitle}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase text-slate-500">Level</div>
        <div className="font-semibold text-slate-900">
          {doc.employee.positionLevel}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase text-slate-500">Department</div>
        <div className="font-semibold text-slate-900">
          {doc.employee.departmentName}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500">
      <div className="mb-2 text-4xl">🧾</div>
      <div className="text-sm font-semibold text-slate-700">
        No employee selected
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Click any employee in the table to preview their payslip for this period.
      </div>
    </div>
  );
}

export function PayslipCard({ doc }: PayslipCardProps) {
  if (!doc) return <EmptyState />;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {doc.employee.agencyName}
          </h2>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Payslip · {doc.period.label}
          </p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <p className="font-medium">CID: {doc.employee.cid}</p>
          <p>Ref: {doc.refId}</p>
        </div>
      </div>

      <div className="mb-6">
        <EmployeeMeta doc={doc} />
      </div>

      <LineTable
        title="Earnings"
        rows={doc.earnings}
        totalLabel="Total Earnings (Gross)"
        totalAmount={doc.totals.grossPay}
        totalTone="earnings"
      />

      <LineTable
        title="Deductions"
        rows={doc.deductions}
        totalLabel="Total Deductions"
        totalAmount={doc.totals.totalDeductions}
        totalTone="deductions"
      />

      {/* Net Pay */}
      <div className="mb-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-slate-900">
            Net Pay (Credit to Bank)
          </span>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums">
            {nu(doc.totals.netPay)}
          </span>
        </div>
      </div>

      {/* Bank */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">
          Bank Details
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-slate-500">Bank</div>
            <div className="font-semibold text-slate-900">
              {doc.employee.bankName}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Account</div>
            <div className="font-mono font-semibold text-slate-900">
              {doc.employee.bankAccountNo}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <p>Electronically generated payslip. No signature required.</p>
        <p className="mt-0.5">Generated on {todayLong()}</p>
      </div>
    </section>
  );
}
