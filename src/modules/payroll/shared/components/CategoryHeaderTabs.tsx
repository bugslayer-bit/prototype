import React from "react";
import { EmployeeCategory } from "../types";

export interface CategoryHeaderTabsProps {
  selectedCategory: EmployeeCategory | null;
  onSelectCategory: (category: EmployeeCategory) => void;
  csCount: number;
  opsCount: number;
  /**
   * Categories this persona is scoped to. Tabs outside the allow-list are
   * hidden so e.g. an OPS-only persona never sees the Civil Service tab.
   * Defaults to both when omitted (cross-scope users).
   */
  allowedCategories?: EmployeeCategory[];
}

export function CategoryHeaderTabs({
  selectedCategory,
  onSelectCategory,
  csCount,
  opsCount,
  allowedCategories,
}: CategoryHeaderTabsProps) {
  const tabs: Array<{
    id: EmployeeCategory;
    label: string;
    sub: string;
    icon: string;
    count: number;
    activeCls: string;
    inactiveCls: string;
  }> = [
    {
      id: "civil-servant",
      label: "Civil Service",
      sub: "Source: ZESt (RCSC)",
      icon: "👨‍💼",
      count: csCount,
      activeCls: "bg-[linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)] text-white border-blue-500",
      inactiveCls: "bg-blue-50/80 text-blue-700 border-blue-100 hover:border-blue-300",
    },
    {
      id: "other-public-servant",
      label: "Other Public Service",
      sub: "Interface / Manual / Bulk Upload",
      icon: "🏛️",
      count: opsCount,
      activeCls: "bg-[linear-gradient(135deg,#b45309,#d97706,#f59e0b)] text-white border-amber-500",
      inactiveCls:
        "bg-amber-50/80 text-amber-700 border-amber-100 hover:border-amber-300",
    },
  ];

  const visibleTabs = allowedCategories && allowedCategories.length > 0
    ? tabs.filter((t) => allowedCategories.includes(t.id))
    : tabs;

  return (
    <div
      className={`grid w-full gap-3 ${
        visibleTabs.length === 1 ? "max-w-[340px] grid-cols-1" : "max-w-[620px] grid-cols-1 md:grid-cols-2"
      }`}
    >
      {visibleTabs.map((t) => {
        const isActive = selectedCategory === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectCategory(t.id)}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
              isActive ? t.activeCls : t.inactiveCls
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-lg shadow-inner">
              {t.icon}
            </span>
            <div className="min-w-0 text-left">
              <div className="text-sm font-bold leading-tight">{t.label}</div>
              <div className="text-[11px] opacity-75 leading-tight">{t.sub}</div>
            </div>
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${
                isActive
                  ? "bg-white/25 text-white"
                  : t.id === "civil-servant"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
