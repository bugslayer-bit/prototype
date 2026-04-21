/* ═══════════════════════════════════════════════════════════════════════════
   PayrollRoleBoundary
   ───────────────────
   Forces a full unmount + remount of its children whenever the acting
   persona changes (active role id, active agency, or roleSwitchEpoch).

   This guarantees that every payroll page — wizard step, form values,
   selected employee, workflow stage — resets cleanly when the user switches
   roles from the top-bar. Without this boundary React would try to reconcile
   the previous persona's state into the new persona's UI and you'd see
   "defaults coming inside the process" (step 5 stays on step 5, previous
   employee still selected, HR form values leaking into Finance review, etc.).

   Usage — wrap the inner body of every payroll page:

     export function MyPayrollPage() {
       return (
         <PayrollRoleBoundary>
           <MyPayrollPageInner />
         </PayrollRoleBoundary>
       );
     }
   ═══════════════════════════════════════════════════════════════════════════ */
import React from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export interface PayrollRoleBoundaryProps {
  children: React.ReactNode;
  /** Optional extra key fragment if the page needs more segmentation. */
  extraKey?: string;
}

export function PayrollRoleBoundary({ children, extraKey = "" }: PayrollRoleBoundaryProps) {
  const { activeRoleId, activeAgencyCode, roleSwitchEpoch } = useAuth();
  const boundaryKey = `${activeRoleId ?? "anon"}|${activeAgencyCode ?? ""}|${roleSwitchEpoch}|${extraKey}`;
  return <React.Fragment key={boundaryKey}>{children}</React.Fragment>;
}

export default PayrollRoleBoundary;
