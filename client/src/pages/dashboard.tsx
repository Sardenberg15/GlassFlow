import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Target, AlertTriangle, FileText, Users, Wallet,
  Calendar, ChevronRight, BarChart3, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import type { Category, Transaction } from "@shared/schema";

// ── Helpers ──────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};
const pctBadge = (change: number) => {
  if (change === 0) return null;
  const isPositive = change > 0;
  return (
    <span className={`kpi-trend ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}{change}% vs mês anterior
    </span>
  );
};

// ── Types ────────────────────────────────────────────────
interface FinancialSummary {
  currentMonth: string;
  receitas: { value: number; change: number };
  despesas: { value: number; change: number };
  resultado: { value: number; change: number };
  margem: number;
  pendingReceivables: number;
  pendingPayables: number;
  overdueReceivables: number;
  overduePayables: number;
  activeProjects: number;
  totalClients: number;
}
interface ChartDataPoint {
  name: string;
  month: string;
  Receitas: number;
  Despesas: number;
  Resultado: number;
}
interface GoalProgress {
  hasGoal: boolean;
  period: string;
  target: number;
  achieved: number;
  percentage: number;
  remaining: number;
  description: string | null;
}
interface UpcomingBill {
  id: string;
  type: string;
  description: string;
  value: number;
  dueDate: string;
  status: string;
  projectName: string | null;
  isOverdue: boolean;
}

// ══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/dashboard/financial-summary"],
  });

  const { data: chartData = [], isLoading: chartLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/dashboard/chart-data"],
  });

  const { data: goalProgress } = useQuery<GoalProgress>({
    queryKey: ["/api/goals/current-progress"],
  });

  const { data: upcomingBills = [] } = useQuery<UpcomingBill[]>({
    queryKey: ["/api/dashboard/upcoming-bills"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Category spending for donut chart
  const categorySpending = (() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTx = transactions.filter(t => t.date?.startsWith(currentMonth) && t.type === 'despesa');
    const grouped: Record<string, { name: string; value: number; color: string }> = {};
    monthTx.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (cat?.name === 'Transferência entre contas') return;
      const key = t.categoryId || 'outros';
      if (!grouped[key]) grouped[key] = { name: cat?.name || 'Outros', value: 0, color: cat?.color || '#94a3b8' };
      grouped[key].value += parseFloat(String(t.value));
    });
    return Object.values(grouped).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  })();

  const monthLabel = (() => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return months[new Date().getMonth()] + ' ' + new Date().getFullYear();
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p>{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dre">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Ver DRE
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Receitas */}
        <div className="kpi-card animate-slide-up stagger-1">
          <div className="kpi-accent bg-emerald-500" />
          <CardContent className="p-5 pl-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kpi-label">Receitas</span>
              <div className="kpi-icon bg-emerald-500/10 text-emerald-600"><ArrowUpRight className="h-4 w-4" /></div>
            </div>
            {summaryLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="kpi-value text-emerald-700 dark:text-emerald-400">{fmt(summary?.receitas.value || 0)}</div>
                {pctBadge(summary?.receitas.change || 0)}
              </>
            )}
          </CardContent>
        </div>

        {/* Despesas */}
        <div className="kpi-card animate-slide-up stagger-2">
          <div className="kpi-accent bg-rose-500" />
          <CardContent className="p-5 pl-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kpi-label">Despesas</span>
              <div className="kpi-icon bg-rose-500/10 text-rose-600"><ArrowDownRight className="h-4 w-4" /></div>
            </div>
            {summaryLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="kpi-value text-rose-600 dark:text-rose-400">{fmt(summary?.despesas.value || 0)}</div>
                {pctBadge(summary?.despesas.change || 0)}
              </>
            )}
          </CardContent>
        </div>

        {/* Resultado */}
        <div className="kpi-card animate-slide-up stagger-3">
          <div className={`kpi-accent ${(summary?.resultado.value || 0) >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
          <CardContent className="p-5 pl-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kpi-label">Resultado</span>
              <div className={`kpi-icon ${(summary?.resultado.value || 0) >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600'}`}><Wallet className="h-4 w-4" /></div>
            </div>
            {summaryLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className={`kpi-value ${(summary?.resultado.value || 0) >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600'}`}>{fmt(summary?.resultado.value || 0)}</div>
                <span className="kpi-trend text-muted-foreground">Margem {summary?.margem || 0}%</span>
              </>
            )}
          </CardContent>
        </div>

        {/* A Receber */}
        <div className="kpi-card animate-slide-up stagger-4">
          <div className="kpi-accent bg-amber-400" />
          <CardContent className="p-5 pl-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kpi-label">A Receber</span>
              <div className="kpi-icon bg-amber-500/10 text-amber-600"><DollarSign className="h-4 w-4" /></div>
            </div>
            {summaryLoading ? <Skeleton className="h-8 w-28" /> : (
              <>
                <div className="kpi-value text-amber-700 dark:text-amber-400">{fmt(summary?.pendingReceivables || 0)}</div>
                {(summary?.overdueReceivables || 0) > 0 && (
                  <span className="kpi-trend text-rose-500">
                    <AlertTriangle className="h-3 w-3" />
                    {fmt(summary?.overdueReceivables || 0)} vencido
                  </span>
                )}
              </>
            )}
          </CardContent>
        </div>

        {/* Projetos Ativos */}
        <div className="kpi-card animate-slide-up stagger-5">
          <div className="kpi-accent bg-indigo-500" />
          <CardContent className="p-5 pl-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kpi-label">Projetos</span>
              <div className="kpi-icon bg-indigo-500/10 text-indigo-600"><FileText className="h-4 w-4" /></div>
            </div>
            {summaryLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="kpi-value">{summary?.activeProjects || 0}</div>
                <span className="kpi-trend text-muted-foreground">em execução</span>
              </>
            )}
          </CardContent>
        </div>

        {/* Clientes */}
        <div className="kpi-card animate-slide-up stagger-6">
          <div className="kpi-accent bg-violet-500" />
          <CardContent className="p-5 pl-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kpi-label">Clientes</span>
              <div className="kpi-icon bg-violet-500/10 text-violet-600"><Users className="h-4 w-4" /></div>
            </div>
            {summaryLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="kpi-value">{summary?.totalClients || 0}</div>
                <span className="kpi-trend text-muted-foreground">cadastrados</span>
              </>
            )}
          </CardContent>
        </div>
      </div>

      {/* ═══ Goal Progress Bar (if set) ═══ */}
      {goalProgress?.hasGoal && (
        <Card className="border-none shadow-sm animate-slide-up">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Meta de Vendas — {monthLabel}</p>
                  <p className="text-xs text-muted-foreground">{goalProgress.description || "Meta mensal"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">{goalProgress.percentage}%</p>
                <p className="text-xs text-muted-foreground">{fmt(goalProgress.achieved)} de {fmt(goalProgress.target)}</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  goalProgress.percentage >= 100 ? "bg-emerald-500" :
                  goalProgress.percentage >= 70 ? "bg-blue-500" :
                  goalProgress.percentage >= 40 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, goalProgress.percentage)}%` }}
              />
            </div>
            {goalProgress.remaining > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Falta {fmt(goalProgress.remaining)} para atingir a meta</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Bar Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Evolução Financeira</CardTitle>
            <CardDescription>Receitas vs Despesas — últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? <Skeleton className="h-[280px] w-full rounded-lg" /> : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtCompact(v)} dx={-5} />
                    <RechartsTooltip
                      formatter={(value: number) => fmt(value)}
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '13px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Donut */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Despesas por Categoria</CardTitle>
            <CardDescription>{monthLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {categorySpending.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpending}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {categorySpending.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => fmt(value)}
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '13px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                  {categorySpending.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate max-w-[100px]" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{fmt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma despesa no mês
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Bottom Widgets ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bills */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Próximos Vencimentos</CardTitle>
              <CardDescription>Contas a pagar e receber pendentes</CardDescription>
            </div>
            <Link href="/financeiro">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Ver todos <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            {upcomingBills.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhum vencimento pendente</div>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto custom-scrollbar">
                {upcomingBills.slice(0, 8).map(bill => (
                  <div key={bill.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1.5 h-8 rounded-full ${bill.isOverdue ? 'bg-rose-500' : bill.type === 'receber' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{bill.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {bill.dueDate ? new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          {bill.isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Vencido</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-semibold tabular-nums ${bill.type === 'receber' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {bill.type === 'receber' ? '+' : '-'}{fmt(bill.value)}
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${bill.type === 'receber' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
                        {bill.type === 'receber' ? 'Receber' : 'Pagar'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado Trend (Area chart) */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Evolução do Resultado</CardTitle>
            <CardDescription>Lucro/Prejuízo mensal — últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? <Skeleton className="h-[280px] w-full rounded-lg" /> : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradResult" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtCompact(v)} dx={-5} />
                    <RechartsTooltip
                      formatter={(value: number) => fmt(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '13px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Resultado"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#gradResult)"
                      dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
