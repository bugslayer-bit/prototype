/* ═══════════════════════════════════════════════════════════════════════════
   SocialBenefitStipendPage — top-level route entry for SRS PRN 8.1
   ═══════════════════════════════════════════════════════════════════════════
   Thin shell that owns the list↔workspace view toggle and the currently
   editing record. All real content lives under ../sections/.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { StoredSb } from "../types";
import { PageHeader } from "../sections/PageHeader";
import { RoleContextBanner } from "../sections/RoleContextBanner";
import { SbQueue } from "../sections/queue/SbQueue";
import { SbWorkspace } from "../sections/workspace/SbWorkspace";

type View = "list" | "workspace";

export function SocialBenefitStipendPage() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredSb | null>(null);

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
        <SbQueue
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
        <SbWorkspace
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
