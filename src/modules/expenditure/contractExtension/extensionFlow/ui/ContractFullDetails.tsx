/* ContractFullDetails — expand / collapse panel that renders the full
   dynamic snapshot (every field of StoredContract) when a real contract
   is selected. Piggy-backs on the infrastructure built for the Contract
   Lifecycle page so the two stay in sync. */
import { useState } from "react";
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import {
  ContractSnapshotPanel,
  ContractIdentityStrip,
} from "../../../contractLifecycle/lifecycleFlow";

interface Props {
  contract: StoredContract;
}

export function ContractFullDetails({ contract }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-left shadow-sm transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-xl text-white">
            🧾
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">
              Full Contract Details — every field, fully dynamic
            </p>
            <p className="text-[11px] text-slate-500">
              Identification · Status · Budget · Contractor · Officer · Tax · Advance · Retention · Items · Documents · Approvals
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-indigo-600">
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div className="space-y-4">
          <ContractIdentityStrip contract={contract} />
          <ContractSnapshotPanel contract={contract} />
        </div>
      )}
    </div>
  );
}
