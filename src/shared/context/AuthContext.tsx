import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getStoredRoles, getStoredUsers, resolvePermissionIds, seedUsers } from "../../modules/admin/rbac/rbacData";
import { getActiveAgencyCode, setActiveAgencyCode as persistAgencyCode, getDefaultAgencyCode } from "../data/agencyPersonas";
import { getActiveDelegationsForUser, type Delegation } from "../../modules/admin/delegation/delegationData";

export type Permission = string;
export type UserRole = "admin" | "public";
export type AppMode = "admin" | "public";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleIds?: string[];
}

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  roleIds: string[];
  roleLabels: string[];
  permissionIds: string[];
  appMode: AppMode;
  isLoading: boolean;
  isAdmin: boolean;
  isPublic: boolean;
  /** Currently active role (for users with multiple assigned roles). Drives effective permissions / approval inbox. */
  activeRoleId: string | null;
  /** Currently active agency code (UCoA Organisation Segment). */
  activeAgencyCode: string;
  /** Monotonic counter bumped on every role switch — use as a React key to force full remounts. */
  roleSwitchEpoch: number;
  /** Switch the active role at runtime — persisted to localStorage and broadcast app-wide. */
  setActiveRoleId: (roleId: string) => void;
  /** Switch the active agency at runtime — persisted to localStorage. */
  setActiveAgencyCode: (code: string) => void;
  /** Bump roleSwitchEpoch manually — use for explicit user actions (e.g. AgencyPicker) that need full remount. */
  bumpEpoch: () => void;
  /** Switch persona instantly without page reload — updates user, role, agency, and permissions in context. */
  switchPersona: (persona: { userId: string; name: string; email: string; roleId: string; agencyCode: string }) => void;
  /** Active delegations received by the current user (they are acting on behalf of someone). */
  activeDelegations: Delegation[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  canAccessModule: (moduleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  defaultRole?: UserRole;
  appMode?: AppMode;
}

/** Public-facing roles — contractors/vendors, muster roll beneficiaries, AND financial institutions */
const PUBLIC_ROLE_IDS = new Set(["role-public", "role-muster-roll", "role-fi"]);

function deriveAppRole(roleIds: string[]): UserRole {
  return roleIds.length === 1 && PUBLIC_ROLE_IDS.has(roleIds[0]) ? "public" : "admin";
}

function resolveUserRoleIds(email: string, fallbackRole: UserRole): string[] {
  const matchedUser = getStoredUsers().find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
  if (matchedUser?.roleIds?.length) {
    return matchedUser.roleIds;
  }
  return fallbackRole === "public" ? ["role-public"] : ["role-admin"];
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  defaultRole = "admin",
  appMode: appModeProp = "admin",
}) => {
  const appMode = appModeProp;
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [activeRoleId, setActiveRoleIdState] = useState<string | null>(null);
  const [activeAgencyCode, setActiveAgencyCodeState] = useState<string>(() => getActiveAgencyCode(null));
  const [roleSwitchEpoch, setRoleSwitchEpoch] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const ACTIVE_ROLE_KEY = "ifmis_active_role_id";

  const syncAuthState = useCallback((nextUser: User | null, nextRoleIds: string[]) => {
    const roles = getStoredRoles();
    setUser(nextUser);
    setRole(nextUser ? deriveAppRole(nextRoleIds) : null);
    setRoleIds(nextRoleIds);
    setPermissionIds(resolvePermissionIds(nextRoleIds, roles));
    /* Resolve active role: prefer persisted value if it's still valid for this user, else first assigned role */
    const persisted = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_ROLE_KEY) : null;
    const nextActive = persisted && nextRoleIds.includes(persisted) ? persisted : (nextRoleIds[0] ?? null);
    setActiveRoleIdState(nextActive);
    if (nextActive && typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ROLE_KEY, nextActive);
    }
    /* Sync agency code */
    setActiveAgencyCodeState(getActiveAgencyCode(nextActive));
  }, []);

  const setActiveRoleId = useCallback((roleId: string) => {
    setActiveRoleIdState(roleId);
    setRoleSwitchEpoch((prev) => prev + 1);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ROLE_KEY, roleId);
    }
    /* Also recompute permissions to reflect just the active role */
    const roles = getStoredRoles();
    setPermissionIds(resolvePermissionIds([roleId], roles));
    /* Reset agency to default for the new role if current agency doesn't match */
    const defaultCode = getDefaultAgencyCode(roleId);
    setActiveAgencyCodeState(defaultCode);
    persistAgencyCode(defaultCode);
  }, []);

  const setActiveAgencyCode = useCallback((code: string) => {
    setActiveAgencyCodeState(code);
    persistAgencyCode(code);
    /* NOTE: Intentionally does NOT bump roleSwitchEpoch here.
       AgencyRouteSync calls this during URL sync — bumping epoch there would
       cause AppShell to navigate to "/" and lose the current path.
       Explicit user actions (persona switch, role switch, AgencyPicker) bump
       epoch via switchPersona / setActiveRoleId or bumpEpoch explicitly. */
  }, []);

  const bumpEpoch = useCallback(() => {
    setRoleSwitchEpoch((prev) => prev + 1);
  }, []);

  const switchPersona = useCallback((persona: { userId: string; name: string; email: string; roleId: string; agencyCode: string }) => {
    /* Derive the correct app-level role (admin vs public) from the persona's roleId */
    const derivedRole = deriveAppRole([persona.roleId]);

    /* Update user object with persona details */
    const updatedUser: User = {
      id: persona.userId,
      name: persona.name,
      email: persona.email,
      role: derivedRole,
      roleIds: [persona.roleId],
    };
    setUser(updatedUser);
    setRole(derivedRole);
    setRoleIds([persona.roleId]);

    /* Update active role and agency */
    setActiveRoleIdState(persona.roleId);
    setActiveAgencyCodeState(persona.agencyCode);
    persistAgencyCode(persona.agencyCode);

    /* Bump epoch to trigger component remounts */
    setRoleSwitchEpoch((prev) => prev + 1);

    /* Recompute permissions for the new role */
    const roles = getStoredRoles();
    setPermissionIds(resolvePermissionIds([persona.roleId], roles));

    /* Persist to localStorage */
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ROLE_KEY, persona.roleId);
      const authData = {
        user: updatedUser,
        role: derivedRole,
      };
      window.localStorage.setItem("ifmis_auth", JSON.stringify(authData));
    }
  }, []);

  useEffect(() => {
    const storedAuth = localStorage.getItem("ifmis_auth");
    if (storedAuth) {
      try {
        const { user: storedUser } = JSON.parse(storedAuth) as { user: User };
        /* Always re-resolve the user's roles from the freshest seed/store so
           that newly-added approval personas (Agency Finance, Head of Agency,
           Payment Release, Initiator) are picked up automatically without
           requiring a logout/login cycle. */
        const freshRoleIds = resolveUserRoleIds(storedUser.email, storedUser.role ?? defaultRole);
        const nextRoleIds = freshRoleIds.length
          ? freshRoleIds
          : (storedUser.roleIds ?? []);
        syncAuthState({ ...storedUser, roleIds: nextRoleIds, role: deriveAppRole(nextRoleIds) }, nextRoleIds);
      } catch (error) {
        console.error("Failed to parse stored auth:", error);
        localStorage.removeItem("ifmis_auth");
      }
    } else {
      const defaultSeedUser = defaultRole === "public"
        ? seedUsers.find((candidate) => candidate.roleIds.some((r) => PUBLIC_ROLE_IDS.has(r)))
        : seedUsers.find((candidate) => candidate.roleIds.includes("role-admin"));

      if (defaultSeedUser) {
        const nextRoleIds = defaultSeedUser.roleIds;
        syncAuthState({
          id: defaultSeedUser.id,
          name: defaultSeedUser.name,
          email: defaultSeedUser.email,
          role: deriveAppRole(nextRoleIds),
          roleIds: nextRoleIds,
        }, nextRoleIds);
      }
    }
    setIsLoading(false);
  }, [defaultRole, syncAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const fallbackRole: UserRole = email.includes("admin") ? "admin" : "public";
      const nextRoleIds = resolveUserRoleIds(email, fallbackRole);
      const matchedUser = getStoredUsers().find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
      const newUser: User = {
        id: matchedUser?.id ?? `user_${Date.now()}`,
        name: matchedUser?.name ?? email.split("@")[0],
        email,
        role: deriveAppRole(nextRoleIds),
        roleIds: nextRoleIds,
      };
      syncAuthState(newUser, nextRoleIds);
      localStorage.setItem("ifmis_auth", JSON.stringify({ user: newUser, role: newUser.role }));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [syncAuthState]);

  const logout = useCallback(() => {
    syncAuthState(null, []);
    localStorage.removeItem("ifmis_auth");
  }, [syncAuthState]);

  const hasPermission = useCallback((permission: Permission) => {
    return permissionIds.includes(permission);
  }, [permissionIds]);

  const canAccessModule = useCallback((moduleName: string) => {
    const normalizedModule = moduleName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    return permissionIds.some((permissionId) => permissionId.startsWith(`${normalizedModule}_`));
  }, [permissionIds]);

  const roleLabels = useMemo(() => {
    const roles = getStoredRoles();
    return roleIds
      .map((roleId) => roles.find((candidate) => candidate.id === roleId)?.name)
      .filter((label): label is string => Boolean(label));
  }, [roleIds]);

  /** Active delegations where the current user is the delegatee */
  const activeDelegations = useMemo(() => {
    if (!user?.id) return [];
    return getActiveDelegationsForUser(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roleSwitchEpoch]);

  const value: AuthContextType = {
    user,
    role,
    roleIds,
    roleLabels,
    permissionIds,
    appMode,
    isLoading,
    isAdmin: role === "admin",
    isPublic: role === "public",
    activeRoleId,
    activeAgencyCode,
    roleSwitchEpoch,
    setActiveRoleId,
    setActiveAgencyCode,
    bumpEpoch,
    switchPersona,
    activeDelegations,
    login,
    logout,
    hasPermission,
    canAccessModule,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
