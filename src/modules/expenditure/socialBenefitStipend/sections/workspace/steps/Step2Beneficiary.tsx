/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 — Beneficiary Onboarding (SRS PRN row 98 + row 102)
   ═══════════════════════════════════════════════════════════════════════
   Dynamically shows the right field mix based on Step 1 Program Type:
     • Stipend Program → Student Code, Student Category, Agency ID, Office ID
     • Social Benefit  → Age Group
   And on Beneficiary Type (Individual vs Institutional) narrows the
   Beneficiary Category LoV accordingly.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { SbFormState } from "../../../types";
import { useSbStore } from "../../../state/useSbStore";
import {
  useSbMasterData,
  filterCategoryByBeneficiaryType,
  beneficiaryFieldsVisible,
} from "../../../state/useSbMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SbFormState;
  onChange: (next: SbFormState | ((cur: SbFormState) => SbFormState)) => void;
  readOnly?: boolean;
}

export function Step2Beneficiary({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSbMasterData();
  const { generateNextBeneficiaryId } = useSbStore();

  const visible = useMemo(
    () => beneficiaryFieldsVisible(form.header.programType),
    [form.header.programType],
  );

  const addBeneficiary = () => {
    onChange((cur) => ({
      ...cur,
      beneficiaries: [
        ...cur.beneficiaries,
        {
          id: generateNextBeneficiaryId(),
          beneficiaryType: "",
          beneficiaryCategory: "",
          cid: "",
          firstName: "",
          middleName: "",
          lastName: "",
          nationality: "",
          gender: "",
          dob: "",
          ageGroup: "",
          phoneNumber: "",
          studentCode: "",
          studentCategory: "",
          agencyId: "",
          officeId: "",
          bankName: "",
          bankBranch: "",
          bankAccountNo: "",
          accountType: "",
          beneficiaryStatus: "",
          remarks: "",
        },
      ],
    }));
  };
  const removeBeneficiary = (id: string) =>
    onChange((cur) => ({
      ...cur,
      beneficiaries: cur.beneficiaries.filter((b) => b.id !== id),
    }));

  const update = <K extends keyof SbFormState["beneficiaries"][number]>(
    id: string,
    key: K,
    value: SbFormState["beneficiaries"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      beneficiaries: cur.beneficiaries.map((b) =>
        b.id === id ? { ...b, [key]: value } : b,
      ),
    }));

  /* Clear category if it falls outside the filtered set after a type change. */
  useEffect(() => {
    onChange((cur) => ({
      ...cur,
      beneficiaries: cur.beneficiaries.map((b) => {
        if (!b.beneficiaryCategory) return b;
        const allowed = filterCategoryByBeneficiaryType(
          b.beneficiaryType,
          master.beneficiaryCategory,
        );
        if (allowed.includes(b.beneficiaryCategory)) return b;
        return { ...b, beneficiaryCategory: "" };
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master.beneficiaryCategory.join("|")]);

  const lovChecks: { key: string; label: string; values: string[] }[] = [
    { key: "sb-beneficiary-type", label: "Beneficiary Type", values: master.beneficiaryType },
    { key: "sb-beneficiary-category", label: "Beneficiary Category", values: master.beneficiaryCategory },
    { key: "gender", label: "Gender", values: master.gender },
    { key: "nationality-status", label: "Nationality", values: master.nationality },
    { key: "sb-age-group", label: "Age Group", values: master.ageGroup },
    { key: "sb-student-category", label: "Student Category", values: master.studentCategory },
    { key: "account-type", label: "Account Type", values: master.accountType },
    { key: "sb-beneficiary-status", label: "Beneficiary Status", values: master.beneficiaryStatus },
  ];
  const emptyLovs = lovChecks.filter((c) => c.values.length === 0);

  if (!form.header.programType) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-bold">Pick a Program Type on Step 1 first.</p>
        <p className="mt-1 text-xs">
          Beneficiary onboarding fields are driven by the Program Type
          (Stipend → student fields, Social Benefit → age group fields).
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {emptyLovs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ {emptyLovs.length} master-data list(s) empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span>:{" "}
            {emptyLovs.map((l) => l.key).join(", ")}
          </p>
        </div>
      )}

      <Card
        title={`2. Beneficiary Roster — ${form.header.programType}`}
        subtitle="PRN rows 98 / 102 — DD 25.x + 28.x. Dropdowns cascade from the selections above."
      >
        {form.beneficiaries.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No beneficiaries yet. Click <strong>+ Add Beneficiary</strong> below.
          </p>
        ) : (
          <div className="grid gap-4">
            {form.beneficiaries.map((b) => {
              const filteredCategories = filterCategoryByBeneficiaryType(
                b.beneficiaryType,
                master.beneficiaryCategory,
              );
              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {b.id}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeBeneficiary(b.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Beneficiary Type">
                      <Select
                        value={b.beneficiaryType}
                        options={master.beneficiaryType}
                        onChange={(v) => update(b.id, "beneficiaryType", v)}
                      />
                    </Field>
                    <Field
                      label="Beneficiary Category"
                      hint={
                        b.beneficiaryType
                          ? `${filteredCategories.length} of ${master.beneficiaryCategory.length} categories apply`
                          : "Pick a Beneficiary Type first"
                      }
                    >
                      <Select
                        value={b.beneficiaryCategory}
                        options={filteredCategories}
                        onChange={(v) => update(b.id, "beneficiaryCategory", v)}
                        disabled={!b.beneficiaryType}
                      />
                    </Field>
                    <Field label="Beneficiary Status">
                      <Select
                        value={b.beneficiaryStatus}
                        options={master.beneficiaryStatus}
                        onChange={(v) => update(b.id, "beneficiaryStatus", v)}
                      />
                    </Field>

                    <Field label="CID">
                      <input
                        className={inputCls}
                        value={b.cid}
                        onChange={(e) => update(b.id, "cid", e.target.value)}
                      />
                    </Field>
                    <Field label="First Name">
                      <input
                        className={inputCls}
                        value={b.firstName}
                        onChange={(e) => update(b.id, "firstName", e.target.value)}
                      />
                    </Field>
                    <Field label="Middle Name">
                      <input
                        className={inputCls}
                        value={b.middleName}
                        onChange={(e) => update(b.id, "middleName", e.target.value)}
                      />
                    </Field>
                    <Field label="Last Name">
                      <input
                        className={inputCls}
                        value={b.lastName}
                        onChange={(e) => update(b.id, "lastName", e.target.value)}
                      />
                    </Field>
                    <Field label="Nationality">
                      <Select
                        value={b.nationality}
                        options={master.nationality}
                        onChange={(v) => update(b.id, "nationality", v)}
                      />
                    </Field>
                    <Field label="Gender">
                      <Select
                        value={b.gender}
                        options={master.gender}
                        onChange={(v) => update(b.id, "gender", v)}
                      />
                    </Field>
                    <Field label="Date of Birth">
                      <input
                        type="date"
                        className={inputCls}
                        value={b.dob}
                        onChange={(e) => update(b.id, "dob", e.target.value)}
                      />
                    </Field>
                    <Field label="Phone Number">
                      <input
                        className={inputCls}
                        value={b.phoneNumber}
                        onChange={(e) => update(b.id, "phoneNumber", e.target.value)}
                      />
                    </Field>

                    {visible.showAgeGroup && (
                      <Field label="Age Group">
                        <Select
                          value={b.ageGroup}
                          options={master.ageGroup}
                          onChange={(v) => update(b.id, "ageGroup", v)}
                        />
                      </Field>
                    )}

                    {visible.showStudentFields && (
                      <>
                        <Field label="Student Code">
                          <input
                            className={inputCls}
                            value={b.studentCode}
                            onChange={(e) => update(b.id, "studentCode", e.target.value)}
                          />
                        </Field>
                        <Field label="Student Category">
                          <Select
                            value={b.studentCategory}
                            options={master.studentCategory}
                            onChange={(v) => update(b.id, "studentCategory", v)}
                          />
                        </Field>
                        <Field label="Agency ID">
                          <input
                            className={inputCls}
                            value={b.agencyId}
                            onChange={(e) => update(b.id, "agencyId", e.target.value)}
                          />
                        </Field>
                        <Field label="Office ID">
                          <input
                            className={inputCls}
                            value={b.officeId}
                            onChange={(e) => update(b.id, "officeId", e.target.value)}
                          />
                        </Field>
                      </>
                    )}

                    <Field label="Bank Name">
                      <input
                        className={inputCls}
                        value={b.bankName}
                        onChange={(e) => update(b.id, "bankName", e.target.value)}
                      />
                    </Field>
                    <Field label="Bank Branch">
                      <input
                        className={inputCls}
                        value={b.bankBranch}
                        onChange={(e) => update(b.id, "bankBranch", e.target.value)}
                      />
                    </Field>
                    <Field label="Bank Account No">
                      <input
                        className={inputCls}
                        value={b.bankAccountNo}
                        onChange={(e) => update(b.id, "bankAccountNo", e.target.value)}
                      />
                    </Field>
                    <Field label="Account Type">
                      <Select
                        value={b.accountType}
                        options={master.accountType}
                        onChange={(v) => update(b.id, "accountType", v)}
                      />
                    </Field>

                    <Field label="Remarks" className="md:col-span-2 lg:col-span-3">
                      <input
                        className={inputCls}
                        value={b.remarks}
                        onChange={(e) => update(b.id, "remarks", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={addBeneficiary}
          className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Beneficiary
        </button>
      </Card>
    </div>
  );
}
