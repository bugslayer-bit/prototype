/* ═══════════════════════════════════════════════════════════════════════════
   InvoiceBillPage — entry component for the Invoice & Bill module.
   Hosts the queue (list view) and the wizard workspace (creation/edit).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  InvoiceBillDataProvider,
  useInvoiceBillData,
} from "./context/InvoiceBillDataContext";
import { initialInvoiceBillForm, invoiceBillSteps } from "./config";
import type {
  ApprovalStep,
  AuditRecoveryEntry,
  BillDetailGoods,
  BillDetailServices,
  BillDetailWorks,
  BillTaxDetail,
  ContractMilestone,
  EsgTagging,
  GrnRecord,
  InvoiceBillFormState,
  InvoiceDocument,
  InvoiceValidationCheck,
  PaymentOrderRecord,
  ReversalRequest,
  StoredInvoiceBill,
  WorkflowStatus,
} from "./types";
import { InvoiceIntakeSection } from "./components/InvoiceIntakeSection";
import { InvoiceValidationSection } from "./components/InvoiceValidationSection";
import { BillCreationSection } from "./components/BillCreationSection";
import { TaxDeductionsSection } from "./components/TaxDeductionsSection";
import { InvoiceBillApprovalSection } from "./components/InvoiceBillApprovalSection";
import { DiscountingSection } from "./components/DiscountingSection";
import { SubmitSection } from "./components/SubmitSection";
import { InvoiceBillStepper } from "./components/InvoiceBillStepper";
import { InvoiceBillQueue } from "./components/InvoiceBillQueue";
import { InvoiceSubmissionFlow } from "./InvoiceSubmissionPage";
import { InvoiceProcessingPage } from "./InvoiceProcessingPage";
import { InvoiceApprovalPage } from "./InvoiceApprovalPage";
import { useSubmittedInvoices } from "../../../shared/context/SubmittedInvoiceContext";
import { MilestoneSelectionPanel } from "./components/MilestoneSelectionPanel";
import { GrnLookupPanel } from "./components/GrnLookupPanel";
import { EsgTaggingPanel } from "./components/EsgTaggingPanel";
import { AuditRecoveryPanel } from "./components/AuditRecoveryPanel";
import { ReversalAuthorisationPanel } from "./components/ReversalAuthorisationPanel";
import { PaymentOrderPanel } from "./components/PaymentOrderPanel";
import { PaymentOrderReleasePanel } from "./components/PaymentOrderReleasePanel";
import { SubmissionQueuePanel } from "./components/SubmissionQueuePanel";
import { useContractData } from "../../../shared/context/ContractDataContext";
import { useInvoiceBillMasterData } from "./hooks/useInvoiceBillMasterData";
import { resolveApprovalChain } from "./approvalMatrix";
import { activeTileClass } from "./theme";
import {
  DASHBOARD_TILES,
  DashboardTile,
  PlaceholderSection,
  type View,
} from "./pageFlow";
import { GovTechScopeCard } from "../../../shared/components/GovTechScopeCard";
import { useAuth } from "../../../shared/context/AuthContext";
/* ── Page wrapper ───────────────────────────────────────────────────────── */
export function InvoiceBillPage() {
  return (
    <InvoiceBillDataProvider>
      <InvoiceBillInner />
    </InvoiceBillDataProvider>
  );
}

function InvoiceBillInner() {
  const auth = useAuth();
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredInvoiceBill | null>(null);
  const { invoices: submittedInvoices } = useSubmittedInvoices();
  const pendingProcessingCount = submittedInvoices.filter((i) => i.status === "submitted").length;
  const pendingApprovalCount = submittedInvoices.filter(
    (i) => i.status === "approved" || i.status === "computed",
  ).length;
  const approvalQueueTotal = submittedInvoices.filter((i) =>
    ["approved", "computed", "approved-for-payment", "payment-rejected", "payment-on-hold"].includes(i.status),
  ).length;

  return (
    <div className="grid min-w-0 gap-6">
      {/* Page Header */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-white via-[#fffef7] to-slate-50/70 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Expenditure
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              Contract Management
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">PRN 3</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Invoice & Bill Management
              </h1>
              {/* <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                End-to-end workflow for capturing contractor invoices, generating bills, validating tax & deductions,
                routing approvals, optionally discounting bills, and releasing payment — fully aligned with SRS PRN 3.x.
              </p> */}
            </div>
          </div>
          {view !== "list" && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setView("list");
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Back to Queue
            </button>
          )}
        </div>
      </section>

      {/* GovTech integration-owner surface (agency 70 only). */}
      {view === "list" && (
        <GovTechScopeCard module="expenditure" agencyCode={auth?.activeAgencyCode} />
      )}

      {view === "list" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {DASHBOARD_TILES.map((t) => {
            const badge =
              t.key === "processing"
                ? pendingProcessingCount
                : t.key === "approval"
                  ? pendingApprovalCount
                  : 0;
            return (
              <DashboardTile
                key={t.key}
                tile={t}
                badge={badge}
                onClick={() => setView(t.view)}
                active={false}
              />
            );
          })}
        </div>
      )}

      {view === "list" && (
        <InvoiceBillQueue
          onNewRecord={() => {
            setEditing(null);
            setView("workspace");
          }}
          onEditRecord={(r) => {
            setEditing(r);
            setView("workspace");
          }}
        />
      )}

      {view === "workspace" && (
        <InvoiceBillWorkspace
          existing={editing}
          onDone={() => {
            setEditing(null);
            setView("list");
          }}
        />
      )}

      {view === "submission" && (
        <SubmissionQueuePanel onNewSubmission={() => setView("submission-wizard")} />
      )}

      {view === "submission-wizard" && (
        <section className="rounded-[24px] border border-sky-200 bg-gradient-to-br from-sky-50/40 via-white to-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
                Invoice Processing · SRS Expenditure v3
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Invoice Submission Flow</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Eight-step dynamic intake — submission setup, contract binding, auto-populated context,
                header & amounts, supporting documents, validation, IFMIS registration and final submit.
                All fields and checks run automatically from the bound contract.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("submission")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Back to Submission Queue
            </button>
          </div>
          <InvoiceSubmissionFlow embedded />
        </section>
      )}

      {view === "processing" && <InvoiceProcessingPage />}

      {view === "approval" && <InvoiceApprovalPage />}

      {view === "paymentOrder" && (
        <PaymentOrderReleasePanel onBack={() => setView("list")} />
      )}

      {view === "reversal" && (
        <PlaceholderSection
          tone="rose"
          tag="§3.5 · Post-Payment Exception"
          title="Reversal Authorisation"
          body="Used only when a payment has already been released/confirmed and must be clawed back. Wired into the Invoice & Bill wizard at Step 5. Open an approved record from the queue to access this panel."
          bullets={[
            "Separate approval chain — Finance Head + Treasury sign-off.",
            "States: reversal-requested → reversal-approved → reversed.",
            "Posts reverse ledger entries and re-opens the original commitment for the contract.",
          ]}
          onBack={() => setView("list")}
        />
      )}

      {view === "setup-sanctions" && (
        <PlaceholderSection
          tone="slate"
          tag="Contractor Master · Control List"
          title="Contractor Sanction / Suspense Management"
          body="Lives under Contractor Master Management, not inside the Invoice flow. It is referenced as a guard at four gates — Invoice Submission, Invoice Validation, Bill Verification, and Payment Order Creation."
          bullets={[
            "Gate 1 — Invoice Submission (§3.1.1): reject if Contractor_Status ∈ {Sanctioned, Suspended}.",
            "Gate 2 — Invoice Validation (§3.1.2): re-check before IFMIS registration.",
            "Gate 3 — Bill Verification (§3.2.3): block bill approval if sanction lifted mid-flow.",
            "Gate 4 — Payment Order Creation (§3.4.1): final check before disbursement.",
          ]}
          onBack={() => setView("list")}
        />
      )}
    </div>
  );
}

/* ── Workspace (the wizard) ─────────────────────────────────────────────── */
interface WorkspaceProps {
  existing: StoredInvoiceBill | null;
  onDone: () => void;
}

function InvoiceBillWorkspace({ existing, onDone }: WorkspaceProps) {
  const { addRecord, generateNextInvoiceId, generateNextBillId, generateNextRecordId } = useInvoiceBillData();
  const { contracts } = useContractData();
  const master = useInvoiceBillMasterData();
  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<InvoiceBillFormState>(() =>
    existing
      ? { ...initialInvoiceBillForm, ...existing }
      : { ...initialInvoiceBillForm },
  );

  /* Auto-assign IDs once at first edit */
  useEffect(() => {
    if (existing) return;
    setForm((cur) => {
      if (cur.recordId && cur.invoice.invoiceId) return cur;
      return {
        ...cur,
        recordId: cur.recordId || generateNextRecordId(),
        invoice: {
          ...cur.invoice,
          invoiceId: cur.invoice.invoiceId || generateNextInvoiceId(),
        },
        bill: {
          ...cur.bill,
          billId: cur.bill.billId || generateNextBillId(),
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Field updaters ──────────────────────────────────────────────────── */
  const onInvoiceField = useCallback(
    <K extends keyof InvoiceBillFormState["invoice"]>(key: K, value: InvoiceBillFormState["invoice"][K]) => {
      setForm((cur) => ({ ...cur, invoice: { ...cur.invoice, [key]: value } }));
    },
    [],
  );

  const onBillField = useCallback(
    <K extends keyof InvoiceBillFormState["bill"]>(key: K, value: InvoiceBillFormState["bill"][K]) => {
      setForm((cur) => ({ ...cur, bill: { ...cur.bill, [key]: value } }));
    },
    [],
  );

  const onAddDocument = useCallback((doc: InvoiceDocument) => {
    setForm((cur) => ({
      ...cur,
      invoice: { ...cur.invoice, documents: [...cur.invoice.documents, doc] },
    }));
  }, []);

  const onRemoveDocument = useCallback((id: string) => {
    setForm((cur) => ({
      ...cur,
      invoice: { ...cur.invoice, documents: cur.invoice.documents.filter((d) => d.id !== id) },
    }));
  }, []);

  const onRunValidation = useCallback(
    (checks: InvoiceValidationCheck[]) => setForm((cur) => ({ ...cur, validationChecks: checks })),
    [],
  );

  const onGoodsRows = useCallback((rows: BillDetailGoods[]) => setForm((cur) => ({ ...cur, goodsRows: rows })), []);
  const onWorksRows = useCallback((rows: BillDetailWorks[]) => setForm((cur) => ({ ...cur, worksRows: rows })), []);
  const onServicesRows = useCallback(
    (rows: BillDetailServices[]) => setForm((cur) => ({ ...cur, servicesRows: rows })),
    [],
  );
  const onTaxRows = useCallback((rows: BillTaxDetail[]) => {
    setForm((cur) => {
      const total = rows.reduce((s, r) => s + (parseFloat(r.taxAmount || "0") || 0), 0).toString();
      return {
        ...cur,
        taxRows: rows,
        bill: { ...cur.bill, taxAmount: total },
        invoice: { ...cur.invoice, totalTaxAmount: total },
      };
    });
  }, []);
  const onInvoiceSteps = useCallback(
    (steps: ApprovalStep[]) => setForm((cur) => ({ ...cur, invoiceApprovalSteps: steps })),
    [],
  );
  const onBillSteps = useCallback(
    (steps: ApprovalStep[]) => setForm((cur) => ({ ...cur, billApprovalSteps: steps })),
    [],
  );
  const onPatch = useCallback(
    (patch: Partial<InvoiceBillFormState>) => setForm((cur) => ({ ...cur, ...patch })),
    [],
  );

  /* ── New SRS-driven updaters ────────────────────────────────────────── */
  const onMilestones = useCallback(
    (rows: ContractMilestone[]) => setForm((cur) => ({ ...cur, milestones: rows })),
    [],
  );
  const onGrnRecords = useCallback(
    (rows: GrnRecord[]) => setForm((cur) => ({ ...cur, grnRecords: rows })),
    [],
  );
  const onEsg = useCallback(
    (esg: EsgTagging) => setForm((cur) => ({ ...cur, esg })),
    [],
  );
  const onAuditRecoveries = useCallback(
    (rows: AuditRecoveryEntry[]) => {
      setForm((cur) => {
        const auditTotal = rows.reduce(
          (s, r) => s + (parseFloat(r.amount || "0") || 0),
          0,
        );
        const existingDed = parseFloat(cur.invoice.totalDeductionAmount || "0") || 0;
        /* Merge audit recoveries into the deduction stack: we treat the
           audit total as one component on top of advance recovery. We
           expose the combined number on the invoice + bill. */
        const advRecovery =
          existingDed >= auditTotal ? existingDed - auditTotal : existingDed;
        const combined = (advRecovery + auditTotal).toString();
        return {
          ...cur,
          auditRecoveries: rows,
          invoice: { ...cur.invoice, totalDeductionAmount: combined },
          bill: { ...cur.bill, deductionAmount: combined },
        };
      });
    },
    [],
  );
  const onReversal = useCallback(
    (r: ReversalRequest) => setForm((cur) => ({ ...cur, reversal: r })),
    [],
  );
  const onPaymentOrder = useCallback(
    (po: PaymentOrderRecord) => setForm((cur) => ({ ...cur, paymentOrder: po })),
    [],
  );

  /* ── Auto-create bill from invoice ──────────────────────────────────────
     Pulls header data from the invoice + cascades from the linked contract:
       • bill category ← contract.contractCategory[0]
       • goods/works rows ← contract.formData.contractItemRows
     This is the dynamic bridge between Contract Items (DD 14.2.x) and
     Bill Details Goods/Works (DD 16.2.x / 16.3.x). */
  const onAutoCreateFromInvoice = useCallback(() => {
    setForm((cur) => {
      const linkedContract = contracts.find((c) => c.contractId === cur.invoice.contractId);
      const contractCat = linkedContract?.contractCategory?.[0] || "";
      const billCategory = /works/i.test(contractCat)
        ? "Works"
        : /service|consult/i.test(contractCat)
          ? "Services"
          : /goods/i.test(contractCat)
            ? "Goods"
            : cur.bill.billCategory || "Goods";

      const items = linkedContract?.formData?.contractItemRows ?? [];

      /* Build Goods rows from contract items when category = Goods */
      const goodsRows: BillDetailGoods[] =
        billCategory === "Goods" && items.length > 0
          ? items.map((it, i) => ({
              id: `g-seed-${it.id || i}`,
              billDetailId: `BD-G-${i + 1}`,
              billId: cur.bill.billId,
              grnId: it.contractItemId || "",
              itemName: it.itemDescription || it.itemCode || "",
              itemQuantityContract: it.itemQuantity || "",
              itemRateContract: it.itemUnitRate || "",
              itemBalanceContract: it.quantityBalance || it.itemQuantity || "",
              itemSuppliedPrevious: "0",
              itemQuantityInvoice: it.itemQuantity || "",
              itemRateInvoice: it.itemUnitRate || "",
              itemAmountInvoice: it.itemTotalAmount || "0",
              acceptanceAuthorityId: "",
            }))
          : cur.goodsRows;

      /* Build Works rows from contract items when category = Works */
      const worksRows: BillDetailWorks[] =
        billCategory === "Works" && items.length > 0
          ? items.map((it, i) => ({
              id: `w-seed-${it.id || i}`,
              billDetailId: `BD-W-${i + 1}`,
              billId: cur.bill.billId,
              workItemCode: it.itemCode || "",
              workDescription: it.itemDescription || "",
              workQuantityContract: it.itemQuantity || "",
              workRateContract: it.itemUnitRate || "",
              workCompletedPrevious: "0",
              workCompletedCurrent: "0",
              workAmountCurrent: "0",
              workCompletionPercentage: "0",
            }))
          : cur.worksRows;

      return {
        ...cur,
        bill: {
          ...cur.bill,
          invoiceId: cur.invoice.invoiceId,
          contractId: cur.invoice.contractId,
          billDate: cur.invoice.invoiceDate,
          billCategory,
          billAmountGross: cur.invoice.invoiceGrossAmount,
          taxAmount: cur.invoice.totalTaxAmount,
          deductionAmount: cur.invoice.totalDeductionAmount,
          retentionAmount: cur.invoice.retentionAmount,
          netPayableAmount: cur.invoice.netPayableAmount,
        },
        goodsRows,
        worksRows,
        workflowStatus: "bill-created" as WorkflowStatus,
      };
    });
  }, [contracts]);

  /* ── Net payable refresh ─────────────────────────────────────────────── */
  useEffect(() => {
    const gross = parseFloat(form.invoice.invoiceGrossAmount || "0") || 0;
    const tax = parseFloat(form.invoice.totalTaxAmount || "0") || 0;
    const ret = parseFloat(form.invoice.retentionAmount || "0") || 0;
    const ded = parseFloat(form.invoice.totalDeductionAmount || "0") || 0;
    const net = Math.max(0, gross - tax - ret - ded).toString();
    if (net !== form.invoice.netPayableAmount) {
      setForm((cur) => ({ ...cur, invoice: { ...cur.invoice, netPayableAmount: net } }));
    }
  }, [form.invoice.invoiceGrossAmount, form.invoice.totalTaxAmount, form.invoice.retentionAmount, form.invoice.totalDeductionAmount, form.invoice.netPayableAmount]);

  /* ── Bill net payable refresh ─────────────────────────────────────────── */
  useEffect(() => {
    const gross = parseFloat(form.bill.billAmountGross || "0") || 0;
    const tax = parseFloat(form.bill.taxAmount || "0") || 0;
    const ret = parseFloat(form.bill.retentionAmount || "0") || 0;
    const ded = parseFloat(form.bill.deductionAmount || "0") || 0;
    const net = Math.max(0, gross - tax - ret - ded).toString();
    if (net !== form.bill.netPayableAmount) {
      setForm((cur) => ({ ...cur, bill: { ...cur.bill, netPayableAmount: net } }));
    }
  }, [form.bill.billAmountGross, form.bill.taxAmount, form.bill.retentionAmount, form.bill.deductionAmount, form.bill.netPayableAmount]);

  /* ── Linked contract (live) ──────────────────────────────────────────── */
  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId) || null,
    [contracts, form.invoice.contractId],
  );

  /* ── Retention + advance recovery auto-derive (PRN 3.1.2 + 16.x) ──────
     The moment a contract is linked we pull its retentionRate / advance
     recovery amount and apply them to the invoice + bill so admins don't
     have to retype values that already live on the contract. */
  useEffect(() => {
    if (!linkedContract) return;
    const c = linkedContract.formData;
    const grossInv = parseFloat(form.invoice.invoiceGrossAmount || "0") || 0;
    const grossBill = parseFloat(form.bill.billAmountGross || "0") || 0;

    let invoicePatch: Partial<InvoiceBillFormState["invoice"]> = {};
    let billPatch: Partial<InvoiceBillFormState["bill"]> = {};

    if (c?.retentionApplicable) {
      const rate = parseFloat(c.retentionRate || "0") || 0;
      if (rate > 0) {
        if (grossInv > 0) {
          const ret = ((grossInv * rate) / 100).toFixed(2);
          if (ret !== form.invoice.retentionAmount) invoicePatch.retentionAmount = ret;
        }
        if (grossBill > 0) {
          const retB = ((grossBill * rate) / 100).toFixed(2);
          if (retB !== form.bill.retentionAmount) billPatch.retentionAmount = retB;
        }
      }
    }

    /* Advance recovery (DD 14.1.29) — auto-populate the deduction line */
    const adv = parseFloat(c?.advanceRecoveryAmount || "0") || 0;
    if (
      adv > 0 &&
      (!form.invoice.totalDeductionAmount || form.invoice.totalDeductionAmount === "0")
    ) {
      invoicePatch.totalDeductionAmount = adv.toString();
      billPatch.deductionAmount = adv.toString();
    }

    if (Object.keys(invoicePatch).length === 0 && Object.keys(billPatch).length === 0) return;
    setForm((cur) => ({
      ...cur,
      invoice: { ...cur.invoice, ...invoicePatch },
      bill: { ...cur.bill, ...billPatch },
    }));
  }, [
    linkedContract,
    form.invoice.invoiceGrossAmount,
    form.bill.billAmountGross,
  ]);

  /* ── Approval-matrix routing (PRN 3.1.3 + 3.2.2) ──────────────────────
     Whenever the net payable changes (or the contract is first linked) we
     rebuild both the invoice and bill approval chains from the master
     data matrix so the right approvers are routed in for the right
     amount bracket. We only overwrite chains that haven't started moving
     yet — never trample an approval that's already in progress. */
  useEffect(() => {
    const netInvoice = parseFloat(form.invoice.netPayableAmount || "0") || 0;
    const netBill = parseFloat(form.bill.netPayableAmount || "0") || netInvoice;

    const invoiceTouched = form.invoiceApprovalSteps.some(
      (s) => s.status === "approved" || s.status === "rejected" || s.status === "in_progress",
    );
    const billTouched = form.billApprovalSteps.some(
      (s) => s.status === "approved" || s.status === "rejected" || s.status === "in_progress",
    );

    let nextInvoice = form.invoiceApprovalSteps;
    let nextBill = form.billApprovalSteps;

    if (!invoiceTouched && master.approvalMatrixInvoice.length > 0 && netInvoice > 0) {
      const resolved = resolveApprovalChain(master.approvalMatrixInvoice, netInvoice);
      if (resolved.length > 0) nextInvoice = resolved;
    }
    if (!billTouched && master.approvalMatrixBill.length > 0 && netBill > 0) {
      const resolved = resolveApprovalChain(master.approvalMatrixBill, netBill);
      if (resolved.length > 0) nextBill = resolved;
    }

    if (nextInvoice !== form.invoiceApprovalSteps || nextBill !== form.billApprovalSteps) {
      setForm((cur) => ({
        ...cur,
        invoiceApprovalSteps: nextInvoice,
        billApprovalSteps: nextBill,
      }));
    }
  }, [
    form.invoice.netPayableAmount,
    form.bill.netPayableAmount,
    master.approvalMatrixInvoice,
    master.approvalMatrixBill,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  /* ── Save handlers ───────────────────────────────────────────────────── */
  const persist = useCallback(
    (status: WorkflowStatus) => {
      const now = new Date().toISOString();
      const stored: StoredInvoiceBill = {
        ...form,
        id: existing?.id ?? `ibr-${Date.now()}`,
        workflowStatus: status,
        createdAt: form.createdAt || now,
        updatedAt: now,
      };
      addRecord(stored);
      onDone();
    },
    [form, existing, addRecord, onDone],
  );

  const onSaveDraft = useCallback(() => persist("draft"), [persist]);
  const onSubmit = useCallback(() => {
    const blockers = form.validationChecks.filter((c) => c.severity === "blocker" && !c.passed);
    if (blockers.length > 0) {
      alert(`Cannot submit: ${blockers.length} blocker(s). Please fix Step 2 first.`);
      return;
    }
    persist("bill-approved");
  }, [form.validationChecks, persist]);
  const onReset = useCallback(() => setForm({ ...initialInvoiceBillForm }), []);

  const totalSteps = invoiceBillSteps.length;
  const next = () => setStep((s) => Math.min(totalSteps, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const currentMeta = useMemo(() => invoiceBillSteps.find((s) => s.id === step), [step]);

  return (
      <div className="grid gap-5">
        <InvoiceBillStepper currentStep={step} onStepChange={setStep} />

      {/* Step header */}
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Step {step} of {totalSteps} · {currentMeta?.prn}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{currentMeta?.label}</h2>
        <p className="mt-1 text-sm text-slate-600">{currentMeta?.helper}</p>
      </div>

      {step === 1 && (
        <>
          <InvoiceIntakeSection
            form={form}
            onInvoiceField={onInvoiceField}
            onAddDocument={onAddDocument}
            onRemoveDocument={onRemoveDocument}
          />
          {/* SRS Row 42 — Works milestone selection (Step 1.5) */}
          <MilestoneSelectionPanel form={form} onMilestones={onMilestones} />
          {/* SRS Row 45 — Goods GRN/GIMS lookup (Step 1.8) */}
          <GrnLookupPanel form={form} onGrnRecords={onGrnRecords} />
        </>
      )}
      {step === 2 && <InvoiceValidationSection form={form} onRunValidation={onRunValidation} />}
      {step === 3 && (
        <>
          <BillCreationSection
            form={form}
            onBillField={onBillField}
            onGoodsRows={onGoodsRows}
            onWorksRows={onWorksRows}
            onServicesRows={onServicesRows}
            onAutoCreateFromInvoice={onAutoCreateFromInvoice}
          />
          {/* SRS Row 50 — ESG attribution (Step 3.2) */}
          <EsgTaggingPanel form={form} onEsg={onEsg} />
        </>
      )}
      {step === 4 && (
        <>
          <TaxDeductionsSection form={form} onTaxRows={onTaxRows} />
          {/* SRS Row 56 — Audit recoveries / ARMS / AIN (Step 4.4) */}
          <AuditRecoveryPanel form={form} onAuditRecoveries={onAuditRecoveries} />
        </>
      )}
      {step === 5 && (
        <>
          <InvoiceBillApprovalSection form={form} onInvoiceSteps={onInvoiceSteps} onBillSteps={onBillSteps} />
          {/* SRS Rows 58–59 — Reversal authorisation (Steps 5.4–5.5) */}
          <ReversalAuthorisationPanel form={form} onReversal={onReversal} />
        </>
      )}
      {step === 6 && <DiscountingSection form={form} onPatch={onPatch} />}
      {step === 7 && (
        <>
          {/* SRS Rows 60–64 — Payment Order generation + cancellation (Steps 7.1–7.5) */}
          <PaymentOrderPanel form={form} onPaymentOrder={onPaymentOrder} />
          <SubmitSection form={form} onSaveDraft={onSaveDraft} onSubmit={onSubmit} onReset={onReset} />
        </>
      )}

      {/* Wizard nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={prev}
          disabled={step === 1}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          ← Previous
        </button>
        <p className="text-xs text-slate-500">
          Record: <strong className="text-slate-800">{form.recordId || "—"}</strong> · Invoice:{" "}
          <strong className="text-slate-800">{form.invoice.invoiceId || "—"}</strong> · Bill:{" "}
          <strong className="text-slate-800">{form.bill.billId || "—"}</strong>
        </p>
        <button
          type="button"
          onClick={next}
          disabled={step === totalSteps}
          className="rounded-xl border border-[#2563eb] bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
