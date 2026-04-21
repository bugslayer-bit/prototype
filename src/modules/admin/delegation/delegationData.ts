/* ═══════════════════════════════════════════════════════════════════════════
   Delegation of Authority — Data Model & Seed
   ─────────────────────────────────────────────
   When an officer is absent (leave, travel, etc.) they can delegate specific
   tasks/modules OR their full role to another officer within the SAME agency.
   Delegations are time-bound and auditable.

   Key rules (Bhutan Civil Service):
     • Delegator and delegatee MUST be in the same agency
     • Only active employees can delegate / receive delegation
     • A delegatee inherits the delegated permissions on top of their own
     • Multiple concurrent delegations are allowed (different scopes)
     • Delegation does NOT transfer — delegatee cannot re-delegate
     • All delegation activity is logged for audit trail
   ═══════════════════════════════════════════════════════════════════════════ */

export type DelegationScope = "full-role" | "specific-modules";
export type DelegationStatus = "active" | "pending" | "expired" | "revoked";

export interface Delegation {
  id: string;
  /** Who is delegating (the absentee) */
  delegatorId: string;
  delegatorName: string;
  delegatorRole: string;
  delegatorRoleId: string;
  delegatorDepartment: string;
  /** Who receives the delegation */
  delegateeId: string;
  delegateeName: string;
  delegateeRole: string;
  delegateeRoleId: string;
  delegateeDepartment: string;
  /** Common agency — enforced to be same for both */
  agencyCode: string;
  agencyName: string;
  /** What is being delegated */
  scope: DelegationScope;
  /** If scope = "specific-modules", which modules are delegated */
  delegatedModules: string[];
  /** Reason for delegation */
  reason: string;
  /** Validity period */
  startDate: string;
  endDate: string;
  /** Current status */
  status: DelegationStatus;
  /** Audit */
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
  revokedBy?: string;
  /** Optional notes */
  notes?: string;
}

/* ── Delegatable modules (matching RBAC module catalogue) ──────────────── */
export const DELEGATABLE_MODULES = [
  { id: "payroll", label: "Payroll Processing", icon: "💰" },
  { id: "payroll_approval", label: "Payroll Approval", icon: "✅" },
  { id: "employee_registry", label: "Employee Registry", icon: "👥" },
  { id: "leave_management", label: "Leave Management", icon: "📅" },
  { id: "contract_creation", label: "Contract Creation", icon: "📝" },
  { id: "contract_approval", label: "Contract Approval", icon: "📋" },
  { id: "invoice_bill", label: "Invoice & Bill Processing", icon: "🧾" },
  { id: "payment_order", label: "Payment Order", icon: "💳" },
  { id: "budget_management", label: "Budget Management", icon: "📊" },
  { id: "procurement", label: "Procurement", icon: "🛒" },
  { id: "advances", label: "Advances & Imprest", icon: "💵" },
  { id: "vendor_management", label: "Vendor Management", icon: "🏪" },
];

/* ── Delegation reasons (common in Bhutan civil service) ───────────────── */
export const DELEGATION_REASONS = [
  "Annual leave",
  "Medical leave",
  "Official travel / deputation",
  "Training / workshop",
  "Maternity / paternity leave",
  "Emergency leave",
  "Temporary vacancy",
  "Workload redistribution",
  "Other",
];

/* ── Storage ───────────────────────────────────────────────────────────── */
const STORAGE_KEY = "ifmis_delegations";
const SEED_VERSION_KEY = "ifmis_delegation_seed_version";
const SEED_VERSION = "2026-04-13-v1";

function computeStatus(d: Pick<Delegation, "startDate" | "endDate" | "status">): DelegationStatus {
  if (d.status === "revoked") return "revoked";
  const now = new Date();
  const start = new Date(d.startDate);
  const end = new Date(d.endDate);
  if (now < start) return "pending";
  if (now > end) return "expired";
  return "active";
}

/* ── Seed delegations — demo data ──────────────────────────────────────── */
const seedDelegations: Delegation[] = [
  {
    id: "DEL-001",
    delegatorId: "gt70-hr-01",
    delegatorName: "Namgay Wangmo",
    delegatorRole: "HR Officer",
    delegatorRoleId: "role-hr-officer",
    delegatorDepartment: "Dept of Digital Transformation",
    delegateeId: "gt70-fin-01",
    delegateeName: "Ugyen Pema",
    delegateeRole: "Finance Officer",
    delegateeRoleId: "role-finance-officer",
    delegateeDepartment: "Dept of Digital Infrastructure",
    agencyCode: "70",
    agencyName: "Government Technology Agency",
    scope: "specific-modules",
    delegatedModules: ["payroll", "employee_registry"],
    reason: "Annual leave",
    startDate: "2026-04-10",
    endDate: "2026-04-25",
    status: "active",
    createdAt: "2026-04-08T10:00:00Z",
    createdBy: "gt70-hr-01",
    notes: "Covering HR duties during annual leave — payroll and employee registry only",
  },
  {
    id: "DEL-002",
    delegatorId: "mof-hr-01",
    delegatorName: "Pema Yangzom",
    delegatorRole: "HR Officer",
    delegatorRoleId: "role-hr-officer",
    delegatorDepartment: "Human Resource Division",
    delegateeId: "mof-fin-01",
    delegateeName: "Tshering Dorji",
    delegateeRole: "Finance Officer",
    delegateeRoleId: "role-finance-officer",
    delegateeDepartment: "Dept of Treasury & Accounts",
    agencyCode: "16",
    agencyName: "Ministry of Finance",
    scope: "full-role",
    delegatedModules: [],
    reason: "Official travel / deputation",
    startDate: "2026-04-15",
    endDate: "2026-04-20",
    status: "pending",
    createdAt: "2026-04-12T14:30:00Z",
    createdBy: "mof-hr-01",
    notes: "Full HR delegation during official travel to Bangkok",
  },
  {
    id: "DEL-003",
    delegatorId: "mof-fin-01",
    delegatorName: "Tshering Dorji",
    delegatorRole: "Finance Officer",
    delegatorRoleId: "role-finance-officer",
    delegatorDepartment: "Dept of Treasury & Accounts",
    delegateeId: "mof-staff-01",
    delegateeName: "Sangay Zam",
    delegateeRole: "Agency Staff",
    delegateeRoleId: "role-agency-staff",
    delegateeDepartment: "Dept of Macro-Fiscal & Development Finance",
    agencyCode: "16",
    agencyName: "Ministry of Finance",
    scope: "specific-modules",
    delegatedModules: ["invoice_bill", "payment_order"],
    reason: "Training / workshop",
    startDate: "2026-03-01",
    endDate: "2026-03-15",
    status: "expired",
    createdAt: "2026-02-27T09:00:00Z",
    createdBy: "mof-fin-01",
  },
];

/* ── CRUD helpers ──────────────────────────────────────────────────────── */

export function getStoredDelegations(): Delegation[] {
  const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
  if (storedVersion !== SEED_VERSION) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDelegations));
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    return seedDelegations.map((d) => ({ ...d, status: computeStatus(d) }));
  }
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Delegation[];
    return data.map((d) => ({ ...d, status: computeStatus(d) }));
  } catch {
    return [];
  }
}

export function saveDelegations(delegations: Delegation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(delegations));
}

export function addDelegation(d: Omit<Delegation, "id" | "createdAt" | "status">): Delegation {
  const all = getStoredDelegations();
  const newDel: Delegation = {
    ...d,
    id: `DEL-${String(all.length + 1).padStart(3, "0")}`,
    status: computeStatus(d as Delegation),
    createdAt: new Date().toISOString(),
  };
  all.push(newDel);
  saveDelegations(all);
  return newDel;
}

export function revokeDelegation(id: string, revokedBy: string): Delegation | null {
  const all = getStoredDelegations();
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx],
    status: "revoked",
    revokedAt: new Date().toISOString(),
    revokedBy,
  };
  saveDelegations(all);
  return all[idx];
}

/** Get all active delegations where this user is the delegatee (receiving delegation). */
export function getActiveDelegationsForUser(userId: string): Delegation[] {
  return getStoredDelegations().filter(
    (d) => d.delegateeId === userId && d.status === "active"
  );
}

/** Get all delegations created by this user (as delegator). */
export function getDelegationsByDelegator(userId: string): Delegation[] {
  return getStoredDelegations().filter((d) => d.delegatorId === userId);
}

/** Get all delegations for a specific agency. */
export function getDelegationsByAgency(agencyCode: string): Delegation[] {
  return getStoredDelegations().filter((d) => d.agencyCode === agencyCode);
}
