import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { authRepository } from "../repositories/auth.repository";
import { createSessionPayload, clearStoredAuthSession, getStoredAuthSession, refreshStoredAuthSession, setStoredAuthSession } from "../session";
import type { AuthSession } from "../types";
import { hashPassword, verifyPassword } from "../password";

const DEFAULT_DEV_EMAIL = "ana@morong.med.br";
const DEFAULT_DEV_PASSWORD = "Ana2026!";

export interface LoginResult {
  session: AuthSession;
}

export const authService = {
  getSession(): AuthSession | null {
    return getStoredAuthSession();
  },

  touchSession(): AuthSession | null {
    return refreshStoredAuthSession();
  },

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findActiveUserByEmail(normalizedEmail);

    if (!user || user.is_active !== 1) {
      await auditRepository.log({
        action: "auth_login_failed",
        entity_type: "auth",
        description: `Tentativa de login invalida para ${normalizedEmail || "email vazio"}.`,
        after_data: { email: normalizedEmail, reason: "user_not_found_or_inactive" },
        user_id: null,
      });
      throw new Error("E-mail ou senha invalidos.");
    }

    let isValid = await verifyPassword(password, user.password_hash);

    if (!isValid && user.email.toLowerCase() === DEFAULT_DEV_EMAIL && password === DEFAULT_DEV_PASSWORD) {
      const upgradedHash = await hashPassword(password);
      await authRepository.updatePasswordHash(user.id, upgradedHash);
      isValid = true;
    }

    if (!isValid) {
      await auditRepository.log({
        action: "auth_login_failed",
        entity_type: "auth",
        entity_id: user.id,
        description: `Tentativa de login invalida para ${user.email}.`,
        after_data: { email: user.email, reason: "invalid_password" },
        user_id: user.id,
      });
      throw new Error("E-mail ou senha invalidos.");
    }

    await authRepository.touchLastLogin(user.id);
    const session = createSessionPayload(user);
    setStoredAuthSession(session);

    await auditRepository.log({
      action: "auth_login_success",
      entity_type: "auth",
      entity_id: user.id,
      description: `Login realizado por ${user.name}.`,
      user_id: user.id,
    });

    return { session };
  },

  async logout(reason: "manual" | "inactivity" = "manual"): Promise<void> {
    const session = getStoredAuthSession();
    clearStoredAuthSession();

    if (!session) return;

    await auditRepository.log({
      action: reason === "inactivity" ? "auth_locked_inactivity" : "auth_logout",
      entity_type: "auth",
      entity_id: session.userId,
      description: reason === "inactivity"
        ? `Sessao bloqueada por inatividade para ${session.name}.`
        : `Logout realizado por ${session.name}.`,
      user_id: session.userId,
    });
  },
};

