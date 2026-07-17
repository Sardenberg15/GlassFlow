import { Badge } from "@/components/ui/badge";

type ProjectStatus = "orcamento" | "aprovado" | "execucao" | "finalizado" | "cancelado";

interface ProjectStatusBadgeProps {
  status: string;
}

const statusConfig = {
  orcamento: { label: "Orçamento", className: "bg-muted text-muted-foreground" },
  aprovado: { label: "Aprovado", className: "bg-primary text-primary-foreground" },
  execucao: { label: "Em Execução", className: "bg-chart-3 text-white" },
  finalizado: { label: "Finalizado", className: "bg-chart-2 text-white" },
  cancelado: { label: "Cancelado", className: "bg-chart-4 text-white" },
};

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = statusConfig[status as ProjectStatus] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Desconhecido",
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
