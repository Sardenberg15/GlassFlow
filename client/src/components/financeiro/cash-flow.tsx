import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Calendar } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import type { Bill, Transaction } from "@shared/schema";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtShort = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return fmt(v);
};

interface CashFlowProps {
  bills: Bill[];
  transactions: Transaction[];
  bankAccounts?: any[];
}

export function CashFlow({ bills, transactions, bankAccounts = [] }: CashFlowProps) {
  const cashFlowData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Current balance = sum of real bank account balances (manually updated by user)
    // These represent the actual money in each account right now
    const currentBalance = bankAccounts.reduce((sum, acc) => {
      return sum + (parseFloat(acc.initialBalance) || 0);
    }, 0);

    // Project future 90 days using pending bills
    const days: { date: string; label: string; saldo: number; entradas: number; saidas: number; isNegative: boolean }[] = [];
    let runningBalance = currentBalance;

    // Group pending bills by date
    const billsByDate: Record<string, { entradas: number; saidas: number }> = {};
    const pendingBills = bills.filter(b => b.status === 'pendente' && b.dueDate >= todayStr);
    
    pendingBills.forEach(bill => {
      const date = bill.dueDate;
      if (!billsByDate[date]) billsByDate[date] = { entradas: 0, saidas: 0 };
      const val = parseFloat(String(bill.value));
      if (bill.type === 'receber') {
        billsByDate[date].entradas += val;
      } else {
        billsByDate[date].saidas += val;
      }
    });

    // Generate daily data for 90 days
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

      const dayData = billsByDate[dateStr] || { entradas: 0, saidas: 0 };
      runningBalance += dayData.entradas - dayData.saidas;

      // Only add data points for days with activity or every 3 days
      if (dayData.entradas > 0 || dayData.saidas > 0 || i === 0 || i % 3 === 0 || i === 89) {
        days.push({
          date: dateStr,
          label,
          saldo: runningBalance,
          entradas: dayData.entradas,
          saidas: dayData.saidas,
          isNegative: runningBalance < 0,
        });
      }
    }

    return { currentBalance, days };
  }, [bills, transactions, bankAccounts]);

  const negativeDays = cashFlowData.days.filter(d => d.isNegative);
  const minBalance = Math.min(...cashFlowData.days.map(d => d.saldo));
  const maxBalance = Math.max(...cashFlowData.days.map(d => d.saldo));

  // Summary metrics — from PENDING BILLS (predicted, not confirmed)
  const next30Entradas = cashFlowData.days.slice(0, 30).reduce((s, d) => s + d.entradas, 0);
  const next30Saidas = cashFlowData.days.slice(0, 30).reduce((s, d) => s + d.saidas, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="kpi-accent bg-blue-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saldo em Contas</span>
            <p className={`text-xl font-bold tabular-nums mt-1 ${cashFlowData.currentBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'}`}>
              {fmt(cashFlowData.currentBalance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Soma das contas bancárias</p>
          </CardContent>
        </div>
        <div className="kpi-card">
          <div className="kpi-accent bg-emerald-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">A Receber (30d)</span>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">{fmt(next30Entradas)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Contas pendentes</p>
          </CardContent>
        </div>
        <div className="kpi-card">
          <div className="kpi-accent bg-rose-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">A Pagar (30d)</span>
            <p className="text-xl font-bold text-rose-600 tabular-nums mt-1">{fmt(next30Saidas)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Contas pendentes</p>
          </CardContent>
        </div>
        <div className="kpi-card">
          <div className={`kpi-accent ${negativeDays.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alertas</span>
            {negativeDays.length > 0 ? (
              <div className="mt-1">
                <p className="text-xl font-bold text-amber-600 tabular-nums">{negativeDays.length}</p>
                <p className="text-[10px] text-amber-600">dias com saldo negativo</p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-sm font-semibold text-emerald-600">✓ Sem alertas</p>
                <p className="text-[10px] text-muted-foreground">Fluxo saudável nos próx. 90 dias</p>
              </div>
            )}
          </CardContent>
        </div>
      </div>

      {/* Negative balance warning */}
      {negativeDays.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold">Atenção: Saldo negativo projetado</p>
                <p className="mt-1">
                  O fluxo de caixa projetado indica <strong>{negativeDays.length} dia(s)</strong> com saldo negativo nos próximos 90 dias.
                  O saldo mínimo projetado é de <strong>{fmt(minBalance)}</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Projeção de Fluxo de Caixa</CardTitle>
          <CardDescription>Saldo projetado para os próximos 90 dias baseado nas contas pendentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData.days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCashPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCashNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => fmtShort(v)} dx={-5} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [fmt(value), name === 'saldo' ? 'Saldo' : name]}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '13px' }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradCashPositive)"
                  dot={false}
                  name="Saldo"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming movements table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Movimentações Previstas</CardTitle>
          <CardDescription>Dias com movimentação nos próximos 30 dias</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y max-h-[300px] overflow-y-auto custom-scrollbar">
            {cashFlowData.days.filter(d => d.entradas > 0 || d.saidas > 0).slice(0, 15).map((day, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  {day.entradas > 0 && (
                    <span className="text-sm font-medium text-emerald-600 tabular-nums flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{fmt(day.entradas)}
                    </span>
                  )}
                  {day.saidas > 0 && (
                    <span className="text-sm font-medium text-rose-600 tabular-nums flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      -{fmt(day.saidas)}
                    </span>
                  )}
                  <Badge variant="outline" className={`text-[10px] tabular-nums ${day.saldo >= 0 ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-rose-200 text-rose-700 bg-rose-50'}`}>
                    Saldo: {fmt(day.saldo)}
                  </Badge>
                </div>
              </div>
            ))}
            {cashFlowData.days.filter(d => d.entradas > 0 || d.saidas > 0).length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Nenhuma movimentação prevista nos próximos 90 dias.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
