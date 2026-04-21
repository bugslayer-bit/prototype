/**
 * ModuleActorBanner — intentionally disabled.
 *
 * The Initiator / Reviewer / Approver role-pipeline card has been removed
 * from the UI across the whole project. The routing it described (who can
 * initiate, who reviews, who approves) is now enforced in the background by
 * the RBAC workflow mapping in `src/modules/admin/rbac/workflowData.ts`
 * together with per-agency role assignments (Agency × Person × Role).
 *
 * This component is preserved as a no-op so that existing call sites keep
 * compiling; removing it visually is the only change.
 */
interface ModuleActorBannerProps {
  moduleKey?: string;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ModuleActorBanner(_props: ModuleActorBannerProps): null {
  return null;
}

export default ModuleActorBanner;
