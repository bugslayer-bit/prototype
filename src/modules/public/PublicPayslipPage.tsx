import React, { useState, useMemo } from 'react';
import { useAuth } from '../../shared/context/AuthContext';

interface Employee {
  id: string;
  cid: string;
  name: string;
  position: string;
  positionLevel: string;
  department: string;
  agency: string;
  bankAccount: string;
  bankName: string;
}

interface PayslipData {
  month: string;
  year: number;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
}

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    cid: "11234567890",
    name: "Tenzin Dorji",
    position: "Senior Finance Officer",
    positionLevel: "P2",
    department: "Finance & Accounts",
    agency: "Ministry of Finance",
    bankAccount: "****5678",
    bankName: "Bank of Bhutan",
  },
  {
    id: "EMP002",
    cid: "12345678901",
    name: "Chimi Yangzom",
    position: "Administrative Officer",
    positionLevel: "P3",
    department: "Administration",
    agency: "Royal Thromde of Thimphu",
    bankAccount: "****1234",
    bankName: "BDFC Limited",
  },
  {
    id: "EMP003",
    cid: "13456789012",
    name: "Sonam Penjor",
    position: "Program Officer",
    positionLevel: "P4",
    department: "Development",
    agency: "Dzongkhag Administration",
    bankAccount: "****9876",
    bankName: "Bank of Bhutan",
  },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function generatePayslip(employee: Employee, monthIndex: number): PayslipData {
  const basicPay = Math.floor(Math.random() * 15000) + 25000;

  return {
    month: MONTHS[monthIndex],
    year: 2026,
    earnings: {
      "Basic Pay": basicPay,
      "Leave Encashment (8.33%)": Math.round(basicPay * 0.0833),
      "LTC (8.33%)": Math.round(basicPay * 0.0833),
      "Lump Sum (50%)": Math.round(basicPay * 0.5),
      "Indexation (5%)": Math.round(basicPay * 0.05),
    },
    deductions: {
      "PF (10%)": Math.round(basicPay * 0.1),
      "GIS (slab)": Math.floor(Math.random() * 500) + 200,
      "Health Contribution (1%)": Math.round(basicPay * 0.01),
      "TDS (progressive)": Math.floor(Math.random() * 1500) + 500,
      "CSWS": 150,
    },
  };
}

export function PublicPayslipPage() {
  const { user } = useAuth();
  const [cidInput, setCidInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<Employee | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleCidLogin = () => {
    if (cidInput.length === 11 && /^\d+$/.test(cidInput)) {
      const employee = MOCK_EMPLOYEES[Math.floor(Math.random() * MOCK_EMPLOYEES.length)];
      setAuthenticatedEmployee({ ...employee, cid: cidInput });
    }
  };

  const payslipData = useMemo(() => {
    return authenticatedEmployee ? generatePayslip(authenticatedEmployee, selectedMonth) : null;
  }, [authenticatedEmployee, selectedMonth]);

  const totalEarnings = useMemo(() => {
    if (!payslipData) return 0;
    return Object.values(payslipData.earnings).reduce((a, b) => a + b, 0);
  }, [payslipData]);

  const totalDeductions = useMemo(() => {
    if (!payslipData) return 0;
    return Object.values(payslipData.deductions).reduce((a, b) => a + b, 0);
  }, [payslipData]);

  const netPay = totalEarnings - totalDeductions;

  const handleDownload = () => {
    setToastMessage("Download feature coming soon");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="grid gap-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V9.75A2.25 2.25 0 016 7.5h12z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Payslip</h1>
            <p className="text-sm text-slate-600">View and download your salary slips</p>
          </div>
        </div>
      </section>

      {!authenticatedEmployee ? (
        /* ── CID Login Form ─────────────────────────────────────── */
        <section className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-6 max-w-md">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Employee Authentication</h2>
          <p className="text-sm text-slate-600 mb-4">Enter your 11-digit CID number to view your payslips</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CID Number</label>
              <input
                type="text"
                maxLength={11}
                value={cidInput}
                onChange={(e) => setCidInput(e.target.value.replace(/\D/g, ''))}
                placeholder="11234567890"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">Mock: Any 11-digit number works</p>
            </div>

            <button
              onClick={handleCidLogin}
              disabled={cidInput.length !== 11}
              className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              View My Payslips
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* ── Month Selector ─────────────────────────────────── */}
          <section className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Select Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {MONTHS.slice(0, 3).map((month, idx) => (
                <option key={idx} value={idx}>{month} 2026</option>
              ))}
            </select>

            <button
              onClick={() => setAuthenticatedEmployee(null)}
              className="ml-auto px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Change CID
            </button>
          </section>

          {/* ── Payslip Card ───────────────────────────────────── */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 print:shadow-none">
            {/* Header */}
            <div className="border-b border-slate-200 pb-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{authenticatedEmployee.agency}</h2>
                  <p className="text-sm text-slate-500">PAYSLIP - {payslipData?.month.toUpperCase()} {payslipData?.year}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p className="font-medium">CID: {authenticatedEmployee.cid}</p>
                  <p>Payslip ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Employee Name</p>
                  <p className="font-semibold text-slate-900">{authenticatedEmployee.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Position</p>
                  <p className="font-semibold text-slate-900">{authenticatedEmployee.position}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Level</p>
                  <p className="font-semibold text-slate-900">{authenticatedEmployee.positionLevel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="font-semibold text-slate-900">{authenticatedEmployee.department}</p>
                </div>
              </div>
            </div>

            {/* Earnings Table */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide text-slate-600">Earnings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(payslipData?.earnings || {}).map(([key, value], idx) => (
                      <tr key={key} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">{key}</td>
                        <td className="px-4 py-2.5 text-right text-slate-900 font-semibold">Nu {value.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-teal-200 bg-teal-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">Total Earnings</td>
                      <td className="px-4 py-3 text-right font-bold text-teal-700">Nu {totalEarnings.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide text-slate-600">Deductions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(payslipData?.deductions || {}).map(([key, value], idx) => (
                      <tr key={key} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">{key}</td>
                        <td className="px-4 py-2.5 text-right text-slate-900 font-semibold">Nu {value.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-rose-200 bg-rose-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">Total Deductions</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">Nu {totalDeductions.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Pay */}
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900">Net Pay (Credit to Bank)</span>
                <span className="text-3xl font-bold text-emerald-700">Nu {netPay.toLocaleString()}</span>
              </div>
            </div>

            {/* Bank Details */}
            <div className="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-600 uppercase mb-2">Bank Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Bank Name</p>
                  <p className="font-semibold text-slate-900">{authenticatedEmployee.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Account Number</p>
                  <p className="font-semibold text-slate-900">{authenticatedEmployee.bankAccount}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
              <p>This is an electronically generated payslip. No signature required.</p>
              <p className="mt-1">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </section>

          {/* ── Action Buttons ─────────────────────────────────── */}
          <div className="flex gap-3 print:hidden">
            <button
              onClick={handleDownload}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2v-2a2 2 0 00-2-2z" />
              </svg>
              Print
            </button>
          </div>
        </>
      )}

      {/* ── Toast Notification ─────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-4 right-4 px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-medium shadow-lg animate-pulse">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
