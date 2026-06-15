import { ReactNode } from "react";

interface ReportSummaryCardProps {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "red" | "indigo" | "yellow" | "gray";
}

export function ReportSummaryCard({ label, value, color = "gray" }: ReportSummaryCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    green: "bg-green-50 text-green-900 border-green-200",
    red: "bg-red-50 text-red-900 border-red-200",
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-200",
    yellow: "bg-yellow-50 text-yellow-900 border-yellow-200",
    gray: "bg-gray-50 text-gray-900 border-gray-200",
  };

  return (
    <div className={`card text-center border p-4 shadow-sm ${colorClasses[color]}`}>
      <h4 className="text-xs uppercase font-bold opacity-70 mb-1">{label}</h4>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

interface ReportSummaryGroupProps {
  children: ReactNode;
}

export function ReportSummaryGroup({ children }: ReportSummaryGroupProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {children}
    </div>
  );
}
