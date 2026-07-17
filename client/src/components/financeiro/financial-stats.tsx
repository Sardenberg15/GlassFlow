import { ArrowDown, ArrowUp, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { CardContent } from "@/components/ui/card";

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface FinancialStatsProps {
    receitas: number;
    despesas: number;
    lucro: number;
    pendingReceivables: number;
    saldoAtual?: number;
}

export function FinancialStats({ receitas, despesas, lucro, pendingReceivables, saldoAtual = 0 }: FinancialStatsProps) {
    const margin = receitas > 0 ? (lucro / receitas) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Resultado */}
            <div className="kpi-card animate-slide-up stagger-1">
                <div className={`kpi-accent ${lucro >= 0 ? 'bg-blue-600' : 'bg-red-500'}`} />
                <CardContent className="p-5 pl-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="kpi-label">Resultado Líquido</span>
                        <div className={`kpi-icon ${lucro >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-500'}`}>
                            <Wallet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className={`kpi-value ${lucro >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600'}`}>
                        {fmt(lucro)}
                    </div>
                    <span className="kpi-trend text-muted-foreground">
                        <TrendingUp className={`h-3 w-3 ${lucro >= 0 ? 'text-blue-500' : 'text-red-400'}`} />
                        Margem {margin.toFixed(1)}%
                    </span>
                </CardContent>
            </div>

            {/* Receitas */}
            <div className="kpi-card animate-slide-up stagger-2">
                <div className="kpi-accent bg-emerald-500" />
                <CardContent className="p-5 pl-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="kpi-label">Receitas</span>
                        <div className="kpi-icon bg-emerald-500/10 text-emerald-600">
                            <ArrowUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="kpi-value text-emerald-700 dark:text-emerald-400">{fmt(receitas)}</div>
                    <span className="kpi-trend text-muted-foreground">Entradas confirmadas</span>
                </CardContent>
            </div>

            {/* Despesas */}
            <div className="kpi-card animate-slide-up stagger-3">
                <div className="kpi-accent bg-rose-500" />
                <CardContent className="p-5 pl-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="kpi-label">Despesas</span>
                        <div className="kpi-icon bg-rose-500/10 text-rose-600">
                            <ArrowDown className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="kpi-value text-rose-600">{fmt(despesas)}</div>
                    <span className="kpi-trend text-muted-foreground">Saídas totais</span>
                </CardContent>
            </div>

            {/* A Receber */}
            <div className="kpi-card animate-slide-up stagger-4">
                <div className="kpi-accent bg-amber-400" />
                <CardContent className="p-5 pl-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="kpi-label">A Receber</span>
                        <div className="kpi-icon bg-amber-500/10 text-amber-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="kpi-value text-amber-700 dark:text-amber-400">{fmt(pendingReceivables)}</div>
                    <span className="kpi-trend text-muted-foreground">Previsão de projetos aprovados</span>
                </CardContent>
            </div>
        </div>
    );
}
