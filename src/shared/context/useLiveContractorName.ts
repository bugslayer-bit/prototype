/* ═══════════════════════════════════════════════════════════════════════════
   useLiveContractorName
   ─────────────────────
   Cross-process dynamic link helper.

   Every module that displays a contractor / vendor name historically stored
   a denormalized cache at record creation time (e.g. `contractorName` on
   ContractRecord, `serviceProviderName` on UtilityHeader). That worked
   fine in isolation, but if the user renamed "Bhutan Telecom Ltd." in
   the Contractor module the Contract Lifecycle and Utility Queue would
   still show the stale cached copy until each dependent record was
   reopened and re-saved.

   This hook closes that loop. Given an id + a cached fallback label, it
   returns the CURRENT display name from ContractorDataContext if the id
   matches a live record, otherwise it returns the cache. Because the
   hook subscribes to ContractorDataContext, every consumer automatically
   re-renders when a contractor is edited anywhere — no manual refresh,
   no context gymnastics, no denormalization drift.

   Usage:

     const live = useLiveContractorName(r.header.serviceProviderId,
                                        r.header.serviceProviderName);
     return <td>{live}</td>;

   Or batched:

     const lookup = useLiveContractorLookup();
     const name = lookup(id, fallback);
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useMemo } from "react";
import { useContractorData } from "./ContractorDataContext";

export function useLiveContractorName(
  id: string | undefined,
  fallback: string | undefined,
): string {
  const { contractors } = useContractorData();

  return useMemo(() => {
    if (!id) return fallback || "";
    const match = contractors.find((c) => c.id === id);
    if (match && match.displayName) return match.displayName;
    return fallback || "";
  }, [id, fallback, contractors]);
}

/**
 * Batched variant — returns a stable lookup function so a table can
 * resolve many ids without re-subscribing per cell.
 */
export function useLiveContractorLookup() {
  const { contractors } = useContractorData();

  const byId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contractors) {
      if (c.id) m.set(c.id, c.displayName || "");
    }
    return m;
  }, [contractors]);

  return useCallback(
    (id: string | undefined, fallback: string | undefined): string => {
      if (!id) return fallback || "";
      const live = byId.get(id);
      if (live) return live;
      return fallback || "";
    },
    [byId],
  );
}
