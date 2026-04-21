/* ═══════════════════════════════════════════════════════════════════════════
   FinancialInstitutionPage — top-level route entry for SRS PRN 7.1
   ═══════════════════════════════════════════════════════════════════
   Thin shell that owns the list↔workspace view toggle and the currently
   editing record. All real content lives under ../sections/.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { StoredFi } from "../types";
import { PageHeader } from "../sections/PageHeader";
import { RoleContextBanner } from "../sections/RoleContextBanner";
import { FiQueue } from "../sections/queue/FiQueue";
import { FiWorkspace } from "../sections/workspace/FiWorkspace";

type View = "list" | "workspace";

export function FinancialInstitutionPage() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredFi | null>(null);

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
        <FiQueue
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
        <FiWorkspace
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
