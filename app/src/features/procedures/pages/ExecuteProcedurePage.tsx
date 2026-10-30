import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Check, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import Select from "react-select";

// Hooks
import { useSaveDraftProcedure, useFinalizeProcedure } from "../hooks/useProcedures";
import { useBodyAreas, useAdministrationRoutes } from "../hooks/useBodyAreas";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useEvolutionTemplates } from "@/features/protocols/hooks/useEvolutionTemplates";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { patientApplicationsService } from "@/features/patients/services/patientApplications.service";
import { protocolsService } from "@/features/protocols/services/protocols.service";

// Components
import { MultiBodyAreaSelector } from "../components/MultiBodyAreaSelector";
import { ProcedureApplicationCard } from "../components/ProcedureApplicationCard";
import { ProcedureEvolutionPanel } from "../components/ProcedureEvolutionPanel";
import { PatientProcedureHistory } from "../components/PatientProcedureHistory";
import { FinancialCheckoutPanel } from "../components/FinancialCheckoutPanel";
import { ProcedurePlanSelector, type PlanChargeMode } from "../components/ProcedurePlanSelector";
import { useActivePatientPlan } from "@/features/plans/hooks/usePatientPlans";

// Types
import type { Procedure, ProcedureApplication } from "../types";
import { type RouteCode } from "../constants/bodyAreaMap";

function toRouteCode(name: string | null | undefined): RouteCode | null {
  if (!name) return null;
  const upper = name.toUpperCase();
  if (upper === "EV" || upper.includes("ENDOVENOSA") || upper.includes("INTRAVENOSA")) return "EV";
  if (upper === "IM" || upper.includes("INTRAMUSCULAR")) return "IM";
  if (upper === "SC" || upper.includes("SUBCUT") || upper.includes("SUBCUTÂNEA")) return "SC";
  return null;
}

function newEmptyApplication(bodyAreaId?: string, bodyAreaName?: string): ProcedureApplication {
  return {
    id: crypto.randomUUID(),
    protocolId: null,
    bodyAreaId: bodyAreaId ?? null,
    bodyAreaName: bodyAreaName ?? null,
    notes: null,
    items: [],
  };
}

export default function ExecuteProcedurePage() {
  const { applicationPlanId } = useParams({ strict: false }) as { applicationPlanId: string };
  const navigate = useNavigate();

  const { data: patients = [] } = usePatients("", true);
  const { data: protocols = [] } = useProtocols();
  const { data: templates = [] } = useEvolutionTemplates();
  const { data: inventoryData } = useInventoryOptions();
  const { data: bodyAreas = [] } = useBodyAreas();
  const { data: routes = [] } = useAdministrationRoutes();

  const saveDraft = useSaveDraftProcedure();
  const finalizeProcedure = useFinalizeProcedure();

  const [loadingPlan, setLoadingPlan] = useState(true);
  const [applications, setApplications] = useState<ProcedureApplication[]>([newEmptyApplication()]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  /** ID da aplicação que deve ser destacada/com foco (clicou no mapa em área já usada) */
  const [focusedAppId, setFocusedAppId] = useState<string | null>(null);
  
  const [financialData, setFinancialData] = useState<any>({
    subtotal: 0,
    discountAmount: 0,
    discountType: "fixed",
    totalAmount: 0,
    paymentMethod: "",
    paymentStatus: "pending"
  });

  const { register, handleSubmit, watch, setValue, control } = useForm<Partial<Procedure>>({
    defaultValues: {
      patientId: "",
      notes: "",
      hadIntercurrence: 0,
      intercurrenceDescription: "",
      applicationPlanId,
    },
  });

  const patientId = watch("patientId");
  const hadIntercurrence = Boolean(watch("hadIntercurrence"));
  const intercurrenceDescription = watch("intercurrenceDescription");
  const notes = watch("notes");

  const [planChargeMode, setPlanChargeMode] = useState<PlanChargeMode>("included");
  const { data: activePlan } = useActivePatientPlan(patientId);

  // Load plan data
  useEffect(() => {
    async function load() {
      try {
        const plan = await patientApplicationsService.getById(applicationPlanId);
        if (plan) {
          setValue("patientId", plan.patientId);

          let initialItems: any[] = [];
          const protocolWithItems = await protocolsService.getProtocolWithItems(plan.protocolId);
          if (protocolWithItems?.items.length) {
            initialItems = protocolWithItems.items.map((item: any) => ({
              inventoryItemId: item.inventoryItemId,
              itemType: item.itemRole,
              quantityUsed: item.defaultQuantity,
              unit: item.unit,
              inventoryBatchId: "",
              notes: item.notes ?? null,
            }));
          }

          setApplications([{
            id: crypto.randomUUID(),
            protocolId: plan.protocolId,
            bodyAreaId: null, // Resolvido pela interface
            bodyAreaName: null, // Será resolvido pela interface
            notes: null,
            items: initialItems,
          }]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPlan(false);
      }
    }
    load();
  }, [applicationPlanId, setValue]);

  const activeBodyAreaIds = applications.map((a) => a.bodyAreaId).filter(Boolean) as string[];

  // Deriva a via recomendada do aplicativo em foco (para bloquear visualmente o mapa)
  let activeRouteCode: RouteCode | null = null;
  const appToInspect = applications.find(a => a.id === focusedAppId) || (applications.length === 1 ? applications[0] : null);
  if (appToInspect && inventoryData && routes.length > 0) {
    const medicationWithRoute = appToInspect.items.find((item: any) => {
      const inv = inventoryData.items.find((i: any) => i.id === item.inventoryItemId);
      return inv?.administration_route_id;
    });

    if (medicationWithRoute) {
      const inv = inventoryData.items.find((i: any) => i.id === medicationWithRoute.inventoryItemId);
      if (inv) {
        const route = routes.find(r => r.id === inv.administration_route_id);
        if (route) {
          activeRouteCode = toRouteCode(route.name);
        }
      }
    }
  }

  // Generate Evolution Text Preview
  useEffect(() => {
    const generatePreview = () => {
      const firstApp = applications[0];
      const selectedProtocol = protocols.find(p => p.id === firstApp?.protocolId);
      let targetTemplate = templates.find(t => t.id === selectedProtocol?.defaultEvolutionTemplateId) 
                        || templates.find(t => Boolean(t.isDefault))
                        || templates[0];
      
      const templateText = targetTemplate?.templateText || `Paciente {{patient_name}} realizou {{protocol_name}} em {{procedure_date}}.

Área registrada: {{body_area}}.

Medicamentos utilizados:
{{medications}}

Materiais utilizados:
{{materials}}

Procedimento registrado {{intercurrence_status}}.`;

      const patientName = patients.find(p => p.id === patientId)?.full_name || "Paciente não selecionado";
      const protocolName = applications.map(a => protocols.find(p => p.id === a.protocolId)?.name).filter(Boolean).join(", ") || "Procedimento avulso";
      const areaNames = applications.map(a => {
        const ba = bodyAreas.find((b: any) => b.id === a.bodyAreaId);
        return ba?.displayName || ba?.name;
      }).filter(Boolean).join(", ");
      
      const allItems = applications.flatMap(a => a.items);
      const medicationsList = allItems.filter(i => i.itemType === 'medication').map(i => {
        const inv = inventoryData?.items.find((inv: any) => inv.id === i.inventoryItemId);
        return `- ${inv?.name || "Item Desconhecido"} (${i.quantityUsed} ${i.unit})`;
      }).join("\n");
      const materialsList = allItems.filter(i => i.itemType === 'material').map(i => {
        const inv = inventoryData?.items.find((inv: any) => inv.id === i.inventoryItemId);
        return `- ${inv?.name || "Item Desconhecido"} (${i.quantityUsed} ${i.unit})`;
      }).join("\n");

      let text = templateText;
      text = text.replace(/{{patient_name}}/g, patientName);
      text = text.replace(/{{procedure_date}}/g, new Date().toLocaleDateString("pt-BR"));
      text = text.replace(/{{protocol_name}}/g, protocolName);
      text = text.replace(/{{body_area}}/g, areaNames || "Múltiplas áreas");
      text = text.replace(/{{medications}}/g, medicationsList || "Nenhum medicamento");
      text = text.replace(/{{materials}}/g, materialsList || "Nenhum material");
      
      const intercorrenciaTexto = hadIntercurrence ? `COM intercorrência: ${intercurrenceDescription || 'Sem detalhes'}` : "SEM intercorrências";
      text = text.replace(/{{intercurrence_status}}/g, intercorrenciaTexto);

      setValue("evolutionText", text);
    };

    if (!loadingPlan) {
      generatePreview();
    }
  }, [patientId, applications, notes, hadIntercurrence, intercurrenceDescription, inventoryData, patients, protocols, bodyAreas, templates, setValue, loadingPlan]);

  const showMessage = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 6000);
    }
  };

  const onSubmit = async (data: Partial<Procedure>, action: "draft" | "finalize") => {
    if (!data.patientId) {
      showMessage("error", "Selecione o paciente.");
      return;
    }

    const payload = {
      procedure: {
        ...data,
        ...financialData,
        applicationPlanId,
        patientPlanId: activePlan ? activePlan.id : null,
        planChargeMode: activePlan ? planChargeMode : "full_price",
      },
      applications: applications.map(app => ({
        ...app,
        items: app.items.map((item: any) => ({
          ...item,
          quantityUsed: Number(item.quantityUsed)
        }))
      }))
    };

    try {
      if (action === "draft") {
        const procedureId = await saveDraft.mutateAsync(payload);
        setValue("id", procedureId);
        showMessage("success", "Rascunho salvo com sucesso.");
      } else {
        if (applications.length === 0) {
          showMessage("error", "Adicione pelo menos uma aplicação.");
          return;
        }
        for (const app of applications) {
          if (!app.bodyAreaId) {
            showMessage("error", "Selecione a área corporal para todas as aplicações antes de finalizar.");
            return;
          }
        }
        
        let idToFinalize = data.id;
        if (!idToFinalize) {
          idToFinalize = await saveDraft.mutateAsync(payload);
          setValue("id", idToFinalize);
        }
        
        payload.procedure.id = idToFinalize;
        await finalizeProcedure.mutateAsync(payload);
        showMessage("success", "Procedimento finalizado com sucesso!");
        setTimeout(() => navigate({ to: `/patients/${data.patientId}` }), 1500);
      }
    } catch (error) {
      showMessage("error", String(error));
    }
  };

  // ─── Handlers de Aplicação ──────────────────────────────────────────────────

  function handleMapAreaClick(areaKey: string, bodyAreaId: string) {
    const dbArea = bodyAreas.find((a: any) => a.id === bodyAreaId);
    const bodyAreaName = dbArea?.displayName || dbArea?.name || areaKey;

    setApplications((prev) => {
      const existingIdx = prev.findIndex((a) => a.bodyAreaId === bodyAreaId);
      if (existingIdx !== -1) {
        const existingId = prev[existingIdx].id!;
        setTimeout(() => {
          setFocusedAppId(existingId);
          document.getElementById(`app-card-${existingId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          setTimeout(() => setFocusedAppId(null), 2000);
        }, 50);
        return prev;
      }

      const noAreaIdx = prev.findIndex((a) => !a.bodyAreaId);
      if (noAreaIdx !== -1) {
        const updated = [...prev];
        const filledId = updated[noAreaIdx].id!;
        updated[noAreaIdx] = { ...updated[noAreaIdx], bodyAreaId, bodyAreaName };
        setTimeout(() => {
          setFocusedAppId(filledId);
          document.getElementById(`app-card-${filledId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          setTimeout(() => setFocusedAppId(null), 1500);
        }, 50);
        return updated;
      }

      const newApp = newEmptyApplication(bodyAreaId, bodyAreaName);
      setTimeout(() => {
        setFocusedAppId(newApp.id!);
        document.getElementById(`app-card-${newApp.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setTimeout(() => setFocusedAppId(null), 1500);
      }, 100);
      return [...prev, newApp];
    });
  }

  function handleAddApplication() {
    setApplications((prev) => [...prev, newEmptyApplication()]);
  }

  function handleRemoveApplication(index: number) {
    setApplications((prev) => prev.filter((_, i) => i !== index));
  }

  function handleApplicationChange(index: number, updatedApp: ProcedureApplication) {
    setApplications((prev) => {
      const newApps = [...prev];
      newApps[index] = updatedApp;
      return newApps;
    });
  }

  const isPending = saveDraft.isPending || finalizeProcedure.isPending;

  if (loadingPlan) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header procedure-page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: `/patients/${patientId}` })} className="btn btn-ghost btn-icon">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Executar Aplicação Planejada</h1>
            <p className="page-subtitle">Finalizando o procedimento vinculado ao plano.</p>
          </div>
        </div>
        <div className="procedure-action-group">
          <button
            type="button"
            onClick={() => handleSubmit((data) => onSubmit(data, "draft"))()}
            disabled={isPending}
            className="btn btn-secondary"
          >
            <Save size={16} /> Salvar Rascunho
          </button>
          <button
            type="button"
            onClick={() => handleSubmit((data) => onSubmit(data, "finalize"))()}
            disabled={isPending}
            className="btn btn-primary bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm"
          >
            <Check size={16} /> {isPending ? "Salvando..." : "Finalizar & Baixar Estoque"}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-green-50 text-green-800 border-l-4 border-green-500">
          <Check size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-800 border-l-4 border-red-500">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {/* Layout 3 colunas: Paciente | Mapa | Aplicações */}
      <div className="flex flex-col xl:flex-row gap-4 min-h-0">
        
        {/* ── COLUNA ESQUERDA: Paciente + Histórico ── */}
        <div className="w-full xl:w-[260px] flex-shrink-0 flex flex-col gap-4">
          <div className="card" style={{ borderColor: "var(--color-gray-200)" }}>
            <div className="procedure-card-heading">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Sessão Clínica</h2>
                <p className="text-xs text-gray-500">Paciente do plano.</p>
              </div>
            </div>
            <div className="px-3 pb-3">
              <div className="form-group mb-0">
                <label className="form-label text-sm text-gray-600 font-medium">Paciente *</label>
                <Controller
                  name="patientId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { onChange, value, ref } }) => (
                    <Select
                      ref={ref}
                      options={patients.map((p: any) => ({ value: p.id, label: p.full_name }))}
                      value={
                        patients.find((p: any) => p.id === value)
                          ? { value, label: patients.find((p: any) => p.id === value)?.full_name ?? "" }
                          : null
                      }
                      onChange={(val) => onChange(val?.value || "")}
                      placeholder="Buscar paciente..."
                      noOptionsMessage={() => "Nenhum paciente encontrado"}
                      isClearable
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: "#f9fafb",
                          borderColor: "#d1d5db",
                          fontSize: "0.875rem",
                          minHeight: "38px",
                          boxShadow: "none",
                          "&:hover": { borderColor: "#9ca3af" },
                        }),
                        menu: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  )}
                />
              </div>

              {/* Vínculo de Plano Saúde 360® */}
              <div className="mt-3">
                <ProcedurePlanSelector
                  patientId={patientId}
                  chargeMode={planChargeMode}
                  onChangeChargeMode={setPlanChargeMode}
                />
              </div>
            </div>
          </div>

          <PatientProcedureHistory patientId={patientId || null} />
        </div>

        {/* ── COLUNA CENTRAL: Mapa Corporal ── */}
        <div className="w-full xl:w-[340px] flex-shrink-0 flex flex-col gap-2">
          <div className="card flex-1 flex flex-col" style={{ borderColor: "var(--color-gray-200)" }}>
            <div className="procedure-card-heading flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Mapa Corporal</h2>
                <p className="text-xs text-gray-500">Clique para adicionar aplicações</p>
              </div>
            </div>
            <div className="px-3 pb-3 flex-1 flex flex-col">
              <MultiBodyAreaSelector
                selectedBodyAreaIds={activeBodyAreaIds}
                bodyAreas={bodyAreas}
                activeRouteCode={activeRouteCode}
                onAreaClick={handleMapAreaClick}
              />
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: Aplicações + Evolução ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
          {/* Aplicações */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Aplicações{" "}
                  <span className="text-sm font-normal text-gray-400">
                    ({applications.length})
                  </span>
                </h2>
                <p className="text-xs text-gray-500">
                  Use o mapa para selecionar áreas ou adicione avulsas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddApplication}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} /> Aplicação avulsa
              </button>
            </div>

            {applications.map((app, index) => (
              <div key={app.id || index} id={`app-card-${app.id}`}>
                <ProcedureApplicationCard
                  application={app}
                  index={index}
                  protocols={protocols}
                  bodyAreas={bodyAreas}
                  inventoryData={inventoryData}
                  onChange={(updated) => handleApplicationChange(index, updated)}
                  onRemove={() => handleRemoveApplication(index)}
                  canRemove={applications.length > 1}
                  isFocused={focusedAppId === app.id}
                />
              </div>
            ))}
          </div>

          {/* Evolução */}
          <ProcedureEvolutionPanel
            register={register}
            hadIntercurrence={hadIntercurrence}
          />
          
          {/* Resumo Financeiro */}
          <FinancialCheckoutPanel 
            applications={applications}
            protocols={protocols}
            inventoryData={inventoryData}
            onFinancialDataChange={setFinancialData}
          />
        </div>
      </div>
    </>
  );
}
