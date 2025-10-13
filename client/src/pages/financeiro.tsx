import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Line, LineChart, Pie, PieChart, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import type { Transaction } from "@shared/schema";

// Mock data for charts - will aggregate real data later
const financeData = [
  { month: "Jan", receita: 45000, despesa: 32000 },
  { month: "Fev", receita: 52000, despesa: 38000 },
  { month: "Mar", receita: 48000, despesa: 35000 },
  { month: "Abr", receita: 61000, despesa: 42000 },
  { month: "Mai", receita: 55000, despesa: 39000 },
  { month: "Jun", receita: 67000, despesa: 45000 },
];

const categoryData = [
  { name: "Vidros", value: 45000, color: "hsl(var(--chart-1))" },
  { name: "Espelhos", value: 28000, color: "hsl(var(--chart-2))" },
  { name: "Reparos", value: 15000, color: "hsl(var(--chart-3))" },
  { name: "Outros", value: 12000, color: "hsl(var(--chart-4))" },
];

interface DashboardStats {
  activeProjects: number;
  totalClients: number;
  receitas: number;
  despesas: number;
  lucro: number;
  margem: number;
}

export default function Financeiro() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalReceitas = stats?.receitas || 0;
  const totalDespesas = stats?.despesas || 0;
  const lucro = stats?.lucro || 0;
  const margemLucro = stats?.margem || 0;

  const recentTransactions = transactions?.slice(-5).reverse() || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Visão geral das finanças da empresa</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} data-testid={`skeleton-metric-${i}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Receitas Totais"
              value={formatCurrency(totalReceitas)}
              icon={ArrowUpCircle}
              iconColor="bg-chart-2"
            />
            <MetricCard
              title="Despesas Totais"
              value={formatCurrency(totalDespesas)}
              icon={ArrowDownCircle}
              iconColor="bg-chart-4"
            />
            <MetricCard
              title="Lucro Líquido"
              value={formatCurrency(lucro)}
              icon={Wallet}
              iconColor="bg-primary"
            />
            <MetricCard
              title="Margem de Lucro"
              value={`${margemLucro}%`}
              icon={TrendingUp}
              iconColor="bg-chart-3"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
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
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo de Caixa */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={financeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              <Line type="monotone" dataKey="receita" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Receita" />
              <Line type="monotone" dataKey="despesa" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Despesa" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`skeleton-transaction-${i}`}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-transactions">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
              <p className="text-sm text-muted-foreground">
                As transações aparecerão aqui quando forem criadas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 ${transaction.type === "receita" ? "bg-chart-2/10" : "bg-chart-4/10"}`}>
                      {transaction.type === "receita" ? (
                        <ArrowUpCircle className="h-5 w-5 text-chart-2" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-chart-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`transaction-description-${transaction.id}`}>{transaction.description}</p>
                      <p className="text-sm text-muted-foreground" data-testid={`transaction-date-${transaction.id}`}>{transaction.date}</p>
                    </div>
                  </div>
                  <span 
                    className={`text-lg font-bold font-mono ${transaction.type === "receita" ? "text-chart-2" : "text-chart-4"}`}
                    data-testid={`transaction-value-${transaction.id}`}
                  >
                    {transaction.type === "receita" ? "+" : "-"}{formatCurrency(parseFloat(transaction.value))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
