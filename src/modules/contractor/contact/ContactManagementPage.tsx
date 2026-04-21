import { useState, useMemo, useCallback } from "react";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import type { ContractorRecord } from "../../../shared/types";
import { generateContactId } from "../registration/stages/sharedTypes";
import type { ContactRow } from "../registration/stages/sharedTypes";

/* ── Types & helpers ── */

interface FlatContact extends ContactRow {
  contractorId: string;
  contractorName: string;
  contractorKind: "individual" | "business";
  contractorVerification: string;
}

function parseContacts(rec: ContractorRecord): ContactRow[] {
  try {
    const raw = (rec.profile as Record<string, unknown>).contacts;
    if (Array.isArray(raw)) return raw as ContactRow[];
    if (typeof raw === "string") return JSON.parse(raw) as ContactRow[];
  } catch { /* ignore */ }
  return [];
}

function flattenAllContacts(contractors: ContractorRecord[]): FlatContact[] {
  const all: FlatContact[] = [];
  for (const c of contractors) {
    for (const contact of parseContacts(c)) {
      all.push({
        ...contact,
        contractorId: c.id,
        contractorName: c.displayName,
        contractorKind: c.kind,
        contractorVerification: c.verification,
      });
    }
  }
  return all;
}

function createEmptyContact(kind: "individual" | "business", index: number, contractorId?: string): ContactRow {
  return {
    id: `contact-new-${Date.now()}-${index}`,
    contactId: generateContactId(kind, contractorId),
    salutation: "", firstName: "", middleName: "", lastName: "",
    nationalId: "", gender: "", email: "", mobileNumber: "",
    landlineNumber: "", jobTitle: "",
    isPrimaryContact: "No", isIfmisDesignated: "No", isActive: "Yes",
  };
}

/* ── Style tokens ── */
const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-50";
const sel = inp;
const lbl = "mb-1 block text-[11px] font-semibold text-slate-500";

/* ── Badges ── */
const YesBadge = ({ text, color }: { text: string; color: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>{text}</span>
);
const Dash = () => <span className="text-slate-300">—</span>;

/* ════════════════════════════════════════════════════════════════════════ */

export function ContactManagementPage() {
  const { contractors, updateContractor } = useContractorData();
  /* All dropdown LoVs pulled from MasterDataContext at runtime so admins can
     manage them centrally in /master-data — no hardcoded values. */
  const { masterDataMap } = useMasterData();
  const getMasterOptions = (id: string): string[] => masterDataMap.get(id) ?? [];
  const booleanChoices = getMasterOptions("boolean-choice");
  const yesValue = booleanChoices[0] ?? "Yes";
  const noValue = booleanChoices[1] ?? "No";

  /* state */
  const [search, setSearch] = useState("");
  const [filterContractor, setFilterContractor] = useState("");
  const [filterPrimary, setFilterPrimary] = useState<"" | "Yes" | "No">("");
  const [filterActive, setFilterActive] = useState<"" | "Yes" | "No">("");

  const [editModal, setEditModal] = useState<{ contact: ContactRow; contractorId: string } | null>(null);
  const [addModal, setAddModal] = useState<{ contractorId: string } | null>(null);
  const [editForm, setEditForm] = useState<ContactRow>(createEmptyContact("individual", 0));
  const [deleteConfirm, setDeleteConfirm] = useState<{ contact: FlatContact } | null>(null);

  /* derived */
  const allContacts = useMemo(() => flattenAllContacts(contractors), [contractors]);

  const filtered = useMemo(() => {
    let list = allContacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) || c.nationalId.toLowerCase().includes(q) ||
        c.mobileNumber.includes(q) || (c.contactId || "").toLowerCase().includes(q) ||
        c.contractorName.toLowerCase().includes(q) || c.contractorId.toLowerCase().includes(q)
      );
    }
    if (filterContractor) list = list.filter(c => c.contractorId === filterContractor);
    if (filterPrimary) list = list.filter(c => c.isPrimaryContact === filterPrimary);
    if (filterActive) list = list.filter(c => c.isActive === filterActive);
    return list;
  }, [allContacts, search, filterContractor, filterPrimary, filterActive]);

  const stats = useMemo(() => ({
    total: allContacts.length,
    primary: allContacts.filter(c => c.isPrimaryContact === "Yes").length,
    active: allContacts.filter(c => c.isActive === "Yes").length,
    contractors: new Set(allContacts.map(c => c.contractorId)).size,
  }), [allContacts]);

  const contractorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allContacts) map.set(c.contractorId, c.contractorName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allContacts]);

  /* ── CRUD ── */

  const openEdit = useCallback((fc: FlatContact) => {
    const contact: ContactRow = {
      id: fc.id, contactId: fc.contactId || "", salutation: fc.salutation,
      firstName: fc.firstName, middleName: fc.middleName, lastName: fc.lastName,
      nationalId: fc.nationalId, gender: fc.gender, email: fc.email,
      mobileNumber: fc.mobileNumber, landlineNumber: fc.landlineNumber, jobTitle: fc.jobTitle,
      isPrimaryContact: fc.isPrimaryContact, isIfmisDesignated: fc.isIfmisDesignated, isActive: fc.isActive,
    };
    setEditForm({ ...contact });
    setEditModal({ contact, contractorId: fc.contractorId });
  }, []);

  const openAdd = useCallback((contractorId: string) => {
    const rec = contractors.find(c => c.id === contractorId);
    const kind = rec?.kind || "individual";
    setEditForm(createEmptyContact(kind, Date.now(), contractorId));
    setAddModal({ contractorId });
  }, [contractors]);

  const saveContact = useCallback((contractorId: string, updatedContact: ContactRow, isNew: boolean) => {
    const rec = contractors.find(c => c.id === contractorId);
    if (!rec) return;
    const existing = parseContacts(rec);
    let updated: ContactRow[];
    if (isNew) {
      updated = [...existing, updatedContact];
    } else {
      updated = existing.map(c => c.id === updatedContact.id ? updatedContact : c);
    }
    if (updatedContact.isPrimaryContact === "Yes") {
      updated = updated.map(c => c.id === updatedContact.id ? c : { ...c, isPrimaryContact: "No" });
    }
    const primary = updated.find(c => c.isPrimaryContact === "Yes") || updated[0];
    updateContractor(rec.id, {
      email: primary?.email || rec.email,
      phone: primary?.mobileNumber || rec.phone,
      profile: { ...rec.profile, contacts: updated as unknown as string },
    });
    setEditModal(null);
    setAddModal(null);
  }, [contractors, updateContractor]);

  const deleteContact = useCallback((fc: FlatContact) => {
    const rec = contractors.find(c => c.id === fc.contractorId);
    if (!rec) return;
    const existing = parseContacts(rec);
    if (existing.length <= 1) return;
    const updated = existing.filter(c => c.id !== fc.id);
    if (fc.isPrimaryContact === "Yes" && updated.length > 0) {
      updated[0] = { ...updated[0], isPrimaryContact: "Yes" };
    }
    const primary = updated.find(c => c.isPrimaryContact === "Yes") || updated[0];
    updateContractor(rec.id, {
      email: primary?.email || rec.email,
      phone: primary?.mobileNumber || rec.phone,
      profile: { ...rec.profile, contacts: updated as unknown as string },
    });
    setDeleteConfirm(null);
  }, [contractors, updateContractor]);

  const closeModals = () => { setEditModal(null); setAddModal(null); };
  const ef = (fn: (v: string) => Partial<ContactRow>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setEditForm(f => ({ ...f, ...fn(e.target.value) }));

  /* ── Contact Form Modal ── */
  const ContactFormModal = ({ contractorId, isNew }: { contractorId: string; isNew: boolean }) => {
    const contractor = contractors.find(c => c.id === contractorId);
    const valid = !!editForm.firstName && !!editForm.email && !!editForm.mobileNumber;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={closeModals}>
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
          {/* header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">{isNew ? "Add Contact" : "Edit Contact"}</h3>
              {contractor && <p className="text-xs text-slate-500">{contractor.displayName} <span className="font-mono text-slate-400">({contractorId})</span></p>}
            </div>
            <button onClick={closeModals} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* contact id */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className="text-[11px] font-semibold text-slate-500">Contact ID</span>
            <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${editForm.contactId?.startsWith("CI") ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
              {editForm.contactId || "—"}
            </span>
            <span className="ml-auto text-[10px] text-slate-400 italic">System-generated</span>
          </div>

          {/* form */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>Salutation</label>
              <select className={sel} value={editForm.salutation} onChange={ef(v => ({ salutation: v }))}>
                <option value="">Select</option>
                {getMasterOptions("salutation").map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-rose-500">*</span></label>
              <input className={inp} value={editForm.firstName} placeholder="First name" onChange={ef(v => ({ firstName: v }))} />
            </div>
            <div>
              <label className={lbl}>Middle Name</label>
              <input className={inp} value={editForm.middleName} placeholder="Middle name" onChange={ef(v => ({ middleName: v }))} />
            </div>
            <div>
              <label className={lbl}>Last Name</label>
              <input className={inp} value={editForm.lastName} placeholder="Last name" onChange={ef(v => ({ lastName: v }))} />
            </div>
            <div>
              <label className={lbl}>National ID / CID</label>
              <input className={inp} value={editForm.nationalId} placeholder="CID or Passport" onChange={ef(v => ({ nationalId: v }))} />
            </div>
            <div>
              <label className={lbl}>Gender</label>
              <select className={sel} value={editForm.gender} onChange={ef(v => ({ gender: v }))}>
                <option value="">Select</option>
                {getMasterOptions("gender").map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Email <span className="text-rose-500">*</span></label>
              <input className={inp} type="email" value={editForm.email} placeholder="Email" onChange={ef(v => ({ email: v }))} />
            </div>
            <div>
              <label className={lbl}>Mobile <span className="text-rose-500">*</span></label>
              <input className={inp} value={editForm.mobileNumber} placeholder="+975..." onChange={ef(v => ({ mobileNumber: v }))} />
            </div>
            <div>
              <label className={lbl}>Landline</label>
              <input className={inp} value={editForm.landlineNumber} placeholder="Landline" onChange={ef(v => ({ landlineNumber: v }))} />
            </div>
            <div>
              <label className={lbl}>Job Title</label>
              <input className={inp} value={editForm.jobTitle} placeholder="Job title" onChange={ef(v => ({ jobTitle: v }))} />
            </div>
            <div>
              <label className={lbl}>Primary Contact</label>
              <select className={sel} value={editForm.isPrimaryContact} onChange={ef(v => ({ isPrimaryContact: v }))}>
                {booleanChoices.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>IFMIS Designated</label>
              <select className={sel} value={editForm.isIfmisDesignated} onChange={ef(v => ({ isIfmisDesignated: v }))}>
                {booleanChoices.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Status</label>
              <select className={sel} value={editForm.isActive} onChange={ef(v => ({ isActive: v }))}>
                <option value={yesValue}>Active</option>
                <option value={noValue}>Inactive</option>
              </select>
            </div>
          </div>

          {/* actions */}
          <div className="mt-5 flex items-center justify-between">
            {!valid && <p className="text-xs text-amber-600">First Name, Email and Mobile are required.</p>}
            <div className="ml-auto flex gap-2">
              <button onClick={closeModals} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { if (valid) saveContact(contractorId, editForm, isNew); }} disabled={!valid}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed">
                {isNew ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── Delete Modal ── */
  const DeleteModal = () => {
    if (!deleteConfirm) return null;
    const fc = deleteConfirm.contact;
    const rec = contractors.find(c => c.id === fc.contractorId);
    const count = rec ? parseContacts(rec).length : 0;
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-bold text-slate-900">Remove Contact</h3>
          {count <= 1 ? (
            <p className="mt-3 text-sm text-amber-700">Cannot remove the last contact for this contractor.</p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Remove <strong>{fc.firstName} {fc.lastName}</strong> from <strong>{fc.contractorName}</strong>?
              {fc.isPrimaryContact === "Yes" && <span className="block mt-1 text-xs text-amber-600">Primary status will transfer to the next contact.</span>}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            {count > 1 && (
              <button onClick={() => deleteContact(fc)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Remove</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════════════
     MAIN RENDER
     ════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Contact Management</h1>
        <select
          className="w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none"
          value=""
          onChange={e => { if (e.target.value) openAdd(e.target.value); }}
        >
          <option value="">+ Add Contact</option>
          {contractors.map(c => (
            <option key={c.id} value={c.id}>{c.displayName} ({c.id})</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, cls: "border-slate-200 text-slate-700" },
          { label: "Primary", value: stats.primary, cls: "border-sky-200 text-sky-700" },
          { label: "Active", value: stats.active, cls: "border-emerald-200 text-emerald-700" },
          { label: "Contractors", value: stats.contractors, cls: "border-amber-200 text-amber-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border bg-white p-3 ${s.cls}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Table */}
      <div className={card}>
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-3">
          <div className="min-w-[180px] flex-1">
            <label className={lbl}>Search</label>
            <input className={inp} placeholder="Name, email, CID, contractor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-[180px]">
            <label className={lbl}>Contractor</label>
            <select className={sel} value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
              <option value="">All</option>
              {contractorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div className="w-[120px]">
            <label className={lbl}>Primary</label>
            <select className={sel} value={filterPrimary} onChange={e => setFilterPrimary(e.target.value as "" | "Yes" | "No")}>
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="w-[120px]">
            <label className={lbl}>Status</label>
            <select className={sel} value={filterActive} onChange={e => setFilterActive(e.target.value as "" | "Yes" | "No")}>
              <option value="">All</option>
              <option value="Yes">Active</option>
              <option value="No">Inactive</option>
            </select>
          </div>
          {(search || filterContractor || filterPrimary || filterActive) && (
            <button onClick={() => { setSearch(""); setFilterContractor(""); setFilterPrimary(""); setFilterActive(""); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50">
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        <div className="border-b border-slate-50 bg-slate-50/50 px-5 py-2 text-xs text-slate-500">
          {filtered.length} of {allContacts.length} contacts
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Contact ID</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Mobile</th>
                <th className="px-4 py-2.5">National ID</th>
                <th className="px-4 py-2.5">Contractor</th>
                <th className="px-4 py-2.5 text-center">Primary</th>
                <th className="px-4 py-2.5 text-center">IFMIS</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-10 text-center text-sm text-slate-400">No contacts found.</td></tr>
              ) : filtered.map(fc => (
                <tr key={`${fc.contractorId}-${fc.id}`} className="border-b border-slate-50 transition hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    {fc.contactId ? (
                      <span className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                        fc.contactId.startsWith("CI") ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
                      }`}>{fc.contactId}</span>
                    ) : <span className="text-[10px] text-slate-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-slate-800">{fc.salutation ? `${fc.salutation} ` : ""}{fc.firstName} {fc.lastName}</span>
                    {fc.gender && <span className="ml-1.5 text-[10px] text-slate-400">{fc.gender}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{fc.email}</td>
                  <td className="px-4 py-2.5 text-slate-600">{fc.mobileNumber}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{fc.nationalId || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-slate-700">{fc.contractorName}</span>
                    <span className="ml-1 text-[10px] font-mono text-slate-400">{fc.contractorId}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {fc.isPrimaryContact === "Yes" ? <YesBadge text="Primary" color="bg-sky-100 text-sky-700" /> : <Dash />}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {fc.isIfmisDesignated === "Yes" ? <YesBadge text="IFMIS" color="bg-indigo-100 text-indigo-700" /> : <Dash />}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <YesBadge text={fc.isActive === "Yes" ? "Active" : "Inactive"} color={fc.isActive === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(fc)} className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Edit</button>
                      <button onClick={() => setDeleteConfirm({ contact: fc })} className="rounded border border-red-200 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 p-4 lg:hidden">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No contacts found.</div>
          ) : filtered.map(fc => (
            <div key={`${fc.contractorId}-${fc.id}-m`} className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  {fc.contactId && (
                    <span className={`mb-1 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      fc.contactId.startsWith("CI") ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
                    }`}>{fc.contactId}</span>
                  )}
                  <div className="text-sm font-semibold text-slate-800">{fc.firstName} {fc.lastName}</div>
                  <div className="text-xs text-slate-500">{fc.email}</div>
                </div>
                <div className="flex gap-1">
                  {fc.isPrimaryContact === "Yes" && <YesBadge text="Primary" color="bg-sky-100 text-sky-700" />}
                  <YesBadge text={fc.isActive === "Yes" ? "Active" : "Inactive"} color={fc.isActive === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                <div><span className="font-medium text-slate-500">Mobile:</span> {fc.mobileNumber}</div>
                <div><span className="font-medium text-slate-500">CID:</span> {fc.nationalId || "—"}</div>
                <div className="col-span-2"><span className="font-medium text-slate-500">Contractor:</span> {fc.contractorName} <span className="text-[10px] text-slate-400">({fc.contractorId})</span></div>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => openEdit(fc)} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit</button>
                <button onClick={() => setDeleteConfirm({ contact: fc })} className="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {editModal && <ContactFormModal contractorId={editModal.contractorId} isNew={false} />}
      {addModal && <ContactFormModal contractorId={addModal.contractorId} isNew={true} />}
      <DeleteModal />
    </div>
  );
}
