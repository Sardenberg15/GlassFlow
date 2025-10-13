import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Line, LineChart } from "recharts";

// Mock data - todo: remove mock functionality
const revenueData = [
  { month: "Jan", receita: 45000, despesa: 32000 },
  { month: "Fev", receita: 52000, despesa: 38000 },
  { month: "Mar", receita: 48000, despesa: 35000 },
  { month: "Abr", receita: 61000, despesa: 42000 },
  { month: "Mai", receita: 55000, despesa: 39000 },
  { month: "Jun", receita: 67000, despesa: 45000 },
];

const recentProjects = [
  { id: "1", name: "Fachada Comercial - Edifício Central", client: "Construtora ABC", status: "execucao" as const, value: "R$ 30.000" },
  { id: "2", name: "Box de Banheiro Residencial", client: "João Silva", status: "aprovado" as const, value: "R$ 3.500" },
  { id: "3", name: "Espelhos Decorativos - Loja Shopping", client: "Decorações Ltda", status: "orcamento" as const, value: "R$ 12.000" },
  { id: "4", name: "Reparo de Vidraça - Escritório", client: "Empresa XYZ", status: "finalizado" as const, value: "R$ 850" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de gestão HelpGlass</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Projetos Ativos"
          value="24"
          icon={FileText}
          trend={{ value: 8, isPositive: true }}
          iconColor="bg-primary"
        />
        <MetricCard
          title="Total de Clientes"
          value="248"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          iconColor="bg-chart-2"
        />
        <MetricCard
          title="Receita do Mês"
          value="R$ 67.000"
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
          iconColor="bg-chart-3"
        />
        <MetricCard
          title="Margem Média"
          value="32.8%"
          icon={TrendingUp}
          trend={{ value: 3, isPositive: true }}
          iconColor="bg-primary"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="receita" fill="hsl(var(--chart-2))" name="Receita" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" fill="hsl(var(--chart-4))" name="Despesa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Receita" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Projetos Recentes</span>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                data-testid={`project-${project.id}`}
              >
                <div className="space-y-1">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold font-mono">{project.value}</span>
                  <ProjectStatusBadge status={project.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
