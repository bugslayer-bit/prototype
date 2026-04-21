import React, { useState, useMemo, useCallback } from "react";
import {
  DEFAULT_WORKFLOW_CONFIGS,
  getWorkflowConfigForModule,
  saveWorkflowConfigForModule,
  resetWorkflowConfigToDefault,
  buildWorkflowRuntime,
  getWorkflowHeadline,
  type ModuleWorkflowConfig,
  type WorkflowStepConfig,
} from "../../../shared/workflow/workflowEngine";
import { getStoredRoles, type Role } from "../rbac/rbacData";

/* ═══════════════════════════════════════════════════════════════════════════
   Workflow Configuration Page
   Admin can view, add, remove, reorder, edit approval levels for ALL modules.
   Everything persists to localStorage; resolves roles dynamically from RBAC.
   ═══════════════════════════════════════════════════════════════════════════ */

const allModuleConfigs = DEFAULT_WORKFLOW_CONFIGS;

/* ── Helpers ── */
const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

function generateStepKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `step-${Date.now()}`;
}

/* ═══ Main Page ══════════════════════════════════════════════════════════ */

export default function WorkflowConfigPage() {
  const [selectedModuleKey, setSelectedModuleKey] = useState(allModuleConfigs[0]?.moduleKey ?? "");
  const [editingConfig, setEditingConfig] = useState<ModuleWorkflowConfig | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "warn" } | null>(null);
  const roles = useMemo(() => getStoredRoles(), []);

  const currentConfig = useMemo(() => {
    if (editingConfig && editingConfig.moduleKey === selectedModuleKey) return editingConfig;
    return getWorkflowConfigForModule(selectedModuleKey) ?? allModuleConfigs[0];
  }, [selectedModuleKey, editingConfig]);

  const runtimeSteps = useMemo(() => {
    if (!currentConfig) return [];
    return buildWorkflowRuntime(currentConfig, roles);
  }, [currentConfig, roles]);

  const headline = useMemo(() => {
    if (!currentConfig) return "";
    return getWorkflowHeadline(currentConfig, roles);
  }, [currentConfig, roles]);

  const isCustomized = useMemo(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("ifmis_workflow_configs") : null;
    if (!stored) return false;
    try {
      const configs = JSON.parse(stored) as ModuleWorkflowConfig[];
      return configs.some((c) => c.moduleKey === selectedModuleKey);
    } catch { return false; }
  }, [selectedModuleKey, editingConfig]);

  /* ── Edit Handlers ── */

  const startEditing = useCallback(() => {
    if (currentConfig) setEditingConfig(JSON.parse(JSON.stringify(currentConfig)));
  }, [currentConfig]);

  const cancelEditing = useCallback(() => setEditingConfig(null), []);

  const saveEditing = useCallback(() => {
    if (!editingConfig) return;
    const renumbered = { ...editingConfig, steps: editingConfig.steps.map((s, i) => ({ ...s, level: i + 1 })), version: (editingConfig.version ?? 0) + 1, updatedAt: new Date().toISOString(), updatedBy: "admin" };
    saveWorkflowConfigForModule(renumbered);
    setEditingConfig(null);
    setToast({ msg: `Saved workflow for ${renumbered.moduleLabel}`, tone: "ok" });
    setTimeout(() => setToast(null), 3000);
  }, [editingConfig]);

  const resetToDefault = useCallback(() => {
    resetWorkflowConfigToDefault(selectedModuleKey);
    setEditingConfig(null);
    setToast({ msg: "Reset to SRS default", tone: "warn" });
    setTimeout(() => setToast(null), 3000);
  }, [selectedModuleKey]);

  /* ── Step CRUD ── */

  const addStep = useCallback(() => {
    if (!editingConfig) return;
    const newStep: WorkflowStepConfig = {
      key: `custom-step-${Date.now()}`,
      level: editingConfig.steps.length + 1,
      label: "New Approval Level",
      permissionId: `${editingConfig.moduleKey}_approve`,
      preferredRoleIds: ["role-admin"],
      srsReference: "Custom",
      slaHours: 48,
      canSkip: false,
      isConditional: false,
      conditionLabel: "",
    };
    setEditingConfig({ ...editingConfig, steps: [...editingConfig.steps, newStep] });
  }, [editingConfig]);

  const removeStep = useCallback((idx: number) => {
    if (!editingConfig) return;
    const next = editingConfig.steps.filter((_, i) => i !== idx);
    setEditingConfig({ ...editingConfig, steps: next });
  }, [editingConfig]);

  const moveStep = useCallback((idx: number, dir: -1 | 1) => {
    if (!editingConfig) return;
    const arr = [...editingConfig.steps];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setEditingConfig({ ...editingConfig, steps: arr });
  }, [editingConfig]);

  const updateStep = useCallback((idx: number, patch: Partial<WorkflowStepConfig>) => {
    if (!editingConfig) return;
    const arr = [...editingConfig.steps];
    arr[idx] = { ...arr[idx], ...patch };
    if (patch.label && !patch.key) arr[idx].key = generateStepKey(patch.label);
    setEditingConfig({ ...editingConfig, steps: arr });
  }, [editingConfig]);

  const togglePreferredRole = useCallback((stepIdx: number, roleId: string) => {
    if (!editingConfig) return;
    const step = editingConfig.steps[stepIdx];
    const has = step.preferredRoleIds.includes(roleId);
    const next = has ? step.preferredRoleIds.filter((id) => id !== roleId) : [...step.preferredRoleIds, roleId];
    updateStep(stepIdx, { preferredRoleIds: next });
  }, [editingConfig, updateStep]);

  if (!currentConfig) return <div className="p-8 text-slate-500">No workflow configs found.</div>;

  const isEditing = editingConfig !== null;
  const stepsToShow = isEditing ? editingConfig!.steps : currentConfig.steps;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Workflow Configuration</h1>
            <p className="text-sm text-slate-500 mt-0.5">Configure approval workflows for all expenditure modules. Changes take effect immediately.</p>
          </div>
          {toast && (
            <div className={cn("px-4 py-2 rounded-lg text-sm font-medium", toast.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* ── Module Sidebar ── */}
        <div className="w-72 bg-white border-r border-slate-200 min-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 mb-2">Expenditure Modules ({allModuleConfigs.length})</p>
            {allModuleConfigs.map((cfg) => {
              const active = cfg.moduleKey === selectedModuleKey;
              return (
                <button
                  key={cfg.moduleKey}
                  onClick={() => { setSelectedModuleKey(cfg.moduleKey); setEditingConfig(null); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors",
                    active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="block truncate">{cfg.moduleLabel}</span>
                  <span className="block text-xs text-slate-400 truncate">{cfg.steps.length} level{cfg.steps.length !== 1 ? "s" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Module Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{currentConfig.moduleLabel}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{currentConfig.srsSection}</p>
                {isCustomized && <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">Customized</span>}
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <button onClick={startEditing} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      Edit Workflow
                    </button>
                    {isCustomized && (
                      <button onClick={resetToDefault} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                        Reset to Default
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={saveEditing} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                      Save Changes
                    </button>
                    <button onClick={cancelEditing} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Headline Preview */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Live Workflow Chain (resolved from RBAC)</p>
              <p className="text-sm font-mono text-indigo-700">{headline}</p>
            </div>
          </div>

          {/* ── Approval Levels ── */}
          <div className="space-y-3">
            {stepsToShow.map((step, idx) => {
              const resolved = runtimeSteps[idx];
              return (
                <div key={step.key + idx} className={cn("bg-white rounded-xl border p-4", isEditing ? "border-indigo-200" : "border-slate-200")}>
                  <div className="flex items-start gap-4">
                    {/* Level badge */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                        L{idx + 1}
                      </div>
                      {isEditing && (
                        <div className="flex flex-col gap-0.5">
                          <button disabled={idx === 0} onClick={() => moveStep(idx, -1)} className="text-xs text-slate-400 hover:text-indigo-600 disabled:opacity-30">▲</button>
                          <button disabled={idx === stepsToShow.length - 1} onClick={() => moveStep(idx, 1)} className="text-xs text-slate-400 hover:text-indigo-600 disabled:opacity-30">▼</button>
                        </div>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        /* ── EDIT MODE ── */
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Step Label</label>
                              <input
                                value={step.label}
                                onChange={(e) => updateStep(idx, { label: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Permission ID</label>
                              <input
                                value={step.permissionId}
                                onChange={(e) => updateStep(idx, { permissionId: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">SLA (hours)</label>
                              <input
                                type="number"
                                value={step.slaHours ?? 48}
                                onChange={(e) => updateStep(idx, { slaHours: Number(e.target.value) })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">SRS Reference</label>
                              <input
                                value={step.srsReference}
                                onChange={(e) => updateStep(idx, { srsReference: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                              />
                            </div>
                            <div className="flex items-end gap-4">
                              <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={step.canSkip ?? false} onChange={(e) => updateStep(idx, { canSkip: e.target.checked })} className="rounded border-slate-300" />
                                Skippable
                              </label>
                              <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={step.isConditional ?? false} onChange={(e) => updateStep(idx, { isConditional: e.target.checked })} className="rounded border-slate-300" />
                                Conditional
                              </label>
                            </div>
                          </div>
                          {step.isConditional && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Condition Description</label>
                              <input
                                value={step.conditionLabel ?? ""}
                                onChange={(e) => updateStep(idx, { conditionLabel: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                                placeholder="e.g., Only if implementing agency differs"
                              />
                            </div>
                          )}

                          {/* Preferred Roles */}
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Preferred Roles (click to toggle)</label>
                            <div className="flex flex-wrap gap-1.5">
                              {roles.map((role) => {
                                const selected = step.preferredRoleIds.includes(role.id);
                                return (
                                  <button
                                    key={role.id}
                                    onClick={() => togglePreferredRole(idx, role.id)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                      selected ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                  >
                                    {role.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ── VIEW MODE ── */
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-800">{step.label}</h3>
                            {step.isConditional && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">Conditional</span>}
                            {step.canSkip && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 ring-1 ring-sky-200">Skippable</span>}
                          </div>
                          <p className="text-sm text-indigo-600 mt-0.5">Resolved: <span className="font-medium">{resolved?.role ?? "—"}</span></p>
                          <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                            <span>Permission: <code className="text-slate-500">{step.permissionId}</code></span>
                            <span>SLA: {step.slaHours ?? 48}h</span>
                            <span>SRS: {step.srsReference}</span>
                          </div>
                          {step.isConditional && step.conditionLabel && (
                            <p className="text-xs text-amber-600 mt-1">⚡ {step.conditionLabel}</p>
                          )}
                          {/* Show preferred roles chips */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {step.preferredRoleIds.map((roleId) => {
                              const role = roles.find((r) => r.id === roleId);
                              return (
                                <span key={roleId} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">
                                  {role?.name ?? roleId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remove button (edit mode) */}
                    {isEditing && stepsToShow.length > 1 && (
                      <button onClick={() => removeStep(idx)} className="mt-1 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Remove level">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Step button (edit mode) */}
            {isEditing && (
              <button onClick={addStep} className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors">
                + Add Approval Level
              </button>
            )}
          </div>

          {/* ── Module Summary Table ── */}
          <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-medium text-slate-800">All Module Workflow Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2 font-medium text-slate-500">Module</th>
                    <th className="px-4 py-2 font-medium text-slate-500">SRS Section</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-center">Levels</th>
                    <th className="px-4 py-2 font-medium text-slate-500">Approval Chain</th>
                    <th className="px-4 py-2 font-medium text-slate-500 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allModuleConfigs.map((cfg) => {
                    const hl = getWorkflowHeadline(cfg, roles);
                    const stored = typeof window !== "undefined" ? window.localStorage.getItem("ifmis_workflow_configs") : null;
                    let customized = false;
                    if (stored) {
                      try { customized = (JSON.parse(stored) as ModuleWorkflowConfig[]).some((c) => c.moduleKey === cfg.moduleKey); } catch {}
                    }
                    return (
                      <tr
                        key={cfg.moduleKey}
                        onClick={() => { setSelectedModuleKey(cfg.moduleKey); setEditingConfig(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={cn("border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors", cfg.moduleKey === selectedModuleKey && "bg-indigo-50")}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-700">{cfg.moduleLabel}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{cfg.srsSection}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{cfg.steps.length}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-600 max-w-md truncate">{hl}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", customized ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                            {customized ? "Custom" : "Default"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
