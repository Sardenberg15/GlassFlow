import { ProjectStatusBadge } from '../project-status-badge';

export default function ProjectStatusBadgeExample() {
  return (
    <div className="flex gap-2">
      <ProjectStatusBadge status="orcamento" />
      <ProjectStatusBadge status="aprovado" />
      <ProjectStatusBadge status="execucao" />
      <ProjectStatusBadge status="finalizado" />
    </div>
  );
}
