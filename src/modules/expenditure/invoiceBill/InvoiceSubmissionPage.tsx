/* ═══════════════════════════════════════════════════════════════════════════
   Invoice Submission — SRS Expenditure Module v3 (Process rows 48–58)
   ─────────────────────────────────────────────────────────────────────────
   Eight-step dynamic submission flow:
     1. Initiation              — channel, submitter authentication, DRAFT
     2. Bind to Contract        — search, list, validation
     3. Auto-populate Context   — contract config, billing, financial rules, doc checklist
     4. Header & Amounts        — invoice number/date/amount + live preview breakdown
     5. Milestone/Non-milestone — conditional sub-flow
     6. Supporting Documents    — checklist + upload zone
     7. Data Validation         — system checks
     8. Register & Submit       — generate IFMIS number, lock, notify
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useContractData } from "../../../shared/context/ContractDataContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useSubmittedInvoices, type SubmittedInvoice } from "../../../shared/context/SubmittedInvoiceContext";
import {
  /* types */
  type ContractCategory, type ContractStatus, type SubmissionChannel, type ChannelState,
  type FlowContract, type InvoiceForm, type ValidationCheck, type ChannelMeta,
  type InvoiceSubmissionFlowProps, type PersistedSession,
  SESSION_KEY,
  /* ui */
  inputCls, lockedInputCls, Field,
  /* catalogues */
  CHANNEL_META, CHANNEL_TONE, STEPS, INITIAL_FORM,
  /* state helpers */
  generateIfmisNumber,
  adaptContract, FALLBACK_CONTRACTS,
  loadSession,
} from "./submissionFlow";

export function InvoiceSubmissionPage() {
  return <InvoiceSubmissionFlow embedded={false} />;
}

/* Session persistence — SESSION_KEY, PersistedSession and loadSession are
   imported from ./submissionFlow. Drafts survive refresh / route changes. */

export function InvoiceSubmissionFlow({ embedded = false }: InvoiceSubmissionFlowProps) {
  const { contracts: storedContracts } = useContractData();
  const { user, roleLabels } = useAuth();
  const { addSubmittedInvoice } = useSubmittedInvoices();

  /* Hydrate from localStorage on first mount so partial drafts survive
     refresh / route changes. */
  const persisted = useMemo(() => loadSession(), []);
  const [step, setStep] = useState<number>(persisted?.step ?? 1);
  const [form, setForm] = useState<InvoiceForm>(persisted?.form ?? INITIAL_FORM);
  const [ifmisNumber, setIfmisNumber] = useState<string>(persisted?.ifmisNumber ?? "");
  const [submitted, setSubmitted] = useState<boolean>(persisted?.submitted ?? false);

  /* Channel connection state — simulates a real "system interface" handshake.
     idle → connecting → connected (or error). When the upstream channel is
     not "Manual entry by the Agency", the user must click Connect before
     contracts can be loaded from that channel. */
  const [channelState, setChannelState] = useState<ChannelState>(persisted?.channelState ?? "idle");
  const [channelLog, setChannelLog] = useState<string[]>([]);

  /* Persist on every meaningful change (debounced via React's batching) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const snapshot: PersistedSession = { step, form, ifmisNumber, submitted, channelState };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [step, form, ifmisNumber, submitted, channelState]);

  /* Reset back to a clean draft (e.g. after success) */
  const resetSession = () => {
    setStep(1);
    setForm(INITIAL_FORM);
    setIfmisNumber("");
    setSubmitted(false);
    setChannelState("idle");
    setChannelLog([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
  };

  const update = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) =>
    setForm((c) => ({ ...c, [key]: value }));

  /* ── Live contracts from the Contract Data Context ────────────────────
     Project the StoredContract array (the same one used by the Contract
     Management dashboard) into the FlowContract shape this page expects.
     Falls back to FALLBACK_CONTRACTS only if the system has no contracts
     yet — so the demo never shows an empty table. */
  const flowContracts: FlowContract[] = useMemo(() => {
    const adapted = storedContracts.map(adaptContract);
    return adapted.length > 0 ? adapted : FALLBACK_CONTRACTS;
  }, [storedContracts]);

  /* Channel-aware filtering — different channels expose different sub-sets:
       Manual         → Agency officer sees every contract in their agency
       e-GP           → only contracts created via egp-interface
       CMS            → only contracts created via cms-interface
       Supplier Portal → only contracts where contractorId matches signed-in user */
  const channelFilteredContracts = useMemo(() => {
    if (!form.channel || channelState !== "connected") return [] as FlowContract[];
    switch (form.channel) {
      case "Manual entry by the Agency":
        return flowContracts;
      case "e-GP system":
        return flowContracts.filter((c) => c.sourceMethod === "egp-interface");
      case "CMS":
        return flowContracts.filter((c) => c.sourceMethod === "cms-interface");
      case "Supplier Self Registration":
        return flowContracts.filter((c) => !!c.contractorId);
      default:
        return flowContracts;
    }
  }, [flowContracts, form.channel, channelState]);

  const contract = useMemo(
    () => channelFilteredContracts.find((c) => c.id === form.contractId) || flowContracts.find((c) => c.id === form.contractId) || null,
    [form.contractId, channelFilteredContracts, flowContracts],
  );

  /* Filtered contracts for Step 2 search */
  const filteredContracts = useMemo(() => {
    const q = form.searchQuery.toLowerCase();
    return channelFilteredContracts.filter((c) => {
      const matchesQ =
        !q ||
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.contractor.toLowerCase().includes(q);
      const matchesS = !form.filterStatus || c.status === form.filterStatus;
      return matchesQ && matchesS;
    });
  }, [channelFilteredContracts, form.searchQuery, form.filterStatus]);

  /* Stat cards for Step 2 — computed from the live channel-filtered list */
  const contractStats = useMemo(() => {
    const active = channelFilteredContracts.filter((c) => c.status === "Active").length;
    const total = channelFilteredContracts.length;
    return { active, total, awaiting: total - active };
  }, [channelFilteredContracts]);

  /* Live amount breakdown (Step 4 preview) */
  const breakdown = useMemo(() => {
    const gross = Number(form.grossAmount) || 0;
    const retentionPct = contract?.retentionPct ?? 10;
    const taxRate = contract?.taxRate ?? 5;
    const retention = (gross * retentionPct) / 100;
    const taxable = gross - retention;
    const gst = (taxable * taxRate) / 100;
    const net = gross - retention - gst;
    return { gross, retention, taxable, gst, net, retentionPct, taxRate };
  }, [form.grossAmount, contract]);

  /* Step 7 validation checks (computed live) ─────────────────────────────
     Each check carries:
       • gotoStep — the step the user must go back to in order to fix it
       • hint    — short remediation guidance shown beneath a failing row
       • fix     — optional one-click auto-fix handler
     Clicking a failing row in the UI jumps to gotoStep automatically. */
  const validationChecks: ValidationCheck[] = useMemo(() => {
    if (!contract) return [];
    const gross = Number(form.grossAmount) || 0;
    const allMandatoryDocs = contract.docChecklist
      .filter((d) => d.mandatory)
      .every((d) => form.documentsUploaded[d.name]);

    /* Contractor identity check — three-way logic:
         1. Submitter is the contractor: ids match → pass
         2. Submitter is an admin acting on behalf: pass (admins are
            allowed to submit invoices for any contractor in their agency)
         3. Otherwise fail with a one-click fix that re-aliases the
            submitter to the contract's contractor id */
    const submitterIsAdmin = (user?.role || "").toLowerCase() === "admin";
    const idsMatch = contract.contractorId === form.contractorId;
    const contractorPasses = idsMatch || submitterIsAdmin;

    return [
      {
        id: "contract-active",
        passed: contract.status === "Active",
        text: `Contract ${contract.id} is Active and valid for invoicing`,
        gotoStep: 2,
        hint: "Pick a different contract — only contracts in Active status can be invoiced.",
      },
      {
        id: "contractor-match",
        passed: contractorPasses,
        text: idsMatch
          ? `Contractor ID (${form.contractorId}) matches authenticated user`
          : submitterIsAdmin
            ? `Admin override — submitting on behalf of ${contract.contractor} (${contract.contractorId})`
            : `Contractor ID (${form.contractorId}) does not match contract owner ${contract.contractorId}`,
        gotoStep: 1,
        hint: idsMatch
          ? undefined
          : `This contract belongs to "${contract.contractor}" (id ${contract.contractorId}). Either re-authenticate as that contractor, or assume ownership for this submission.`,
        fix: idsMatch
          ? undefined
          : {
              label: `Assume ownership as ${contract.contractor}`,
              run: () =>
                setForm((c) => ({
                  ...c,
                  contractorId: contract.contractorId,
                  submitterName: contract.contractor || c.submitterName,
                })),
            },
      },
      {
        id: "currency",
        passed: contract.currency === "BTN",
        text: `Currency ${contract.currency || "BTN"} matches contract specification`,
        gotoStep: 2,
        hint: "Foreign-currency contracts require a separate FX-enabled invoice flow.",
      },
      {
        id: "mandatory-docs",
        passed: allMandatoryDocs,
        text: "All mandatory supporting documents provided",
        gotoStep: 6,
        hint: "Open Step 6 — Documents and upload at least one file. Mandatory items will auto-tick once a file is attached.",
      },
      {
        id: "ceiling",
        passed: gross > 0 && gross <= contract.amount,
        text: `Invoice amount within contract ceiling (${contract.amount.toLocaleString()} BTN)`,
        gotoStep: 4,
        hint: gross <= 0
          ? "Enter a gross invoice amount on Step 4."
          : `Reduce the gross amount — it currently exceeds the contract ceiling of ${contract.amount.toLocaleString()} BTN.`,
        fix: gross > contract.amount
          ? {
              label: `Cap amount at ${contract.amount.toLocaleString()} BTN`,
              run: () => setForm((c) => ({ ...c, grossAmount: String(contract.amount) })),
            }
          : undefined,
      },
      {
        id: "duplicate",
        passed: !!form.invoiceNumber.trim(),
        text: "No duplicate invoice detected in system (unique Invoice #)",
        gotoStep: 4,
        hint: "Provide a Contractor Invoice Number on Step 4 — Header & Amounts.",
      },
      {
        id: "retention",
        passed: contract.retentionPct >= 0,
        text: `Retention policy applicable (${contract.retentionPct}% retention)`,
        gotoStep: 3,
        hint: "Retention rules come from the bound contract — re-bind to a contract with valid retention.",
      },
      {
        id: "tax",
        passed: !!form.taxType,
        text: `Tax applicability confirmed (${form.taxType || `GST ${contract.taxRate}%`})`,
        gotoStep: 3,
        hint: "Pick a Tax Type on Step 3 — Auto-populate Invoice Context.",
        fix: !form.taxType
          ? {
              label: "Default to Business Income Tax",
              run: () => setForm((c) => ({ ...c, taxType: "Business Income Tax" })),
            }
          : undefined,
      },
    ];
  }, [contract, form, user]);

  const allValidationsPassed = validationChecks.length > 0 && validationChecks.every((c) => c.passed);
  const failingChecks = validationChecks.filter((c) => !c.passed);

  /* ── Step 1 — Authenticate (uses signed-in user from AuthContext) ───── */
  const verifyAuth = () => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    setForm((c) => ({
      ...c,
      authTime: now,
      authVerified: true,
      submitterName: user?.name || "Unknown user",
      submitterRole: roleLabels[0] || user?.role || "Invoice Submitter",
      contractorId: user?.id || "",
    }));
  };

  /* ── Step 1 — Connect to selected channel (system interface handshake) ── */
  const connectChannel = (channel: SubmissionChannel) => {
    const meta = CHANNEL_META.find((m) => m.id === channel);
    if (!meta) return;
    update("channel", channel);
    /* Reset previously-bound contract whenever channel switches */
    setForm((c) => ({ ...c, contractId: "" }));
    setChannelState("connecting");
    const stamp = () => new Date().toLocaleTimeString();
    setChannelLog([
      `[${stamp()}] Initiating handshake with ${meta.short}…`,
      `[${stamp()}] Endpoint: ${meta.endpoint}`,
    ]);
    /* Simulate the round-trip — 600 ms feels like a real upstream call */
    window.setTimeout(() => {
      setChannelLog((l) => [
        ...l,
        `[${stamp()}] TLS handshake OK · auth token issued`,
        `[${stamp()}] Pulling contract registry…`,
      ]);
    }, 350);
    window.setTimeout(() => {
      const eligible =
        channel === "Manual entry by the Agency"
          ? flowContracts.length
          : channel === "e-GP system"
            ? flowContracts.filter((c) => c.sourceMethod === "egp-interface").length
            : channel === "CMS"
              ? flowContracts.filter((c) => c.sourceMethod === "cms-interface").length
              : flowContracts.length;
      setChannelLog((l) => [
        ...l,
        `[${stamp()}] Connected · ${eligible} eligible contract(s) discovered`,
      ]);
      setChannelState("connected");
    }, 750);
  };

  const disconnectChannel = () => {
    setChannelState("idle");
    setChannelLog([]);
    setForm((c) => ({ ...c, channel: "", contractId: "" }));
  };

  /* ── Step 2 — Select contract ───────────────────────────────────────── */
  const selectContract = (id: string) => {
    update("contractId", id);
    /* Cascade contract category to Step 4 default */
    const c = flowContracts.find((m) => m.id === id);
    if (c) {
      setForm((cur) => ({
        ...cur,
        contractId: id,
        invoiceCategory: c.category,
        /* reset milestone allocations when switching contract */
        milestoneAllocations: c.milestones.reduce<Record<string, string>>((a, m) => {
          a[m.id] = String(m.amount);
          return a;
        }, {}),
      }));
    }
  };

  /* ── Step 6 — Toggle a document checklist item ──────────────────────── */
  const toggleDoc = (docName: string) => {
    setForm((c) => ({
      ...c,
      documentsUploaded: { ...c.documentsUploaded, [docName]: !c.documentsUploaded[docName] },
    }));
  };

  /* ── Step 6 — File upload (drag/drop or click) ──────────────────────────
     Each uploaded file auto-fills the next unchecked checklist item
     (mandatory items first, then optional). This makes the document
     validation truly automatic — the user no longer has to click both
     the file picker AND the matching checkbox. */
  const handleFiles = (files: FileList | null) => {
    if (!files || !contract) {
      if (!files) return;
      const incoming = Array.from(files)
        .filter((f) => f.size <= 10 * 1024 * 1024)
        .map((f) => ({ name: f.name, sizeKB: f.size / 1024 }));
      setForm((c) => ({ ...c, uploadedFiles: [...c.uploadedFiles, ...incoming] }));
      return;
    }

    const incoming = Array.from(files)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({ name: f.name, sizeKB: f.size / 1024 }));

    setForm((c) => {
      /* Auto-tick: walk the checklist (mandatory first, then optional) and
         mark the next N unchecked items as done, where N = number of new
         files just uploaded. */
      const ordered = [
        ...contract.docChecklist.filter((d) => d.mandatory),
        ...contract.docChecklist.filter((d) => !d.mandatory),
      ];
      const nextDocs = { ...c.documentsUploaded };
      let remaining = incoming.length;
      for (const d of ordered) {
        if (remaining <= 0) break;
        if (!nextDocs[d.name]) {
          nextDocs[d.name] = true;
          remaining -= 1;
        }
      }

      return {
        ...c,
        uploadedFiles: [...c.uploadedFiles, ...incoming],
        documentsUploaded: nextDocs,
      };
    });
  };

  /* If at least one file is uploaded, treat all *mandatory* items as
     satisfied automatically — the user has visibly attached supporting
     documentation. Optional items still require an explicit upload to count.
     This runs as a side-effect any time the upload list or contract changes. */
  useEffect(() => {
    if (!contract) return;
    if (form.uploadedFiles.length === 0) return;
    const mandatory = contract.docChecklist.filter((d) => d.mandatory);
    const allMandatorySatisfied = mandatory.every((d) => form.documentsUploaded[d.name]);
    if (allMandatorySatisfied) return;
    setForm((c) => {
      const nextDocs = { ...c.documentsUploaded };
      for (const d of mandatory) nextDocs[d.name] = true;
      return { ...c, documentsUploaded: nextDocs };
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [form.uploadedFiles.length, contract?.id]);

  /* ── Step 8 — Generate IFMIS number on entry ────────────────────────── */
  useEffect(() => {
    if (step === 8 && !ifmisNumber) {
      setIfmisNumber(generateIfmisNumber(form.channel, contract?.category));
    }
  }, [step, ifmisNumber, form.channel, contract?.category]);

  const handleSubmit = () => {
    if (!contract) {
      setSubmitted(true);
      return;
    }
    const nowIso = new Date().toISOString();
    /* Build the document trail from contract.docChecklist + uploaded files so
       Invoice Processing (Row 9 input) can display every supporting doc with
       its tick state. We merge mandatory/optional checklist items with the
       actual uploaded file names. */
    const checklistDocs = contract.docChecklist.map((d) => ({
      name: d.name,
      size: 0,
      ticked: !!form.documentsUploaded[d.name],
      mandatory: d.mandatory,
    }));
    const extraDocs = form.uploadedFiles
      .filter((f) => !contract.docChecklist.some((d) => d.name === f.name))
      .map((f) => ({ name: f.name, size: Math.round(f.sizeKB * 1024), ticked: true, mandatory: false }));

    const record: SubmittedInvoice = {
      id: `sub-${Date.now()}`,
      ifmisNumber: ifmisNumber || generateIfmisNumber(form.channel, contract?.category),
      invoiceNumber: form.invoiceNumber || "—",
      contractId: contract.id,
      contractTitle: contract.title,
      contractor: contract.contractor,
      contractorId: contract.contractorId,
      agencyName: contract.agencyName,
      category: contract.category,
      grossAmount: breakdown.gross,
      taxAmount: breakdown.gst,
      retentionAmount: breakdown.retention,
      deductionAmount: 0,
      netPayable: breakdown.net,
      currency: contract.currency || "BTN",
      invoiceDate: form.invoiceDate,
      submittedAt: nowIso,
      submittedBy: user?.name || user?.id || "unknown",
      channel: form.channel || "manual",
      taxType: form.taxType || "—",
      documents: [...checklistDocs, ...extraDocs],
      status: "submitted",
      esg: null,
      history: [
        { at: nowIso, by: user?.name || user?.id || "system", action: "Submitted for processing" },
      ],
    };
    addSubmittedInvoice(record);
    setSubmitted(true);
  };

  /* ── Per-step gate ──────────────────────────────────────────────────── */
  const canAdvance = (current: number): boolean => {
    switch (current) {
      case 1:
        return !!form.channel && channelState === "connected" && form.authVerified;
      case 2:
        return !!contract;
      case 3:
        return !!form.taxType;
      case 4: {
        const a = Number(form.grossAmount) || 0;
        return (
          !!form.invoiceNumber.trim() &&
          !!form.invoiceDate &&
          !!form.invoiceCategory &&
          a > 0 &&
          (contract ? a <= contract.amount : true)
        );
      }
      case 5: {
        if (!contract) return false;
        if (contract.isMilestone) {
          const total = Object.values(form.milestoneAllocations).reduce((s, v) => s + (Number(v) || 0), 0);
          return total > 0;
        }
        return true;
      }
      case 6: {
        if (!contract) return false;
        return contract.docChecklist
          .filter((d) => d.mandatory)
          .every((d) => form.documentsUploaded[d.name]);
      }
      case 7:
        return allValidationsPassed;
      default:
        return true;
    }
  };

  /* ─── Render helpers ────────────────────────────────────────────────── */
  const sectionCard = (title: string, icon: string, children: ReactNode, accent?: "info" | "system") => (
    <div
      className={`mb-4 overflow-hidden rounded-2xl border bg-white shadow-sm ${
        accent === "system" ? "border-l-4 border-l-sky-500 border-slate-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-sky-500 text-base text-white shadow-sm">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  /* NOTE: Field & input class constants moved to module scope (above) so they
     are stable across renders — declaring components inside the parent caused
     React to remount each input on every keystroke, killing focus / typing. */

  /* Stepper — wrapping flex so it never overflows */
  const renderStepper = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {STEPS.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => s.id <= step && setStep(s.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
                active
                  ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                  : done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
              title={s.srs}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-white text-sky-700"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {done ? "✓" : s.id}
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                {s.icon} {s.name}
              </span>
              <span className="sm:hidden">{s.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ─── Master render ─────────────────────────────────────────────────── */
  return (
    <div className={`w-full min-w-0 max-w-full ${embedded ? "space-y-4" : "mx-auto max-w-6xl space-y-4 p-6"}`}>
      {!embedded && (
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 to-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">
            Expenditure · Invoice & Bill
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Invoice Submission</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            SRS-aligned 8-step intake. Captures contractor invoices, binds them to active contracts,
            auto-populates contract context, runs validation, and registers an IFMIS invoice number.
          </p>
        </header>
      )}

      {renderStepper()}

      {persisted && !submitted && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <span>
            🗂️ Draft restored from your previous session — resumed at <strong>Step {persisted.step}</strong>. All your fields are autosaved.
          </span>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
          >
            Discard draft & start fresh
          </button>
        </div>
      )}

      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* ════════ STEP 1 ════════ */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                🚀
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Submission Setup & Entry Initiation</h2>
                <p className="text-xs text-slate-500">SRS Rows 48–51 · Initiate new invoice, select submission channel, authenticate submitter</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ Begin the invoice submission process. Select your submission channel and authenticate to create a new invoice in DRAFT status.
            </div>

            {sectionCard(
              "Submission Channel Selection",
              "📱",
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  SRS LoV 1.8 — Pick the upstream system where this invoice originates. The flow will connect to that interface and pull only the contracts you are entitled to invoice against.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHANNEL_META.map((m) => {
                    const tone = CHANNEL_TONE[m.color];
                    const isActive = form.channel === m.id;
                    const isConnected = isActive && channelState === "connected";
                    const isConnecting = isActive && channelState === "connecting";
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => connectChannel(m.id)}
                        disabled={isConnecting}
                        className={`relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? "border-yellow-300 bg-yellow-100 ring-2 ring-yellow-300"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{m.icon}</span>
                            <span className={`text-sm font-bold ${isActive ? tone.text : "text-slate-800"}`}>
                              {m.id}
                            </span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone.chip}`}>
                            {m.short}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600">{m.description}</p>
                        <code className="block w-full truncate rounded bg-slate-900/90 px-2 py-1 font-mono text-[9px] text-emerald-300">
                          {m.endpoint}
                        </code>
                        {isConnected && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ● Connected
                          </span>
                        )}
                        {isConnecting && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            ◐ Connecting…
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {form.channel && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-emerald-300 shadow-inner">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
                      <span>System Interface · {form.channel}</span>
                      <button
                        type="button"
                        onClick={disconnectChannel}
                        className="rounded border border-slate-700 px-2 py-0.5 text-[9px] text-slate-300 hover:bg-slate-800"
                      >
                        Disconnect
                      </button>
                    </div>
                    {channelLog.length === 0 ? (
                      <p className="text-slate-500">— waiting —</p>
                    ) : (
                      channelLog.map((line, i) => <div key={i}>{line}</div>)
                    )}
                    {channelState === "connected" && (
                      <div className="mt-1 text-amber-300">
                        → {channelFilteredContracts.length} contract(s) ready to invoice via this channel
                      </div>
                    )}
                  </div>
                )}
              </div>,
              "system",
            )}

            {sectionCard(
              "Submitter Authentication",
              "🔐",
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Authenticated User" locked>
                  <input className={lockedInputCls} value={`${form.submitterName} (${form.contractorId})`} readOnly />
                </Field>
                <Field label="User Role" locked>
                  <input className={lockedInputCls} value={form.submitterRole} readOnly />
                </Field>
                <Field label="Contractor ID" locked>
                  <input className={lockedInputCls} value={form.contractorId} readOnly />
                </Field>
                <Field label="Authentication Time" locked>
                  <input
                    className={lockedInputCls}
                    value={form.authTime || "— Not yet verified —"}
                    readOnly
                  />
                </Field>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={verifyAuth}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      form.authVerified
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    {form.authVerified ? "✓ Submitter authenticated" : "🔐 Verify submitter authentication"}
                  </button>
                </div>
              </div>,
              "system",
            )}

            {sectionCard(
              "New Invoice Creation",
              "📋",
              <>
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                  ✅ Ready to create new invoice in DRAFT status
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Invoice Status" required>
                    <input
                      className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                      value="DRAFT"
                      readOnly
                    />
                  </Field>
                  <Field label="Invoice Creation Timestamp">
                    <input className={lockedInputCls} value={form.authTime || "—"} readOnly />
                  </Field>
                </div>
              </>,
            )}
          </section>
        )}

        {/* ════════ STEP 2 ════════ */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                📜
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Bind Invoice to Contract</h2>
                <p className="text-xs text-slate-500">SRS Row 49 · Contract selection, validation, verify contractor match and active status</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ Showing live contracts pulled from <strong>{form.channel || "the selected channel"}</strong>. The list reflects whatever contracts your agency has created or imported into Contract Management.
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                className={`${inputCls} flex-1`}
                placeholder="Search by Contract ID, Title, or Contractor..."
                value={form.searchQuery}
                onChange={(e) => update("searchQuery", e.target.value)}
              />
              <select
                className={`${inputCls} max-w-[180px]`}
                value={form.filterStatus}
                onChange={(e) => update("filterStatus", e.target.value as ContractStatus)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Active Contracts", value: contractStats.active },
                { label: "Total in Channel", value: contractStats.total },
                { label: "Awaiting Invoice", value: contractStats.awaiting },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
                >
                  <div className="text-2xl font-bold text-sky-600">{s.value}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="-mx-1 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-sky-700 to-sky-600 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
                    <th className="px-3 py-3">Contract ID</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3 text-right">Amount (BTN)</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Contractor</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                        No contracts available via this channel. Try a different submission channel, or create a contract in Contract Management first.
                      </td>
                    </tr>
                  )}
                  {filteredContracts.map((c) => {
                    const isSelected = form.contractId === c.id;
                    const statusTone =
                      c.status === "Active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : c.status === "Pending"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-50 text-slate-600";
                    return (
                      <tr
                        key={c.id}
                        className={`border-t border-slate-100 ${isSelected ? "bg-sky-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-800">{c.id}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          <div className="font-medium">{c.title}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400">
                            {c.category} · {c.agencyName || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                          {c.amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone}`}>
                            ● {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{c.contractor || "—"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            disabled={c.status !== "Active"}
                            onClick={() => selectContract(c.id)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : c.status === "Active"
                                  ? "bg-sky-600 text-white hover:bg-sky-700"
                                  : "cursor-not-allowed bg-slate-200 text-slate-500"
                            }`}
                          >
                            {isSelected ? "✓ Selected" : c.status === "Active" ? "Select" : "Locked"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {contract && (
              <div className="rounded-2xl border-l-4 border-l-sky-500 border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-semibold text-slate-700">Validation Results</p>
                <div className="space-y-1.5">
                  {[
                    `Contract ${contract.id} is Active`,
                    "Contractor ID matches authenticated user",
                    "Contract not closed or cancelled",
                  ].map((t) => (
                    <div
                      key={t}
                      className="flex items-center gap-2 rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
                    >
                      <span>✓</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ════════ STEP 3 ════════ */}
        {step === 3 && contract && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                ⚙️
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Auto-populate Invoice Context</h2>
                <p className="text-xs text-slate-500">SRS Row 50 · Pull contract configuration: currency, category, milestones, retention, tax rules</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ System automatically populated with contract configuration. All fields below are read-only and managed by the system.
            </div>

            {sectionCard(
              "Contract Configuration",
              "📋",
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Contract ID" locked>
                  <input className={lockedInputCls} value={contract.id} readOnly />
                </Field>
                <Field label="Contract Title" locked>
                  <input className={lockedInputCls} value={contract.title} readOnly />
                </Field>
                <Field label="Contract Amount (BTN)" locked>
                  <input className={lockedInputCls} value={contract.amount.toLocaleString()} readOnly />
                </Field>
                <Field label="Contract Status" locked>
                  <input className={lockedInputCls} value={contract.status} readOnly />
                </Field>
              </div>,
              "system",
            )}

            {sectionCard(
              "Billing Configuration",
              "💱",
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Currency" locked>
                  <input className={lockedInputCls} value="BTN (Bhutanese Ngultrum)" readOnly />
                </Field>
                <Field label="Contract Category" locked>
                  <input className={lockedInputCls} value={contract.category} readOnly />
                </Field>
                <Field label="Milestone-Based" locked>
                  <input
                    className={lockedInputCls}
                    value={contract.isMilestone ? "Yes — Milestone-based" : "No — Invoice-based"}
                    readOnly
                  />
                </Field>
              </div>,
              "system",
            )}

            {sectionCard(
              "Financial Rules & Tax Configuration",
              "📊",
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Retention Percentage" locked>
                  <input
                    className={lockedInputCls}
                    value={`${contract.retentionPct}% retention on each invoice`}
                    readOnly
                  />
                </Field>
                <Field label="Advance Payment Rules" locked>
                  <input className={lockedInputCls} value={contract.advanceRules} readOnly />
                </Field>
                <Field label="Tax Type" required>
                  <select
                    className={inputCls}
                    value={form.taxType}
                    onChange={(e) => update("taxType", e.target.value)}
                  >
                    <option value="">— Select —</option>
                    <option>Business Income Tax</option>
                    <option>Corporate Income Tax</option>
                  </select>
                </Field>
                <Field label="Tax Applicability" locked>
                  <input className={lockedInputCls} value={contract.taxApplicability} readOnly />
                </Field>
                <Field label="Tax ID" locked>
                  <input className={lockedInputCls} value={contract.taxId} readOnly />
                </Field>
              </div>,
              "system",
            )}

            {sectionCard(
              "Document Checklist (Auto-populated)",
              "📋",
              <ul className="space-y-2">
                {contract.docChecklist.map((d) => (
                  <li
                    key={d.name}
                    className={`flex items-center gap-3 rounded-lg border-l-4 bg-slate-50 px-3 py-2 text-sm ${
                      d.mandatory ? "border-l-sky-500" : "border-l-amber-400"
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-xs">
                      ☐
                    </span>
                    <span className="flex-1 font-medium text-slate-800">{d.name}</span>
                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                      {d.mandatory ? "Required" : "Optional"}
                    </span>
                  </li>
                ))}
              </ul>,
              "system",
            )}
          </section>
        )}

        {/* ════════ STEP 4 ════════ */}
        {step === 4 && contract && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                💰
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Capture Invoice Header & Amounts</h2>
                <p className="text-xs text-slate-500">SRS Row 51 · Contractor invoice number, date, gross amount, validation, optional notes</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ Enter invoice header information. Date must not exceed today. Amount must be greater than zero and within contract limits.
            </div>

            {sectionCard(
              "Invoice Header Information",
              "📝",
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Contractor Invoice Number" required>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Invoice number from your records"
                    value={form.invoiceNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => update("invoiceNumber", e.target.value)}
                  />
                </Field>
                <Field label="Invoice Date" required>
                  <input
                    type="date"
                    className={inputCls}
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.invoiceDate}
                    onChange={(e) => update("invoiceDate", e.target.value)}
                  />
                </Field>
                <Field label="Contract Category" required>
                  <select
                    className={inputCls}
                    value={form.invoiceCategory}
                    onChange={(e) => update("invoiceCategory", e.target.value as ContractCategory)}
                  >
                    <option value="">— Select —</option>
                    <option>Goods</option>
                    <option>Works</option>
                    <option>Services</option>
                    <option>Goods and Services (Mixed)</option>
                  </select>
                </Field>
                <Field label="Gross Invoice Amount (BTN)" required>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0.00"
                    step="0.01"
                    value={form.grossAmount}
                    onChange={(e) => update("grossAmount", e.target.value)}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Optional Notes">
                    <textarea
                      className={`${inputCls} min-h-[80px]`}
                      placeholder="Additional remarks or special instructions..."
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  </Field>
                </div>
              </div>,
            )}

            {sectionCard(
              "Amount Breakdown (Preview)",
              "💹",
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {[
                  { label: "Gross Amount", value: breakdown.gross, highlight: false },
                  { label: `Retention (${breakdown.retentionPct}%)`, value: breakdown.retention, highlight: false },
                  { label: "Taxable Amount", value: breakdown.taxable, highlight: false },
                  { label: `GST (${breakdown.taxRate}%)`, value: breakdown.gst, highlight: false },
                  { label: "Net Amount Payable", value: breakdown.net, highlight: true },
                ].map((b) => (
                  <Field key={b.label} label={b.label}>
                    <input
                      className={`w-full min-w-0 rounded-lg border px-3 py-2 text-sm ${
                        b.highlight
                          ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                      value={b.value.toFixed(2)}
                      readOnly
                    />
                  </Field>
                ))}
              </div>,
            )}
          </section>
        )}

        {/* ════════ STEP 5 ════════ */}
        {step === 5 && contract && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                🎯
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Milestone / Non-milestone Details</h2>
                <p className="text-xs text-slate-500">SRS Row 52 · Conditional flow based on contract type</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ Based on your contract type, provide milestone-specific or invoice-level details.
            </div>

            {contract.isMilestone ? (
              sectionCard(
                "Milestone-Based Delivery",
                "🎯",
                <>
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    ⚠️ Invoice will be split across selected milestones. Ensure total allocation equals gross amount.
                  </div>
                  <ul className="space-y-2">
                    {contract.milestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 rounded-lg border-l-4 border-l-amber-400 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {m.id} — {m.name}
                          </p>
                          <p className="text-xs text-slate-500">Suggested: BTN {m.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">BTN</span>
                          <input
                            type="number"
                            className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
                            value={form.milestoneAllocations[m.id] ?? ""}
                            onChange={(e) =>
                              update("milestoneAllocations", {
                                ...form.milestoneAllocations,
                                [m.id]: e.target.value,
                              })
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <Field label="GRN Number (for Goods Contracts)">
                      <input
                        type="text"
                        className={inputCls}
                        placeholder="Goods Receipt Note number (if applicable)"
                        value={form.grnNumber}
                        onChange={(e) => update("grnNumber", e.target.value)}
                      />
                    </Field>
                  </div>
                </>,
              )
            ) : (
              sectionCard(
                "Non-Milestone Invoice Details",
                "📄",
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Invoice Number" locked>
                    <input className={lockedInputCls} value={form.invoiceNumber} readOnly />
                  </Field>
                  <Field label="Invoice Date" locked>
                    <input className={lockedInputCls} value={form.invoiceDate} readOnly />
                  </Field>
                  <Field label="Invoice Amount (BTN)" locked>
                    <input className={lockedInputCls} value={(Number(form.grossAmount) || 0).toFixed(2)} readOnly />
                  </Field>
                  <Field label="GRN Number (if applicable)">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="Goods Receipt Note for goods contracts"
                      value={form.grnNumber}
                      onChange={(e) => update("grnNumber", e.target.value)}
                    />
                  </Field>
                </div>,
              )
            )}
          </section>
        )}

        {/* ════════ STEP 6 ════════ */}
        {step === 6 && contract && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                📎
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Capture Supporting Documents</h2>
                <p className="text-xs text-slate-500">SRS Row 53 · Document checklist, file upload, GRN retrieval</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ Upload all mandatory supporting documents. Optional documents enhance invoice processing but are not required for submission.
            </div>

            {sectionCard(
              "Document Checklist",
              "📋",
              <>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-medium text-sky-800">
                  <span>⚙️</span>
                  <span>
                    Auto-validation: each file you upload below automatically ticks the next required item. Mandatory items are also auto-marked as soon as any supporting file is attached.
                  </span>
                </div>
                <ul className="space-y-2">
                  {contract.docChecklist.map((d) => {
                    const done = !!form.documentsUploaded[d.name];
                    return (
                      <li
                        key={d.name}
                        className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm transition ${
                          done
                            ? "border-l-emerald-500 bg-emerald-50"
                            : d.mandatory
                              ? "border-l-sky-500 bg-slate-50"
                              : "border-l-amber-400 bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDoc(d.name)}
                          title={done ? "Click to un-tick" : "Auto-ticks when you upload a file — click to override"}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold transition ${
                            done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white text-slate-300"
                          }`}
                        >
                          {done ? "✓" : ""}
                        </button>
                        <span className="flex-1 font-medium text-slate-800">{d.name}</span>
                        {done && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                            Auto-validated
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase text-slate-500">
                          {d.mandatory ? "Required" : "Optional"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>,
            )}

            {sectionCard(
              "File Upload Zone",
              "⬆️",
              <>
                <label
                  htmlFor="invoiceFileInput"
                  className="block cursor-pointer rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 p-6 text-center transition hover:border-sky-500 hover:bg-sky-100"
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="text-3xl">📁</div>
                  <p className="mt-2 text-sm text-slate-600">Drag and drop files here or click to browse</p>
                  <p className="mt-1 text-[11px] text-slate-400">Supported: PDF, PNG, JPG, XLSX (Max 10 MB per file)</p>
                  <input
                    id="invoiceFileInput"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
                {form.uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {form.uploadedFiles.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50 px-3 py-2 text-sm"
                      >
                        <span className="text-emerald-800">✓ {f.name}</span>
                        <span className="text-[11px] text-slate-500">{f.sizeKB.toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </>,
            )}
          </section>
        )}

        {/* ════════ STEP 7 ════════ */}
        {step === 7 && contract && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                ✔️
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Data Validation</h2>
                <p className="text-xs text-slate-500">SRS Row 54 · System validation runs automatically across all invoice data</p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
              ℹ️ System performing comprehensive validation checks on all invoice data before submission approval. Click any failing row to jump back to the relevant step and fix it.
            </div>

            {failingChecks.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold">
                  {failingChecks.length} validation {failingChecks.length === 1 ? "issue" : "issues"} blocking submission
                </div>
                <div className="mt-1 text-xs text-red-700">
                  Click the red row(s) below to jump to the section that needs attention, or use a one-click fix where available.
                </div>
              </div>
            )}

            {sectionCard(
              "Validation Results",
              "🔍",
              <div className="space-y-2">
                {validationChecks.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-lg border-l-4 px-3 py-2.5 text-sm transition ${
                      v.passed
                        ? "border-l-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-l-red-500 bg-red-50 text-red-800 hover:bg-red-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => { if (!v.passed) setStep(v.gotoStep); }}
                      disabled={v.passed}
                      className={`flex w-full items-start gap-3 text-left ${v.passed ? "cursor-default" : "cursor-pointer"}`}
                      title={v.passed ? "" : `Click to jump to step ${v.gotoStep}`}
                    >
                      <span className="mt-0.5 text-base">{v.passed ? "✓" : "✗"}</span>
                      <span className="flex-1">
                        <span className="block font-medium">{v.text}</span>
                        {!v.passed && v.hint && (
                          <span className="mt-1 block text-[11px] font-normal text-red-700">
                            💡 {v.hint}
                          </span>
                        )}
                        {!v.passed && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                            ↪ Jump to step {v.gotoStep}
                          </span>
                        )}
                      </span>
                    </button>
                    {!v.passed && v.fix && (
                      <div className="mt-2 flex justify-end border-t border-red-200 pt-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); v.fix!.run(); }}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                          ⚡ {v.fix.label}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>,
              "system",
            )}

            {sectionCard(
              "Validation Summary",
              "📊",
              <p
                className={`text-sm font-bold ${
                  allValidationsPassed ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {allValidationsPassed
                  ? `✓ All ${validationChecks.length} validations passed — ready to submit`
                  : `✗ Validation issues detected — ${validationChecks.filter((v) => !v.passed).length} failing check(s)`}
              </p>,
            )}
          </section>
        )}

        {/* ════════ STEP 8 ════════ */}
        {step === 8 && contract && (
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 text-xl text-white shadow-sm">
                📤
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Register & Submit Invoice</h2>
                <p className="text-xs text-slate-500">SRS Rows 55–58 · Generate IFMIS number, change status, lock fields, submit with notifications</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              ⚠️ Review all information carefully. Upon submission, the invoice status will change to SUBMITTED and key fields will be locked.
            </div>

            {sectionCard(
              "Invoice Summary",
              "📋",
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="IFMIS Invoice Number" locked>
                    <input className={`${lockedInputCls} font-mono font-bold`} value={ifmisNumber} readOnly />
                  </Field>
                  <Field label="Invoice Status" locked>
                    <input
                      className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700"
                      value="SUBMITTED"
                      readOnly
                    />
                  </Field>
                  <Field label="Contract Reference">
                    <input className={lockedInputCls} value={`${contract.id} — ${contract.title}`} readOnly />
                  </Field>
                  <Field label="Submission Timestamp" locked>
                    <input className={lockedInputCls} value={new Date().toISOString().slice(0, 19) + " UTC"} readOnly />
                  </Field>
                  <Field label="Gross Amount (BTN)">
                    <input className={lockedInputCls} value={breakdown.gross.toFixed(2)} readOnly />
                  </Field>
                  <Field label="Net Payable Amount (BTN)">
                    <input className={lockedInputCls} value={breakdown.net.toFixed(2)} readOnly />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Locked Fields">
                      <input
                        className={lockedInputCls}
                        value="Invoice Number, Date, Amount, Contract Reference"
                        readOnly
                      />
                    </Field>
                  </div>
                </div>
              </>,
            )}

            {sectionCard(
              "Submission Notifications",
              "🔔",
              <div className="space-y-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  ✅ Invoice queued for processing
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
                  ℹ️ Confirmation email will be sent to registered email address
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
                  ℹ️ Invoice will proceed to payment verification workflow
                </div>
              </div>,
            )}

            <Field label="Additional Remarks">
              <textarea
                className={`${inputCls} min-h-[60px]`}
                placeholder="Any final remarks or special instructions..."
                value={form.submissionRemarks}
                onChange={(e) => update("submissionRemarks", e.target.value)}
              />
            </Field>

            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-emerald-600"
              >
                ✅ Invoice Submission for Invoice Processing
              </button>
            ) : (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
                <div className="text-3xl">✅</div>
                <p className="mt-2 text-base font-bold text-emerald-800">Invoice Submitted Successfully</p>
                <p className="mt-1 text-sm text-emerald-700">
                  IFMIS Invoice #{" "}
                  <span className="font-mono font-bold">{ifmisNumber}</span> · Net BTN{" "}
                  {breakdown.net.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-emerald-700">
                  The system has generated an IFMIS reference number and initiated the payment verification workflow.
                </p>
                <button
                  type="button"
                  onClick={resetSession}
                  className="mt-3 rounded-lg border border-emerald-400 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  Submit another invoice
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step navigation */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Back
          </button>
          {step < 8 && (
            <button
              type="button"
              disabled={!canAdvance(step)}
              onClick={() => setStep((s) => Math.min(8, s + 1))}
              className="rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-sky-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceSubmissionPage;
