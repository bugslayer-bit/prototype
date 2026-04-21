import React from "react";
import { FormFieldConfig } from "../types";

export interface FormFieldProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  lovMap: Record<string, string[]>;
}

export function FormField({ field, value, onChange, lovMap }: FormFieldProps) {
  if (field.type === "dropdown") {
    const options = lovMap[field.lovKey || ""] || [];
    return (
      <div className="form-group">
        <label htmlFor={field.id} className="block text-sm font-medium mb-1">
          {field.label}
          {field.mandatory && <span className="text-red-500">*</span>}
        </label>
        <select
          id={field.id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select {field.label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="form-group">
        <label htmlFor={field.id} className="block text-sm font-medium mb-1">
          {field.label}
          {field.mandatory && <span className="text-red-500">*</span>}
        </label>
        <textarea
          id={field.id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="form-group flex items-center">
        <input
          id={field.id}
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor={field.id} className="ml-2 text-sm font-medium">
          {field.label}
          {field.mandatory && <span className="text-red-500">*</span>}
        </label>
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="form-group">
        <label htmlFor={field.id} className="block text-sm font-medium mb-1">
          {field.label}
          {field.mandatory && <span className="text-red-500">*</span>}
        </label>
        <input
          id={field.id}
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="form-group">
        <label htmlFor={field.id} className="block text-sm font-medium mb-1">
          {field.label}
          {field.mandatory && <span className="text-red-500">*</span>}
        </label>
        <input
          id={field.id}
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : "")}
          step={field.step || 1}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="form-group">
      <label htmlFor={field.id} className="block text-sm font-medium mb-1">
        {field.label}
        {field.mandatory && <span className="text-red-500">*</span>}
      </label>
      <input
        id={field.id}
        type={field.type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        minLength={field.minLength}
        pattern={field.pattern}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
