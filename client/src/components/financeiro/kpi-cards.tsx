
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet } from "lucide-react";

interface KPICardsProps {
    totalReceitas: number;
    totalDespesas: number;
    lucro: number;
    pendingReceivables: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function KPICards({ totalReceitas, totalDespesas, lucro, pendingReceivables }: KPICardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalReceitas)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        +12.5% em relação ao mês anterior
                    </p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Totais</CardTitle>
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(totalDespesas)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        -2.4% em relação ao mês anterior
                    </p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
                    <DollarSign className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${lucro >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(lucro)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Margem de {totalReceitas > 0 ? ((lucro / totalReceitas) * 100).toFixed(1) : 0}%
                    </p>
                </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
                    <Wallet className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(pendingReceivables)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Valores pendentes de projetos
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
