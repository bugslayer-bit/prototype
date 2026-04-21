import { FormFieldConfig } from "../../shared/types";

export const OPS_FLOATING_DEDUCTIONS_FIELDS: FormFieldConfig[] = [
  {
    id: "employeeName",
    label: "Employee Name",
    type: "text",
    mandatory: true,
    source: "System",
  },
  {
    id: "positionTitle",
    label: "Position Title",
    type: "text",
    mandatory: true,
    source: "System",
  },
  {
    id: "cid",
    label: "CID",
    type: "text",
    mandatory: true,
    source: "System",
  },
  {
    id: "basicPay",
    label: "Basic Pay",
    type: "number",
    mandatory: true,
    source: "System",
    step: 0.01,
  },
  {
    id: "grossPay",
    label: "Gross Pay",
    type: "number",
    mandatory: true,
    source: "System",
    step: 0.01,
  },
  {
    id: "floatingDeductionName",
    label: "Name of Floating Deductions",
    type: "dropdown",
    mandatory: true,
    source: "System",
    lovKey: "opsFloatingDeductions",
  },
  {
    id: "deductionMethod",
    label: "Deduction Method",
    type: "dropdown",
    mandatory: true,
    source: "System",
    lovKey: "floatingDeductionMethods",
  },
];
