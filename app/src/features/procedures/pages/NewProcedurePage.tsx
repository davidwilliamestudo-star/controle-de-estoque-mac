import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Save, Check, AlertTriangle, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import Select from "react-select";

// Hooks
import { useProcedureWithItems, useSaveDraftProcedure, useFinalizeProcedure } from "../hooks/useProcedures";
import { useBodyAreas, useAdministrationRoutes } from "../hooks/useBodyAreas";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useEvolutionTemplates } from "@/features/protocols/hooks/useEvolutionTemplates";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";

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

export default function NewProcedurePage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { patientId?: string; procedureId?: string };

  const { data: procedureData } = useProcedureWithItems(searchParams.procedureId || null);
  const { data: patients = [] } = usePatients("", true);
  const { data: protocols = [] } = useProtocols();
  const { data: templates = [] } = useEvolutionTemplates();
  const { data: inventoryData } = useInventoryOptions();
  const { data: bodyAreas = [] } = useBodyAreas();
  const { data: routes = [] } = useAdministrationRoutes();

  const saveDraft = useSaveDraftProcedure();
  const finalizeProcedure = useFinalizeProcedure();

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
      patientId: searchParams.patientId || "",
      notes: "",
      hadIntercurrence: 0,
      intercurrenceDescription: "",
    },
  });

  const patientId = watch("patientId");
  const hadIntercurrence = Boolean(watch("hadIntercurrence"));
  const intercurrenceDescription = watch("intercurrenceDescription");
  const notes = watch("notes");

  const [planChargeMode, setPlanChargeMode] = useState<PlanChargeMode>("included");
  const { data: activePlan } = useActivePatientPlan(patientId);

  const activeBodyAreaIds = applications.map((a) => a.bodyAreaId).filter(Boolean) as string[];

  // Deriva a via recomendada do aplicativo em foco (para bloquear visualmente o mapa)
  let activeRouteCode: RouteCode | null = null;
  const appToInspect = applications.find(a => a.id === focusedAppId) || (applications.length === 1 ? applications[0] : null);
  if (appToInspect && inventoryData && routes.length > 0) {
    const medicationWithRoute = appToInspect.items.find(item => {
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
    if (procedureData?.procedure.status === "finalized") return;

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

Procedimento registrado {{intercurrence_status}}.

Observações: {{notes}}`;

      const patientName = patients.find((p: any) => p.id === patientId)?.full_name || "Não selecionado";
      
      const protocolNames = applications.map(app => {
        const pName = protocols.find(p => p.id === app.protocolId)?.name || "Avulso";
        return pName;
      }).filter((v, i, a) => a.indexOf(v) === i).join(", ");

      const bodyAreaNames = applications.map(app => {
        const ba = bodyAreas.find((b: any) => b.id === app.bodyAreaId);
        return ba?.displayName || ba?.name || "Não informada";
      }).filter((v, i, a) => a.indexOf(v) === i).join(", ");

      const allItems = applications.flatMap(app => app.items || []);

      const medicationsList = allItems.filter(i => i.itemType === 'medication').map(i => {
        const name = inventoryData?.items.find((inv: any) => inv.id === i.inventoryItemId)?.name || "Item Desconhecido";
        return `- ${name} (${i.quantityUsed} ${i.unit})`;
      }).join("\n");

      const materialsList = allItems.filter(i => i.itemType === 'material').map(i => {
        const name = inventoryData?.items.find((inv: any) => inv.id === i.inventoryItemId)?.name || "Item Desconhecido";
        return `- ${name} (${i.quantityUsed} ${i.unit})`;
      }).join("\n");

      let text = templateText;
      text = text.replace(/{{patient_name}}/g, patientName);
      text = text.replace(/{{procedure_date}}/g, new Date().toLocaleDateString("pt-BR"));
      text = text.replace(/{{protocol_name}}/g, protocolNames || "Avulso");
      text = text.replace(/{{body_area}}/g, bodyAreaNames || "Não informada");
      text = text.replace(/{{medications}}/g, medicationsList || "Nenhum medicamento");
      text = text.replace(/{{materials}}/g, materialsList || "Nenhum material");
      
      const intercorrenciaTexto = hadIntercurrence ? `COM intercorrência: ${intercurrenceDescription || 'Sem detalhes'}` : "SEM intercorrências";
      text = text.replace(/{{intercurrence_status}}/g, intercorrenciaTexto);
      text = text.replace(/{{notes}}/g, notes || "Sem observações adicionais");

      setValue("evolutionText", text);
    };

    generatePreview();
  }, [
    applications, patientId, hadIntercurrence, intercurrenceDescription, notes, 
    inventoryData, patients, protocols, bodyAreas, templates, setValue, procedureData
  ]);

  // Carregar dados existentes se for edição
  useEffect(() => {
    if (procedureData) {
      setValue("patientId", procedureData.procedure.patientId);
      setValue("notes", procedureData.procedure.notes || "");
      setValue("hadIntercurrence", procedureData.procedure.hadIntercurrence);
      setValue("intercurrenceDescription", procedureData.procedure.intercurrenceDescription || "");

      if (procedureData.applications && procedureData.applications.length > 0) {
        const itemsByApp = new Map<string, typeof procedureData.items>();
        for (const item of procedureData.items) {
          const appId = (item as any).procedureApplicationId || "__legacy__";
          if (!itemsByApp.has(appId)) itemsByApp.set(appId, []);
          itemsByApp.get(appId)!.push(item);
        }

        const loadedApps: ProcedureApplication[] = procedureData.applications.map((app: any) => ({
          id: app.id,
          protocolId: app.protocol_id,
          protocolName: app.protocol_name,
          bodyAreaId: app.body_area_id,
          bodyAreaName: app.body_area_name,
          sortOrder: app.sort_order,
          notes: app.notes,
          items: itemsByApp.get(app.id) ?? [],
        }));

        setApplications(loadedApps.length > 0 ? loadedApps : [newEmptyApplication()]);
      } else if (procedureData.items.length > 0) {
        setApplications([
          {
            id: crypto.randomUUID(),
            protocolId: procedureData.procedure.protocolId,
            bodyAreaId: procedureData.procedure.bodyAreaId,
            items: procedureData.items,
          },
        ]);
      }
    }
  }, [procedureData, setValue]);

  // ─── Handlers de Aplicação ──────────────────────────────────────────────────

  /**
   * Clique no mapa corporal.
   * Lógica:
   *  1. Se já existe uma aplicação com essa bodyAreaId → focar/scrollar para ela (NÃO cria nova)
   *  2. Se existe algum card sem área ainda (independente de ter itens) → preenche com a área
   *  3. Se todos os cards já têm área → cria nova aplicação
   */
  function handleMapAreaClick(areaKey: string, bodyAreaId: string) {
    const dbArea = bodyAreas.find((a: any) => a.id === bodyAreaId);
    const bodyAreaName = dbArea?.displayName || dbArea?.name || areaKey;

    setApplications((prev) => {
      // 1. Já existe aplicação com essa área? → focar ela sem criar nova
      const existingIdx = prev.findIndex((a) => a.bodyAreaId === bodyAreaId);
      if (existingIdx !== -1) {
        const existingId = prev[existingIdx].id!;
        // Agendar foco depois do render
        setTimeout(() => {
          setFocusedAppId(existingId);
          document.getElementById(`app-card-${existingId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          // Remover foco após animação
          setTimeout(() => setFocusedAppId(null), 2000);
        }, 50);
        return prev; // sem mudança de estado
      }

      // 2. Existe card sem área (pode ter itens de protocolo já carregados)? → preencher
      const noAreaIdx = prev.findIndex((a) => !a.bodyAreaId);
      if (noAreaIdx !== -1) {
        const updated = [...prev];
        const filledId = updated[noAreaIdx].id!;
        updated[noAreaIdx] = { ...updated[noAreaIdx], bodyAreaId, bodyAreaName };
        // Focar o card preenchido
        setTimeout(() => {
          setFocusedAppId(filledId);
          document.getElementById(`app-card-${filledId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          setTimeout(() => setFocusedAppId(null), 1500);
        }, 50);
        return updated;
      }

      // 3. Todos os cards têm área → nova aplicação
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

  function handleApplicationChange(index: number, updated: ProcedureApplication) {
    setApplications((prev) => prev.map((app, i) => (i === index ? updated : app)));
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

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

    const hasAnyItem = applications.some((app) => app.items.length > 0);
    if (action === "finalize" && !hasAnyItem) {
      showMessage("error", "Adicione pelo menos um medicamento em uma das aplicações.");
      return;
    }

    const payload = {
      procedure: { 
        ...data, 
        ...financialData,
        id: searchParams.procedureId || undefined,
        patientPlanId: activePlan ? activePlan.id : null,
        planChargeMode: activePlan ? planChargeMode : "full_price",
      },
      applications,
    };

    try {
      if (action === "draft") {
        const id = await saveDraft.mutateAsync(payload);
        navigate({ to: "/procedures/new", search: { procedureId: id }, replace: true });
        showMessage("success", "Rascunho salvo com sucesso.");
      } else {
        let idToFinalize = searchParams.procedureId;
        if (!idToFinalize) {
          idToFinalize = await saveDraft.mutateAsync(payload);
        }
        payload.procedure.id = idToFinalize;
        await finalizeProcedure.mutateAsync(payload);
        showMessage("success", "Procedimento finalizado e estoque baixado com sucesso!");
        setTimeout(() => navigate({ to: "/procedures" }), 1500);
      }
    } catch (error) {
      showMessage("error", String(error));
    }
  };

  const isPending = saveDraft.isPending || finalizeProcedure.isPending;


  return (
    <>
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/procedures" })} className="btn btn-ghost btn-icon">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">
              {searchParams.procedureId ? "Editar Atendimento" : "Nova Aplicação"}
            </h1>
            <p className="page-subtitle">
              Clique nas áreas do corpo para criar aplicações. Medicamentos são controlados em ml.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSubmit((data) => onSubmit(data, "draft"))()}
            disabled={isPending}
            className="btn btn-secondary"
          >
            <Save size={16} /> Salvar Rascunho
          </button>
          <button
            onClick={() => handleSubmit((data) => onSubmit(data, "finalize"))()}
            disabled={isPending}
            className="btn btn-primary bg-green-600 hover:bg-green-700 text-white border-transparent"
          >
            <Check size={16} /> {isPending ? "Salvando..." : "Finalizar & Baixar Estoque"}
          </button>
        </div>
      </div>

      {/* Alertas */}
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
                <p className="text-xs text-gray-500">Selecione o paciente.</p>
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
