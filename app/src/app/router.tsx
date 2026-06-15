/**
 * router.tsx — TanStack Router com todas as rotas do sistema
 */
import { createRouter, createRoute, createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Layout
import { AppShell } from "@/components/layout/AppShell";
import { isAuthenticated } from "@/features/auth/session";

// Pages (lazy loaded)
const LoginPage       = lazy(() => import("@/features/auth/pages/LoginPage"));
const DashboardPage   = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const AgendaPage       = lazy(() => import("@/features/agenda/pages/AgendaPage"));
const PatientsPage    = lazy(() => import("@/features/patients/pages/PatientsPage"));
const PatientRecord   = lazy(() => import("@/features/patients/pages/PatientRecordPage"));
const ProceduresPage  = lazy(() => import("@/features/procedures/pages/ProceduresPage"));
const NewProcedurePage = lazy(() => import("@/features/procedures/pages/NewProcedurePage"));
const ExecuteProcedurePage = lazy(() => import("@/features/procedures/pages/ExecuteProcedurePage"));
const InventoryPage   = lazy(() => import("@/features/inventory/pages/InventoryPage"));
const InventoryEntryPage = lazy(() => import("@/features/inventory/pages/InventoryEntryPage"));
const InventoryItemFormPage = lazy(() => import("@/features/inventory/pages/InventoryItemFormPage"));
const EquipmentPage = lazy(() => import("@/features/inventory/pages/EquipmentPage"));
const SuppliersPage = lazy(() => import("@/features/inventory/pages/SuppliersPage"));
const InventoryFinancialPage = lazy(() => import("@/features/inventory/pages/InventoryFinancialPage"));
const InventoryLocationsPage = lazy(() => import("@/features/inventory/pages/InventoryLocationsPage"));
const MedicationsPage = lazy(() => import("@/features/medications/pages/MedicationsPage"));
const MaterialsPage   = lazy(() => import("@/features/materials/pages/MaterialsPage"));
const LabelsPage      = lazy(() => import("@/features/labels/pages/LabelsPage"));
const ProtocolsPage   = lazy(() => import("@/features/protocols/pages/ProtocolsPage"));
const ReportsPage     = lazy(() => import("@/features/reports/pages/ReportsPage.tsx"));
const PurchasePlanPage = lazy(() => import("@/features/reports/pages/PurchasePlanPage.tsx"));
const AuditPage       = lazy(() => import("@/features/audit/pages/AuditPage"));
const SettingsPage    = lazy(() => import("@/features/settings/pages/SettingsPage"));
const ImportExportPage = lazy(() => import("@/features/import-export/pages/ImportExportPage"));
const BackupPage      = lazy(() => import("@/features/backup/pages/BackupPage"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin w-8 h-8 rounded-full border-2 border-[var(--color-green-deep)] border-t-transparent" />
  </div>
);

// Root
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Login (sem shell)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>,
});

// Shell routes
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "shell",
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/",
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
  component: () => null,
});

const dashboardRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/dashboard",
  component: () => <DashboardPage />,
});

const appointmentsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/agenda",
  component: () => <AgendaPage />,
});

const patientsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/patients",
  component: () => <PatientsPage />,
});

const patientRecordRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/patients/$patientId",
  component: () => <PatientRecord />,
});

const patientApplicationsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/patients/$patientId/applications",
  component: () => <PatientRecord />,
});

const patientApplicationNewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/patients/$patientId/applications/new",
  component: () => <PatientRecord />,
});

const patientApplicationDetailsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/patients/$patientId/applications/$applicationPlanId",
  component: () => <PatientRecord />,
});

const proceduresRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/procedures",
  component: () => <ProceduresPage />,
});

const newProcedureRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/procedures/new",
  validateSearch: (search: Record<string, unknown>): { patientId?: string; procedureId?: string } => ({
    patientId: typeof search.patientId === "string" ? search.patientId : undefined,
    procedureId: typeof search.procedureId === "string" ? search.procedureId : undefined,
  }),
  component: () => <NewProcedurePage />,
});

const executeProcedureRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/procedures/execute/$applicationPlanId",
  component: () => <ExecuteProcedurePage />,
});

const inventoryRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory",
  validateSearch: (search: Record<string, unknown>) => ({
    success: search.success === true || search.success === "true" ? true : undefined,
  }),
  component: () => <InventoryPage />,
});

const inventoryEntryRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory/entry",
  component: () => <InventoryEntryPage />,
});

const inventoryItemNewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory/items/new",
  validateSearch: (search: Record<string, unknown>) => ({
    type: typeof search.type === "string" ? search.type : undefined,
  }),
  component: () => <InventoryItemFormPage />,
});

const inventoryItemEditRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory/items/$itemId/edit",
  component: () => <InventoryItemFormPage />,
});

const medicationsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/medications",
  component: () => <MedicationsPage />,
});

const materialsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/materials",
  component: () => <MaterialsPage />,
});

const equipmentRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/equipment",
  component: () => <EquipmentPage />,
});

const inventoryFinancialRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory/financial",
  component: () => <InventoryFinancialPage />,
});

const suppliersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory/suppliers",
  component: () => <SuppliersPage />,
});

const inventoryLocationsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/inventory/locations",
  component: () => <InventoryLocationsPage />,
});

const labelsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/labels",
  validateSearch: (
    search: Record<string, unknown>,
  ): { jobId?: string; batchId?: string; qr?: string } => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
    batchId: typeof search.batchId === "string" ? search.batchId : undefined,
    qr: typeof search.qr === "string" ? search.qr : undefined,
  }),
  component: () => <LabelsPage />,
});

const protocolsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/protocols",
  component: () => <ProtocolsPage />,
});

const reportsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/reports",
  component: () => <ReportsPage />,
});

const purchasePlanRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/reports/purchase-plan",
  component: () => <PurchasePlanPage />,
});

const auditRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/audit",
  component: () => <AuditPage />,
});

const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/settings",
  component: () => <SettingsPage />,
});

const importExportRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/settings/import-export",
  component: () => <ImportExportPage />,
});

const backupRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/backup",
  component: () => <BackupPage />,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  shellRoute.addChildren([
    indexRoute,
    dashboardRoute,
    appointmentsRoute,
    patientsRoute,
    patientRecordRoute,
    patientApplicationsRoute,
    patientApplicationNewRoute,
    patientApplicationDetailsRoute,
    proceduresRoute,
    newProcedureRoute,
    executeProcedureRoute,
    inventoryRoute,
    inventoryEntryRoute,
    inventoryItemNewRoute,
    inventoryItemEditRoute,
    inventoryFinancialRoute,
    inventoryLocationsRoute,
    medicationsRoute,
    materialsRoute,
    equipmentRoute,
    suppliersRoute,
    labelsRoute,
    protocolsRoute,
    reportsRoute,
    purchasePlanRoute,
    auditRoute,
    settingsRoute,
    importExportRoute,
    backupRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}
