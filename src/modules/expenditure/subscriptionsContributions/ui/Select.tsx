import type { ChangeEvent } from "react";
import { inputCls } from "./inputCls";

export function Select({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "— Select —",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      className={inputCls + (disabled ? " bg-slate-100 text-slate-400" : "")}
      value={value}
      disabled={disabled || options.length === 0}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      <option value="">{options.length === 0 ? "— Master data empty —" : placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
