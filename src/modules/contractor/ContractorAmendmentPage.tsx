import { useState, useMemo } from "react";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import { useAuth } from "../../shared/context/AuthContext";
import type { ContractorRecord, EditHistoryEntry } from "../../shared/types";
import { ContractorFormModal } from "./registration/ContractorFormModal";
import type { FormState, BankAccountRow, ContactRow } from "./registration/stages/sharedTypes";

/* ═══════════════════════════════════════════════════════════════════════════
   Contractor Amendment Page — Uses Shared ContractorFormModal
   ═══════════════════════════════════════════════════════════════════════════ */

const amendBadgeCls = "rounded-full px-2.5 py-0.5 text-[10px] font-bold";

/* ═══ Helper: extract FormState from ContractorRecord ═══ */
function recordToFormState(c: ContractorRecord): Partial<FormState> {
  return {
    contractorId: c.id,
    displayName: c.displayName,
    contractorType: c.contractorType,
    contractualType: c.contractualType || "",
    category: c.category,
    nationality: c.nationality,
    registrationNumber: c.registrationNumber,
    taxNumber: c.taxNumber,
    email: c.email,
    phone: c.phone,
    address: c.address,
    bankName: c.bankName,
    bankAccountNumber: c.bankAccountNumber,
    bankAccountName: c.bankAccountName,
    contractorStatusPrimary: c.status === "Active and verified" ? "Active" : "Draft",
    contractorStatusSecondary: c.profile?.statusSecondary || "",
    /* profile fields */
    firstName: c.profile?.firstName || "",
    middleName: c.profile?.middleName || "",
    lastName: c.profile?.lastName || "",
    salutation: c.profile?.salutation || "",
    gender: c.profile?.gender || "",
    dateOfBirth: c.profile?.dateOfBirth || "",
    secondaryName: c.profile?.secondaryName || "",
    businessRegistrationDate: c.profile?.businessRegistrationDate || "",
    countryOfRegistration: c.profile?.countryOfRegistration || "",
    gstNumber: c.profile?.gstNumber || "",
    licenseNumber: c.profile?.licenseNumber || "",
    addressLine2: c.profile?.addressLine2 || "",
    addressLine3: c.profile?.addressLine3 || "",
    district: c.profile?.district || "",
    dungkhag: c.profile?.dungkhag || "",
    gewog: c.profile?.gewog || "",
    thromde: c.profile?.thromde || "",
    cityTown: c.profile?.cityTown || "",
    stateProvince: c.profile?.stateProvince || "",
    region: c.profile?.region || "",
    postalCode: c.profile?.postalCode || "",
    bankBranchName: c.profile?.bankBranchName || "",
    bankBranchCode: c.profile?.bankBranchCode || "",
    accountType: c.profile?.accountType || "",
    currencyType: c.profile?.currencyType || "BTN",
    accountStatus: c.profile?.accountStatus || "Active",
    ifscCode: c.profile?.ifscCode || "",
    swiftCode: c.profile?.swiftCode || "",
    contactPerson: c.profile?.contactPerson || `${c.profile?.firstName || ""} ${c.profile?.lastName || ""}`.trim(),
    contactRole: c.profile?.jobTitle || "",
    isPrimaryContractor: c.profile?.isPrimaryContractor || "No",
    secondaryPhone: c.profile?.secondaryPhone || "",
    faxNumber: c.profile?.faxNumber || "",
    statusReason: c.profile?.statusReason || "",
    sanctionsCheck: c.profile?.sanctionsCheck || "",
    sanctionCategory: c.profile?.sanctionCategory || "",
    sanctionType: c.profile?.sanctionType || "",
    sanctionStartDate: c.profile?.sanctionStartDate || "",
    sanctionEndDate: c.profile?.sanctionEndDate || "",
    sanctionReason: c.profile?.sanctionReason || "",
  } as Partial<FormState>;
}

/* ═══ Helper: extract bank rows from ContractorRecord ═══ */
function recordToBankRows(c: ContractorRecord): BankAccountRow[] {
  if (c.profile?.bankAccounts && Array.isArray(c.profile.bankAccounts) && c.profile.bankAccounts.length > 0) {
    return c.profile.bankAccounts as BankAccountRow[];
  }
  if (c.bankName || c.bankAccountNumber) {
    return [{
      id: crypto.randomUUID(),
      holderName: c.bankAccountName || "",
      accountNumber: c.bankAccountNumber || "",
      type: c.profile?.accountType || "Savings",
      category: c.profile?.accountCategory || "Domestic",
      bank: c.bankName || "",
      branch: c.profile?.bankBranchName || "",
      branchCode: c.profile?.bankBranchCode || "",
      currency: c.profile?.currencyType || "BTN",
      status: c.profile?.accountStatus || "Active",
      primary: "Yes",
      cbsVerified: false,
    }];
  }
  return [];
}

/* ═══ Helper: extract contact rows from ContractorRecord ═══ */
function recordToContactRows(c: ContractorRecord): ContactRow[] {
  if (c.profile?.contacts && Array.isArray(c.profile.contacts) && c.profile.contacts.length > 0) {
    return c.profile.contacts as ContactRow[];
  }
  const firstName = c.profile?.firstName || "";
  const lastName = c.profile?.lastName || "";
  if (firstName || lastName || c.email || c.phone) {
    return [{
      id: crypto.randomUUID(),
      contactId: `${c.kind === "business" ? "CB" : "CI"}-${c.id}-001`,
      salutation: c.profile?.salutation || "",
      firstName,
      middleName: c.profile?.middleName || "",
      lastName,
      nationalId: c.registrationNumber || "",
      gender: c.profile?.gender || "",
      email: c.email || "",
      mobileNumber: c.phone || "",
      landlineNumber: "",
      jobTitle: c.profile?.jobTitle || "",
      isPrimaryContact: "Yes",
      isIfmisDesignated: "No",
      isActive: "Yes",
    }];
  }
  return [];
}

export function ContractorAmendmentPage() {
  const { contractors, updateContractor } = useContractorData();
  const { activeRoleId, user } = useAuth();
  const isPublicActor = activeRoleId === "role-public";

  /* ── State ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<ContractorRecord | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{ name: string; changeCount: number; remarks: string; id: string } | null>(null);

  /* ── Search results ── */
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return contractors.filter(c =>
      c.id.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q) ||
      c.registrationNumber.toLowerCase().includes(q) || c.taxNumber.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchTerm, contractors]);

  /* ── Select contractor ── */
  function selectContractor(c: ContractorRecord) {
    setSelected(c);
    setSubmitted(false);
    setSubmittedInfo(null);
    setSearchTerm("");
  }

  /* ── Handle save from ContractorFormModal ── */
  function handleAmendmentSave(data: {
    form: FormState;
    bankRows: BankAccountRow[];
    contactRows: ContactRow[];
    changes: { field: string; key: string; oldValue: string; newValue: string }[];
    remarks: string;
  }) {
    if (!selected) return;

    const editorLabel = isPublicActor
      ? `${user?.name ?? "Contractor"} (Self-Service Portal)`
      : "Admin";
    const historyEntry: EditHistoryEntry = {
      editedBy: editorLabel,
      editedAt: new Date().toISOString(),
      changes: data.changes.map(c => ({ field: c.field, oldValue: c.oldValue, newValue: c.newValue })),
      remarks: data.remarks,
    };

    const primaryBank = data.bankRows.find(r => r.primary === "Yes") || data.bankRows[0];
    const primaryContact = data.contactRows.find(r => r.isPrimaryContact === "Yes") || data.contactRows[0];

    updateContractor(selected.id, {
      displayName: data.form.displayName,
      contractorType: data.form.contractorType,
      contractualType: data.form.contractualType,
      category: data.form.category,
      nationality: data.form.nationality,
      registrationNumber: data.form.registrationNumber,
      taxNumber: data.form.taxNumber,
      email: primaryContact?.email || data.form.email || selected.email,
      phone: primaryContact?.mobileNumber || data.form.phone || selected.phone,
      address: data.form.address,
      bankName: primaryBank?.bank || data.form.bankName || "",
      bankAccountNumber: primaryBank?.accountNumber || data.form.bankAccountNumber || "",
      bankAccountName: primaryBank?.holderName || data.form.bankAccountName || "",
      /* Public portal submissions → route back into pending queue for admin
         review (NotificationBell watches submittedVia === "public" &&
         verification ∈ {Pending, Resubmitted}). Admin submissions stay
         auto-approved. */
      ...(isPublicActor
        ? {
            submittedVia: "public" as const,
            submitterEmail: user?.email ?? selected.submitterEmail,
            verification: "Resubmitted" as const,
            status: "Draft" as const,
            reviewRemarks: `Amendment submitted by ${user?.name ?? "contractor"} — pending admin review.`,
          }
        : {
            status: data.form.contractorStatusPrimary === "Active" ? "Active and verified" : "Draft",
          }),
      editHistory: [...(selected.editHistory || []), historyEntry],
      profile: {
        ...selected.profile,
        firstName: data.form.firstName,
        middleName: data.form.middleName,
        lastName: data.form.lastName,
        salutation: data.form.salutation,
        gender: data.form.gender,
        dateOfBirth: data.form.dateOfBirth,
        secondaryName: data.form.secondaryName,
        businessRegistrationDate: data.form.businessRegistrationDate,
        countryOfRegistration: data.form.countryOfRegistration,
        gstNumber: data.form.gstNumber,
        licenseNumber: data.form.licenseNumber,
        addressLine2: data.form.addressLine2,
        addressLine3: data.form.addressLine3,
        district: data.form.district,
        dungkhag: data.form.dungkhag,
        gewog: data.form.gewog,
        thromde: data.form.thromde,
        cityTown: data.form.cityTown,
        stateProvince: data.form.stateProvince,
        region: data.form.region,
        postalCode: data.form.postalCode,
        bankBranchName: primaryBank?.branch || data.form.bankBranchName || "",
        bankBranchCode: primaryBank?.branchCode || data.form.bankBranchCode || "",
        accountType: primaryBank?.type || data.form.accountType || "",
        currencyType: primaryBank?.currency || data.form.currencyType || "BTN",
        accountStatus: primaryBank?.status || data.form.accountStatus || "Active",
        ifscCode: data.form.ifscCode || "",
        swiftCode: data.form.swiftCode || "",
        contactPerson: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim() : data.form.contactPerson || "",
        jobTitle: primaryContact?.jobTitle || data.form.contactRole || "",
        isPrimaryContractor: data.form.isPrimaryContractor,
        secondaryPhone: data.form.secondaryPhone,
        faxNumber: data.form.faxNumber,
        statusSecondary: data.form.contractorStatusSecondary,
        statusReason: data.form.statusReason,
        sanctionsCheck: data.form.sanctionsCheck,
        sanctionCategory: data.form.sanctionCategory,
        sanctionType: data.form.sanctionType,
        sanctionStartDate: data.form.sanctionStartDate,
        sanctionEndDate: data.form.sanctionEndDate,
        sanctionReason: data.form.sanctionReason,
        lastAmendedAt: new Date().toISOString(),
        amendmentReason: data.remarks,
      },
    });

    setSubmitted(true);
    setSubmittedInfo({
      name: data.form.displayName,
      changeCount: data.changes.length,
      remarks: data.remarks,
      id: selected.id,
    });
    setSelected(null);
  }

  function handleCancel() {
    setSelected(null);
  }

  function goBack() {
    setSelected(null);
    setSubmitted(false);
    setSubmittedInfo(null);
  }

  /* ═══ MAIN RENDER ═══ */

  /* ── If a contractor is selected, show the modal ── */
  if (selected) {
    return (
      <ContractorFormModal
        kind={selected.kind}
        mode="amendment"
        contractorId={selected.id}
        contractorName={selected.displayName}
        initialData={recordToFormState(selected)}
        initialBankRows={recordToBankRows(selected)}
        initialContactRows={recordToContactRows(selected)}
        onSave={handleAmendmentSave}
        onCancel={handleCancel}
        actor={isPublicActor ? "public" : "admin"}
      />
    );
  }

  /* ── Search & Select view ── */
  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Success Banner (after amendment) */}
      {submitted && submittedInfo && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Amendment Approved & Submitted</h3>
          <p className="text-sm text-slate-600">
            All {submittedInfo.changeCount} change{submittedInfo.changeCount > 1 ? "s" : ""} for <strong>{submittedInfo.name}</strong> have been applied and recorded in audit trail.
          </p>
          {submittedInfo.remarks && (
            <p className="text-xs text-slate-500 mt-2 italic">Remarks: "{submittedInfo.remarks}"</p>
          )}
          <p className="text-xs text-slate-400 mt-2">Amendment ID: AMN-{submittedInfo.id.slice(-4)}-{new Date().getTime().toString(36).toUpperCase()}</p>
          <button onClick={goBack} className="mt-5 rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition">
            Start New Amendment
          </button>
        </div>
      )}

      {/* Search Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Find Contractor to Amend</h2>
            <p className="text-xs text-slate-500">Search by ID, name, registration number, TPN, or email</p>
          </div>
        </div>

        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Enter Contractor ID, Name, CID, BRN, TPN, or Email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition" />
        </div>

        {searchTerm.trim() && (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {searchResults.length > 0 ? searchResults.map(c => (
              <button key={c.id} onClick={() => selectContractor(c)}
                className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.displayName}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="font-mono text-xs text-indigo-600">{c.id}</span>
                      <span className="text-xs text-slate-500">TPN: {c.taxNumber}</span>
                      <span className={`${amendBadgeCls} ${c.kind === "individual" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>{c.kind === "individual" ? "Individual" : "Business"}</span>
                      <span className={`${amendBadgeCls} ${c.verification === "Verified" ? "bg-emerald-50 text-emerald-700" : c.verification === "Rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{c.verification || "Pending"}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            )) : (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-slate-400">No contractors found for "{searchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {!searchTerm.trim() && !submitted && (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="text-sm text-slate-500 font-medium">Start typing to search contractors</p>
            <p className="text-xs text-slate-400 mt-1">Search across {contractors.length} registered contractors</p>
          </div>
        )}
      </div>
    </div>
  );
}
