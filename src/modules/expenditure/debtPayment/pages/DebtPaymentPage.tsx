/* ═══════════════════════════════════════════════════════════════════════════
   DebtPaymentPage — top-level route entry for SRS PRN 6.1
   ═══════════════════════════════════════════════════════
   Thin shell that owns the list↔workspace view toggle and the currently
   editing record. All real content lives under ../sections/.

   Architecture (nested feature folder):
     debtPayment/
       pages/         top-level route entry
       sections/      PageHeader, queue, workspace (+ steps)
       ui/            Card, Field, Select, Empty, StatusPill, inputCls
       state/         useDebtStore, useDebtMasterData
       types/         shared TS types
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { StoredDebt } from "../types";
import { PageHeader } from "../sections/PageHeader";
import { DebtQueue } from "../sections/queue/DebtQueue";
import { DebtWorkspace } from "../sections/workspace/DebtWorkspace";
import { RoleContextBanner } from "../sections/RoleContextBanner";

type View = "list" | "workspace";

export function DebtPaymentPage() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredDebt | null>(null);

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        showBack={view === "workspace"}
        onBack={() => {
          setEditing(null);
          setView("list");
        }}
      />

      {/* Re-renders automatically when the user picks a different role from
          the top-bar switcher. Surfaces what the active persona can/can't do. */}
      <RoleContextBanner />

      {view === "list" && (
        <DebtQueue
          onNewRecord={() => {
            setEditing(null);
            setView("workspace");
          }}
          onEditRecord={(r) => {
            setEditing(r);
            setView("workspace");
          }}
        />
      )}

      {view === "workspace" && (
        <DebtWorkspace
          existing={editing}
          onDone={() => {
            setEditing(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
}
