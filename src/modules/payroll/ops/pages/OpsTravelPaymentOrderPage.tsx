/* ═══════════════════════════════════════════════════════════════════════════
   OPS Travel — Payment Order Page
   ───────────────────────────────────────────────────────────────────
   Focuses on SRS §3: from the approved claim onwards.
     • Auto-generated Payment Transaction (IFMIS-YYYY-XXXXX)
     • Auto-generated Payment Order (PO-YYYY-XXXXX) with bank/cash details
     • Generate Payment Advice → Post to MCP → MCP Release chain
     • Per-row and bulk actions
     • Inline PO + Advice preview modals

   Consumes the shared travelClaims store so actions here propagate back
   to the Claim List view automatically.
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useOpsRoleCapabilities } from '../state/useOpsRoleCapabilities';
import {
  useTravelClaims,
  setClaims,
  type TravelClaim,
  type TravelClaimCategory,
} from '../state/travelClaims';
import {
  generatePaymentAdvice,
  postAdviceToMcp,
  markAdviceReleased,
  markOrderStatus,
  getOrderForClaim,
  useTravelPaymentData,
  type TravelPaymentOrder,
  type TravelPaymentAdvice,
} from '../state/travelPaymentTransactions';
import { enqueueTravelEdatsDispatch } from '../state/travelEdatsDispatches';

const PIPELINE_STATUSES: TravelClaim['status'][] = [
  'approved', 'advice-generated', 'posted-to-mcp', 'paid',
];

const STATUS_TONE: Record<string, string> = {
  approved: 'bg-green-100 text-green-700 border-green-200',
  'advice-generated': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'posted-to-mcp': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  paid: 'bg-teal-100 text-teal-700 border-teal-200',
};

const nu = (currency: string, n: number) =>
  `${currency === 'BTN' ? 'Nu.' : currency} ${Math.round(n).toLocaleString('en-IN')}`;

export function OpsTravelPaymentOrderPage() {
  const caps = useOpsRoleCapabilities();
  const claims = useTravelClaims();
  const { orders, advices } = useTravelPaymentData();
  const location = useLocation();

  /* Detect category from the URL: OPS routes live under /payroll/ops/…,
     CS routes under /payroll/travel-claims/…. Same component, different
     source filters. */
  const category: TravelClaimCategory = location.pathname.includes('/payroll/ops/')
    ? 'other-public-servant'
    : 'civil-servant';
  const categoryLabel = category === 'other-public-servant' ? 'Other Public Servant' : 'Civil Servant';

  const [statusFilter, setStatusFilter] = useState<TravelClaim['status'] | 'all'>('all');
  const [query, setQuery] = useState('');
  const [poPreview, setPoPreview] = useState<TravelPaymentOrder | null>(null);
  const [advicePreview, setAdvicePreview] = useState<TravelPaymentAdvice | null>(null);

  const pipeline = useMemo(
    () => claims.filter((c) => c.category === category && PIPELINE_STATUSES.includes(c.status)),
    [claims, category],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pipeline.filter((c) =>
      (statusFilter === 'all' || c.status === statusFilter) &&
      (q.length === 0 ||
        c.refNo.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        (c.approvedTARefNo ?? '').toLowerCase().includes(q) ||
        (c.paymentTransactionRef ?? '').toLowerCase().includes(q) ||
        (c.paymentOrderId ?? '').toLowerCase().includes(q)),
    );
  }, [pipeline, statusFilter, query]);

  /* ── Per-row handlers — share logic with the Claim List page. ────────── */
  const handleGenerateAdvice = useCallback((claimId: string) => {
    const advice = generatePaymentAdvice(claimId);
    if (!advice) return;
    setClaims((prev) => prev.map((c) =>
      c.id === claimId
        ? { ...c, status: 'advice-generated', paymentAdviceId: advice.id, adviceGeneratedAt: advice.generatedAt }
        : c,
    ));
    console.log(`[Toast] Payment Advice ${advice.id} generated.`);
  }, []);

  const handlePostToMcp = useCallback((claimId: string) => {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim?.paymentAdviceId) return;
    const updated = postAdviceToMcp(claim.paymentAdviceId);
    if (!updated) return;
    setClaims((prev) => prev.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: 'posted-to-mcp',
            mcpJournalEntryId: updated.mcpJournalEntryId,
            mcpPostedAt: updated.postedToMcpAt,
          }
        : c,
    ));
    console.log(`[Toast] Advice ${claim.paymentAdviceId} posted to MCP. Journal ${updated.mcpJournalEntryId}.`);
  }, [claims]);

  const handleRelease = useCallback((claimId: string) => {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;
    const paidAt = new Date().toISOString().split('T')[0];
    const order = getOrderForClaim(claimId);
    if (order) markOrderStatus(order.id, 'settled');
    if (claim.paymentAdviceId) markAdviceReleased(claim.paymentAdviceId);
    if (claim.approvedTARefNo && claim.paymentTransactionRef) {
      enqueueTravelEdatsDispatch({
        claimId: claim.id,
        approvedTARefNo: claim.approvedTARefNo,
        paymentTransactionRef: claim.paymentTransactionRef,
        transactionStatus: 'paid',
        dateOfPayment: paidAt,
        amountPaid: claim.approvedAdvanceAmount || claim.amount,
        currency: claim.currency,
      });
    }
    setClaims((prev) => prev.map((c) =>
      c.id === claimId ? { ...c, status: 'paid', paidAt } : c,
    ));
    console.log('[Toast] MCP released payment. e-DATS post-back queued.');
  }, [claims]);

  /* ── Bulk actions ───────────────────────────────────────────────────── */
  const approvedCount = pipeline.filter((c) => c.status === 'approved').length;
  const adviceReadyCount = pipeline.filter((c) => c.status === 'advice-generated').length;

  const handleBulkGenerateAdvice = useCallback(() => {
    const approvedIds = claims
      .filter((c) => c.category === category && c.status === 'approved')
      .map((c) => c.id);
    if (approvedIds.length === 0) return;
    const generated: Array<{ id: string; adviceId: string; generatedAt: string }> = [];
    approvedIds.forEach((id) => {
      const advice = generatePaymentAdvice(id);
      if (advice) generated.push({ id, adviceId: advice.id, generatedAt: advice.generatedAt });
    });
    setClaims((prev) => prev.map((c) => {
      const match = generated.find((g) => g.id === c.id);
      return match
        ? { ...c, status: 'advice-generated' as const, paymentAdviceId: match.adviceId, adviceGeneratedAt: match.generatedAt }
        : c;
    }));
    console.log(`[Toast] Generated ${generated.length} Payment Advice${generated.length > 1 ? 's' : ''}.`);
  }, [claims, category]);

  const handleBulkPostToMcp = useCallback(() => {
    const advIds = claims
      .filter((c) => c.category === category && c.status === 'advice-generated')
      .map((c) => c.id);
    if (advIds.length === 0) return;
    const posted: Array<{ claimId: string; journalId: string; postedAt: string }> = [];
    advIds.forEach((id) => {
      const claim = claims.find((c) => c.id === id);
      if (!claim?.paymentAdviceId) return;
      const updated = postAdviceToMcp(claim.paymentAdviceId);
      if (updated?.mcpJournalEntryId && updated.postedToMcpAt) {
        posted.push({ claimId: id, journalId: updated.mcpJournalEntryId, postedAt: updated.postedToMcpAt });
      }
    });
    setClaims((prev) => prev.map((c) => {
      const match = posted.find((p) => p.claimId === c.id);
      return match
        ? { ...c, status: 'posted-to-mcp' as const, mcpJournalEntryId: match.journalId, mcpPostedAt: match.postedAt }
        : c;
    }));
    console.log(`[Toast] Posted ${posted.length} advice${posted.length > 1 ? 's' : ''} to MCP.`);
  }, [claims, category]);

  /* ── Summary tiles ──────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalsByStatus: Record<string, number> = {};
    pipeline.forEach((c) => { totalsByStatus[c.status] = (totalsByStatus[c.status] ?? 0) + 1; });
    const amountQueued = pipeline
      .filter((c) => c.status !== 'paid')
      .reduce((s, c) => s + (c.approvedAdvanceAmount || c.amount) * (c.exchangeRate ?? 1), 0);
    return {
      approved: totalsByStatus['approved'] ?? 0,
      adviceReady: totalsByStatus['advice-generated'] ?? 0,
      postedToMcp: totalsByStatus['posted-to-mcp'] ?? 0,
      paid: totalsByStatus['paid'] ?? 0,
      amountQueued,
    };
  }, [pipeline]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Travel — Payment Order
            <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-600">
              {categoryLabel}
            </span>
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700">
            SRS §3 — Payment Transaction + Payment Order
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Auto-generated Payment Transactions and Payment Orders for approved {categoryLabel.toLowerCase()}{' '}
          travel advances. Progress each claim through Generate Advice → Post to MCP → MCP Release. e-DATS
          post-back fires automatically on payment.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Approved" value={String(stats.approved)} tone="green" />
        <Tile label="Advice Ready" value={String(stats.adviceReady)} tone="indigo" />
        <Tile label="Posted to MCP" value={String(stats.postedToMcp)} tone="emerald" />
        <Tile label="Paid" value={String(stats.paid)} tone="teal" />
        <Tile label="In Queue (Nu.)" value={Math.round(stats.amountQueued).toLocaleString('en-IN')} tone="slate" />
      </div>

      {/* Bulk actions */}
      {!caps.isReadOnly && (approvedCount > 0 || adviceReadyCount > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <div className="flex-1 text-sm">
            <div className="font-bold text-indigo-900">Bulk actions</div>
            <div className="text-xs text-indigo-700">
              Push every eligible claim through its next SRS step in one click. Each claim keeps its own
              Advice + Journal entry for audit.
            </div>
          </div>
          {approvedCount > 0 && (
            <button
              onClick={handleBulkGenerateAdvice}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Generate Advice for all {approvedCount}
            </button>
          )}
          {adviceReadyCount > 0 && (
            <button
              onClick={handleBulkPostToMcp}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Post all {adviceReadyCount} to MCP
            </button>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by claim ref / TA ref / txn ref / PO id / employee…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[260px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TravelClaim['status'] | 'all')}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
        >
          <option value="all">All pipeline stages</option>
          <option value="approved">Approved (awaiting Advice)</option>
          <option value="advice-generated">Advice Generated</option>
          <option value="posted-to-mcp">Posted to MCP</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Claim</th>
              <th className="px-3 py-2.5">Employee</th>
              <th className="px-3 py-2.5">TA / Txn / PO</th>
              <th className="px-3 py-2.5">Mode</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Advice · MCP</th>
              <th className="px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No claims in the Payment Order pipeline match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const order = orders.find((o) => o.id === c.paymentOrderId);
                const advice = advices.find((a) => a.id === c.paymentAdviceId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 align-top">
                      <div className="font-mono font-semibold text-slate-900">{c.refNo}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{c.travelType === 'domestic' ? 'In-country' : 'Foreign'} · {c.destination}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-semibold text-slate-900">{c.employeeName}</div>
                      <div className="text-[11px] text-slate-500">CID {c.cid}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] font-mono">
                      <div>TA: {c.approvedTARefNo ?? '—'}</div>
                      <div>Txn: {c.paymentTransactionRef ?? '—'}</div>
                      <div>PO: {c.paymentOrderId ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2 align-top capitalize">{c.paymentMode ?? 'bank'}</td>
                    <td className="px-3 py-2 align-top text-right tabular-nums">
                      {nu(c.currency, c.approvedAdvanceAmount || c.amount)}
                      {c.currency !== 'BTN' && (
                        <div className="text-[10px] text-slate-500">≈ Nu. {Math.round((c.approvedAdvanceAmount || c.amount) * (c.exchangeRate ?? 1)).toLocaleString('en-IN')}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_TONE[c.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {c.status.replace(/-/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] font-mono">
                      <div>{c.paymentAdviceId ?? '—'}</div>
                      <div>{c.mcpJournalEntryId ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        {order && (
                          <button onClick={() => setPoPreview(order)} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">PO</button>
                        )}
                        {advice && (
                          <button onClick={() => setAdvicePreview(advice)} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">Advice</button>
                        )}
                        {!caps.isReadOnly && c.status === 'approved' && (
                          <button onClick={() => handleGenerateAdvice(c.id)} className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-200">
                            Gen. Advice
                          </button>
                        )}
                        {!caps.isReadOnly && c.status === 'advice-generated' && (
                          <button onClick={() => handlePostToMcp(c.id)} className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200">
                            Post to MCP
                          </button>
                        )}
                        {!caps.isReadOnly && c.status === 'posted-to-mcp' && (
                          <button onClick={() => handleRelease(c.id)} className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700 hover:bg-teal-200">
                            MCP Release
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

      {/* Preview modals */}
      {poPreview && (
        <PaymentOrderPreview
          order={poPreview}
          claim={claims.find((c) => c.paymentOrderId === poPreview.id) ?? null}
          onClose={() => setPoPreview(null)}
        />
      )}
      {advicePreview && (
        <PaymentAdvicePreview
          advice={advicePreview}
          onClose={() => setAdvicePreview(null)}
          onPostToMcp={() => {
            handlePostToMcp(advicePreview.claimId);
            setAdvicePreview(null);
          }}
        />
      )}

      <p className="mt-4 text-[11px] text-slate-500">
        This page is the Step 3 workstation. Use the Claim List sub-menu to create new claims (Step 1) and
        the POST Payment sub-menu to monitor the e-DATS post-back queue (Step 4).
      </p>
    </div>
  );
}

/* ─── Shared small bits ─────────────────────────────────────────────────── */

function Tile({ label, value, tone }: { label: string; value: string; tone: 'green' | 'indigo' | 'emerald' | 'teal' | 'slate' }) {
  const bg = {
    green: 'border-green-200 bg-green-50',
    indigo: 'border-indigo-200 bg-indigo-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    teal: 'border-teal-200 bg-teal-50',
    slate: 'border-slate-200 bg-white',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${bg}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function PaymentOrderPreview({
  order,
  claim,
  onClose,
}: {
  order: TravelPaymentOrder;
  claim: TravelClaim | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:backdrop-blur-none print:p-0">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl print:max-h-none print:shadow-none print:border-0">
        <div className="p-8 print:p-12">
          <div className="border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  Royal Government of Bhutan · IFMIS
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Payment Order</h2>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                  Travel Advance — {claim?.travelType === 'foreign' ? 'Foreign' : 'In-Country'}
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p><span className="font-bold">PO ID:</span> <span className="font-mono">{order.id}</span></p>
                <p><span className="font-bold">Txn Ref:</span> <span className="font-mono">{order.transactionId}</span></p>
                <p><span className="font-bold">Generated:</span> {new Date(order.generatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payee</div>
              <div className="mt-1 font-semibold text-slate-900">{order.employeeName}</div>
              <div className="text-xs text-slate-600 font-mono">CID: {order.employeeCid}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Mode</div>
              <div className="mt-1 font-semibold text-slate-900 capitalize">{order.mode === 'bank' ? 'Bank Transfer' : 'Cash Collection'}</div>
            </div>
            {order.mode === 'bank' ? (
              <>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bank</div>
                  <div className="mt-1 font-semibold text-slate-900">{order.bankName ?? '—'}</div>
                  <div className="text-xs text-slate-600">{order.bankBranch ?? ''}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account No.</div>
                  <div className="mt-1 font-mono text-slate-900">{order.bankAccountNumber ?? '—'}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Authorized Collector</div>
                  <div className="mt-1 font-semibold text-slate-900">{order.cashCollectorName ?? '—'}</div>
                  <div className="text-xs text-slate-600">CID: {order.cashCollectorCid ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Collection Point</div>
                  <div className="mt-1 text-slate-900">Agency Cashier Window</div>
                </div>
              </>
            )}
          </div>
          <table className="w-full border border-slate-300 text-sm mb-6">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-3 py-2 font-bold text-slate-700">Particular</th>
                <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700">Amount ({order.currency})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2">Approved Travel Advance</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{order.advanceAmount.toLocaleString()}</td>
              </tr>
              {order.bankCharges != null && order.bankCharges > 0 && (
                <tr>
                  <td className="border border-slate-300 px-3 py-2">Bank Charges</td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-mono">{order.bankCharges.toLocaleString()}</td>
                </tr>
              )}
              {order.fxConversionCharges != null && order.fxConversionCharges > 0 && (
                <tr>
                  <td className="border border-slate-300 px-3 py-2">Currency Conversion Charges</td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-mono">{order.fxConversionCharges.toLocaleString()}</td>
                </tr>
              )}
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-300 px-3 py-2">Total</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{order.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap gap-2 print:hidden">
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">🖨️ Print</button>
          <button onClick={() => { markOrderStatus(order.id, 'employee-copy'); window.alert(`Download queued for ${order.id}.`); }} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">📄 Download PDF</button>
          {order.mode === 'bank' && order.status !== 'sent-to-bank' && order.status !== 'settled' && (
            <button onClick={() => { markOrderStatus(order.id, 'sent-to-bank'); }} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700">🏦 Send to Bank</button>
          )}
          <button onClick={onClose} className="ml-auto px-3 py-1.5 rounded-lg bg-slate-200 text-slate-900 text-xs font-semibold hover:bg-slate-300">Close</button>
        </div>
      </div>
    </div>
  );
}

function PaymentAdvicePreview({
  advice,
  onClose,
  onPostToMcp,
}: {
  advice: TravelPaymentAdvice;
  onClose: () => void;
  onPostToMcp: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:backdrop-blur-none print:p-0">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl print:max-h-none print:shadow-none print:border-0">
        <div className="p-8 print:p-12">
          <div className="border-b-2 border-indigo-700 pb-4 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                  Royal Government of Bhutan · IFMIS
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Payment Advice</h2>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                  Travel Advance — {advice.travelType === 'foreign' ? 'Foreign' : 'In-Country'} · To Cash Management (MCP)
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p><span className="font-bold">Advice ID:</span> <span className="font-mono">{advice.id}</span></p>
                <p><span className="font-bold">Txn:</span> <span className="font-mono">{advice.transactionId}</span></p>
                <p><span className="font-bold">PO:</span> <span className="font-mono">{advice.paymentOrderId}</span></p>
                <p><span className="font-bold">TA Ref:</span> <span className="font-mono">{advice.approvedTARefNo}</span></p>
                {advice.mcpJournalEntryId && <p><span className="font-bold">MCP Journal:</span> <span className="font-mono">{advice.mcpJournalEntryId}</span></p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payee</div>
              <div className="mt-1 font-semibold text-slate-900">{advice.employeeName}</div>
              <div className="text-xs text-slate-600 font-mono">CID: {advice.employeeCid}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agency / Budget</div>
              <div className="mt-1 text-slate-900 font-mono">{advice.agencyCode}</div>
              <div className="text-xs text-slate-600 font-mono">{advice.budgetCode}</div>
            </div>
          </div>
          <table className="w-full border border-slate-300 text-sm mb-6">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-3 py-2 font-bold text-slate-700">Particular</th>
                <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700">Amount ({advice.currency})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2">Approved Travel Advance</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advice.advanceAmount.toLocaleString()}</td>
              </tr>
              {advice.bankCharges != null && advice.bankCharges > 0 && (
                <tr>
                  <td className="border border-slate-300 px-3 py-2">Bank Charges</td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advice.bankCharges.toLocaleString()}</td>
                </tr>
              )}
              {advice.fxConversionCharges != null && advice.fxConversionCharges > 0 && (
                <tr>
                  <td className="border border-slate-300 px-3 py-2">Currency Conversion Charges</td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advice.fxConversionCharges.toLocaleString()}</td>
                </tr>
              )}
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-300 px-3 py-2">Total Advice</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advice.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap gap-2 print:hidden">
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">🖨️ Print</button>
          <button onClick={() => window.alert(`Download queued for ${advice.id}.`)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">📄 Download PDF</button>
          {advice.status === 'ready' && (
            <button onClick={onPostToMcp} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Post to MCP</button>
          )}
          <button onClick={onClose} className="ml-auto px-3 py-1.5 rounded-lg bg-slate-200 text-slate-900 text-xs font-semibold hover:bg-slate-300">Close</button>
        </div>
      </div>
    </div>
  );
}
