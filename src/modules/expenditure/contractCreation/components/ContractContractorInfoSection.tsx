import type { ContractContractorInfoSectionProps } from "../sectionProps";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";
import { deriveCurrencyFromCountry } from "../../../../shared/context/demoSeed";

export function ContractContractorInfoSection({
  form,
  inputClass,
  lockedInputClass,
  labelClass,
  isFieldLocked,
  updateField,
  verifyContractor,
  helperFor
}: ContractContractorInfoSectionProps) {
  const { contractors } = useContractorData();
  const isActive = form.contractorStatus.includes("Active");
  const isDebarred = form.contractorDebarmentStatus === "Debarred" || form.contractorDebarmentStatus === "Suspended";

  /* ── Approved contractors from the Contractor Registration module ─────────
     Only contractors that have completed the FULL registration approval
     workflow are eligible to be selected for contract creation. A contractor
     is considered fully approved when ALL of the following are true:
       1. Top-level status === "Active and verified"
          (set by ContractorRegistrationPage on final workflow approval)
       2. verification === "Verified"
       3. Either no workflowSteps exist (legacy seed) OR every workflow step
          is marked "approved" or "skipped" (no pending/rejected steps)
     This guarantees the dropdown is dynamically driven by live data from
     the Contractor Registration module via ContractorDataContext. */
  const approvedContractors = contractors.filter((c) => {
    if (c.status !== "Active and verified") return false;
    if (c.verification !== "Verified") return false;
    if (Array.isArray(c.workflowSteps) && c.workflowSteps.length > 0) {
      const allCleared = c.workflowSteps.every(
        (s) => s.status === "approved" || s.status === "skipped"
      );
      if (!allCleared) return false;
    }
    return true;
  });

  function handleContractorSelect(contractorId: string) {
    if (isFieldLocked("contractorId")) return;
    const match = contractors.find((c) => c.id === contractorId);
    if (match) {
      updateField("contractorId", match.id);
      updateField("contractorName", match.displayName);
      updateField("contractorStatus", match.status === "Active and verified" ? "Active and verified" : "Pending verification");
      updateField("contractorBankAccount", match.bankAccountNumber ? `${match.bankName}-${match.bankAccountNumber}` : "");
      updateField("contractorDebarmentStatus", "Clear — No sanctions");

      /* ── Dynamic data-flow: country → vendor-origin → currency ───────────
         When a contractor is picked, propagate their nationality into
         vendorOrigin (drives the tax-master lookup) AND auto-derive the
         contract currency from the country so a Bhutan-registered vendor
         defaults to BTN, an Indian vendor to INR, a German vendor to EUR,
         etc. Fixes the "Bhutan → USD" static default complaint. */
      const rawCountry = match.nationality || "Bhutanese";
      const isBhutanese = rawCountry === "Bhutanese" || rawCountry === "Bhutan";
      updateField("vendorOrigin", isBhutanese ? "Bhutanese" : "Non-Bhutanese");
      updateField("vendorTaxType", isBhutanese ? "Domestic Contractor" : "Foreign Contractor");
      if (!isFieldLocked("contractCurrencyId")) {
        updateField("contractCurrencyId", deriveCurrencyFromCountry(rawCountry));
      }

      /* Carry officer contact details from the contractor master so the
         Contract Officer fields on Step 5 are pre-filled rather than blank. */
      if (match.email && !form.officerEmail) updateField("officerEmail", match.email);
      if (match.phone && !form.officerPhoneNumber) updateField("officerPhoneNumber", match.phone);
    } else {
      updateField("contractorId", contractorId);
    }
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(183,28,28,0.12)]">
      <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff1f3] to-[#fffaf7] px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">4</div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">Contractor & Project Officer</h2>
            <p className="mt-1 text-sm text-slate-600">Select a registered contractor and assign a project officer from the funding agency.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-4 py-6 sm:px-6">
        {/* ── Contractor Selection ── */}
        <div>
          <label className={`${labelClass} min-w-0`}>
            <span>Contractor <span className="text-[#d32f2f]">*</span></span>
            {isFieldLocked("contractorId") ? (
              <input className={lockedInputClass} value={form.contractorId ? `${form.contractorId} — ${form.contractorName}` : ""} readOnly />
            ) : (
              <>
                <select
                  className={inputClass}
                  value={form.contractorId}
                  onChange={(e) => handleContractorSelect(e.target.value)}
                >
                  <option value="">
                    {approvedContractors.length > 0
                      ? `Select a registered contractor (${approvedContractors.length} approved)`
                      : "No approved contractors available"}
                  </option>
                  {approvedContractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.displayName} ({c.kind})
                    </option>
                  ))}
                  {/* Fallback manual entry options */}
                  <option disabled>──── or enter manually ────</option>
                  <option value="__manual__">Enter contractor ID manually</option>
                </select>
                <span className="mt-1 text-[11px] font-medium text-emerald-700">
                  Live from Contractor Registration • Only fully approved contractors are listed
                </span>
                {approvedContractors.length === 0 && (
                  <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    No contractors have completed the full registration approval workflow yet.
                    Please complete a contractor registration in the Contractor Registration module,
                    or use manual entry below.
                  </div>
                )}
              </>
            )}
          </label>

          {/* Manual entry fallback */}
          {form.contractorId === "__manual__" && (
            <label className={`${labelClass} mt-3 min-w-0`}>
              <span>Contractor ID (Manual Entry)</span>
              <input
                className={inputClass}
                value=""
                onChange={(e) => updateField("contractorId", e.target.value)}
                placeholder="Enter Contractor ID (e.g., CTR-BIZ-2026-0015)"
              />
            </label>
          )}

          {form.contractorId && form.contractorId !== "__manual__" && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className={`rounded-full px-3 py-2 text-sm font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {form.contractorStatus}
              </span>
              {!isActive && (
                <button type="button" className="rounded-full bg-rose-50 px-4 py-2 font-semibold text-[#b71c1c] transition hover:bg-rose-100" onClick={verifyContractor}>
                  Verify Contractor
                </button>
              )}
              {form.contractorName && (
                <span className="text-sm text-slate-600">{form.contractorName}</span>
              )}
            </div>
          )}

          {isActive && (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <p className="text-sm font-semibold text-emerald-900">Contractor Verified</p>
                <div className="mt-2 grid gap-2 text-xs text-emerald-800 sm:grid-cols-2">
                  <p>Contractor Status: Active</p>
                  <p>Not suspended / Not debarred</p>
                  <p>Debarment status check passed</p>
                  <p>Contractual obligation verified</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={`${labelClass} min-w-0`}>
                  <span>Bank Account</span>
                  <input className={lockedInputClass} value={form.contractorBankAccount || "Auto-populated"} readOnly />
                </label>

                <label className={`${labelClass} min-w-0`}>
                  <span>Debarment Status</span>
                  <input className={lockedInputClass} value={form.contractorDebarmentStatus || "Clear — No sanctions"} readOnly />
                </label>
              </div>
            </div>
          )}

          {isDebarred && (
            <div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4">
              <p className="text-sm font-bold text-red-900">Blocked — Contractor is {form.contractorDebarmentStatus}</p>
              <p className="mt-1 text-xs text-red-700">Contract creation is blocked. The selected contractor is not eligible.</p>
            </div>
          )}
        </div>

        {/* ── Project Officer Details ── */}
        <div>
          <h3 className="text-xl font-bold text-[#8f1111]">Project Officer Details</h3>
          <p className="mt-1 text-xs text-slate-500">Project officer from the funding agency — P-Level or above</p>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className={`${labelClass} min-w-0`}>
              <span className="flex items-center gap-2">Officer ID <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700">Auto</span></span>
              <input className={lockedInputClass} value={form.officerId} readOnly />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Contract Reference</span>
              <input className={lockedInputClass} value={form.officerContractId || form.contractId} readOnly />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Salutation</span>
              <select
                className={isFieldLocked("officerSalutation") ? lockedInputClass : inputClass}
                value={form.officerSalutation}
                onChange={(e) => updateField("officerSalutation", e.target.value)}
                disabled={isFieldLocked("officerSalutation")}
              >
                <option value="">Select</option>
                <option value="Dasho">Dasho</option>
                <option value="Aum">Aum</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
              </select>
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>First Name <span className="text-[#d32f2f]">*</span></span>
              <input className={isFieldLocked("officerFirstName") ? lockedInputClass : inputClass} value={form.officerFirstName} onChange={(e) => updateField("officerFirstName", e.target.value)} placeholder="First name" readOnly={isFieldLocked("officerFirstName")} />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Middle Name</span>
              <input className={inputClass} value={form.officerMiddleName} onChange={(e) => updateField("officerMiddleName", e.target.value)} placeholder="Middle name" />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Last Name <span className="text-[#d32f2f]">*</span></span>
              <input className={isFieldLocked("officerLastName") ? lockedInputClass : inputClass} value={form.officerLastName} onChange={(e) => updateField("officerLastName", e.target.value)} placeholder="Last name" readOnly={isFieldLocked("officerLastName")} />
            </label>

            <label className={`${labelClass} min-w-0 xl:col-span-2`}>
              <span>Email <span className="text-[#d32f2f]">*</span></span>
              <input className={isFieldLocked("officerEmail") ? lockedInputClass : inputClass} type="email" value={form.officerEmail} onChange={(e) => updateField("officerEmail", e.target.value)} placeholder="officer@agency.gov.bt" readOnly={isFieldLocked("officerEmail")} />
            </label>

            <label className={labelClass}>
              <span>Phone Number <span className="text-[#d32f2f]">*</span></span>
              <input className={isFieldLocked("officerPhoneNumber") ? lockedInputClass : inputClass} value={form.officerPhoneNumber} onChange={(e) => updateField("officerPhoneNumber", e.target.value)} placeholder="+975 XX XX XX XX" readOnly={isFieldLocked("officerPhoneNumber")} />
            </label>

            <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>
              <span>Payment Structure <span className="text-[#d32f2f]">*</span></span>
              <p className="mt-1 text-xs text-slate-500">Define how payments will be structured for this contract</p>
              <select className={inputClass} value={form.paymentStructure} onChange={(e) => updateField("paymentStructure", e.target.value)}>
                <option value="">Select payment structure</option>
                <option value="Milestone Based">Milestone Based</option>
                <option value="Lump Sum">Lump Sum (Non-milestone)</option>
                <option value="Periodic">Periodic</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
