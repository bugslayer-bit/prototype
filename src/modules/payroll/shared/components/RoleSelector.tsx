import React from "react";
import { EmployeeCategory, PayrollRole } from "../types";

export interface RoleSelectorProps {
  selectedRole: PayrollRole | null;
  onSelectRole: (role: PayrollRole) => void;
  selectedCategory: EmployeeCategory;
}

export function RoleSelector({
  selectedRole,
  onSelectRole,
  selectedCategory,
}: RoleSelectorProps) {
  const tone =
    selectedCategory === "civil-servant"
      ? {
          shell:
            "border-blue-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.92),rgba(255,255,255,0.98))]",
          badge: "bg-blue-100 text-blue-700",
          active:
            "border-blue-500 bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] text-white shadow-[0_18px_35px_rgba(37,99,235,0.18)]",
          inactive:
            "border-white/70 bg-white/90 text-slate-700 hover:border-blue-200 hover:bg-blue-50/60",
          icon: "bg-blue-50 text-blue-700",
        }
      : {
          shell:
            "border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.94),rgba(255,255,255,0.98))]",
          badge: "bg-amber-100 text-amber-700",
          active:
            "border-amber-500 bg-[linear-gradient(135deg,#b45309,#d97706)] text-white shadow-[0_18px_35px_rgba(217,119,6,0.18)]",
          inactive:
            "border-white/70 bg-white/90 text-slate-700 hover:border-amber-200 hover:bg-amber-50/60",
          icon: "bg-amber-50 text-amber-700",
        };
  const roles: PayrollRole[] = [
    "system-administrator",
    "hr-officer",
    "finance-officer",
    "head-of-agency",
    "agency-staff",
    "auditor",
  ];

  const roleLabels: Record<PayrollRole, string> = {
    "system-administrator": "System Administrator",
    "hr-officer": "HR Officer",
    "finance-officer": "Finance Officer",
    "head-of-agency": "Head of Agency",
    "agency-staff": "Agency Staff",
    auditor: "Auditor",
  };

  const roleNotes: Record<PayrollRole, string> = {
    "system-administrator": "Full configuration, processing, review, and approval access",
    "hr-officer": "Manages payroll preparation, employee actions, and submission",
    "finance-officer": "Validates pay computations, deductions, and fiscal readiness",
    "head-of-agency": "Approves final payroll packages and downstream posting",
    "agency-staff": "Monitors payroll information and personal records in view mode",
    auditor: "Reviews payroll history, controls, and compliance evidence",
  };

  const roleIcons: Record<PayrollRole, string> = {
    "system-administrator": "⚙️",
    "hr-officer": "👥",
    "finance-officer": "💼",
    "head-of-agency": "🏛️",
    "agency-staff": "🧾",
    auditor: "🔎",
  };

  return (
    <div className={`mb-6 rounded-[28px] border p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] ${tone.shell}`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${tone.badge}`}>
            Access Context
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">Choose your working role</h3>
          <p className="mt-2 text-sm text-slate-600">
            Same roles, redesigned as action cards so the page feels like a workflow dashboard.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => onSelectRole(role)}
            className={`rounded-[24px] border p-4 text-left transition ${
              selectedRole === role
                ? tone.active
                : tone.inactive
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg shadow-sm ${
                  selectedRole === role ? "bg-white/15 text-white" : tone.icon
                }`}
              >
                {roleIcons[role]}
              </span>
              <div className="min-w-0">
                <div className="text-base font-black leading-tight">{roleLabels[role]}</div>
                <div
                  className={`mt-2 text-xs leading-5 ${
                    selectedRole === role ? "text-white/85" : "text-slate-500"
                  }`}
                >
                  {roleNotes[role]}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
