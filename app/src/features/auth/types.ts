export interface AuthUser {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  role: string;
  is_active: number;
  last_login_at?: string | null;
}

export interface AuthSession {
  userId: string;
  clinicId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: number;
}

