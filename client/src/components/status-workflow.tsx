import { Check } from "lucide-react";

type WorkflowStatus = "orcamento" | "aprovado" | "execucao" | "finalizado";

interface StatusWorkflowProps {
  currentStatus: WorkflowStatus;
}

const steps = [
  { key: "orcamento", label: "Orçamento" },
  { key: "aprovado", label: "Aprovado" },
  { key: "execucao", label: "Em Execução" },
  { key: "finalizado", label: "Finalizado" },
];

export function StatusWorkflow({ currentStatus }: StatusWorkflowProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStatus);

  return (
    <div className="w-full" data-testid="status-workflow">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted || isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted bg-background text-muted-foreground'
                  }`}
                  data-testid={`step-${step.key}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className={`text-xs font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 bg-border">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? 'bg-primary w-full' : 'bg-border w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
