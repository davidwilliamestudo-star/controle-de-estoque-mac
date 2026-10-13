import type { AuthSession } from "./types";

const AUTH_SESSION_KEY = "dra_ana_auth_session";
const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;

export function getIdleTimeoutMs(): number {
  return DEFAULT_IDLE_TIMEOUT_MINUTES * 60 * 1000;
}

export function createSessionPayload(user: {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  role: string;
}): AuthSession {
  return {
    userId: user.id,
    clinicId: user.clinic_id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + getIdleTimeoutMs(),
  };
}

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session || !session.expiresAt || session.expiresAt < Date.now()) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function refreshStoredAuthSession(): AuthSession | null {
  const session = getStoredAuthSession();
  if (!session) return null;

  const refreshed = {
    ...session,
    expiresAt: Date.now() + getIdleTimeoutMs(),
  };
  setStoredAuthSession(refreshed);
  return refreshed;
}

export function clearStoredAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return getStoredAuthSession() !== null;
}

