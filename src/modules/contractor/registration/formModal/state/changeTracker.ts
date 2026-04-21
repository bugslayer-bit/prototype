/* Diff tracker for ContractorFormModal */
import type { FormState } from '../../stages/sharedTypes';

export function trackChanges(initial: Partial<FormState>, current: FormState): { field: string; key: string; oldValue: string; newValue: string }[] {
  const changes: { field: string; key: string; oldValue: string; newValue: string }[] = [];
  for (const key of Object.keys(current) as (keyof FormState)[]) {
    const oldValue = String(initial[key] ?? '');
    const newValue = String(current[key] ?? '');
    if (oldValue !== newValue) {
      changes.push({ field: key, key, oldValue, newValue });
    }
  }
  return changes;
}
