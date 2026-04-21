/* ═══════════════════════════════════════════════════════════════════════════
   Financial Institution — Self-Service Portal Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   ───────────────────────────────────────────────────────────────────
   Landing page for Financial Institution users showing dashboard with
   key metrics, quick actions, and status overview.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useState } from "react";
import { useAuth } from "../../shared/context/AuthContext";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface FIMetricCard {
  label: string;
  value: string | number;
  change?: string;
  color: string;
  icon: string;
}

interface DiscountingRequest {
  id: string;
  contractor: string;
  invoiceNo: string;
  amount: number;
  submittedDate: string;
  status: "pending" | "verified" | "rejected" | "settled";
}

interface PaymentOrder {
  id: string;
  agency: string;
  beneficiary: string;
  amount: number;
  date: string;
  status: "pending" | "processed" | "settled";
}

/* ─── Seed Data ──────────────────────────────────────────────────────────── */
const METRICS: FIMetricCard[] = [
  { label: "Active Payment Channels", value: 14, change: "+2 this month", color: "bg-blue-500", icon: "🔗" },
  { label: "Pending Discounting Requests", value: 7, change: "3 urgent", color: "bg-amber-500", icon: "📄" },
  { label: "Payment Orders (This Month)", value: 42, change: "Nu.12.4M total", color: "bg-emerald-500", icon: "💰" },
  { label: "CBS Connection Status", value: "Active", change: "Last sync: 2 min ago", color: "bg-indigo-500", icon: "🏦" },
];

const DISCOUNTING_REQUESTS: DiscountingRequest[] = [
  { id: "BD-2026-001", contractor: "Dorji Construction Pvt Ltd", invoiceNo: "INV-2026-0142", amount: 2450000, submittedDate: "2026-04-10", status: "pending" },
  { id: "BD-2026-002", contractor: "Bhutan Builders & Engineers", invoiceNo: "INV-2026-0138", amount: 1890000, submittedDate: "2026-04-09", status: "pending" },
  { id: "BD-2026-003", contractor: "Druk IT Solutions", invoiceNo: "INV-2026-0135", amount: 780000, submittedDate: "2026-04-08", status: "verified" },
  { id: "BD-2026-004", contractor: "Tashi Medical Supplies", invoiceNo: "INV-2026-0130", amount: 3200000, submittedDate: "2026-04-05", status: "settled" },
  { id: "BD-2026-005", contractor: "Phuentsholing Trading Co.", invoiceNo: "INV-2026-0125", amount: 560000, submittedDate: "2026-04-03", status: "rejected" },
];

const PAYMENT_ORDERS: PaymentOrder[] = [
  { id: "PO-2026-0891", agency: "Ministry of Finance", beneficiary: "Dorji Construction Pvt Ltd", amount: 4500000, date: "2026-04-12", status: "pending" },
  { id: "PO-2026-0888", agency: "Government Technology Agency", beneficiary: "Druk IT Solutions", amount: 1200000, date: "2026-04-11", status: "processed" },
  { id: "PO-2026-0885", agency: "Ministry of Health", beneficiary: "Tashi Medical Supplies", amount: 2800000, date: "2026-04-10", status: "settled" },
  { id: "PO-2026-0880", agency: "Ministry of Finance", beneficiary: "Bhutan Builders & Engineers", amount: 6200000, date: "2026-04-09", status: "settled" },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatNu(amount: number): string {
  if (amount >= 1_000_000) return `Nu.${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Nu.${(amount / 1_000).toFixed(0)}K`;
  return `Nu.${amount.toLocaleString()}`;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
  verified: { bg: "bg-blue-50", text: "text-blue-700", label: "Verified" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  settled: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Settled" },
  processed: { bg: "bg-indigo-50", text: "text-indigo-700", label: "Processed" },
};

/* ─── Component ──────────────────────────────────────────────────────────── */
const FIPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"discounting" | "payments">("discounting");

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🏦</span>
              <h1 className="text-2xl font-bold">Financial Institution Portal</h1>
            </div>
            <p className="text-blue-100 text-sm mt-1">
              Welcome, {user?.name ?? "FI User"} — manage bill discounting, payment channels, and CBS integration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              CBS Connected
            </span>
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              FI Portal v1.0
            </span>
          </div>
        </div>
      </div>

      {/* ── Metrics Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{m.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{m.value}</p>
                {m.change && <p className="text-xs text-slate-500 mt-0.5">{m.change}</p>}
              </div>
              <span className={`${m.color} text-white text-lg rounded-lg w-10 h-10 flex items-center justify-center`}>
                {m.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "📝", label: "New FI Registration", desc: "Register institution" },
            { icon: "📄", label: "Bill Discounting", desc: "Review requests" },
            { icon: "🔄", label: "CBS Sync", desc: "Refresh connection" },
            { icon: "📊", label: "Transaction Report", desc: "Download reports" },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 hover:border-blue-300 transition-all text-center"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-xs font-medium text-slate-700">{action.label}</span>
              <span className="text-[10px] text-slate-500">{action.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Switcher ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("discounting")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "discounting"
                ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Bill Discounting Requests ({DISCOUNTING_REQUESTS.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "payments"
                ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Payment Orders ({PAYMENT_ORDERS.length})
          </button>
        </div>

        {/* ── Discounting Table ─────────────────────────────────────── */}
        {activeTab === "discounting" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase">
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Contractor</th>
                  <th className="px-4 py-3">Invoice No.</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DISCOUNTING_REQUESTS.map((req) => {
                  const badge = STATUS_BADGES[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{req.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{req.contractor}</td>
                      <td className="px-4 py-3 text-slate-600">{req.invoiceNo}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatNu(req.amount)}</td>
                      <td className="px-4 py-3 text-slate-500">{req.submittedDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Payment Orders Table ─────────────────────────────────── */}
        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Agency</th>
                  <th className="px-4 py-3">Beneficiary</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PAYMENT_ORDERS.map((po) => {
                  const badge = STATUS_BADGES[po.status];
                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{po.id}</td>
                      <td className="px-4 py-3 text-slate-700">{po.agency}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{po.beneficiary}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatNu(po.amount)}</td>
                      <td className="px-4 py-3 text-slate-500">{po.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CBS Integration Status ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Core Banking System (CBS) Integration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-emerald-800">API Connection</p>
              <p className="text-xs text-emerald-600">Active — Latency 45ms</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-800">Last Sync</p>
              <p className="text-xs text-blue-600">2 minutes ago — 42 transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="h-3 w-3 rounded-full bg-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">BFSC Code</p>
              <p className="text-xs text-slate-500">BOB-001 (Bank of Bhutan — Main)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FIPortalPage;
