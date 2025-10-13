import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Transaction {
  id: string;
  type: "receita" | "despesa";
  description: string;
  value: number;
  date: string;
}

interface CartaoObrasProps {
  projectName: string;
  transactions: Transaction[];
}

export function CartaoObras({ projectName, transactions }: CartaoObrasProps) {
  const receitas = transactions.filter(t => t.type === "receita");
  const despesas = transactions.filter(t => t.type === "despesa");
  
  const totalReceitas = receitas.reduce((sum, t) => sum + t.value, 0);
  const totalDespesas = despesas.reduce((sum, t) => sum + t.value, 0);
  const saldo = totalReceitas - totalDespesas;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cartão de Obras - {projectName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Receitas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-chart-2" />
              <h3 className="font-semibold text-chart-2">Receitas</h3>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-3">
                {receitas.length > 0 ? (
                  receitas.map((receita) => (
                    <div key={receita.id} className="space-y-1" data-testid={`receita-${receita.id}`}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{receita.description}</p>
                        <p className="text-sm font-semibold text-chart-2">{formatCurrency(receita.value)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{receita.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma receita registrada</p>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-lg font-bold text-chart-2" data-testid="total-receitas">{formatCurrency(totalReceitas)}</span>
            </div>
          </div>

          {/* Despesas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-chart-4" />
              <h3 className="font-semibold text-chart-4">Despesas</h3>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-3">
                {despesas.length > 0 ? (
                  despesas.map((despesa) => (
                    <div key={despesa.id} className="space-y-1" data-testid={`despesa-${despesa.id}`}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{despesa.description}</p>
                        <p className="text-sm font-semibold text-chart-4">{formatCurrency(despesa.value)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{despesa.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-lg font-bold text-chart-4" data-testid="total-despesas">{formatCurrency(totalDespesas)}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className={`flex justify-between items-center p-4 rounded-md ${saldo >= 0 ? 'bg-chart-2/10' : 'bg-chart-4/10'}`}>
          <span className="text-lg font-semibold">Saldo do Projeto:</span>
          <span className={`text-2xl font-bold ${saldo >= 0 ? 'text-chart-2' : 'text-chart-4'}`} data-testid="saldo-projeto">
            {formatCurrency(saldo)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
