import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Line, LineChart, Pie, PieChart, Cell } from "recharts";

// Mock data - todo: remove mock functionality
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

const recentTransactions = [
  { id: "1", type: "receita" as const, description: "Pagamento - Fachada Comercial", value: 15000, date: "20/10/2025", project: "Edifício Central" },
  { id: "2", type: "despesa" as const, description: "Compra de vidros", value: 8000, date: "19/10/2025", project: "Fachada Comercial" },
  { id: "3", type: "receita" as const, description: "Pagamento - Box Banheiro", value: 3500, date: "18/10/2025", project: "João Silva" },
  { id: "4", type: "despesa" as const, description: "Mão de obra", value: 3500, date: "17/10/2025", project: "Fachada Comercial" },
  { id: "5", type: "despesa" as const, description: "Ferragens", value: 1200, date: "16/10/2025", project: "Casa Jardim" },
];

export default function Financeiro() {
  const totalReceitas = financeData.reduce((sum, item) => sum + item.receita, 0);
  const totalDespesas = financeData.reduce((sum, item) => sum + item.despesa, 0);
  const lucro = totalReceitas - totalDespesas;
  const margemLucro = ((lucro / totalReceitas) * 100).toFixed(1);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Visão geral das finanças da empresa</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{transaction.project} • {transaction.date}</p>
                  </div>
                </div>
                <span className={`text-lg font-bold font-mono ${transaction.type === "receita" ? "text-chart-2" : "text-chart-4"}`}>
                  {transaction.type === "receita" ? "+" : "-"}{formatCurrency(transaction.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
