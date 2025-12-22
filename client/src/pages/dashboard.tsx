import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Line, LineChart } from "recharts";
import type { Project, Client } from "@shared/schema";
import PageHeader from "@/components/layout/page-header";

type ProjectStatus = "orcamento" | "aprovado" | "execucao" | "finalizado" | "cancelado";

// Mock data for charts - will be replaced later with aggregated data
const revenueData = [
  { month: "Jan", receita: 45000, despesa: 32000 },
  { month: "Fev", receita: 52000, despesa: 38000 },
  { month: "Mar", receita: 48000, despesa: 35000 },
  { month: "Abr", receita: 61000, despesa: 42000 },
  { month: "Mai", receita: 55000, despesa: 39000 },
  { month: "Jun", receita: 67000, despesa: 45000 },
];

interface DashboardStats {
  activeProjects: number;
  totalClients: number;
  receitas: number;
  despesas: number;
  lucro: number;
  margem: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || "Cliente não encontrado";
  };

  // Get recent projects (first 4)
  const recentProjects = projects?.slice(0, 4) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio" />

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <Card className="shadow-xs rounded-xl">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
            <Card className="shadow-xs rounded-xl">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
            <Card className="shadow-xs rounded-xl">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
            <Card className="shadow-xs rounded-xl">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          </>
        ) : stats ? (
          <>
            <MetricCard
              title="Projetos Ativos"
              value={stats.activeProjects.toString()}
              icon={FileText}
              trend={{ value: 8, isPositive: true }}
              iconColor="bg-primary"
              data-testid="metric-active-projects"
            />
            <MetricCard
              title="Total de Clientes"
              value={stats.totalClients.toString()}
              icon={Users}
              trend={{ value: 12, isPositive: true }}
              iconColor="bg-chart-2"
              data-testid="metric-total-clients"
            />
            <MetricCard
              title="Receita do Mês"
              value={formatCurrency(stats.receitas)}
              icon={DollarSign}
              trend={{ value: 15, isPositive: true }}
              iconColor="bg-chart-3"
              data-testid="metric-monthly-revenue"
            />
            <MetricCard
              title="Margem Média"
              value={formatPercentage(stats.margem)}
              icon={TrendingUp}
              trend={{ value: 3, isPositive: true }}
              iconColor="bg-primary"
              data-testid="metric-average-margin"
            />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-xs rounded-xl">
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

        <Card className="shadow-xs rounded-xl">
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
      <Card className="shadow-xs rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Projetos Recentes</span>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading || clientsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`project-${project.id}`}
                >
                  <div className="space-y-1">
                    <p className="font-medium" data-testid={`project-name-${project.id}`}>{project.name}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`project-client-${project.id}`}>
                      {getClientName(project.clientId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold font-mono" data-testid={`project-value-${project.id}`}>
                      {formatCurrency(parseFloat(project.value))}
                    </span>
                    <ProjectStatusBadge status={project.status as ProjectStatus} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" data-testid="empty-projects">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum projeto encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
