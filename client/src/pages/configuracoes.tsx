import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Settings, Building, Landmark, Target, Plus, Trash2, Save,
  Palette, Info
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Goal {
  id: string;
  type: string;
  period: string;
  targetValue: number;
  description: string | null;
  createdAt: string;
}

export default function Configuracoes() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"metas" | "bancos">("metas");

  // ═══ Goals ═══
  const [openGoalDialog, setOpenGoalDialog] = useState(false);
  const [goalPeriod, setGoalPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [goalValue, setGoalValue] = useState("");
  const [goalDescription, setGoalDescription] = useState("");

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/goals", {
        type: "mensal",
        period: goalPeriod,
        targetValue: parseFloat(goalValue),
        description: goalDescription || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/current-progress"] });
      setOpenGoalDialog(false);
      setGoalValue("");
      setGoalDescription("");
      toast({ title: "Meta criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/current-progress"] });
      toast({ title: "Meta excluída!" });
    },
  });

  const sections = [
    { key: "metas" as const, label: "Metas de Vendas", icon: Target },
    { key: "bancos" as const, label: "Contas Bancárias", icon: Landmark },
  ];

  const monthLabel = (period: string) => {
    const [y, m] = period.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]}/${y}`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Settings className="h-7 w-7 text-primary" />
            Configurações
          </h1>
          <p>Gerencie metas, bancos e preferências do sistema</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {sections.map(section => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeSection === section.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* ═══ Metas de Vendas ═══ */}
      {activeSection === "metas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Metas de Vendas</h2>
              <p className="text-sm text-muted-foreground">Defina metas mensais de receita. O Dashboard exibirá o progresso automaticamente.</p>
            </div>
            <Button onClick={() => setOpenGoalDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Meta
            </Button>
          </div>

          {goals.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma meta definida</h3>
                <p className="text-sm text-muted-foreground mb-4">Configure metas mensais para acompanhar o desempenho de vendas no Dashboard.</p>
                <Button onClick={() => setOpenGoalDialog(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Definir primeira meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map(goal => (
                <Card key={goal.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-xs font-semibold">{monthLabel(goal.period)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-primary">{fmt(goal.targetValue)}</p>
                    {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Goal Dialog */}
          <Dialog open={openGoalDialog} onOpenChange={setOpenGoalDialog}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Nova Meta de Vendas</DialogTitle>
                <DialogDescription>Defina uma meta de receita para um mês específico.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input type="month" value={goalPeriod} onChange={e => setGoalPeriod(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Meta (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 100000"
                    value={goalValue}
                    onChange={e => setGoalValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Meta do Q2 2026"
                    value={goalDescription}
                    onChange={e => setGoalDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => createGoalMutation.mutate()}
                  disabled={!goalValue || createGoalMutation.isPending}
                  className="w-full"
                >
                  {createGoalMutation.isPending ? "Salvando..." : "Salvar Meta"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ═══ Contas Bancárias ═══ */}
      {activeSection === "bancos" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Contas Bancárias</h2>
            <p className="text-sm text-muted-foreground">Configure suas contas para a conciliação bancária.</p>
          </div>

          {/* Pre-configured banks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">BTG Pactual</p>
                    <p className="text-xs text-muted-foreground">Conta PJ — Banco 208</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Ativo</Badge>
                  <Badge variant="outline" className="text-[10px]">OFX / CSV</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Inter Banking</p>
                    <p className="text-xs text-muted-foreground">Conta PJ — Banco 077</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Ativo</Badge>
                  <Badge variant="outline" className="text-[10px]">OFX / CSV</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800/80 dark:text-blue-300/80">
                  <p className="font-semibold">Como funciona a conciliação?</p>
                  <p className="mt-1">
                    Importe o extrato bancário (OFX ou CSV) na aba <strong>Conciliação</strong> do módulo Financeiro.
                    O sistema vai comparar automaticamente as transações do banco com os lançamentos cadastrados e sugerir o vínculo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
