export type UserRole = "role1" | "role2" | "role3";
export type AuthRole = "admin" | UserRole;

export type AuthSession = {
  role: AuthRole;
  email: string;
};

const AUTH_STORAGE_KEY = "asap_auth_v1";

const USER_ROLE_ORDER: UserRole[] = ["role1", "role2", "role3"];

export function isUserRole(role: AuthRole): role is UserRole {
  return role === "role1" || role === "role2" || role === "role3";
}

export function getDefaultUserRoute(role: UserRole) {
  if (role === "role1" || role === "role2") return "/app/m1";
  return "/app/m3/dashboard";
}

export function getDefaultAppRoute(role: AuthRole) {
  if (role === "admin") return "/app/m3/dashboard";
  return getDefaultUserRoute(role);
}

export function canAccessUserRoute(role: UserRole, path: string) {
  if (path.startsWith("/app/settings") || path.startsWith("/app/history")) return true;
  if (path.startsWith("/app/m1")) return true;
  if (path.startsWith("/app/m2")) return role === "role2" || role === "role3";
  if (
    path.startsWith("/app/m3") ||
    path.startsWith("/app/dashboard") ||
    path.startsWith("/app/explore") ||
    path.startsWith("/app/business-case") ||
    path.startsWith("/app/import") ||
    path.startsWith("/app/component") ||
    path.startsWith("/app/ms/")
  ) {
    return role === "role3";
  }
  return false;
}

export function canAccessAppRoute(role: AuthRole, path: string) {
  if (role === "admin") {
    return canAccessUserRoute("role3", path);
  }
  return canAccessUserRoute(role, path);
}

export function getAllowedUserModules(role: UserRole) {
  const maxIndex = USER_ROLE_ORDER.indexOf(role);
  return USER_ROLE_ORDER.slice(0, maxIndex + 1);
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string; email?: string };
    if (!parsed || typeof parsed.email !== "string") {
      return null;
    }
    if (parsed.role === "admin" || parsed.role === "role1" || parsed.role === "role2" || parsed.role === "role3") {
      return { role: parsed.role, email: parsed.email };
    }
    if (parsed.role === "user") {
      return { role: "role3", email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
