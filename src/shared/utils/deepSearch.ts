/* ═══════════════════════════════════════════════════════════════════════
   deepSearch — generic, fully-dynamic record search helper.
   Walks every string / number leaf of an object (or array of objects) and
   returns true if any of them contains the lowercased query substring.

   Used by every queue/list screen so the search box matches any visible
   (or hidden) field without us having to hand-list properties. This keeps
   search behaviour honest to the "no hardcoded fields" rule: if a new
   attribute is added to a record, it automatically becomes searchable.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Returns `true` if any string/number leaf of `value` contains the
 * substring `needle` (case-insensitive). `needle` must already be
 * lowercased by the caller for performance when filtering large lists.
 */
export function deepMatches(value: unknown, needle: string): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.toLowerCase().includes(needle);
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value).toLowerCase().includes(needle);
  }
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) {
    for (const item of value) if (deepMatches(item, needle)) return true;
    return false;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (deepMatches((value as Record<string, unknown>)[key], needle)) return true;
    }
    return false;
  }
  return false;
}

/**
 * Filter an array of records by a free-text query. Empty / whitespace-only
 * queries return the original list untouched. The match walks every leaf
 * in each record, so the caller never has to declare which fields are
 * searchable.
 */
export function filterByQuery<T>(records: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return records.slice();
  return records.filter((r) => deepMatches(r, q));
}
