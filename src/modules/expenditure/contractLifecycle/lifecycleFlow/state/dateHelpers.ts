/* Date math helpers for ContractLifecyclePage */
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.round((db - da) / 86_400_000);
};
