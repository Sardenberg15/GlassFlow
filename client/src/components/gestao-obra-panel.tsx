import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, TrendingUp, FileText, Settings } from "lucide-react";
import type { Transaction, ProjectFile } from "@shared/schema";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { RelatorioObraPDF } from "@/components/relatorio-obra-pdf";
import { useToast } from "@/hooks/use-toast";

type ProjectBasics = {
  id: string;
  name: string;
  clientId?: string;
  value: string | number;
  status: string;
  transactions: Transaction[];
};

interface GestaoObraPanelProps {
  project: ProjectBasics;
  onAddReceita?: () => void;
  onAddDespesa?: () => void;
  projectFiles?: ProjectFile[];
}

const formatCurrency = (value: number | string) => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numValue || 0);
};

export function GestaoObraPanel({ project, onAddReceita, onAddDespesa, projectFiles = [] }: GestaoObraPanelProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  // Buscar arquivos do projeto se não foram fornecidos
  const { data: fetchedProjectFiles = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/projects", project.id, "files"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: projectFiles.length === 0, // Só busca se não houver arquivos fornecidos
  });

  // Fetch client details
  const { data: client } = useQuery({
    queryKey: ["/api/clients", project.clientId],
    queryFn: async () => {
      if (!project.clientId) return null;
      const response = await fetch(`/api/clients/${project.clientId}`);
      if (!response.ok) throw new Error("Failed to fetch client");
      return response.json();
    },
    enabled: !!project.clientId,
  });

  const finalProjectFiles = projectFiles.length > 0 ? projectFiles : fetchedProjectFiles;

  const { receitas, despesas, totalReceitas, totalDespesas, valorTotalContratado, aReceber, percentualRecebido, lucro, margem } = useMemo(() => {
    const receitas = project.transactions.filter(t => t.type === "receita");
    const despesas = project.transactions.filter(t => t.type === "despesa");
    const totalReceitas = receitas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
    const totalDespesas = despesas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
    const valorTotalContratado = typeof project.value === "string" ? parseFloat(project.value) : project.value;
    const aReceber = Math.max(0, (valorTotalContratado || 0) - totalReceitas);
    const percentualRecebido = valorTotalContratado > 0 ? Math.min(100, (totalReceitas / valorTotalContratado) * 100) : 0;
    const lucro = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

    return { receitas, despesas, totalReceitas, totalDespesas, valorTotalContratado, aReceber, percentualRecebido, lucro, margem };
  }, [project]);

  // Heurística simples para categorias das despesas
  const despesasAgrupadas = useMemo(() => {
    const grupos: Record<string, number> = { "Materiais (Vidro, Alumínio, Ferragens)": 0, "Mão de Obra (Horas)": 0, "Despesas Extras": 0 };
    despesas.forEach(d => {
      const desc = (d.description || "").toLowerCase();
      if (/(vidro|alum[ií]nio|ferrag|materiais)/.test(desc)) grupos["Materiais (Vidro, Alumínio, Ferragens)"] += parseFloat(String(d.value));
      else if (/(hora|m[aã]o de obra|servi[cç]o)/.test(desc)) grupos["Mão de Obra (Horas)"] += parseFloat(String(d.value));
      else grupos["Despesas Extras"] += parseFloat(String(d.value));
    });
    return grupos;
  }, [despesas]);

  const isPaid = percentualRecebido >= 100;
  const isOverdue = project.status === "finalizado" && aReceber > 0;
  const hasPaymentPending = aReceber > 0 && !isOverdue;

  return (
    <div className="space-y-6">
      {/* Botão de relatório PDF */}
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={async () => {
            try {
              setIsGeneratingPDF(true);

              // Adicionar delay pequeno para garantir que o estado seja atualizado
              await new Promise(resolve => setTimeout(resolve, 100));

              const blob = await pdf(
                <RelatorioObraPDF
                  project={{
                    id: project.id,
                    name: project.name,
                    value: project.value,
                    status: project.status,
                    client: client?.name || "Cliente do Projeto",
                    address: client?.address || "Endereço do Projeto",
                    responsible: "Responsável Técnico"
                  }}
                  transactions={project.transactions}
                  projectFiles={finalProjectFiles}
                  reportType="detailed"
                  reportPeriod={{
                    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  }}
                />
              ).toBlob();

              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `relatorio-obra-${(project.name || 'projeto').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              setTimeout(() => URL.revokeObjectURL(url), 100);

              toast({
                title: "Relatório gerado com sucesso!",
                description: "O download do relatório foi iniciado.",
              });
            } catch (error: any) {
              console.error('Erro completo ao gerar PDF:', error);

              let errorMessage = "Ocorreu um erro ao gerar o PDF.";
              if (error?.message?.includes('unitsPerEm')) {
                errorMessage = "Erro de fonte no PDF. Tente novamente.";
              } else if (error?.message?.includes('undefined') || error?.message?.includes('null')) {
                errorMessage = "Dados incompletos para gerar o PDF. Verifique se todos os dados estão carregados.";
              }

              toast({
                title: "Erro ao gerar relatório",
                description: errorMessage,
                variant: "destructive"
              });
            } finally {
              setIsGeneratingPDF(false);
            }
          }}
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? (
            <>
              <Settings className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório PDF
            </>
          )}
        </Button>
      </div>
      {/* Top Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receitas do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">Valor Total Contratado</div>
            <div className="text-2xl font-bold">{formatCurrency(valorTotalContratado)}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Recebido</div>
                <div className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalReceitas)}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">A Receber</div>
                <div className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(aReceber)}</div>
              </div>
            </div>
            <Progress value={percentualRecebido} />
            <div className="flex items-center gap-2">
              {isOverdue && (
                <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Atrasado</Badge>
              )}
              {isPaid && (
                <Badge className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Pago</Badge>
              )}
              {hasPaymentPending && (
                <Badge className="text-xs bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lucratividade Real</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{margem.toFixed(1)}%</div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">{formatCurrency(lucro)} de lucro</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Receita</div>
                <div className="font-semibold">{formatCurrency(totalReceitas)}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">Custos</div>
                <div className="font-semibold">{formatCurrency(totalDespesas)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recebimentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parcelas e Recebimentos</CardTitle>
            {onAddReceita && (
              <Button size="sm" onClick={onAddReceita}>Registrar Recebimento</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitas.length > 0 ? (
                receitas.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[400px] truncate">{r.description}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(r.value)}</TableCell>
                    <TableCell>{r.date}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">Nenhum recebimento registrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Custos detalhados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custos Detalhados</CardTitle>
            {onAddDespesa && (
              <Button size="sm" onClick={onAddDespesa}>Lançar Despesa</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(despesasAgrupadas).map(([categoria, valor]) => (
                <TableRow key={categoria}>
                  <TableCell>{categoria}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
}