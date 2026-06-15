/**
 * Sidebar.tsx - Menu lateral com toggle animado e identidade visual aprovada
 */
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Package,
  Pill,
  QrCode,
  Settings,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  section?: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", section: "Visao Geral" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/patients", icon: Users, label: "Pacientes", section: "Clinico" },
  { to: "/procedures", icon: Activity, label: "Aplicacoes" },
  { to: "/protocols", icon: FileText, label: "Protocolos" },
  { to: "/inventory", icon: Package, label: "Estoque", section: "Inventario" },
  { to: "/medications", icon: Pill, label: "Medicamentos" },
  { to: "/materials", icon: Boxes, label: "Materiais" },
  { to: "/equipment", icon: Wrench, label: "Equipamentos" },
  { to: "/labels", icon: QrCode, label: "Etiquetas" },
  { to: "/reports", icon: BarChart3, label: "Relatorios", section: "Gestao" },
  { to: "/audit", icon: Shield, label: "Auditoria" },
  { to: "/settings", icon: Settings, label: "Configuracoes", section: "Sistema" },
  { to: "/backup", icon: HardDrive, label: "Backup" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  let lastSection = "";

  return (
    <aside className="sidebar" id="main-sidebar">
      <button
        onClick={onToggle}
        className="sidebar-toggle-btn"
        title={collapsed ? "Expandir menu" : "Minimizar menu"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-header">
        {collapsed ? (
          <BrandLogo variant="collapsed" className="sidebar-logo-collapsed" />
        ) : (
          <BrandLogo variant="expanded" className="sidebar-logo" />
        )}
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.to) && item.to !== "/dashboard"
            ? currentPath === item.to || currentPath.startsWith(item.to + "/")
            : currentPath === item.to;

          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.to}>
              {showSection && !collapsed && (
                <div className="nav-section">
                  {item.section}
                </div>
              )}
              {showSection && collapsed && <div className="mt-3" />}

              <Link
                to={item.to as string}
                className={`nav-item ${isActive ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile" title="Usuário logado">
          <div className="user-avatar">AM</div>
          {!collapsed && (
            <div className="user-info">
              <div className="user-name">Dra. Ana Morong</div>
              <div className="user-role">Medica</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
