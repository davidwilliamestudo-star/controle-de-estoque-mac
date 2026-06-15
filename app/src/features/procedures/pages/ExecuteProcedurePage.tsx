import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

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
import { BodyAreaSelector } from "../components/BodyAreaSelector";
import { ProcedureContextCard } from "../components/ProcedureContextCard";
import { ProcedureAreaDetails } from "../components/ProcedureAreaDetails";
import { ProcedureItemsPanel } from "../components/ProcedureItemsPanel";
import { ProcedureEvolutionPanel } from "../components/ProcedureEvolutionPanel";
import { PatientProcedureHistory } from "../components/PatientProcedureHistory";
import { ProcedureExecutionSidebar } from "../components/ProcedureExecutionSidebar";

// Types & Constants
import type { Procedure, ProcedureItemUsed } from "../types";
import type { BodyArea } from "../repositories/procedures.repository";
import { BODY_AREA_MAP, ROUTE_COLORS, type RouteCode } from "../constants/bodyAreaMap";

function toRouteCode(name: string | null | undefined): RouteCode | null {
  if (!name) return null;
  const upper = name.toUpperCase();
  if (upper === "EV" || upper.includes("ENDOVENOSA") || upper.includes("INTRAVENOSA")) return "EV";
  if (upper === "IM" || upper.includes("INTRAMUSCULAR")) return "IM";
  if (upper === "SC" || upper.includes("SUBCUT") || upper.includes("SUBCUTÂNEA")) return "SC";
  return null;
}

function safeRouteColor(code: RouteCode | null | string | undefined) {
  if (!code) return null;
  const key = String(code).toUpperCase();
  return (ROUTE_COLORS as any)[key] ?? null;
}

export default function ExecuteProcedurePage() {
  const { applicationPlanId } = useParams({ from: "/shell/procedures/execute/$applicationPlanId" });
  const navigate = useNavigate();

  const { data: patients = [] } = usePatients("", true);
  const { data: protocols = [] } = useProtocols();
  const { data: inventoryData } = useInventoryOptions();
  const { data: bodyAreas = [] } = useBodyAreas();
  const { data: routes = [] } = useAdministrationRoutes();

  const saveDraft = useSaveDraftProcedure();
  const finalizeProcedure = useFinalizeProcedure();

  const [items, setItems] = useState<Partial<ProcedureItemUsed>[]>([]);
  const [selectedRouteCode, setSelectedRouteCode] = useState<RouteCode | null>(null);
  const [selectedAreaKey, setSelectedAreaKey] = useState<string | null>(null);
  const [manualRouteId, setManualRouteId] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [loadingPlan, setLoadingPlan] = useState(true);

  const { register, handleSubmit, watch, setValue, control } = useForm<Partial<Procedure>>({
    defaultValues: {
      patientId: "",
      protocolId: "",
      bodyAreaId: "",
      notes: "",
      hadIntercurrence: 0,
      intercurrenceDescription: "",
      applicationPlanId: applicationPlanId,
    }
  });

  const patientId = watch("patientId");
  const protocolId = watch("protocolId");
  const bodyAreaId = watch("bodyAreaId");
  const notes = watch("notes");
  const intercurrenceDescription = watch("intercurrenceDescription");
  const evolutionText = watch("evolutionText");
  const hadIntercurrence = Boolean(watch("hadIntercurrence"));

  // Load plan data
  useEffect(() => {
    async function load() {
      try {
        const plan = await patientApplicationsService.getById(applicationPlanId);
        if (plan) {
          setValue("patientId", plan.patientId);
          setValue("protocolId", plan.protocolId);
          setManualRouteId(plan.routeId);

          const protocolWithItems = await protocolsService.getProtocolWithItems(plan.protocolId);
          if (protocolWithItems?.items.length) {
            setItems(protocolWithItems.items.map(item => ({
              inventoryItemId: item.inventoryItemId,
              itemType: item.itemRole,
              quantityUsed: item.defaultQuantity,
              unit: item.unit,
              inventoryBatchId: "",
              notes: item.notes ?? null,
            })));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPlan(false);
      }
    }
    load();
  }, [applicationPlanId, setValue]);

  // Sincroniza via ativa pelo manualRouteId carregado do plano
  useEffect(() => {
    if (manualRouteId && routes.length > 0) {
      const route = routes.find(r => r.id === manualRouteId);
      setSelectedRouteCode(route ? toRouteCode(route.name) : null);
    } else {
      setSelectedRouteCode(null);
    }
  }, [manualRouteId, routes]);

  const handleAreaSelect = (areaKey: string, areaId: string) => {
    setSelectedAreaKey(areaKey);
    setValue("bodyAreaId", areaId);
  };

  const { data: templates = [] } = useEvolutionTemplates();

  const handleClearArea = () => {
    setSelectedAreaKey(null);
    setValue("bodyAreaId", "");
  };

  // Generate Evolution Text Preview
  useEffect(() => {
    const generatePreview = async () => {
      // Usar template vinculado ao protocolo selecionado ou default/geral
      const selectedProtocol = protocols.find(p => p.id === protocolId);
      let targetTemplate = templates.find(t => t.id === selectedProtocol?.defaultEvolutionTemplateId) 
                        || templates.find(t => Boolean(t.isDefault))
                        || templates[0];
      
      const templateText = targetTemplate?.templateText || `
Paciente: {{paciente_nome}}
Data: {{data_procedimento}}
Protocolo: {{protocolo_nome}}
Área Corporal: {{area_corporal}}
Via de Aplicação: {{via_aplicacao}}

Medicamentos Utilizados:
{{medicamentos}}

Materiais Utilizados:
{{materiais}}

Lotes Utilizados:
{{lotes}}
Validades:
{{validade_lotes}}

Status: {{intercorrencia}}
Observações: {{observacoes}}
Profissional Responsável: {{profissional}}
      `.trim();

      const patientName = patients.find(p => p.id === patientId)?.full_name || "Não selecionado";
      const protocolName = selectedProtocol?.name || "Avulso/Não selecionado";
      const ba = bodyAreas.find((b: any) => b.id === bodyAreaId);
      const bodyAreaName = ba?.displayName || ba?.name || "Não informada";
      const routeName = routes.find(r => r.id === manualRouteId)?.name || "Via não definida";

      const medicationsList = items.filter((i: any) => i.itemType === 'medication').map((i: any) => {
        const name = inventoryData?.items.find((inv: any) => inv.id === i.inventoryItemId)?.name || "Item Desconhecido";
        return `- ${name} (${i.quantityUsed} ${i.unit})`;
      }).join("\n");

      const materialsList = items.filter((i: any) => i.itemType === 'material').map((i: any) => {
        const name = inventoryData?.items.find((inv: any) => inv.id === i.inventoryItemId)?.name || "Item Desconhecido";
        return `- ${name} (${i.quantityUsed} ${i.unit})`;
      }).join("\n");

      const batchesList = items.map((i: any) => {
        const batchNumber = i.inventoryBatchId || "Não Selecionado";
        return `- Lote: ${batchNumber}`;
      }).join("\n");

      const expirationList = items.map((i: any) => {
        return `- Val: ND`;
      }).join("\n");

      let text = templateText;
      text = text.replace(/{{paciente_nome}}/g, patientName);
      text = text.replace(/{{data_procedimento}}/g, new Date().toLocaleDateString("pt-BR"));
      text = text.replace(/{{protocolo_nome}}/g, protocolName);
      text = text.replace(/{{via_aplicacao}}/g, routeName);
      text = text.replace(/{{area_corporal}}/g, bodyAreaName);
      text = text.replace(/{{medicamentos}}/g, medicationsList || "Nenhum medicamento");
      text = text.replace(/{{materiais}}/g, materialsList || "Nenhum material");
      text = text.replace(/{{lotes}}/g, batchesList || "Nenhum lote");
      text = text.replace(/{{validade_lotes}}/g, expirationList || "N/D");
      
      const intercorrenciaTexto = hadIntercurrence ? `COM intercorrência: ${intercurrenceDescription || 'Sem detalhes'}` : "SEM intercorrências";
      text = text.replace(/{{intercorrencia}}/g, intercorrenciaTexto);
      text = text.replace(/{{observacoes}}/g, notes || "Sem observações adicionais");
      text = text.replace(/{{profissional}}/g, "Profissional Responsável");

      setValue("evolutionText", text);
    };

    generatePreview();
  }, [patientId, protocolId, bodyAreaId, notes, hadIntercurrence, intercurrenceDescription, items, inventoryData, patients, protocols, bodyAreas, routes, manualRouteId, templates, setValue]);

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
      showMessage("error", "Paciente não identificado no plano.");
      return;
    }

    const payload = {
      procedure: {
        ...data,
        protocolId: data.protocolId || null,
        bodyAreaId: data.bodyAreaId || null,
        applicationPlanId,
      },
      items: items.map(item => ({
        ...item,
        quantityUsed: Number(item.quantityUsed)
      }))
    };

    try {
      if (action === "draft") {
        await saveDraft.mutateAsync(payload);
        showMessage("success", "Rascunho salvo com sucesso.");
      } else {
        if (!data.bodyAreaId) {
          showMessage("error", "Selecione a área corporal antes de finalizar.");
          return;
        }
        if (items.length === 0 || items.some(item => !item.inventoryItemId || !item.quantityUsed)) {
          showMessage("error", "Informe os itens utilizados e suas quantidades antes de finalizar.");
          return;
        }
        const procedureId = await saveDraft.mutateAsync(payload);
        payload.procedure.id = procedureId;
        await finalizeProcedure.mutateAsync(payload);
        showMessage("success", "Procedimento finalizado com sucesso!");
        setTimeout(() => navigate({ to: `/patients/${data.patientId}` }), 1500);
      }
    } catch (error) {
      showMessage("error", String(error));
    }
  };

  const selectedAreaEntry = selectedAreaKey
    ? BODY_AREA_MAP.find(e => e.areaKey === selectedAreaKey) || null
    : null;
  const activeDbArea = bodyAreas.find((ba: any) => ba.id === bodyAreaId);
  const activeRouteColor = safeRouteColor(selectedRouteCode);
  const isPending = saveDraft.isPending || finalizeProcedure.isPending;
  const selectedPatient = patients.find(p => p.id === patientId);
  const selectedProtocol = protocols.find(p => p.id === protocolId);
  const selectedRoute = routes.find(r => r.id === manualRouteId);
  const routeLabel = selectedRouteCode
    ? `${selectedRouteCode}${selectedRoute?.description ? ` - ${selectedRoute.description}` : ""}`
    : selectedRoute?.name || "Via nao definida";

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
            <p className="page-subtitle">Finalizando o procedimento vinculado ao prontuário.</p>
          </div>
        </div>
        <div className="procedure-action-group">
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

      {successMsg && (
        <div className="clinical-alert clinical-alert-success">
          <Check size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="clinical-alert clinical-alert-danger">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      <div className="procedure-execution-page">
        {/* COLUNA 1: Contexto (Ready-only parts are useful, but let's reuse ContextCard) */}
        <div className="procedure-context-shell">
          <ProcedureContextCard 
            register={register}
            control={control}
            patients={patients}
            protocols={protocols}
            routes={routes}
            manualRouteId={manualRouteId}
            setManualRouteId={setManualRouteId}
            selectedRouteCode={selectedRouteCode}
            activeRouteColor={activeRouteColor}
          />
        </div>

        {/* COLUNA 2: Mapa Corporal Centralizado */}
        <div className="procedure-execution-stage">
        <div className="procedure-body-card w-full xl:max-w-[680px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-auto">
          <div className="procedure-body-card-header">
            <div>
              <h2>Mapa Corporal Interativo</h2>
              <p>Selecione a area compativel com a via ativa.</p>
            </div>
            <div className="flex gap-2">
              {(["EV", "IM", "SC"] as RouteCode[]).map(code => {
                const c = ROUTE_COLORS[code];
                const isActive = selectedRouteCode === code;
                return (
                  <span key={code} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${isActive ? "font-medium" : "opacity-50"}`}
                    style={{
                      backgroundColor: isActive ? `${c.fill}15` : "transparent",
                      borderColor: isActive ? c.fill : "var(--color-gray-200)",
                      color: isActive ? c.stroke : "var(--color-gray-500)",
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? c.fill : "var(--color-gray-400)" }} />
                    {code}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex-1 p-2">
            <BodyAreaSelector
              routeCode={selectedRouteCode}
              selectedAreaKey={selectedAreaKey}
              bodyAreas={bodyAreas as BodyArea[]}
              onSelect={handleAreaSelect}
            />
          </div>
        </div>

        {/* COLUNA 3: Detalhes da Área, Itens e Evolução */}
        <ProcedureExecutionSidebar
          patientName={selectedPatient?.full_name || "Paciente nao selecionado"}
          protocolName={selectedProtocol?.name || "Procedimento avulso"}
          routeLabel={routeLabel}
          selectedRouteCode={selectedRouteCode}
          selectedAreaEntry={selectedAreaEntry}
          bodyAreaName={(activeDbArea as any)?.displayName || (activeDbArea as any)?.name}
          activeRouteColor={activeRouteColor}
          items={items}
          inventoryData={inventoryData}
          hadIntercurrence={hadIntercurrence}
          evolutionText={evolutionText}
        />
        </div>

        <div className="procedure-lower-grid">
          <ProcedureAreaDetails 
            selectedAreaEntry={selectedAreaEntry} 
            activeRouteColor={activeRouteColor} 
            clearSelection={handleClearArea}
            bodyAreaName={(activeDbArea as any)?.displayName || (activeDbArea as any)?.name}
            bodyAreaTechnicalName={(activeDbArea as any)?.technicalName}
          />
          <PatientProcedureHistory patientId={patientId || null} />
          <ProcedureItemsPanel 
            items={items} 
            setItems={setItems} 
            inventoryData={inventoryData} 
          />
          <ProcedureEvolutionPanel 
            register={register} 
            hadIntercurrence={hadIntercurrence} 
          />
        </div>
      </div>
    </>
  );
}
