/* ═══════════════════════════════════════════════════════════════════════
   STEP 3 — Services & Compliance Profile (SRS PRN 7.1 Step 3)
   ═══════════════════════════════════════════════════════════════════════
   Captures the services offered by the institution. Service Category
   options cascade from the Institution Type chosen in Step 1. */
import { useEffect, useMemo } from "react";
import type { FiFormState } from "../../../types";
import {
  useFiMasterData,
  filterServicesByType,
} from "../../../state/useFiMasterData";
import { useFiStore } from "../../../state/useFiStore";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: FiFormState;
  onChange: (next: FiFormState | ((cur: FiFormState) => FiFormState)) => void;
  readOnly?: boolean;
}

export function Step3Services({ form, onChange, readOnly = false }: SectionProps) {
  const master = useFiMasterData();
  const { generateNextRecordId } = useFiStore();
  const type = form.header.institutionType;

  /* Cascading filter from Step 1's Institution Type */
  const filteredServices = useMemo(
    () => filterServicesByType(type, master.serviceCategory),
    [type, master.serviceCategory],
  );

  /* Clean up any existing service rows whose category no longer matches
     the filtered list (e.g. user changed Institution Type). */
  useEffect(() => {
    if (!type) return;
    const allowed = new Set(filteredServices);
    const hasInvalid = form.services.some(
      (s) => s.serviceCategory && !allowed.has(s.serviceCategory),
    );
    if (!hasInvalid) return;
    onChange((cur) => ({
      ...cur,
      services: cur.services.map((s) =>
        s.serviceCategory && !allowed.has(s.serviceCategory)
          ? { ...s, serviceCategory: "" }
          : s,
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredServices.join("|")]);

  const addService = () =>
    onChange((cur) => ({
      ...cur,
      services: [
        ...cur.services,
        {
          id: generateNextRecordId(),
          serviceCategory: "",
          launchDate: "",
          targetSegment: "",
          remarks: "",
        },
      ],
    }));
  const removeService = (id: string) =>
    onChange((cur) => ({ ...cur, services: cur.services.filter((s) => s.id !== id) }));
  const updateService = <K extends keyof FiFormState["services"][number]>(
    id: string,
    key: K,
    value: FiFormState["services"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      services: cur.services.map((s) => (s.id === id ? { ...s, [key]: value } : s)),
    }));

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {master.serviceCategory.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ master-data list empty</p>
          <p className="mt-0.5">
            Populate <span className="font-mono">fi-service-category</span> in{" "}
            <span className="font-mono">/master-data</span>.
          </p>
        </div>
      )}

      <Card
        title="3. Services & Compliance Profile"
        subtitle={
          type
            ? `PRN 7.1 Step 3 — showing ${filteredServices.length} of ${master.serviceCategory.length} service categories that apply to ${type}.`
            : "PRN 7.1 Step 3 — Pick an Institution Type in Step 1 first so this list can cascade."
        }
      >
        {form.services.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No services recorded yet. Click <strong>+ Add Service</strong> below.
          </p>
        ) : (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Service Category</th>
                  <th className="px-2 py-2">Launch Date</th>
                  <th className="px-2 py-2">Target Segment</th>
                  <th className="px-2 py-2">Remarks</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.services.map((svc) => (
                  <tr key={svc.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <Select
                        value={svc.serviceCategory}
                        options={filteredServices}
                        onChange={(v) => updateService(svc.id, "serviceCategory", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={inputCls}
                        value={svc.launchDate}
                        onChange={(e) => updateService(svc.id, "launchDate", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={svc.targetSegment}
                        onChange={(e) => updateService(svc.id, "targetSegment", e.target.value)}
                        placeholder="SME, Retail, Corporate…"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={svc.remarks}
                        onChange={(e) => updateService(svc.id, "remarks", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeService(svc.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={addService}
          disabled={!type}
          title={type ? undefined : "Pick an Institution Type in Step 1 first"}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Add Service
        </button>
      </Card>
    </div>
  );
}
