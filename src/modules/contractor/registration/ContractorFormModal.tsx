'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { ContractorKind } from '../../../shared/types';
import { useMasterData } from '../../../shared/context/MasterDataContext';
import { BankAccountStage } from './stages/BankAccountStage';
import { ContactStage } from './stages/ContactStage';
import type { BankAccountRow, ContactRow, FormState } from './stages/sharedTypes';
import { generateContactId } from './stages/sharedTypes';
import { getAllDzongkhags, getDungkhagsForDzongkhag, getGewogsForDzongkhag, getThromdeForDzongkhag } from '../../../shared/data/locationData';
import { getAllBanks, getBranchesForBank } from '../../../shared/data/bankData';
import {
  saveDocsToStorage,
  loadDocsFromStorage,
  ModalDocField,
  inputClass,
  lockedInputClass,
  labelClass,
  sectionCardClass,
  individualSteps,
  businessSteps,
  defaultForm,
  createBankRow,
  createContactRow,
  trackChanges,
} from './formModal';

/* ═══════════════════════════════════════════════════════════════════════════
   ContractorFormModal — Reusable Edit / Amendment Modal
   Renders the EXACT same fields & tabs as the registration form in
   ContractorRegistrationPage.tsx so that edit & amendment flows are
   consistent with registration.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ContractorFormModalProps {
  kind: ContractorKind;
  mode: 'edit' | 'amendment';
  initialData: Partial<FormState>;
  initialBankRows?: BankAccountRow[];
  initialContactRows?: ContactRow[];
  contractorId: string;
  contractorName: string;
  onSave: (data: {
    form: FormState;
    bankRows: BankAccountRow[];
    contactRows: ContactRow[];
    changes: { field: string; key: string; oldValue: string; newValue: string }[];
    remarks: string;
  }) => void;
  onCancel: () => void;
  /** Role of the submitter. "public" → contractor self-service portal (shows
      "Submit for Approval"); "admin" (default) → internal user approving
      on behalf of the contractor (shows "Submit and Approve"). */
  actor?: 'admin' | 'public';
}


/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function ContractorFormModal({
  kind,
  mode,
  initialData,
  initialBankRows,
  initialContactRows,
  contractorId,
  contractorName,
  onSave,
  onCancel,
  actor = 'admin',
}: ContractorFormModalProps) {
  const isPublicActor = actor === 'public';
  const { masterDataMap } = useMasterData();

  /* ── Body scroll lock & entrance animation ── */
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // trigger entrance animation on next frame
    requestAnimationFrame(() => setMounted(true));
    return () => { document.body.style.overflow = orig; };
  }, []);

  /* ── ESC key to close ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);
  const md = useCallback((id: string) => masterDataMap.get(id) ?? [], [masterDataMap]);

  const steps = kind === 'business' ? businessSteps : individualSteps;
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => ({ ...defaultForm(kind), ...initialData }));
  const [initialSnapshot] = useState<Partial<FormState>>(() => ({ ...initialData }));
  const [bankRows, setBankRows] = useState<BankAccountRow[]>(initialBankRows?.length ? initialBankRows : [createBankRow(1)]);
  const [contactRows, setContactRows] = useState<ContactRow[]>(initialContactRows?.length ? initialContactRows : [createContactRow(kind, 1, contractorId)]);

  /* ── Documents & Compliance state ── */
  const [docFiles, setDocFiles] = useState<Record<string, File[]>>({});
  const [complianceChecks, setComplianceChecks] = useState<Record<string, boolean>>({});

  /* ── Load saved documents from localStorage on mount (edit mode) ── */
  const docsLoadedRef = useRef(false);
  useEffect(() => {
    if (docsLoadedRef.current || !contractorId) return;
    docsLoadedRef.current = true;
    loadDocsFromStorage(contractorId).then(loaded => {
      if (Object.keys(loaded).length > 0) setDocFiles(loaded);
    });
  }, [contractorId]);

  /* ── Persist documents to localStorage whenever they change ── */
  useEffect(() => {
    if (!contractorId || Object.keys(docFiles).length === 0) return;
    saveDocsToStorage(contractorId, docFiles);
  }, [docFiles, contractorId]);

  const isBhutanese = form.nationality === 'Bhutanese' || form.nationality === 'Bhutan';
  const isIndividual = kind === 'individual';

  /* ── Location & Bank cascading options ── */
  const dzongkhagOptions = useMemo(() => getAllDzongkhags(), []);
  const dungkhagOptions = useMemo(() => (form.district ? getDungkhagsForDzongkhag(form.district) : []), [form.district]);
  const gewogOptions = useMemo(() => {
    if (!form.district) return [];
    return form.dungkhag ? getGewogsForDzongkhag(form.district, form.dungkhag) : getGewogsForDzongkhag(form.district);
  }, [form.district, form.dungkhag]);
  const thromdeOptions = useMemo(() => (form.district ? getThromdeForDzongkhag(form.district) : []), [form.district]);

  /* ── Update field ── */
  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === 'nationality') {
        const bhutanese = value === 'Bhutanese';
        if (isIndividual) {
          next.registrationNumber = '';
          next.taxNumber = '';
          next.firstName = '';
          next.middleName = '';
          next.lastName = '';
          next.displayName = '';
          next.countryOfRegistration = bhutanese ? 'Bhutan' : '';
        }
        if (!isIndividual) {
          next.registrationNumber = '';
          next.taxNumber = '';
          next.businessRegistrationDate = '';
          next.countryOfRegistration = bhutanese ? 'Bhutan' : '';
        }
        next.address = '';
        next.addressLine2 = '';
        next.addressLine3 = '';
        next.gewog = '';
        next.dungkhag = '';
        next.thromde = '';
        next.district = '';
        next.cityTown = '';
        next.stateProvince = '';
        next.region = '';
        next.postalCode = '';
      }
      if (key === 'district') {
        next.dungkhag = '';
        next.gewog = '';
        next.thromde = '';
      }
      if (key === 'dungkhag') {
        next.gewog = '';
      }
      if (key === 'bankName') {
        next.bankBranchName = '';
        next.bankBranchCode = '';
      }
      if (isIndividual && ['firstName', 'middleName', 'lastName'].includes(key as string)) {
        next.displayName = [
          key === 'firstName' ? String(value) : next.firstName,
          key === 'lastName' ? String(value) : next.lastName,
          key === 'middleName' ? String(value) : next.middleName,
        ].filter(Boolean).join(' ').trim();
      }

      return next;
    });
  }

  /* ── Bank row helpers ── */
  function updateBankRow(rowId: string, key: keyof BankAccountRow, value: string) {
    setBankRows((current) =>
      current.map((row) => {
        if (key === 'primary' && value === 'Yes') {
          return row.id === rowId ? { ...row, primary: 'Yes' } : { ...row, primary: 'No' };
        }
        return row.id === rowId ? { ...row, [key]: value } : row;
      })
    );
  }
  function addBankRow() { setBankRows((c) => [...c, createBankRow(c.length + 1)]); }
  function removeBankRow(rowId: string) {
    setBankRows((c) => {
      const filtered = c.filter((r) => r.id !== rowId);
      if (filtered.length === 0) return [createBankRow(1)];
      if (!filtered.some((r) => r.primary === 'Yes')) filtered[0] = { ...filtered[0], primary: 'Yes' };
      return filtered;
    });
  }

  /* ── CBS (Core Banking System) Verification ── */
  const [cbsVerifyingRowId, setCbsVerifyingRowId] = useState<string | null>(null);

  function simulateCbsVerify(accountNumber: string) {
    if (!accountNumber || accountNumber.trim().length < 1) return null;
    const n = accountNumber.trim();
    const cbsRecords: Record<string, { bankName: string; branchName: string; branchCode: string; holderName: string; accountType: string; currency: string; status: string }> = {
      "1234": { bankName: "Bank of Bhutan", branchName: "Thimphu Main Branch", branchCode: "BOB-001", holderName: "Nar Bdr Kharka", accountType: "Savings Bank Accounts", currency: "BTN", status: "Active" },
      "200100345678": { bankName: "Bhutan National Bank", branchName: "Paro Branch", branchCode: "BNB-012", holderName: "Karma Dorji", accountType: "Current Deposit Account", currency: "BTN", status: "Active" },
      "300200456789": { bankName: "BDBL", branchName: "Phuentsholing Branch", branchCode: "BDBL-005", holderName: "Dechen Wangmo", accountType: "Savings Bank Accounts", currency: "BTN", status: "Active" },
      "400300567890": { bankName: "T-Bank", branchName: "Thimphu Branch", branchCode: "TBNK-003", holderName: "Pema Tenzin Sherpa", accountType: "Current Deposit Account", currency: "BTN", status: "Active" },
    };
    const last4 = n.slice(-4).padStart(4, "0");
    return cbsRecords[n] ?? {
      bankName: "Bank of Bhutan", branchName: "Thimphu Main Branch", branchCode: `BOB-${last4}`,
      holderName: "Nar Bdr Kharka", accountType: "Savings Bank Accounts", currency: "BTN", status: "Active",
    };
  }

  function handleCbsVerifyRow(rowId: string, accountNumberOverride?: string) {
    const row = bankRows.find(r => r.id === rowId);
    const accNum = accountNumberOverride?.trim() || row?.accountNumber?.trim() || "";
    if (!accNum) return;
    setCbsVerifyingRowId(rowId);
    setTimeout(() => {
      const result = simulateCbsVerify(accNum);
      if (result) {
        setBankRows(cur => cur.map(r => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            accountNumber: accNum,
            holderName: result.holderName,
            type: result.accountType,
            bank: result.bankName,
            branch: result.branchName,
            branchCode: result.branchCode,
            currency: result.currency,
            status: result.status,
            cbsVerified: true,
          };
        }));
        setForm(p => ({
          ...p,
          bankName: result.bankName,
          bankBranchName: result.branchName,
          bankBranchCode: result.branchCode,
          bankAccountName: result.holderName,
          accountType: result.accountType,
          currencyType: result.currency,
          accountStatus: result.status,
          accountCategory: isBhutanese ? "Domestic" : "International",
        }));
      }
      setCbsVerifyingRowId(null);
    }, 600);
  }

  /* ── Contact row helpers ── */
  function updateContactRow(rowId: string, key: keyof ContactRow, value: string) {
    setContactRows((current) => current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  }
  function addContactRow() { setContactRows((c) => [...c, createContactRow(kind, c.length + 1, contractorId)]); }
  function removeContactRow(rowId: string) {
    setContactRows((c) => {
      const filtered = c.filter((r) => r.id !== rowId);
      return filtered.length > 0 ? filtered : [createContactRow(kind, 1, contractorId)];
    });
  }

  /* ── Render helpers (match ContractorRegistrationPage) ── */
  /* ── External-system fields: locked in amendment mode (verified via IBLS / RAMIS / CBS) ── */
  const EXTERNAL_SYSTEM_FIELDS: Set<keyof FormState> = new Set([
    'registrationNumber',  /* CID / BRN — from IBLS / Census */
    'taxNumber',           /* TPN — from RAMIS */
    'licenseNumber',       /* Business License — from IBLS */
    'gstNumber',           /* GST Number — from RAMIS */
  ]);

  function isExternalSystemLocked(fieldKey?: keyof FormState): boolean {
    if (mode !== 'amendment' || !fieldKey) return false;
    return EXTERNAL_SYSTEM_FIELDS.has(fieldKey);
  }

  function renderInput(label: string, value: string, onChange: (v: string) => void, opts?: { locked?: boolean; hint?: string; type?: string; placeholder?: string; fieldKey?: keyof FormState }) {
    const extLocked = isExternalSystemLocked(opts?.fieldKey);
    const isLocked = opts?.locked || extLocked;
    return (
      <div>
        <label className={labelClass}>
          {label}
          {opts?.locked && <span className="ml-1.5 text-[10px] text-gray-400 normal-case tracking-normal font-normal">(auto)</span>}
          {extLocked && <span className="ml-1.5 text-[10px] text-amber-600 normal-case tracking-normal font-normal">(external system — read only)</span>}
        </label>
        {isLocked ? <input className={lockedInputClass} value={value} readOnly /> : (
          <input className={inputClass} type={opts?.type ?? 'text'} value={value} placeholder={opts?.placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    );
  }

  function renderSelect(label: string, value: string, options: string[], onChange: (v: string) => void, locked?: boolean) {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        {locked ? <input className={lockedInputClass} value={value} readOnly /> : (
          <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">-- Select --</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>
    );
  }

  function SectionHeader({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
      <div className="mb-4 sm:mb-6 flex items-start gap-3 sm:gap-4">
        <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    );
  }

  /* ── Handle Save ── */
  function handleSave() {
    const changes = trackChanges(initialSnapshot, form);
    onSave({
      form,
      bankRows,
      contactRows,
      changes,
      remarks: form.remarks,
    });
  }

  const currentStep = steps[activeStep];

  /* ═══════════════════════════════════════════════════════════════
     STEP RENDERERS — match ContractorRegistrationPage exactly
     ═══════════════════════════════════════════════════════════════ */

  /* ── Step: Personal Info / Business Profile ── */
  const renderPersonalInfo = () => (
    <div>
      <SectionHeader
        icon={currentStep.icon}
        title={isIndividual ? 'Personal Information' : 'Business Profile'}
        description={isIndividual ? 'Enter basic personal information and contractor classification.' : 'Enter business details and contractor classification.'}
      />

      <div className={`${sectionCardClass} mt-4 sm:mt-6 grid grid-cols-1 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5 sm:grid-cols-2`}>
        {renderInput('Contractor ID', form.contractorId, () => {}, { locked: true })}
        {renderSelect('Entity Type', form.category, md('contractor-category'), (v) => updateField('category', v))}
        {renderSelect('Nationality', form.nationality, md('nationality'), (v) => updateField('nationality', v))}

        {/* Bhutanese Individual: CID */}
        {isIndividual && isBhutanese && renderInput('Bhutan CID (National ID)', form.registrationNumber, (v) => updateField('registrationNumber', v), { placeholder: '12-digit CID number', fieldKey: 'registrationNumber' })}

        {/* Non-Bhutanese Individual: Passport */}
        {isIndividual && !isBhutanese && renderInput('Passport Number', form.registrationNumber, (v) => updateField('registrationNumber', v), { placeholder: 'Passport number', fieldKey: 'registrationNumber' })}

        {renderSelect('Salutation', form.salutation, md('salutation'), (v) => updateField('salutation', v))}

        {isIndividual && (
          <>
            {renderInput('First Name', form.firstName, (v) => updateField('firstName', v), { placeholder: 'First name' })}
            {renderInput('Middle Name', form.middleName, (v) => updateField('middleName', v), { placeholder: 'Optional' })}
            {renderInput('Last Name', form.lastName, (v) => updateField('lastName', v), { placeholder: 'Last name' })}
            {renderInput('Date of Birth', form.dateOfBirth, (v) => updateField('dateOfBirth', v), { type: 'date', hint: isBhutanese ? 'DD 10.7 — auto-populated from BCRS / Census System.' : 'DD 10.7 — captured from passport profile.' })}
          </>
        )}

        {!isIndividual && (
          <>
            {renderInput('Legal Business Name', form.displayName, (v) => updateField('displayName', v))}
            {renderInput('Trade Name / Alternate Name', form.secondaryName, (v) => updateField('secondaryName', v))}
          </>
        )}

        {renderInput('Contractor Name', form.displayName, () => {}, { locked: true })}
        {renderSelect('Gender', form.gender, md('gender'), (v) => updateField('gender', v))}

        {/* Bhutanese: License, TPN, GST */}
        {isBhutanese && renderInput('License Number (IBLS)', form.licenseNumber, (v) => updateField('licenseNumber', v), { placeholder: 'IBLS business license number', fieldKey: 'licenseNumber' })}
        {isBhutanese && renderInput('Tax Payer Number (TPN)', form.taxNumber, (v) => updateField('taxNumber', v), { placeholder: 'RAMIS TPN', fieldKey: 'taxNumber' })}
        {isBhutanese && renderInput('GST Number', form.gstNumber, (v) => updateField('gstNumber', v), { placeholder: 'GST registration number', fieldKey: 'gstNumber' })}

        {/* Non-Bhutanese: Foreign Reg & Tax */}
        {!isBhutanese && (
          <>
            {renderInput('Foreign Registration Number', form.licenseNumber, (v) => updateField('licenseNumber', v), { placeholder: 'Foreign business registration', fieldKey: 'licenseNumber' })}
            {renderInput('Foreign Tax Number', form.gstNumber, (v) => updateField('gstNumber', v), { placeholder: 'Foreign tax identification', fieldKey: 'gstNumber' })}
          </>
        )}

        {renderInput('Phone', form.phone, (v) => updateField('phone', v), { placeholder: '+975-...' })}
        {renderInput('Email', form.email, (v) => updateField('email', v), { type: 'email', placeholder: 'contractor@example.com' })}
      </div>
    </div>
  );

  /* ── Step: Identity & Registration ── */
  const renderIdentity = () => (
    <div>
      <SectionHeader
        icon={currentStep.icon}
        title="Identity & Registration Details"
        description="Registration, verification, and contractor status information."
      />

      {/* Registration & Verification section */}
      {isBhutanese && (
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Registration & Verification</h4>
          <p className="text-[10px] text-emerald-600 font-medium mb-4">Bhutanese (National) — IBLS / RAMIS verified</p>
          <div className="grid grid-cols-1 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5 sm:grid-cols-2">
            {isIndividual && renderInput('CID / National ID', form.registrationNumber, (v) => updateField('registrationNumber', v), { fieldKey: 'registrationNumber' })}
            {!isIndividual && renderInput('Business Registration No. (BRN)', form.registrationNumber, (v) => updateField('registrationNumber', v), { placeholder: 'BRN number', fieldKey: 'registrationNumber' })}
            {renderInput('Business Registration Date', form.businessRegistrationDate, (v) => updateField('businessRegistrationDate', v), { type: 'date' })}
          </div>
        </div>
      )}

      {!isBhutanese && (
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Registration & Verification</h4>
          <p className="text-[10px] text-sky-600 font-medium mb-4">{form.nationality} (International) — Foreign registration details</p>
          <div className="grid grid-cols-1 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5 sm:grid-cols-2">
            {renderInput('Passport Number', form.registrationNumber, (v) => updateField('registrationNumber', v), { placeholder: 'Passport number', fieldKey: 'registrationNumber' })}
            {renderInput('Foreign Registration Number', form.licenseNumber, (v) => updateField('licenseNumber', v), { placeholder: 'Foreign business registration number', fieldKey: 'licenseNumber' })}
            {renderInput('Foreign Tax Number', form.gstNumber, (v) => updateField('gstNumber', v), { placeholder: 'Foreign tax identification number', fieldKey: 'gstNumber' })}
            {renderInput('Business Registration Date', form.businessRegistrationDate, (v) => updateField('businessRegistrationDate', v), { type: 'date' })}
          </div>
        </div>
      )}

      {/* Contractor Status */}
      <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Contractor Status</h4>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          {renderSelect('Contractor Status', form.contractorStatusPrimary, md('contractor-status-primary'), (v) => updateField('contractorStatusPrimary', v))}
          {renderSelect('Secondary Status', form.contractorStatusSecondary, md('contractor-status-secondary'), (v) => updateField('contractorStatusSecondary', v))}
          {renderInput('Status Reason', form.statusReason, (v) => updateField('statusReason', v), { hint: 'Mandatory when status is not Active' })}
          {renderInput('Source for Supplier Data', form.dataSource, () => {}, { locked: true })}
          {renderInput('Date of Registration in System', form.registrationDate, () => {}, { locked: true })}
        </div>
      </div>

      {/* Primary Contractor — Business only */}
      {!isIndividual && (
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Primary Contractor Designation</h4>
          <div className="grid grid-cols-1 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Is Primary Contractor?</label>
              <div className="flex items-center gap-6 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isPrimary" checked={form.isPrimaryContractor === 'Yes'} onChange={() => updateField('isPrimaryContractor', 'Yes')} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 font-medium">Yes — Lead / Primary</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="isPrimary" checked={form.isPrimaryContractor === 'No'} onChange={() => updateField('isPrimaryContractor', 'No')} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700 font-medium">No — Member / Sub-contractor</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Step: Address ── */
  const renderAddress = () => (
    <div>
      <SectionHeader
        icon={currentStep.icon}
        title="Address Information"
        description={isBhutanese ? 'Bhutanese address using the Dzongkhag, Dungkhag, Gewog, and Thromde hierarchy.' : 'International address details for non-Bhutanese registrations.'}
      />
      <div className={`${sectionCardClass} mt-4 sm:mt-6 grid grid-cols-1 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5 sm:grid-cols-2`}>
        {renderInput('Address Line 1', form.address, (v) => updateField('address', v))}
        {renderInput('Address Line 2', form.addressLine2, (v) => updateField('addressLine2', v))}
        {renderInput('Address Line 3', form.addressLine3, (v) => updateField('addressLine3', v))}
        {isBhutanese ? (
          <>
            {renderSelect('Dzongkhag', form.district, dzongkhagOptions, (v) => updateField('district', v))}
            {dungkhagOptions.length > 0
              ? renderSelect('Dungkhag', form.dungkhag, dungkhagOptions, (v) => updateField('dungkhag', v))
              : form.district && (
                <div>
                  <label className={labelClass}>Dungkhag</label>
                  <div className="px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 italic">No Dungkhag for {form.district}</div>
                </div>
              )
            }
            {gewogOptions.length > 0
              ? renderSelect('Gewog', form.gewog, gewogOptions, (v) => updateField('gewog', v))
              : form.district && (
                <div>
                  <label className={labelClass}>Gewog</label>
                  <div className="px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 italic">No Gewog for {form.district}{form.dungkhag ? ` / ${form.dungkhag}` : ''}</div>
                </div>
              )
            }
            {thromdeOptions.length > 0 && renderSelect('Thromde', form.thromde, thromdeOptions, (v) => updateField('thromde', v))}
          </>
        ) : (
          <>
            {renderInput('City / Town', form.cityTown, (v) => updateField('cityTown', v))}
            {renderInput('State / Province', form.stateProvince, (v) => updateField('stateProvince', v))}
            {renderInput('Region', form.region, (v) => updateField('region', v))}
            {renderInput('Postal Code', form.postalCode, (v) => updateField('postalCode', v))}
          </>
        )}
      </div>
    </div>
  );

  /* ── Step: Bank Account ── */
  const renderBank = () => (
    <div>
      <SectionHeader
        icon={currentStep.icon}
        title="Bank Account Details"
        description={isBhutanese ? 'Enter account details and verify with CBS.' : 'Add your international bank account details including SWIFT/IFSC codes.'}
      />
      <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
        <BankAccountStage
          kind={kind}
          form={form}
          inputClass={inputClass}
          labelClass={labelClass}
          lockedInputClass={lockedInputClass}
          getMasterOptions={(id) => md(id)}
          updateField={updateField}
          bankRows={bankRows}
          primaryAccountOptions={['Yes', 'No']}
          updateBankRow={updateBankRow}
          addBankRow={addBankRow}
          removeBankRow={removeBankRow}
          isBhutanese={isBhutanese}
          onCbsVerify={handleCbsVerifyRow}
          cbsVerifyingRowId={cbsVerifyingRowId}
          mode={mode === 'amendment' ? 'amendment' : 'registration'}
        />
      </div>
    </div>
  );

  /* ── Step: Contact(s) ── */
  const renderContact = () => (
    <div>
      <SectionHeader
        icon={currentStep.icon}
        title="Contact Information"
        description="At least one IFMIS-designated contact is required per contractor record."
      />
      <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
        <ContactStage
          kind={kind}
          form={form}
          inputClass={inputClass}
          labelClass={labelClass}
          lockedInputClass={lockedInputClass}
          getMasterOptions={(id) => md(id)}
          updateField={updateField}
          contactRows={contactRows}
          updateContactRow={updateContactRow}
          removeContactRow={removeContactRow}
          addContactRow={addContactRow}
        />
      </div>
    </div>
  );

  /* ── Step: Documents & Compliance ── */
  const renderDocuments = () => {
    const contractorType = kind === 'business' ? 'business' : 'individual';
    const autoFillKeys = ["nationalIdDoc", "taxClearanceDoc", "tradeLicenseDoc"];

    function handleDocChange(fileKey: string, multiple: boolean) {
      return (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = e.target.files ? Array.from(e.target.files) : [];
        if (newFiles.length === 0) return;
        setDocFiles(cur => {
          const next = { ...cur, [fileKey]: multiple ? [...(cur[fileKey] || []), ...newFiles] : newFiles };
          if (!multiple && autoFillKeys.includes(fileKey)) {
            for (const key of autoFillKeys) {
              if (key !== fileKey && !(cur[key]?.length)) next[key] = newFiles;
            }
          }
          return next;
        });
        e.target.value = "";
      };
    }

    function removeDoc(fileKey: string, index: number) {
      setDocFiles(cur => ({ ...cur, [fileKey]: (cur[fileKey] || []).filter((_, i) => i !== index) }));
    }

    return (
      <div>
        <SectionHeader
          icon={currentStep.icon}
          title="Documents & Compliance"
          description="Upload required supporting documents and complete compliance declarations."
        />

        {/* Info banner */}
        <div className="mt-3 sm:mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
          <svg className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-xs text-slate-700 leading-relaxed">Upload required supporting documents. Valid file formats: <strong>PDF, PNG, JPG</strong>. Max <strong>5MB</strong> per file.</p>
        </div>

        {/* Document upload fields */}
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
            <ModalDocField fileKey="nationalIdDoc" label={contractorType === 'business' ? 'Business Registration Certificate' : 'National ID Card Copy'} required hint={contractorType === 'business' ? 'Required: Official BRN certificate' : 'Required for national contractors'} docFiles={docFiles} onDocChange={handleDocChange} onRemoveDoc={removeDoc} />
            <ModalDocField fileKey="taxClearanceDoc" label="Tax Clearance Certificate" required hint="Required for all contractors" docFiles={docFiles} onDocChange={handleDocChange} onRemoveDoc={removeDoc} />
            <ModalDocField fileKey="tradeLicenseDoc" label="Valid Trade License" required={contractorType === 'business'} hint={contractorType === 'business' ? 'Required: Valid trade license' : 'Optional for individuals'} docFiles={docFiles} onDocChange={handleDocChange} onRemoveDoc={removeDoc} />
            <ModalDocField fileKey="otherDocs" label="Other Supporting Documents" required={false} hint="Optional — multiple files allowed" multiple docFiles={docFiles} onDocChange={handleDocChange} onRemoveDoc={removeDoc} />
          </div>
        </div>

        {/* Compliance Declarations */}
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-800">Compliance Declarations</h4>
          </div>
          <div className="grid gap-3">
            {([
              { key: "compliance1", text: "I certify that the information provided is true and accurate to the best of my knowledge." },
              { key: "compliance2", text: "I acknowledge and accept the IFMIS Contractor Code of Conduct." },
              { key: "compliance3", text: "I declare that I am not in the Sanctions/Debarment List of any government or international body." },
              ...(contractorType === "business" ? [{ key: "compliance4", text: "I authorize IFMIS to verify all documents and information with relevant agencies (IBLS, RAMIS, CBS, etc.)." }] : []),
            ]).map(decl => (
              <label key={decl.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer transition hover:bg-slate-50 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={!!complianceChecks[decl.key]}
                  onChange={e => setComplianceChecks(cur => ({ ...cur, [decl.key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 accent-indigo-600"
                />
                <span className="text-sm text-slate-700 leading-relaxed">{decl.text}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ── Step: Review & Submit ── */
  const renderReview = () => {
    const changes = trackChanges(initialSnapshot, form);
    return (
      <div>
        <SectionHeader
          icon={currentStep.icon}
          title="Review & Submit"
          description={`Review all changes before ${mode === 'amendment' ? 'submitting the amendment' : 'saving edits'}.`}
        />

        {/* Change summary */}
        {changes.length > 0 ? (
          <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Change Log — {changes.length} Field{changes.length > 1 ? 's' : ''} Modified</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field</th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previous Value</th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((ch, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-2 px-3 font-medium text-slate-800">{ch.field}</td>
                      <td className="py-2 px-3"><span className="bg-red-50 text-red-600 rounded-lg px-2 py-0.5 text-xs font-mono line-through">{ch.oldValue || '(empty)'}</span></td>
                      <td className="py-2 px-3"><span className="bg-emerald-50 text-emerald-700 rounded-lg px-2 py-0.5 text-xs font-mono font-bold">{ch.newValue || '(empty)'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 sm:mt-6 rounded-xl border-2 border-dashed border-slate-200 p-6 sm:p-8 text-center">
            <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-medium text-slate-500">No changes detected yet</p>
            <p className="text-xs text-slate-400 mt-1">Go back to previous steps and modify fields</p>
          </div>
        )}

        {/* Remarks */}
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{mode === 'amendment' ? 'Amendment Reason' : 'Edit Remarks'}</h4>
          <textarea
            className={`${inputClass} min-h-24 resize-none`}
            value={form.remarks}
            onChange={(e) => updateField('remarks', e.target.value)}
            placeholder={mode === 'amendment' ? 'Provide justification for this amendment...' : 'Optional remarks for this edit...'}
          />
        </div>

        {/* Summary */}
        <div className={`${sectionCardClass} mt-4 sm:mt-6`}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Profile Summary</h4>
          <div className="grid gap-3">
            {[
              ['Full Name', form.displayName || 'Not entered'],
              ['Registration ID', form.registrationNumber || 'Not entered'],
              ['Taxpayer Number', form.taxNumber || 'Not entered'],
              ['Email', form.email || 'Not entered'],
              ['Phone', form.phone || 'Not entered'],
              ['Address', form.address || 'Not entered'],
              ['Bank Account', `${form.bankName || 'Not entered'} - ${form.bankAccountNumber || 'Not entered'}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-3 border-b border-gray-200 last:border-0">
                <span className="text-gray-600 text-sm">{label}</span>
                <span className="font-semibold text-gray-900 text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ── Step dispatcher ── */
  const renderStepContent = () => {
    const key = currentStep.key;
    if (key === 'personal' || key === 'business-profile') return renderPersonalInfo();
    if (key === 'identity' || key === 'business-registration') return renderIdentity();
    if (key === 'address') return renderAddress();
    if (key === 'bank') return renderBank();
    if (key === 'contact') return renderContact();
    if (key === 'documents') return renderDocuments();
    if (key === 'review') return renderReview();
    return null;
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  /* ── Progress percentage ── */
  const progressPct = ((activeStep + 1) / steps.length) * 100;

  return (
    /* ── Full-screen modal overlay — NO scrolling on the overlay itself ── */
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-300 ease-out ${mounted ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-0'}`}
    >
      {/* Backdrop click to cancel */}
      <div className="absolute inset-0" onClick={onCancel} />

      {/* Modal shell — fills viewport height minus outer padding, flex column layout */}
      <div className={`relative mx-auto w-full max-w-[1180px] max-h-full rounded-2xl sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.97]'}`}>

      {/* ═══ FIXED TOP ZONE (header + steps + badges) ═══ */}
      <div className="shrink-0">

        {/* ── Progress bar (top edge) ── */}
        <div className="h-1 overflow-hidden bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* ── Header ── */}
        <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-5 py-4 sm:px-7 sm:py-5 md:px-10 md:py-6">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] ${isPublicActor ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {isPublicActor ? 'Contractor Portal' : 'Admin'} {mode === 'edit' ? 'Edit' : 'Amendment'} Mode
              </p>
              <h2 className="mt-1 sm:mt-1.5 text-lg sm:text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-900 truncate">
                {contractorName}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">ID: {contractorId}</p>
            </div>
            <button
              onClick={onCancel}
              aria-label="Close modal"
              className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-500 hover:rotate-90 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ── Step navigator ── */}
        <div className="bg-white/95 px-3 py-2.5 sm:px-5 sm:py-3 md:px-8 md:py-4 border-b border-slate-200">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 sm:hidden text-center">
            Step {activeStep + 1} of {steps.length}
          </p>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto rounded-2xl sm:rounded-[24px] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-1.5 sm:p-2.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {steps.map((step, idx) => {
              const isActive = idx === activeStep;
              const isCompleted = idx < activeStep;
              return (
                <button
                  key={step.key}
                  onClick={() => setActiveStep(idx)}
                  className={`group relative flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 ${
                    isActive ? 'bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.06)] ring-1 ring-slate-200' :
                    isCompleted ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100' :
                    'text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm'
                  }`}
                >
                  <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-all duration-200 ${
                    isActive ? 'bg-slate-900 text-white shadow-sm' :
                    isCompleted ? 'bg-emerald-500 text-white' :
                    'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : idx + 1}
                  </span>
                  <span className="hidden xs:inline sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Badges ── */}
        <div className="border-b border-slate-100 bg-white px-5 py-2.5 sm:px-7 sm:py-3 md:px-10">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap overflow-x-auto sm:flex-wrap">
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-[0.22em] whitespace-nowrap shrink-0">{mode === 'edit' ? 'Edit' : 'Amendment'} Snapshot</span>
            <span className="rounded-full bg-slate-900 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-white ring-1 ring-slate-900 shrink-0">{isIndividual ? 'Individual' : 'Business'}</span>
            {form.nationality && <span className={`rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold ring-1 shrink-0 ${isBhutanese ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-sky-100 text-sky-700 ring-sky-200'}`}>{isBhutanese ? 'Bhutanese' : `${form.nationality}`}</span>}
            <span className={`rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold ring-1 shrink-0 ${mode === 'edit' ? 'bg-indigo-100 text-indigo-700 ring-indigo-200' : 'bg-orange-100 text-orange-700 ring-orange-200'}`}>{mode === 'edit' ? 'Edit' : 'Amendment'}</span>
          </div>
        </div>

      </div>{/* end FIXED TOP ZONE */}

      {/* ═══ SCROLLABLE CONTENT ZONE — only this area scrolls ═══ */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50 via-white to-slate-50/70 p-4 sm:p-7 md:p-10" key={activeStep}>
        {/* Amendment mode: external-system field lock banner */}
        {mode === 'amendment' && activeStep === 0 && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <div>
              <p className="text-xs font-semibold text-amber-800">External System Fields — Read Only</p>
              <p className="text-[11px] text-amber-700 mt-0.5">CID/BRN, TPN, License Number, and GST Number are sourced from external systems (IBLS, RAMIS, CBS) and cannot be edited in amendments. These fields can only be verified.</p>
            </div>
          </div>
        )}
        <div className="animate-[fadeIn_0.2s_ease-out]">
          {renderStepContent()}
        </div>
      </div>

      {/* ═══ FIXED BOTTOM ZONE (footer) ═══ */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 sm:px-7 sm:py-4 md:px-10">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5 sm:gap-3">
          {/* Left group: Previous + Next */}
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              disabled={activeStep === 0}
              className="flex-1 sm:flex-none rounded-xl border border-slate-300 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-300"
              onClick={() => setActiveStep((c) => Math.max(c - 1, 0))}
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Previous
              </span>
            </button>

            {activeStep < steps.length - 1 && (
              <button
                type="button"
                className="flex-1 sm:flex-none rounded-xl bg-indigo-600 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 active:scale-[0.98]"
                onClick={() => setActiveStep((c) => Math.min(c + 1, steps.length - 1))}
              >
                <span className="flex items-center justify-center gap-1.5">
                  Next Step
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </span>
              </button>
            )}
          </div>

          {/* Right group: Cancel + Save/Submit */}
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              className="flex-1 sm:flex-none rounded-xl border border-slate-300 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              onClick={onCancel}
            >
              Cancel
            </button>

            {activeStep === steps.length - 1 && (
              <button
                type="button"
                className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 active:scale-[0.98]"
                onClick={handleSave}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {isPublicActor ? 'Submit for Approval' : 'Submit and Approve'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      </div>{/* end modal shell */}

      {/* ── Inline keyframe animation & scrollbar styling ── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-thin::-webkit-scrollbar { height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
