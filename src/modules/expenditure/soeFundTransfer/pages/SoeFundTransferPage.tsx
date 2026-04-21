/* ═══════════════════════════════════════════════════════════════════════════
   SoeFundTransferPage — top-level route entry for SRS PRN 6.2
   ═══════════════════════════════════════════════════════════════
   Thin shell that owns the list↔workspace view toggle and the currently
   editing record. All real content lives under ../sections/.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { StoredSoe } from "../types";
import { PageHeader } from "../sections/PageHeader";
import { SoeQueue } from "../sections/queue/SoeQueue";
import { SoeWorkspace } from "../sections/workspace/SoeWorkspace";
import { RoleContextBanner } from "../sections/RoleContextBanner";

type View = "list" | "workspace";

export function SoeFundTransferPage() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredSoe | null>(null);

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
        <SoeQueue
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
        <SoeWorkspace
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
