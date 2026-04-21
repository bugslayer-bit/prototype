/* ═══════════════════════════════════════════════════════════════════════════
   Invoice & Bill module · Theme constants
   ───────────────────────────────────────
   Single source of truth for the active / hover / selected colour used by
   every dashboard tile, sub-header tab and pill button across the module.
   Change the values here and every consumer updates dynamically.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Light-yellow active state used for sub-header tabs and the currently
 *  selected dashboard view. */
export const ACTIVE_BG = "bg-yellow-100";
export const ACTIVE_BORDER = "border-yellow-300";
export const ACTIVE_TEXT = "text-yellow-900";
export const ACTIVE_RING = "ring-2 ring-yellow-300";

/** Compose the full active class string for a sub-header tab / pill. */
export const activeTabClass = `${ACTIVE_BG} ${ACTIVE_BORDER} ${ACTIVE_TEXT}`;

/** Compose the full active class string for a card / tile. */
export const activeTileClass = `${ACTIVE_BG} ${ACTIVE_BORDER} ${ACTIVE_TEXT} ${ACTIVE_RING}`;

/** Convenience helper — returns the active classes when `selected` is true,
 *  otherwise returns the supplied default class string. */
export function tabClass(selected: boolean, base: string): string {
  return selected ? `${base} ${activeTabClass}` : base;
}
