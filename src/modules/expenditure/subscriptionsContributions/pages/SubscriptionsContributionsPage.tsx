/* ═══════════════════════════════════════════════════════════════════════════
   SubscriptionsContributionsPage — top-level route entry for SRS PRN 9.1
   ═══════════════════════════════════════════════════════════════════════════
   Thin shell that owns the list↔workspace view toggle and the currently
   editing record. All real content lives under ../sections/.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { StoredSc } from "../types";
import { PageHeader } from "../sections/PageHeader";
import { RoleContextBanner } from "../sections/RoleContextBanner";
import { ScQueue } from "../sections/queue/ScQueue";
import { ScWorkspace } from "../sections/workspace/ScWorkspace";

type View = "list" | "workspace";

export function SubscriptionsContributionsPage() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredSc | null>(null);

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        showBack={view === "workspace"}
        onBack={() => {
          setEditing(null);
          setView("list");
        }}
      />

      <RoleContextBanner />

      {view === "list" && (
        <ScQueue
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
        <ScWorkspace
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
