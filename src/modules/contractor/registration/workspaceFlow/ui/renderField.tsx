/* Field renderer for ContractorRegistrationWorkspace */
import type { FieldMeta } from "../../contractorRegistrationTypes";
import { inputClass } from "./styleTokens";

export function renderField(field: FieldMeta, value: string, onChange: (value: string) => void) {
  if (field.type === "textarea") {
    return <textarea className={`${inputClass} min-h-24`} value={value} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "select" && field.options) {
    return (
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {field.options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  }
  return <input className={inputClass} type={field.type ?? "text"} value={value} onChange={(event) => onChange(event.target.value)} />;
}
