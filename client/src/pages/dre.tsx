import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown, ChevronRight, BarChart3, Calendar, Info, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Helpers ──────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// ── Types ────────────────────────────────────────────────
interface DREData {
  periodo: { inicio: string; fim: string };
  dre: {
    receitaBruta: number;
    deducoes: number;
    receitaLiquida: number;
    custosVariaveis: number;
    margemContribuicao: number;
    margemContribuicaoPct: number;
    gastosFixos: number;
    resultadoOperacional: number;
    margemOperacionalPct: number;
    resultadoFinanceiro: number;
    lucroAntesIR: number;
    impostos: number;
    lucroLiquido: number;
    margemLiquidaPct: number;
  };
  detalhes: {
    receitas: { nome: string; valor: number }[];
    custosVariaveis: { nome: string; valor: number }[];
    gastosFixos: { nome: string; valor: number }[];
    resultadoFinanceiro: { nome: string; valor: number }[];
    impostos: { nome: string; valor: number }[];
  };
}

// ── DRE Line Component ──────────────────────────────────
function DRELine({
  label, value, isSubtotal, isTotal, isNegative, percentage, indent, details, signal
}: {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isNegative?: boolean;
  percentage?: number;
  indent?: boolean;
  details?: { nome: string; valor: number }[];
  signal?: "+" | "-" | "=";
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = details && details.length > 0;

  const rowClass = isTotal
    ? "dre-row dre-total"
    : isSubtotal
    ? "dre-row dre-subtotal"
    : "dre-row";

  const valueColor = isTotal
    ? value >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"
    : isSubtotal
    ? value >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-600"
    : isNegative
    ? "text-rose-600"
    : "";

  const signalLabel = signal === "+" ? "(+)" : signal === "-" ? "(-)" : signal === "=" ? "(=)" : "";

  return (
    <>
      <div
        className={`${rowClass} ${hasDetails ? 'cursor-pointer hover:bg-muted/40' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className={`flex items-center gap-2 ${indent ? 'pl-6' : ''}`}>
          {hasDetails && (
            expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {!hasDetails && signal && (
            <span className="text-xs text-muted-foreground/60 w-5 text-center font-mono">{signalLabel}</span>
          )}
          <span className={isTotal || isSubtotal ? '' : 'text-sm'}>{label}</span>
          {percentage !== undefined && (
            <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 border-muted-foreground/20">
              {percentage}%
            </Badge>
          )}
        </div>
        <span className={`tabular-nums font-semibold ${valueColor} ${isTotal ? 'text-lg' : 'text-sm'}`}>
          {isNegative && value > 0 ? `(${fmt(value)})` : fmt(value)}
        </span>
      </div>

      {/* Detail rows */}
      {expanded && details && (
        <div className="bg-muted/20 border-l-2 border-primary/20 ml-8">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-center px-4 py-2 text-sm border-b border-muted/30 last:border-0">
              <span className="text-muted-foreground text-xs">{d.nome}</span>
              <span className="tabular-nums font-medium text-xs">{fmt(d.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// DRE PAGE
// ══════════════════════════════════════════════════════════
export default function DRE() {
  const [preset, setPreset] = useState("anual");
  const now = new Date();
  const [startDate, setStartDate] = useState(() => new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => now.toISOString().split('T')[0]);

  const applyPreset = (value: string) => {
    setPreset(value);
    const now = new Date();
    let s: Date, e: Date;
    switch (value) {
      case "mensal":
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = now;
        break;
      case "trimestral":
        s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        e = now;
        break;
      case "semestral":
        s = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        e = now;
        break;
      case "anual":
        s = new Date(now.getFullYear(), 0, 1);
        e = now;
        break;
      default:
        return;
    }
    setStartDate(s.toISOString().split('T')[0]);
    setEndDate(e.toISOString().split('T')[0]);
  };

  const { data, isLoading, error } = useQuery<DREData>({
    queryKey: ["/api/dre", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/dre?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Erro ao carregar DRE");
      return res.json();
    },
    retry: 2,
  });

  const dre = data?.dre;
  const det = data?.detalhes;
  const hasData = dre && (dre.receitaBruta > 0 || dre.custosVariaveis > 0 || dre.gastosFixos > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            Demonstrativo de Resultados (DRE)
          </h1>
          <p>Demonstrativo operacional do exercício</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => {
          window.open(`/api/dre/export?startDate=${startDate}&endDate=${endDate}`, "_blank");
        }}>
          <Download className="h-4 w-4" /> Exportar .xlsx
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</Label>
              <Select value={preset} onValueChange={applyPreset}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mês Atual</SelectItem>
                  <SelectItem value="trimestral">Trimestre</SelectItem>
                  <SelectItem value="semestral">Semestre</SelectItem>
                  <SelectItem value="anual">Ano {new Date().getFullYear()}</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[160px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[160px]" />
                </div>
              </>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary Cards */}
      {dre && hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="kpi-card animate-slide-up stagger-1">
            <div className="kpi-accent bg-emerald-500" />
            <CardContent className="p-4 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Receita</span>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">{fmt(dre.receitaBruta)}</p>
            </CardContent>
          </div>
          <div className="kpi-card animate-slide-up stagger-2">
            <div className="kpi-accent bg-blue-500" />
            <CardContent className="p-4 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">EBITDA</span>
              <p className={`text-xl font-bold tabular-nums mt-1 ${dre.resultadoOperacional >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'}`}>{fmt(dre.resultadoOperacional)}</p>
              <p className="text-[10px] text-muted-foreground">{dre.margemOperacionalPct}% de margem</p>
            </CardContent>
          </div>
          <div className="kpi-card animate-slide-up stagger-3">
            <div className={`kpi-accent ${dre.lucroLiquido >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`} />
            <CardContent className="p-4 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lucro Líquido</span>
              <p className={`text-xl font-bold tabular-nums mt-1 ${dre.lucroLiquido >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600'}`}>{fmt(dre.lucroLiquido)}</p>
              <p className="text-[10px] text-muted-foreground">{dre.margemLiquidaPct}% de margem</p>
            </CardContent>
          </div>
          <div className="kpi-card animate-slide-up stagger-4">
            <div className="kpi-accent bg-amber-400" />
            <CardContent className="p-4 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Despesas</span>
              <p className="text-xl font-bold text-rose-600 tabular-nums mt-1">{fmt(dre.custosVariaveis + dre.gastosFixos)}</p>
              <p className="text-[10px] text-muted-foreground">Total de custos operacionais</p>
            </CardContent>
          </div>
        </div>
      )}

      {/* DRE Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Demonstrativo de Resultados</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Info className="h-3 w-3" /> Clique nas linhas para ver o detalhamento por categoria
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600">
              <p className="font-semibold">Erro ao carregar DRE</p>
              <p className="text-sm text-muted-foreground mt-1">Verifique a conexão com o servidor e tente novamente.</p>
            </div>
          ) : dre && hasData ? (
            <div className="divide-y-0">
              <DRELine label="Receita Bruta de Vendas" value={dre.receitaBruta} signal="+" details={det?.receitas} />
              <DRELine label="Deduções sobre Receita" value={dre.deducoes} isNegative signal="-" indent />
              <DRELine label="RECEITA LÍQUIDA" value={dre.receitaLiquida} isSubtotal signal="=" />
              <DRELine label="Custos Variáveis" value={dre.custosVariaveis} isNegative signal="-" details={det?.custosVariaveis} />
              <DRELine label="MARGEM DE CONTRIBUIÇÃO" value={dre.margemContribuicao} isSubtotal signal="=" percentage={dre.margemContribuicaoPct} />
              <DRELine label="Gastos Fixos" value={dre.gastosFixos} isNegative signal="-" details={det?.gastosFixos} />
              <DRELine label="RESULTADO OPERACIONAL (EBITDA)" value={dre.resultadoOperacional} isSubtotal signal="=" percentage={dre.margemOperacionalPct} />
              <DRELine label="Resultado Financeiro" value={dre.resultadoFinanceiro} isNegative signal="-" details={det?.resultadoFinanceiro} />
              <DRELine label="LUCRO ANTES DO IR/CSLL" value={dre.lucroAntesIR} isSubtotal signal="=" />
              <DRELine label="IR / CSLL Estimado" value={dre.impostos} isNegative signal="-" details={det?.impostos} />
              <DRELine label="LUCRO LÍQUIDO" value={dre.lucroLiquido} isTotal signal="=" percentage={dre.margemLiquidaPct} />
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">Nenhuma movimentação no período</p>
              <p className="text-xs mt-1">Selecione um período diferente ou registre transações no módulo Financeiro.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800/80 dark:text-blue-300/80 space-y-1">
              <p className="font-semibold">Como funciona este DRE?</p>
              <p>O DRE é calculado a partir das transações e suas categorias. Para que os valores apareçam corretamente, certifique-se de:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Categorizar todas as transações</li>
                <li>Classificar as categorias de despesa como <strong>Fixa</strong> ou <strong>Variável</strong></li>
                <li>Definir o tipo de custo (Operacional, Financeiro, Imposto) em cada categoria</li>
              </ul>
              <p>Você pode gerenciar as categorias na aba <strong>Categorias</strong> do módulo Financeiro.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
