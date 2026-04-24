/* ═══════════════════════════════════════════════════════════════════════════
   OPS Travel — POST Payment Page
   ───────────────────────────────────────────────────────────────────
   Focuses on SRS §4. After the MCP releases the travel advance payment,
   IFMIS posts the following to e-DATS:
     • Approved Travel Allowance Reference Number
     • Payment Transaction Reference Number
     • Transaction Status (paid / rejected with reason)
     • Date of Payment
     • Amount Paid
     • Other related data (currency, claim ref)

   This page renders the live dispatch queue with status, timestamps,
   payload fields, and a retry action for failed entries.
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useTravelEdatsDispatches,
  markDispatched,
  markDispatchFailed,
  type TravelEdatsDispatch,
} from '../state/travelEdatsDispatches';
import { useTravelClaims, type TravelClaimCategory } from '../state/travelClaims';

const STATUS_TONE: Record<TravelEdatsDispatch['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  dispatched: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function OpsTravelPostPaymentPage() {
  const dispatches = useTravelEdatsDispatches();
  const claims = useTravelClaims();
  const location = useLocation();
  const category: TravelClaimCategory = location.pathname.includes('/payroll/ops/')
    ? 'other-public-servant'
    : 'civil-servant';
  const categoryLabel = category === 'other-public-servant' ? 'Other Public Servant' : 'Civil Servant';

  const [statusFilter, setStatusFilter] = useState<TravelEdatsDispatch['status'] | 'all'>('all');
  const [query, setQuery] = useState('');

  /* Only show dispatches that belong to claims in this category. */
  const categoryDispatches = useMemo(() => {
    const claimIds = new Set(claims.filter((c) => c.category === category).map((c) => c.id));
    return dispatches.filter((d) => claimIds.has(d.claimId));
  }, [dispatches, claims, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categoryDispatches
      .filter((d) =>
        (statusFilter === 'all' || d.status === statusFilter) &&
        (q.length === 0 ||
          d.approvedTARefNo.toLowerCase().includes(q) ||
          d.paymentTransactionRef.toLowerCase().includes(q) ||
          d.claimId.toLowerCase().includes(q) ||
          d.transactionStatus.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.enqueuedAt.localeCompare(a.enqueuedAt));
  }, [categoryDispatches, statusFilter, query]);

  const stats = useMemo(() => {
    const pending = categoryDispatches.filter((d) => d.status === 'pending').length;
    const dispatched = categoryDispatches.filter((d) => d.status === 'dispatched').length;
    const failed = categoryDispatches.filter((d) => d.status === 'failed').length;
    const totalAmount = categoryDispatches.reduce((s, d) => s + d.amountPaid, 0);
    return { pending, dispatched, failed, total: categoryDispatches.length, totalAmount };
  }, [categoryDispatches]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Travel — POST Payment
            <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-600">
              {categoryLabel}
            </span>
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
            SRS §4 — e-DATS Post-Back
          </span>
        </div>
        <p className="text-sm text-slate-600">
          IFMIS posts {categoryLabel.toLowerCase()} travel payment outcomes back to e-DATS after the MCP
          releases the payment. Each dispatch carries the Approved TA Ref, Payment Transaction Ref, status,
          date of payment, and amount paid. Failures can be retried manually or marked failed with a reason.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Total dispatches" value={String(stats.total)} tone="slate" />
        <Tile label="Pending" value={String(stats.pending)} tone="amber" />
        <Tile label="Dispatched" value={String(stats.dispatched)} tone="emerald" />
        <Tile label="Failed" value={String(stats.failed)} tone="rose" />
        <Tile label="Amount (Nu.)" value={Math.round(stats.totalAmount).toLocaleString('en-IN')} tone="teal" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by TA ref / txn ref / claim id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[260px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TravelEdatsDispatch['status'] | 'all')}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="dispatched">Dispatched</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Payload schema reference */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
        <strong className="font-bold uppercase tracking-widest">Payload sent per dispatch (SRS §4):</strong>{' '}
        <code className="font-mono">{`{ approvedTARefNo, paymentTransactionRef, transactionStatus, dateOfPayment, amountPaid, currency, claimId }`}</code>
      </div>

      {/* Dispatch table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Claim</th>
              <th className="px-3 py-2.5">Approved TA Ref</th>
              <th className="px-3 py-2.5">Payment Txn Ref</th>
              <th className="px-3 py-2.5">Txn Status</th>
              <th className="px-3 py-2.5">Date of Payment</th>
              <th className="px-3 py-2.5 text-right">Amount Paid</th>
              <th className="px-3 py-2.5">Enqueued / Dispatched</th>
              <th className="px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  No e-DATS post-back dispatches yet. Process a travel payment from the Payment Order
                  sub-menu to see one arrive here.
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const claim = claims.find((c) => c.id === d.claimId);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 align-top">
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATUS_TONE[d.status]}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-[12px] text-slate-900">{claim?.refNo ?? d.claimId}</div>
                      <div className="text-[11px] text-slate-500">{claim?.employeeName ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{d.approvedTARefNo}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{d.paymentTransactionRef}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700">{d.transactionStatus}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700">{d.dateOfPayment}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {d.currency} {d.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">
                      <div>enqueued {new Date(d.enqueuedAt).toLocaleTimeString()}</div>
                      {d.dispatchedAt && <div>sent {new Date(d.dispatchedAt).toLocaleTimeString()}</div>}
                      {d.failureReason && <div className="text-rose-600">reason: {d.failureReason}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex gap-1">
                        {d.status === 'pending' && (
                          <>
                            <button
                              onClick={() => markDispatched(d.id)}
                              title="Retry / mark dispatched"
                              className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200"
                            >
                              Retry
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt('Failure reason (will be shown on the dispatch):');
                                if (reason) markDispatchFailed(d.id, reason);
                              }}
                              className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-200"
                            >
                              Mark Failed
                            </button>
                          </>
                        )}
                        {d.status === 'failed' && (
                          <button
                            onClick={() => markDispatched(d.id)}
                            title="Retry failed dispatch"
                            className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Pending dispatches auto-flip to "dispatched" after a short handshake simulating the e-DATS inbound
        webhook. In production, the server-side integration would POST to e-DATS and update this state based
        on the acknowledgement.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'amber' | 'emerald' | 'rose' | 'teal';
}) {
  const bg = {
    slate: 'border-slate-200 bg-white',
    amber: 'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    rose: 'border-rose-200 bg-rose-50',
    teal: 'border-teal-200 bg-teal-50',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${bg}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
