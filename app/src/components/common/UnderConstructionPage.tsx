import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

interface UnderConstructionPageProps {
  title: string;
  subtitle: string;
  description: string;
  icon?: ReactNode;
}

export function UnderConstructionPage({
  title,
  subtitle,
  description,
  icon = <Wrench />,
}: UnderConstructionPageProps) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="card">
        <EmptyState
          icon={icon}
          title="Modulo em desenvolvimento"
          description={description}
        />
      </div>
    </>
  );
}
