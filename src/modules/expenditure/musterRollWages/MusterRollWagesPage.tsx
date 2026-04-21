/* ═══════════════════════════════════════════════════════════════════════════
   Muster Roll & Wages — Unified Page (PRN 6.1 / 7.1 / 8.1)
   Bhutan Integrated Financial Management Information System (IFMIS)

   Consolidates three payroll sub-modules into a single dynamic page
   under IFMIS Recurring Vendor Payment Management:
     1. Muster Roll Creation  (PRN 6.1)
     2. Muster Roll Payment   (PRN 7.1)
     3. Sitting Fee & Honorarium (PRN 8.1)

   Each section is rendered as a dynamic tab with its own content.
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../shared/data/agencyPersonas';

/* ── Lazy-load the existing page components ─────────────────────────────── */
import { MusterRollCreationPage } from '../../payroll/pages/MusterRollCreationPage';
import { MusterRollPaymentPage } from '../../payroll/pages/MusterRollPaymentPage';
import { SittingFeePage } from '../../payroll/pages/SittingFeePage';

/* ───────────────────────────────────────────────────────────────────────────
   Section Configuration
   ─────────────────────────────────────────────────────────────────────────── */

interface SectionConfig {
  id: string;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'creation',
    label: 'Muster Roll Creation',
    shortLabel: 'Creation',
    badge: 'PRN 6.1',
    description: 'Create and manage muster rolls with beneficiary onboarding, project selection, and finalization.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    id: 'payment',
    label: 'Muster Roll Payment',
    shortLabel: 'Payment',
    badge: 'PRN 7.1',
    description: 'Process muster roll payments including draft pay-bill, TDS computation, and ledger posting.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    id: 'sitting-fee',
    label: 'Sitting Fee & Honorarium',
    shortLabel: 'Sitting Fee',
    badge: 'PRN 8.1',
    description: 'Manage sitting fees and honorarium payments with TDS deduction and UCoA posting.',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
];

/* ───────────────────────────────────────────────────────────────────────────
   Quick Stats Component
   ─────────────────────────────────────────────────────────────────────────── */

function QuickStats() {
  const stats = [
    { label: 'Active Muster Rolls', value: '12', change: '+3 this month', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Payments', value: '5', change: 'Nu. 1.24M total', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Beneficiaries', value: '287', change: '14 new this week', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Processed This FY', value: 'Nu. 8.7M', change: '94 transactions', color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-opacity-20`}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
          <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{s.change}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Main Page Component
   ─────────────────────────────────────────────────────────────────────────── */

export function MusterRollWagesPage() {
  const auth = useAuth();
  const context = resolveAgencyContext(auth.activeRoleId);
  const [activeSection, setActiveSection] = useState<string>('creation');
  const [showOverview, setShowOverview] = useState(true);

  /* Resolve which section component to render */
  const activeSectionConfig = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection),
    [activeSection]
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'creation':
        return <MusterRollCreationPage />;
      case 'payment':
        return <MusterRollPaymentPage />;
      case 'sitting-fee':
        return <SittingFeePage />;
      default:
        return null;
    }
  };

  return (
    <div className="grid min-w-0 gap-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Muster Roll & Wages</h1>
              <p className="text-sm text-blue-100">
                IFMIS Recurring Vendor Payment — Beneficiary wage management, muster roll processing & sitting fee payments
              </p>
            </div>
          </div>
        </div>

        {/* ── Role & Agency Context ──────────────────────────────────────── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {context?.name ?? 'Unknown Agency'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">
            Module: <span className="font-semibold text-slate-700">Muster Roll & Wages</span>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">
            SRS: <span className="font-semibold text-slate-700">PRN 6.1 / 7.1 / 8.1</span>
          </span>
        </div>
      </div>

      {/* ── Quick Stats (toggleable) ─────────────────────────────────────── */}
      {showOverview && <QuickStats />}

      {/* ── Dynamic Section Tabs ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between px-4">
            <nav className="flex -mb-px" aria-label="Muster Roll sections">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      group relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all
                      ${isActive
                        ? 'text-indigo-700 border-b-2 border-indigo-600 bg-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border-b-2 border-transparent'
                      }
                    `}
                  >
                    <span className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}>
                      {section.icon}
                    </span>
                    <span>{section.shortLabel}</span>
                    <span className={`
                      ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                      ${isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }
                    `}>
                      {section.badge}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Toggle overview */}
            <button
              onClick={() => setShowOverview(!showOverview)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded"
            >
              {showOverview ? 'Hide Stats' : 'Show Stats'}
            </button>
          </div>
        </div>

        {/* Section Description */}
        {activeSectionConfig && (
          <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="text-indigo-500">{activeSectionConfig.icon}</div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{activeSectionConfig.label}</h2>
                <p className="text-xs text-slate-500">{activeSectionConfig.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Section Content */}
        <div className="p-0">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}
