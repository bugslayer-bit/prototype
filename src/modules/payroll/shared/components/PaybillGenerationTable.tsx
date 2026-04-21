/* ═══════════════════════════════════════════════════════════════════════════
   Paybill Generation Table — dynamic, editable payroll bill format
   ───────────────────────────────────────────────────────────────────
   Matches the standard IFMIS Paybill Generation spreadsheet layout:

     Header filters (xxx_1 … xxx_5)
       · Agency Code · Payroll Department Name · Financial Year
       · Month ID    · Payment Order – Acknowledgement

     Table columns
       Employee Details  | Basic Earnings                  | Allowances
         Sl.No · Name ·    A Basic Pay                         D Total Allow.
         Gender · EID ·    B Arrears
         CID/WP · TPN ·    C Partial Pay
         DoB · DoA · DoS
         Emp Type · Pos Lvl

       Total Earnings  X = A+B+C+D
       Statutory Deductions  E PF · F TDS · G HC · H GIS
       Floating Deductions   I CSWS · J House Rent
       Total Deductions  Y = E+F+G+H+I+J
       Net Pay           Z = X – Y

   Data is sourced live from the ZESt (Civil Servant) or OPS master via the
   `employees` prop. Arrears / Partial Pay / Total Allowances / House Rent
   are editable inline; every dependent cell (Total Earnings, Total
   Deductions, Net Pay, department total) recomputes automatically.
   Edits persist to localStorage so state survives tab switches.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { EMPLOYEES, computeEmployeePay } from "../../state/payrollSeed";

interface PaybillRowEdits {
  /** Arrears (B) override */
  arrears?: number;
  /** Partial Pay (C) override */
  partialPay?: number;
  /** Total Allowances (D) override */
  totalAllowances?: number;
  /** House Rent (J) override */
  houseRent?: number;
}

type EditsMap = Record<string, PaybillRowEdits>;
const LS_KEY = "ifmis-paybill-edits";

function readEdits(): EditsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as EditsMap;
  } catch {
    return {};
  }
}
function writeEdits(m: EditsMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export interface PaybillGenerationTableProps {
  /** Category label used on the hero banner */
  category: "civil-servant" | "other-public-servant";
}

const nu = (n: number) => Math.round(n).toLocaleString("en-IN");

function currentFinancialYear(): string {
  const d = new Date();
  const y = d.getFullYear();
  /* Bhutan FY runs July–June */
  const start = d.getMonth() >= 6 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function currentMonthId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PaybillGenerationTable({ category }: PaybillGenerationTableProps) {
  /* ─── Filter state (header xxx_1 … xxx_5) ──────────────────────────── */
  const agencies = useMemo(() => {
    const set = new Map<string, string>();
    EMPLOYEES.forEach((e) => {
      if (e.category === category) set.set(e.agencyCode, e.agencyName);
    });
    return Array.from(set.entries()).map(([code, name]) => ({ code, name }));
  }, [category]);

  const [agencyCode, setAgencyCode] = useState<string>(agencies[0]?.code ?? "");
  const agencyName = agencies.find((a) => a.code === agencyCode)?.name ?? "";

  const departments = useMemo(() => {
    const set = new Map<string, string>();
    EMPLOYEES.filter((e) => e.category === category && e.agencyCode === agencyCode).forEach((e) =>
      set.set(e.departmentCode, e.departmentName),
    );
    return Array.from(set.entries()).map(([code, name]) => ({ code, name }));
  }, [category, agencyCode]);

  const [departmentCode, setDepartmentCode] = useState<string>(departments[0]?.code ?? "");
  useEffect(() => {
    /* Reset department when agency changes. */
    setDepartmentCode(departments[0]?.code ?? "");
  }, [departments]);

  const departmentName = departments.find((d) => d.code === departmentCode)?.name ?? "";

  const [financialYear, setFinancialYear] = useState<string>(currentFinancialYear());
  const [monthId, setMonthId] = useState<string>(currentMonthId());
  const [paymentOrderAck, setPaymentOrderAck] = useState<string>(
    `PO-${agencyCode || "XXX"}-${monthId.replace("-", "")}-ACK`,
  );
  useEffect(() => {
    setPaymentOrderAck(`PO-${agencyCode || "XXX"}-${monthId.replace("-", "")}-ACK`);
  }, [agencyCode, monthId]);

  /* ─── Edits map — persists to localStorage for inline editing ─────── */
  const [edits, setEdits] = useState<EditsMap>(() => readEdits());
  const updateEdit = (empId: string, patch: PaybillRowEdits) => {
    setEdits((prev) => {
      const next = { ...prev, [empId]: { ...prev[empId], ...patch } };
      writeEdits(next);
      return next;
    });
  };

  /* ─── Scoped employee roster ─────────────────────────────────────── */
  const roster = useMemo(() => {
    return EMPLOYEES.filter(
      (e) =>
        e.category === category &&
        (agencyCode ? e.agencyCode === agencyCode : true) &&
        (departmentCode ? e.departmentCode === departmentCode : true),
    );
  }, [category, agencyCode, departmentCode]);

  /* ─── Row computation ─────────────────────────────────────────────── */
  const rows = useMemo(() => {
    return roster.map((e, idx) => {
      const pay = computeEmployeePay(e.basicPay, e.positionLevel);
      const rowEdit = edits[e.id] ?? {};
      const A = e.basicPay;
      const B = rowEdit.arrears ?? 0;
      const C = rowEdit.partialPay ?? 0;
      const D = rowEdit.totalAllowances ?? pay.totalAllowances;
      const X = A + B + C + D;
      const E = pay.pf;
      const F = pay.tds;
      const G = pay.hc;
      const H = pay.gis;
      const I = pay.csws;
      const J = rowEdit.houseRent ?? 0;
      const Y = E + F + G + H + I + J;
      const Z = X - Y;
      return { idx: idx + 1, emp: e, A, B, C, D, X, E, F, G, H, I, J, Y, Z };
    });
  }, [roster, edits]);

  /* ─── Column totals ───────────────────────────────────────────────── */
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.A += r.A; acc.B += r.B; acc.C += r.C; acc.D += r.D; acc.X += r.X;
        acc.E += r.E; acc.F += r.F; acc.G += r.G; acc.H += r.H; acc.I += r.I; acc.J += r.J;
        acc.Y += r.Y; acc.Z += r.Z;
        return acc;
      },
      { A: 0, B: 0, C: 0, D: 0, X: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, Y: 0, Z: 0 },
    );
  }, [rows]);

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Filters header — matches xxx_1 … xxx_5 layout */}
      <div className="rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Paybill Generation · Filters
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-700">
            PAYBILL GENERATION
          </span>
        </div>
        <div className="divide-y divide-slate-200">
          <FilterRow label="Agency Code">
            <select
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {agencies.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </FilterRow>
          <FilterRow label="Payroll Department Name : Organization">
            <select
              value={departmentCode}
              onChange={(e) => setDepartmentCode(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </FilterRow>
          <FilterRow label="Financial Year">
            <input
              type="text"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </FilterRow>
          <FilterRow label="Month ID">
            <input
              type="month"
              value={monthId}
              onChange={(e) => setMonthId(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </FilterRow>
          <FilterRow label="Payment Order – Acknowledgement">
            <input
              type="text"
              value={paymentOrderAck}
              onChange={(e) => setPaymentOrderAck(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </FilterRow>
        </div>
      </div>

      {/* Bill Generation table */}
      <div className="overflow-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-700">
          BILL GENERATION
        </div>
        <table className="min-w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th colSpan={11} className="border border-slate-300 px-2 py-1 text-center font-bold">
                Employee Details
              </th>
              <th colSpan={3} className="border border-slate-300 bg-blue-50 px-2 py-1 text-center font-bold">
                Basic Earnings
              </th>
              <th className="border border-slate-300 bg-indigo-50 px-2 py-1 text-center font-bold">Allowances</th>
              <th className="border border-slate-300 bg-emerald-50 px-2 py-1 text-center font-bold">
                Total Earnings
              </th>
              <th colSpan={4} className="border border-slate-300 bg-rose-50 px-2 py-1 text-center font-bold">
                Statutory Deductions
              </th>
              <th colSpan={2} className="border border-slate-300 bg-amber-50 px-2 py-1 text-center font-bold">
                Floating Deductions
              </th>
              <th className="border border-slate-300 bg-rose-100 px-2 py-1 text-center font-bold">
                Total Deductions
              </th>
              <th className="border border-slate-300 bg-emerald-100 px-2 py-1 text-center font-bold">Net Pay</th>
            </tr>
            <tr className="bg-slate-50 text-[11px] font-semibold text-slate-700">
              <Th>Sl.No</Th>
              <Th>Name</Th>
              <Th>Gender</Th>
              <Th>EID</Th>
              <Th>CID/WP</Th>
              <Th>TPN</Th>
              <Th>DoB</Th>
              <Th>Date of Appointment</Th>
              <Th>Date of Separation</Th>
              <Th>Employee Type</Th>
              <Th>Position Level</Th>
              <Th>Basic Pay (A)</Th>
              <Th>Arrears (B)</Th>
              <Th>Partial Pay (C)</Th>
              <Th>Total Allowances (D)</Th>
              <Th>X = A+B+C+D</Th>
              <Th>PF (E)</Th>
              <Th>TDS (F)</Th>
              <Th>HC (G)</Th>
              <Th>GIS (H)</Th>
              <Th>CSWS (I)</Th>
              <Th>House Rent (J)</Th>
              <Th>Y = E+F+G+H+I+J</Th>
              <Th>Z = X – Y</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={24} className="border border-slate-200 px-3 py-8 text-center text-slate-500">
                  No employees match the selected department. Adjust the filters above.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.emp.id} className="hover:bg-slate-50">
                  <Td>{r.idx}</Td>
                  <Td className="whitespace-nowrap font-semibold text-slate-900">{r.emp.name}</Td>
                  <Td>{r.emp.gender}</Td>
                  <Td className="font-mono text-[11px]">{r.emp.eid}</Td>
                  <Td className="font-mono text-[11px]">{r.emp.cid}</Td>
                  <Td className="font-mono text-[11px]">{r.emp.tpn}</Td>
                  <Td className="text-[11px]">{r.emp.dateOfBirth}</Td>
                  <Td className="text-[11px]">{r.emp.dateOfEmployment}</Td>
                  <Td className="text-[11px]">{r.emp.dateOfSeparation ?? "—"}</Td>
                  <Td>{r.emp.subType}</Td>
                  <Td>{r.emp.positionLevel}</Td>
                  <Td className="text-right tabular-nums">{nu(r.A)}</Td>
                  <Td>
                    <EditNum
                      value={r.B}
                      onChange={(v) => updateEdit(r.emp.id, { arrears: v })}
                    />
                  </Td>
                  <Td>
                    <EditNum
                      value={r.C}
                      onChange={(v) => updateEdit(r.emp.id, { partialPay: v })}
                    />
                  </Td>
                  <Td>
                    <EditNum
                      value={r.D}
                      onChange={(v) => updateEdit(r.emp.id, { totalAllowances: v })}
                    />
                  </Td>
                  <Td className="bg-emerald-50/50 text-right font-semibold tabular-nums">{nu(r.X)}</Td>
                  <Td className="text-right tabular-nums">{nu(r.E)}</Td>
                  <Td className="text-right tabular-nums">{nu(r.F)}</Td>
                  <Td className="text-right tabular-nums">{nu(r.G)}</Td>
                  <Td className="text-right tabular-nums">{nu(r.H)}</Td>
                  <Td className="text-right tabular-nums">{nu(r.I)}</Td>
                  <Td>
                    <EditNum
                      value={r.J}
                      onChange={(v) => updateEdit(r.emp.id, { houseRent: v })}
                    />
                  </Td>
                  <Td className="bg-rose-50/60 text-right font-semibold tabular-nums">{nu(r.Y)}</Td>
                  <Td className="bg-emerald-100/60 text-right font-bold tabular-nums">{nu(r.Z)}</Td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <td colSpan={11} className="border border-slate-300 px-2 py-1 text-right">
                  Total Employees with Entitlements for this Payroll Department: {rows.length}
                </td>
                <Td className="text-right tabular-nums">{nu(totals.A)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.B)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.C)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.D)}</Td>
                <Td className="bg-emerald-100 text-right tabular-nums">{nu(totals.X)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.E)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.F)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.G)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.H)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.I)}</Td>
                <Td className="text-right tabular-nums">{nu(totals.J)}</Td>
                <Td className="bg-rose-100 text-right tabular-nums">{nu(totals.Y)}</Td>
                <Td className="bg-emerald-200 text-right tabular-nums">{nu(totals.Z)}</Td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-[11px] text-slate-500">
        Source: ZESt / OPS master · Agency <strong>{agencyName}</strong> · Dept <strong>{departmentName}</strong>.
        Columns A, E, F, G, H, I are computed from Paybill Standard formulae. B / C / D / J are editable and
        persist locally. Totals X, Y, Z recompute automatically.
      </p>
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────────────────── */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-300 px-2 py-1 text-left font-semibold">{children}</th>
  );
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border border-slate-200 px-2 py-1 ${className ?? ""}`}>{children}</td>;
}
function EditNum({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className="w-24 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-right text-[12px] tabular-nums focus:border-blue-500 focus:outline-none"
    />
  );
}
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(220px,280px)_minmax(80px,120px)_1fr] items-center gap-3 px-4 py-1.5">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <span className="font-mono text-[11px] text-slate-400">xxx</span>
      <div>{children}</div>
    </div>
  );
}

export default PaybillGenerationTable;
