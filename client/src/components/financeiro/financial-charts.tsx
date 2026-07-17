import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from "recharts";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction, Category } from "@shared/schema";

interface FinancialChartsProps {
    transactions: Transaction[];
    categories: Category[];
    monthFilter: string;
}

const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const fmtShort = (value: number) => {
    if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value}`;
};

// Professional color palette
const CHART_COLORS = {
    receita: '#10b981',
    despesa: '#ef4444',
    resultado: '#6366f1',
    gradientReceita: ['#10b981', '#059669'],
    gradientDespesa: ['#ef4444', '#dc2626'],
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899', '#10b981', '#f97316', '#64748b', '#84cc16'];

export function FinancialCharts({ transactions, categories, monthFilter }: FinancialChartsProps) {
    // 1. Monthly Trend (6 months) with resultado line
    const trendData = useMemo(() => {
        const data = [];
        const baseMonth = monthFilter !== "all" ? monthFilter : format(new Date(), "yyyy-MM");
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(parseISO(`${baseMonth}-01`), i);
            const monthStr = format(date, "yyyy-MM");

            const monthTx = transactions.filter(t => t.date && t.date.startsWith(monthStr));
            const receitas = monthTx.filter(t => t.type === 'receita').reduce((sum, t) => sum + Number(t.value), 0);
            const despesas = monthTx.filter(t => t.type === 'despesa').reduce((sum, t) => sum + Number(t.value), 0);

            data.push({
                name: format(date, "MMM/yy", { locale: ptBR }).replace(/^./, c => c.toUpperCase()),
                Receitas: receitas,
                Despesas: despesas,
                Resultado: receitas - despesas,
            });
        }
        return data;
    }, [transactions, monthFilter]);

    // 2. Category breakdown (donut)
    const categoryData = useMemo(() => {
        const baseMonth = monthFilter !== "all" ? monthFilter : format(new Date(), "yyyy-MM");
        const monthTx = monthFilter === "all" 
            ? transactions.filter(t => t.type === 'despesa')
            : transactions.filter(t => t.date && t.date.startsWith(baseMonth) && t.type === 'despesa');

        const grouped: Record<string, { value: number, color: string, name: string }> = {};
        monthTx.forEach(t => {
            const catId = t.categoryId || 'sem-categoria';
            if (!grouped[catId]) {
                const cat = categories.find(c => c.id === catId);
                grouped[catId] = { name: cat?.name || 'Sem Categoria', color: cat?.color || '#94a3b8', value: 0 };
            }
            grouped[catId].value += Number(t.value);
        });

        return Object.values(grouped).filter(i => i.value > 0).sort((a, b) => b.value - a.value);
    }, [transactions, categories, monthFilter]);

    // 3. Cash flow (cumulative daily balance for the month)
    const cashFlowData = useMemo(() => {
        const baseMonth = monthFilter !== "all" ? monthFilter : format(new Date(), "yyyy-MM");
        const monthTx = transactions.filter(t => t.date && t.date.startsWith(baseMonth))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        let balance = 0;
        const days: Record<string, number> = {};
        monthTx.forEach(t => {
            const day = t.date!.slice(8, 10);
            const val = Number(t.value);
            balance += t.type === 'receita' ? val : -val;
            days[day] = balance;
        });

        return Object.entries(days).map(([day, saldo]) => ({
            dia: day,
            Saldo: saldo,
        }));
    }, [transactions, monthFilter]);

    // Summary metrics for the month
    const totalDespesas = categoryData.reduce((s, c) => s + c.value, 0);

    const monthLabel = useMemo(() => {
        if (monthFilter === "all") return "Todos os meses";
        try {
            return format(parseISO(`${monthFilter}-01`), "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
        } catch { return monthFilter; }
    }, [monthFilter]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-popover text-popover-foreground shadow-xl rounded-xl border p-3 text-sm">
                <p className="font-semibold mb-1.5">{label}</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-muted-foreground">{p.name}:</span>
                        <span className="font-semibold tabular-nums">{fmtCurrency(p.value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* ══ Evolução Financeira ══ */}
            <Card className="border-none shadow-sm lg:col-span-2">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Evolução Financeira</CardTitle>
                            <CardDescription>Receitas vs Despesas — últimos 6 meses</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Receitas
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <div className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> Despesas
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <div className="w-2.5 h-1 rounded-full bg-indigo-500" /> Resultado
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[280px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                                    </linearGradient>
                                    <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.85} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtShort} dx={-5} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="Receitas" fill="url(#gradReceita)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                                <Bar dataKey="Despesas" fill="url(#gradDespesa)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                                <Line type="monotone" dataKey="Resultado" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} strokeDasharray="" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ══ Despesas por Categoria ══ */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Despesas por Centro de Custo</CardTitle>
                    <CardDescription>{monthLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                    {categoryData.length > 0 ? (
                        <div className="flex flex-col md:flex-row items-center h-[280px] w-full mt-2">
                            <div className="w-full md:w-1/2 h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Total</span>
                                    <span className="text-sm font-bold tabular-nums">{fmtCurrency(totalDespesas)}</span>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 flex flex-col gap-2 pl-0 md:pl-4 mt-4 md:mt-0 overflow-y-auto max-h-[250px] custom-scrollbar">
                                {categoryData.map((item, i) => {
                                    const pct = totalDespesas > 0 ? ((item.value / totalDespesas) * 100).toFixed(1) : "0";
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-sm group">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-muted-foreground truncate flex-1 text-xs" title={item.name}>{item.name}</span>
                                            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{pct}%</span>
                                            <span className="font-semibold text-foreground text-xs tabular-nums">{fmtCurrency(item.value)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                            Nenhuma despesa registrada neste período.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ══ Fluxo Acumulado do Mês ══ */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Fluxo de Caixa Acumulado</CardTitle>
                    <CardDescription>{monthLabel} — resultado diário acumulado</CardDescription>
                </CardHeader>
                <CardContent>
                    {cashFlowData.length > 0 ? (
                        <div className="h-[280px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cashFlowData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradCashPositive2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
                                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtShort} dx={-5} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2} fill="url(#gradCashPositive2)" dot={{ r: 2, fill: '#6366f1' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                            Nenhuma movimentação neste período.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
