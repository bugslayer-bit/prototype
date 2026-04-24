/* ═══════════════════════════════════════════════════════════════════════════
   e-DATS Approved Travel Advance Requests — mock pool
   ───────────────────────────────────────────────────────────────────
   Models the payload IFMIS would receive from an e-DATS "approved travel
   request" fetch (SRS §1). Deterministic — derived from OPS_EMPLOYEES so
   employee IDs / CIDs / agency codes are always real. Alternates between
   domestic and foreign destinations and cycles through realistic travel
   purposes, budget codes and approved amounts.

   Usage: the OpsTravelClaimPage fetch-and-populate dropdown filters this
   pool against already-recorded claims so a TA ref is only offered once.
   ═══════════════════════════════════════════════════════════════════════════ */

import { OPS_EMPLOYEES } from "./opsEmployeeSeed";

export type EdatsTravelType = "domestic" | "foreign";
export type EdatsCurrency = "BTN" | "USD" | "EUR" | "INR" | "GBP";

export interface EdatsApprovedRequest {
  /** Approved Travel Allowance Reference Number (e-DATS-generated). */
  refNo: string;
  /** Date the request was approved in e-DATS. */
  dateOfApproval: string;
  /** Employee master record id — maps 1:1 to OpsEmployeeFull.masterEmpId. */
  employeeId: string;
  employeeName: string;
  positionTitle: string;
  cid: string;
  /** Agency code in the IFMIS org segment (== employee.workingAgency). */
  agencyCode: string;
  budgetCode: string;
  travelType: EdatsTravelType;
  destination: string;
  /** Only populated when travelType === "foreign". */
  countryOfTravel?: string;
  purpose: string;
  startDate: string;
  endDate: string;
  approvedAmount: number;
  currency: EdatsCurrency;
  exchangeRate?: number;
}

const LOCAL_DESTINATIONS = ["Paro", "Bumthang", "Trongsa", "Phuentsholing", "Mongar", "Trashigang", "Gelephu", "Samdrup Jongkhar"];
const FOREIGN_DESTS: Array<{ city: string; country: string; currency: EdatsCurrency; rate: number }> = [
  { city: "New Delhi", country: "India", currency: "INR", rate: 1.06 },
  { city: "Bangkok", country: "Thailand", currency: "USD", rate: 88.5 },
  { city: "Tokyo", country: "Japan", currency: "USD", rate: 88.5 },
  { city: "Geneva", country: "Switzerland", currency: "EUR", rate: 96.2 },
  { city: "Singapore", country: "Singapore", currency: "USD", rate: 88.5 },
  { city: "London", country: "United Kingdom", currency: "GBP", rate: 111.3 },
];
const PURPOSES_LOCAL = [
  "Field monitoring & inspection",
  "Programme implementation visit",
  "Training delivery",
  "District consultation",
  "Project site review",
];
const PURPOSES_FOREIGN = [
  "Official meeting / conference",
  "International training programme",
  "Capacity building workshop",
  "Bilateral consultation",
  "Technical conference",
];
const BUDGET_CODES_DOMESTIC = ["HE-01-001", "HE-02-001", "HE-03-001", "HE-04-001"];
const BUDGET_CODES_FOREIGN  = ["HE-FT-001", "HE-FT-002", "HE-FT-003", "HE-FT-004"];

function iso(offsetDaysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDaysFromToday);
  return d.toISOString().slice(0, 10);
}

/** Deterministic pool — every OPS employee in the first 12 records produces
 *  one approved request, alternating between domestic and foreign. */
export const EDATS_APPROVED_REQUESTS: EdatsApprovedRequest[] = OPS_EMPLOYEES
  .filter((e) => !e.status || e.status === "active")
  .slice(0, 12)
  .map((e, i) => {
    const year = new Date().getFullYear();
    const refNo = `TA-${year}-${String(i + 10001).padStart(5, "0")}`;
    const isForeign = i % 2 === 1;
    const startOffset = -14 - (i * 2);
    const days = 3 + (i % 5);
    const basic = e.monthlyBasicPay || 30000;

    if (isForeign) {
      const dest = FOREIGN_DESTS[i % FOREIGN_DESTS.length];
      /* Foreign amounts are expressed in the destination currency. */
      const approvedAmount = Math.round(basic / 10) * 10; // round to nearest 10
      return {
        refNo,
        dateOfApproval: iso(startOffset - 14),
        employeeId: e.masterEmpId,
        employeeName: `${e.firstName} ${e.lastName}`,
        positionTitle: e.positionTitle,
        cid: e.cid,
        agencyCode: e.workingAgency,
        budgetCode: BUDGET_CODES_FOREIGN[i % BUDGET_CODES_FOREIGN.length],
        travelType: "foreign" as const,
        destination: `${dest.city}, ${dest.country}`,
        countryOfTravel: dest.country,
        purpose: PURPOSES_FOREIGN[i % PURPOSES_FOREIGN.length],
        startDate: iso(startOffset),
        endDate: iso(startOffset + days),
        approvedAmount,
        currency: dest.currency,
        exchangeRate: dest.rate,
      };
    }

    return {
      refNo,
      dateOfApproval: iso(startOffset - 10),
      employeeId: e.masterEmpId,
      employeeName: `${e.firstName} ${e.lastName}`,
      positionTitle: e.positionTitle,
      cid: e.cid,
      agencyCode: e.workingAgency,
      budgetCode: BUDGET_CODES_DOMESTIC[i % BUDGET_CODES_DOMESTIC.length],
      travelType: "domestic" as const,
      destination: LOCAL_DESTINATIONS[i % LOCAL_DESTINATIONS.length],
      purpose: PURPOSES_LOCAL[i % PURPOSES_LOCAL.length],
      startDate: iso(startOffset),
      endDate: iso(startOffset + days),
      approvedAmount: (1800 + (i % 3) * 200) * days,
      currency: "BTN" as const,
    };
  });

export function findEdatsRequestByRef(refNo: string): EdatsApprovedRequest | undefined {
  return EDATS_APPROVED_REQUESTS.find((r) => r.refNo === refNo);
}
