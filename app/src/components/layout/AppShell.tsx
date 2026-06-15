/**
 * AppShell.tsx - Layout principal: sidebar + conteudo
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { authService } from "@/features/auth/services/auth.service";
import { getIdleTimeoutMs } from "@/features/auth/session";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { OnboardingProvider } from "@/features/onboarding/OnboardingContext";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <OnboardingProvider>
      <div className={`app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

        <main className="main-content">
          <header className="header">
            <div className="header-search">
              <Search size={16} />
              <input type="text" placeholder="Buscar pacientes, medicamentos, lotes..." />
            </div>

            <div className="header-actions">
              <NotificationBell />
              <Link to="/procedures" className="btn btn-primary">
                <Plus size={16} />
                Nova Aplicacao
              </Link>
            </div>
          </header>

          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </OnboardingProvider>
  );
}
