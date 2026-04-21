/* ═══════════════════════════════════════════════════════════════════════════
   MusterRollBeneficiaryContext
   ───────────────────────────────────────────────────────────────────
   Shared store for muster-roll beneficiary self-registrations coming from
   the Public Portal. Persists to localStorage + publishes changes over a
   cross-tab `storage` event AND a same-tab `ifmis-musterroll-changed` event
   so the Contractor / MoF Program Officer personas can see live updates
   without a page reload.

   Workflow stages:
     "submitted-to-contractor"  — public user just registered; contractor
                                   (the vendor the beneficiary claims to
                                   work under) needs to approve.
     "approved-by-contractor"   — contractor verified → auto-forwarded to
                                   MoF Program Officer for final clearance.
     "cleared-by-mof"           — MoF program officer signed off; the
                                   beneficiary is now on the muster roll.
     "rejected"                 — rejected at any stage.
   ═══════════════════════════════════════════════════════════════════════════ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MusterRollStage =
  | "submitted-to-contractor"
  | "approved-by-contractor"
  | "cleared-by-mof"
  | "rejected";

export interface MusterRollBeneficiary {
  id: string;
  /* Personal */
  firstName: string;
  middleName?: string;
  lastName: string;
  cid: string;
  gender: "male" | "female" | "";
  dateOfBirth: string;
  phone: string;
  email?: string;
  dzongkhag: string;
  dzongkhagCode?: string;
  dungkhag?: string;
  dungkhagCode?: string;
  gewog?: string;
  gewogCode?: string;
  village?: string;

  /* Work context — the contractor the beneficiary is working under */
  workType: string;
  agency: string;
  department?: string;
  /* Project linked to a verified contract in the ContractDataContext. */
  projectContractId?: string;
  projectName: string;
  contractorId?: string;
  contractorName?: string;

  /* Bank */
  bankName: string;
  bankBranch: string;
  bankAccountNo: string;
  accountHolderName: string;
  cbsVerified: boolean;

  /* Workflow */
  stage: MusterRollStage;
  submittedAt: string;
  contractorApprovedAt?: string;
  contractorApprovedBy?: string;
  mofClearedAt?: string;
  mofClearedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  remarks?: string;
}

interface Ctx {
  beneficiaries: MusterRollBeneficiary[];
  addBeneficiary: (b: MusterRollBeneficiary) => void;
  updateBeneficiary: (id: string, patch: Partial<MusterRollBeneficiary>) => void;
  approveByContractor: (id: string, who: string, remarks?: string) => void;
  clearByMoF: (id: string, who: string, remarks?: string) => void;
  reject: (id: string, who: string, reason: string) => void;
  removeBeneficiary: (id: string) => void;
}

const LS_KEY = "ifmis-musterroll-beneficiaries";
const LIVE_EVENT = "ifmis-musterroll-changed";

const MusterRollContext = createContext<Ctx | null>(null);

function readStore(): MusterRollBeneficiary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MusterRollBeneficiary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(list: MusterRollBeneficiary[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(list));
  /* Same-tab listeners (NotificationBell, LiveToast, ApprovalList) all
     react to this custom event without waiting for a re-render. */
  window.dispatchEvent(new CustomEvent(LIVE_EVENT));
}

export function MusterRollBeneficiaryProvider({ children }: { children: ReactNode }) {
  const [beneficiaries, setBeneficiaries] = useState<MusterRollBeneficiary[]>(() => readStore());

  /* Cross-tab + same-tab live sync. */
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) setBeneficiaries(readStore());
    }
    function onLocal() {
      setBeneficiaries(readStore());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LIVE_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LIVE_EVENT, onLocal);
    };
  }, []);

  const persist = useCallback((next: MusterRollBeneficiary[]) => {
    setBeneficiaries(next);
    writeStore(next);
  }, []);

  const addBeneficiary = useCallback(
    (b: MusterRollBeneficiary) => {
      persist([b, ...readStore()]);
    },
    [persist],
  );

  const updateBeneficiary = useCallback(
    (id: string, patch: Partial<MusterRollBeneficiary>) => {
      const next = readStore().map((x) => (x.id === id ? { ...x, ...patch } : x));
      persist(next);
    },
    [persist],
  );

  const approveByContractor = useCallback(
    (id: string, who: string, remarks?: string) => {
      updateBeneficiary(id, {
        stage: "approved-by-contractor",
        contractorApprovedAt: new Date().toISOString(),
        contractorApprovedBy: who,
        remarks: remarks || undefined,
      });
    },
    [updateBeneficiary],
  );

  const clearByMoF = useCallback(
    (id: string, who: string, remarks?: string) => {
      updateBeneficiary(id, {
        stage: "cleared-by-mof",
        mofClearedAt: new Date().toISOString(),
        mofClearedBy: who,
        remarks: remarks || undefined,
      });
    },
    [updateBeneficiary],
  );

  const reject = useCallback(
    (id: string, who: string, reason: string) => {
      updateBeneficiary(id, {
        stage: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedBy: who,
        rejectionReason: reason,
      });
    },
    [updateBeneficiary],
  );

  const removeBeneficiary = useCallback(
    (id: string) => {
      persist(readStore().filter((x) => x.id !== id));
    },
    [persist],
  );

  const value = useMemo<Ctx>(
    () => ({
      beneficiaries,
      addBeneficiary,
      updateBeneficiary,
      approveByContractor,
      clearByMoF,
      reject,
      removeBeneficiary,
    }),
    [beneficiaries, addBeneficiary, updateBeneficiary, approveByContractor, clearByMoF, reject, removeBeneficiary],
  );

  return <MusterRollContext.Provider value={value}>{children}</MusterRollContext.Provider>;
}

export function useMusterRollBeneficiaries() {
  const ctx = useContext(MusterRollContext);
  if (!ctx)
    throw new Error("useMusterRollBeneficiaries must be used within MusterRollBeneficiaryProvider");
  return ctx;
}
