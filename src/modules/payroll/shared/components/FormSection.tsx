import React from "react";
import { FormFieldConfig } from "../types";
import { FormField } from "./FormField";

export interface FormSectionProps {
  title: string;
  fields: FormFieldConfig[];
  data: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  lovMap: Record<string, string[]>;
}

export function FormSection({
  title,
  fields,
  data,
  onFieldChange,
  lovMap,
}: FormSectionProps) {
  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <FormField
            key={field.id}
            field={field}
            value={data[field.id]}
            onChange={(value) => onFieldChange(field.id, value)}
            lovMap={lovMap}
          />
        ))}
      </div>
    </div>
  );
}
