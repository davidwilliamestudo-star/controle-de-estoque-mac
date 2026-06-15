import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDatum } from "../types/dashboard.types";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface DashboardChartCardProps {
  title: string;
  description: string;
  data: ChartDatum[];
  type?: "bar" | "line" | "pie";
}

const colors = ["#1A5347", "#B8A083", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6B7280", "#D2CBC4"];

export function DashboardChartCard({ title, description, data, type = "bar" }: DashboardChartCardProps) {
  const hasData = data.some(item => item.value > 0);

  return (
    <div className="card dashboard-chart-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-description">{description}</p>
        </div>
      </div>

      {!hasData ? (
        <DashboardEmptyState
          title="Sem dados no periodo"
          description="Quando houver registros reais, este grafico sera preenchido automaticamente."
        />
      ) : (
        <div className="dashboard-chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#1A5347" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            ) : type === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#1A5347" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
