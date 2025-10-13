import { Badge } from "@/components/ui/badge";

type ProjectStatus = "orcamento" | "aprovado" | "execucao" | "finalizado" | "cancelado";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig = {
  orcamento: { label: "Orçamento", className: "bg-muted text-muted-foreground" },
  aprovado: { label: "Aprovado", className: "bg-primary text-primary-foreground" },
  execucao: { label: "Em Execução", className: "bg-chart-3 text-white" },
  finalizado: { label: "Finalizado", className: "bg-chart-2 text-white" },
  cancelado: { label: "Cancelado", className: "bg-chart-4 text-white" },
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="secondary" className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
