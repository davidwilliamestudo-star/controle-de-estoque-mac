import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Save, Check, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";

// Hooks
import { useProcedureWithItems, useSaveDraftProcedure, useFinalizeProcedure } from "../hooks/useProcedures";
import { useBodyAreas, useAdministrationRoutes } from "../hooks/useBodyAreas";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { proceduresRepository } from "../repositories/procedures.repository";

// Components
import { BodyAreaSelector } from "../components/BodyAreaSelector";
import { ProcedureContextCard } from "../components/ProcedureContextCard";
import { ProcedureAreaDetails } from "../components/ProcedureAreaDetails";
import { ProcedureItemsPanel } from "../components/ProcedureItemsPanel";
import { ProcedureEvolutionPanel } from "../components/ProcedureEvolutionPanel";
import { PatientProcedureHistory } from "../components/PatientProcedureHistory";

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

export default function NewProcedurePage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { patientId?: string; procedureId?: string };

  const { data: procedureData } = useProcedureWithItems(searchParams.procedureId || null);
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

  const { register, handleSubmit, watch, setValue, control } = useForm<Partial<Procedure>>({
    defaultValues: {
      patientId: searchParams.patientId || "",
      protocolId: "",
      bodyAreaId: "",
      notes: "",
      hadIntercurrence: 0,
      intercurrenceDescription: "",
    }
  });

  const patientId = watch("patientId");
  const protocolId = watch("protocolId");
  const hadIntercurrence = Boolean(watch("hadIntercurrence"));

  // Sincroniza via ativa pelo manual ou protocolo
  useEffect(() => {
    if (manualRouteId) {
      const route = routes.find(r => r.id === manualRouteId);
      setSelectedRouteCode(route ? toRouteCode(route.name) : null);
    } else if (protocolId) {
      proceduresRepository.getProtocolRouteId(protocolId).then(routeId => {
        if (!routeId) {
          setSelectedRouteCode(null);
          return;
        }
        const route = routes.find(r => r.id === routeId);
        setSelectedRouteCode(route ? toRouteCode(route.name) : null);
      });
    } else {
      setSelectedRouteCode(null);
    }
  }, [manualRouteId, protocolId, routes]);

  // Carregar dados existentes se for edição
  useEffect(() => {
    if (procedureData) {
      setValue("patientId", procedureData.procedure.patientId);
      setValue("protocolId", procedureData.procedure.protocolId || "");
      setValue("bodyAreaId", procedureData.procedure.bodyAreaId || "");
      setValue("notes", procedureData.procedure.notes || "");
      setValue("hadIntercurrence", procedureData.procedure.hadIntercurrence);
      setValue("intercurrenceDescription", procedureData.procedure.intercurrenceDescription || "");
      setItems(procedureData.items);

      const storedAreaId = procedureData.procedure.bodyAreaId;
      if (storedAreaId) {
        const dbArea = bodyAreas.find(ba => ba.id === storedAreaId);
        if (dbArea) {
          const mapEntry = BODY_AREA_MAP.find(e => e.areaKey === dbArea.slug);
          if (mapEntry) setSelectedAreaKey(mapEntry.areaKey);
        }
      }
    }
  }, [procedureData, setValue, bodyAreas]);

  const handleAreaSelect = (areaKey: string, areaId: string) => {
    setSelectedAreaKey(areaKey);
    setValue("bodyAreaId", areaId);
  };

  const handleClearArea = () => {
    setSelectedAreaKey(null);
    setValue("bodyAreaId", "");
  };

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
        id: searchParams.procedureId || undefined,
        protocolId: data.protocolId || null,
        bodyAreaId: data.bodyAreaId || null,
      },
      items: items.map(item => ({
        ...item,
        quantityUsed: Number(item.quantityUsed)
      }))
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

  const selectedAreaEntry = selectedAreaKey
    ? BODY_AREA_MAP.find(e => e.areaKey === selectedAreaKey) || null
    : null;
  const activeDbArea = bodyAreas.find((ba: any) => ba.id === watch("bodyAreaId"));
  const activeRouteColor = safeRouteColor(selectedRouteCode);
  const isPending = saveDraft.isPending || finalizeProcedure.isPending;

  return (
    <>
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/procedures" })} className="btn btn-ghost btn-icon">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">
              {searchParams.procedureId ? "Editar Atendimento" : "Nova Aplicação"}
            </h1>
            <p className="page-subtitle">Preencha os dados e gerencie a aplicação no mapa corporal.</p>
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

      {/* ─── NOVO LAYOUT: 3 COLUNAS ───────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* COLUNA 1: Contexto e Histórico */}
        <div className="w-full xl:w-[320px] flex-shrink-0 flex flex-col gap-4">
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
          <PatientProcedureHistory patientId={patientId || null} />
        </div>

        {/* COLUNA 2: Mapa Corporal Centralizado */}
        <div className="w-full xl:max-w-[680px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-auto">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Mapa Corporal Interativo</h2>
            
            {/* Legenda Dinâmica de Vias */}
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
        <div className="flex-1 min-w-[300px] flex flex-col gap-4">
          <ProcedureAreaDetails 
            selectedAreaEntry={selectedAreaEntry} 
            activeRouteColor={activeRouteColor} 
            clearSelection={handleClearArea}
            bodyAreaName={(activeDbArea as any)?.displayName || (activeDbArea as any)?.name}
            bodyAreaTechnicalName={(activeDbArea as any)?.technicalName}
          />
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
