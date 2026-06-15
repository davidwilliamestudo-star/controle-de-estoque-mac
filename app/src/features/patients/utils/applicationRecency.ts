import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ApplicationRecency {
  hasApplication: boolean;
  days: number | null;
  label: string;
  detail: string;
  dateLabel: string;
  urgency: "none" | "recent" | "attention" | "stale";
}

function parseDate(value: string) {
  const isoDate = parseISO(value);
  if (isValid(isoDate)) return isoDate;

  const fallbackDate = new Date(value);
  return isValid(fallbackDate) ? fallbackDate : null;
}

export function getApplicationRecency(value: string | null | undefined): ApplicationRecency {
  if (!value) {
    return {
      hasApplication: false,
      days: null,
      label: "Sem aplicacao",
      detail: "Nenhuma aplicacao finalizada",
      dateLabel: "-",
      urgency: "none",
    };
  }

  const applicationDate = parseDate(value);
  if (!applicationDate) {
    return {
      hasApplication: false,
      days: null,
      label: "Data invalida",
      detail: "Nao foi possivel calcular a ultima aplicacao",
      dateLabel: "-",
      urgency: "none",
    };
  }

  const days = differenceInCalendarDays(new Date(), applicationDate);
  const dateLabel = format(applicationDate, "dd/MM/yyyy", { locale: ptBR });

  if (days < 0) {
    return {
      hasApplication: true,
      days,
      label: "Data futura",
      detail: `Registrada para ${dateLabel}`,
      dateLabel,
      urgency: "attention",
    };
  }

  if (days === 0) {
    return {
      hasApplication: true,
      days,
      label: "Hoje",
      detail: "0 dias desde a ultima aplicacao",
      dateLabel,
      urgency: "recent",
    };
  }

  if (days === 1) {
    return {
      hasApplication: true,
      days,
      label: "1 dia",
      detail: "Aplicacao feita ontem",
      dateLabel,
      urgency: "recent",
    };
  }

  const approximate =
    days >= 365
      ? `aprox. ${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? "s" : ""}`
      : days >= 30
        ? `aprox. ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? "es" : ""}`
        : null;

  return {
    hasApplication: true,
    days,
    label: `${days} dias`,
    detail: approximate ? `Ultima aplicacao ha ${days} dias (${approximate})` : `Ultima aplicacao ha ${days} dias`,
    dateLabel,
    urgency: days > 180 ? "stale" : days > 60 ? "attention" : "recent",
  };
}
