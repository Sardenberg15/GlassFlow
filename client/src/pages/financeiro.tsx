
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Clock, DollarSign, FileText, Plus, Calendar as CalendarIcon, Trash2, Upload, Eye, Paperclip, Settings, Download, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import type { Bill, Transaction, Project, Category } from "@shared/schema";
import { CategoryManager } from "@/components/financeiro/category-manager";
import { KPICards } from "@/components/financeiro/kpi-cards";
import { FinancialCharts } from "@/components/financeiro/financial-charts";
import { BankReconciliation } from "@/components/financeiro/bank-reconciliation";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number | string) => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numValue || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

const statusBadge = (status: string) => {
  if (status === "pago") return <Badge className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-none px-2 py-1">Pago</Badge>;
  if (status === "atrasado") return <Badge variant="destructive" className="text-xs border-none px-2 py-1">Atrasado</Badge>;
  return <Badge className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-none px-2 py-1">Pendente</Badge>;
};

export default function Financeiro() {
  const { toast } = useToast();
  const [tab, setTab] = useState("dashboard");
  const [openNewBill, setOpenNewBill] = useState(false);
  const [newBillType, setNewBillType] = useState<"pagar" | "receber">("pagar");
  const [newBillProjectId, setNewBillProjectId] = useState<string>("none");
  const [newBillCategoryId, setNewBillCategoryId] = useState<string>("none");
  const [newBillInstallments, setNewBillInstallments] = useState<number>(1);
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [attachingTransaction, setAttachingTransaction] = useState<Transaction | null>(null);
  const [openAttachFile, setOpenAttachFile] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [openViewFiles, setOpenViewFiles] = useState(false);

  const ym = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };
  const monthLabel = (ymStr: string) => {
    if (!ymStr) return "Todos";
    const [y, m] = ymStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  };

  const { data: bills = [], isLoading: loadingBills } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: transactionFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions/files"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const getCategory = (id?: string | null) => categories.find(c => c.id === id);

  // Mutations (CRUD)
  const createBillMutation = useMutation({
    mutationFn: async (payload: { description: string; value: string; dueDate: string; installments: number; type: string; projectId: string | null; categoryId: string | null }) => {
      const today = new Date().toISOString().split("T")[0];
      const totalValue = parseFloat(payload.value) || 0;
      const installments = Math.max(1, payload.installments);
      const installmentValue = (totalValue / installments).toFixed(2);

      for (let i = 0; i < installments; i++) {
        // Calculate due date: advance i months from the base dueDate
        const baseDate = new Date(payload.dueDate + "T00:00:00");
        baseDate.setMonth(baseDate.getMonth() + i);
        const dueDateStr = baseDate.toISOString().split("T")[0];

        const desc = installments > 1
          ? `${payload.description} (Parc. ${String(i + 1).padStart(2, "0")}/${String(installments).padStart(2, "0")})`
          : payload.description;

        const body = {
          type: payload.type,
          description: desc,
          value: installmentValue,
          dueDate: dueDateStr,
          status: "pendente",
          projectId: payload.projectId,
          categoryId: payload.categoryId,
          date: today,
        };
        await apiRequest("POST", "/api/bills", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setOpenNewBill(false);
      setNewBillInstallments(1);
      toast({ title: "Conta(s) criada(s) com sucesso!" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (billId: string) => {
      await apiRequest("PATCH", `/api/bills/${billId}`, { status: "pago" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Conta marcada como paga!" });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      await apiRequest("DELETE", `/api/bills/${billId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({ title: "Conta excluída!" });
    },
  });

  const handleAttachFileMutation = useMutation({
    mutationFn: async (fileData: { transactionId: string; fileName: string; fileType: string; fileSize: number; objectPath: string }) => {
      await apiRequest("POST", "/api/transactions/files", fileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/files"] });
      toast({ title: "Arquivo anexado com sucesso!" });
      setOpenAttachFile(false);
      setAttachingTransaction(null);
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      fields: data.fields || {}
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      if (file.name && file.uploadURL && attachingTransaction) {
        handleAttachFileMutation.mutate({
          transactionId: attachingTransaction.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          objectPath: file.uploadURL
        });
      }
    }
  };

  const getTransactionFiles = (transactionId: string) => {
    return transactionFiles.filter((file: any) => file.transactionId === transactionId);
  };

  // Build absolute server URL for file paths to bypass SPA router
  const getFileUrl = (objectPath: string) => {
    if (!objectPath) return '';
    if (objectPath.startsWith('http')) return objectPath;
    
    // Normalize Supabase-style paths stored in DB
    let normalizedPath = objectPath;
    const supabaseMatch = objectPath.match(/\/storage\/v1\/object\/(?:upload\/sign|public)\/uploads\/([^/?]+)/);
    if (supabaseMatch) {
      normalizedPath = `/objects/uploads/${supabaseMatch[1]}`;
    } else if (objectPath.startsWith('/storage/')) {
      const parts = objectPath.split('/');
      const uuid = parts[parts.length - 1];
      if (uuid) normalizedPath = `/objects/uploads/${uuid}`;
    }
    
    return `${window.location.origin}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  };


  // Filtering logic
  const concludedProjectIds = useMemo(() => {
    return new Set(
      projects
        .filter(p => p.status === "finalizado" || p.status === "concluido")
        .map(p => p.id)
    );
  }, [projects]);

  const baseTransactions = useMemo(() => transactions, [transactions]);
  const summaryTransactions = useMemo(() => {
    if (!monthFilter || monthFilter === "next3") return baseTransactions;
    return baseTransactions.filter(t => (t.date || "").startsWith(monthFilter));
  }, [baseTransactions, monthFilter]);

  const billsComputed = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return bills.map((b) => {
      let st = b.status;
      if (st !== "pago" && b.dueDate < today) st = "atrasado";
      return { ...b, status: st } as Bill;
    });
  }, [bills]);

  const summaryBills = useMemo(() => {
    let list = billsComputed;
    if (monthFilter === "next3") {
      const now = new Date();
      const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      const todayStr = now.toISOString().split("T")[0];
      const futureStr = threeMonthsLater.toISOString().split("T")[0];
      list = list.filter(b => (b.dueDate || "") >= todayStr && (b.dueDate || "") <= futureStr);
    } else if (monthFilter) {
      list = list.filter(b => (b.dueDate || "").startsWith(monthFilter));
    }
    return list;
  }, [billsComputed, monthFilter]);


  // Calculate Totals and KPI
  const totalReceitas = useMemo(() => summaryTransactions.filter(t => t.type === "receita").reduce((s, t) => s + parseFloat(String(t.value)), 0), [summaryTransactions]);
  const totalDespesasTransacoes = useMemo(() => summaryTransactions.filter(t => t.type === "despesa").reduce((s, t) => s + parseFloat(String(t.value)), 0), [summaryTransactions]);
  const totalDespesasBills = useMemo(() => summaryBills.filter(b => b.type === "pagar").reduce((s, b) => s + parseFloat(String(b.value)), 0), [summaryBills]);
  const totalDespesas = totalDespesasTransacoes + totalDespesasBills;
  const lucro = totalReceitas - totalDespesas;

  // Pending Receivables (Projects)
  const saldoPorProjeto = useMemo(() => {
    const projetosConcluidos = projects.filter(p => p.status === "finalizado" || p.status === "concluido");
    return projetosConcluidos.map(p => {
      const receitasProj = transactions
        .filter(t => t.projectId === p.id && t.type === "receita")
        .reduce((s, t) => s + parseFloat(String(t.value)), 0);
      const valorContrato = parseFloat(String(p.value));
      const aReceber = Math.max(0, valorContrato - receitasProj);
      let status: "pago" | "pendente" | "atrasado" = "pendente";
      const percentual = valorContrato > 0 ? (receitasProj / valorContrato) * 100 : 0;
      if (percentual >= 100) status = "pago";
      else if (aReceber > 0 && new Date(p.date) < new Date()) status = "atrasado";

      return { projeto: p, valorContrato, recebido: receitasProj, aReceber, status };
    }).sort((a, b) => b.aReceber - a.aReceber);
  }, [projects, transactions]);

  const totalPendingReceivables = saldoPorProjeto.reduce((acc, p) => acc + p.aReceber, 0);

  // Prepare Data for Charts
  const chartData = useMemo(() => {
    // 1. Monthly Cash Flow (Mocked slightly for demo, ideally would group real data by month)
    // To keep it real, let's group actual transactions by month
    const monthlyData = new Map<string, { name: string, receita: number, despesa: number }>();

    // Helper to get key "YYYY-MM"
    const getKey = (dateStr: string) => dateStr.substring(0, 7);

    transactions.forEach(t => {
      const key = getKey(t.date);
      if (!monthlyData.has(key)) monthlyData.set(key, { name: key, receita: 0, despesa: 0 });
      const val = parseFloat(String(t.value));
      if (t.type === 'receita') monthlyData.get(key)!.receita += val;
      else monthlyData.get(key)!.despesa += val;
    });

    // Also include bills in expenses for the chart? Optional, sticking to transactions for cash flow usually
    const monthlyArray = Array.from(monthlyData.values()).sort((a, b) => a.name.localeCompare(b.name));

    // 2. Categories
    const expenseCats = new Map<string, number>();
    summaryTransactions.filter(t => t.type === 'despesa').forEach(t => {
      const catId = t.categoryId || "uncategorized";
      const val = parseFloat(String(t.value));
      expenseCats.set(catId, (expenseCats.get(catId) || 0) + val);
    });

    const categoryArray = Array.from(expenseCats.entries()).map(([id, val]) => {
      const cat = categories.find(c => c.id === id);
      return {
        name: cat?.name || "Sem Categoria",
        value: val,
        color: cat?.color || "#94a3b8"
      };
    }).sort((a, b) => b.value - a.value);

    return {
      monthly: monthlyArray.slice(-6), // Last 6 months
      categories: categoryArray
    };
  }, [transactions, summaryTransactions, categories]);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Sem projeto";
    const p = projects.find((x) => x.id === projectId);
    return p?.name || "Projeto";
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            Visão Geral Financeira
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o fluxo de caixa, despesas e receitas da sua empresa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <CategoryManager />
          <Button className="gap-2" onClick={() => setOpenNewBill(true)}>
            <Plus className="h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-white/50 backdrop-blur-sm border hidden lg:flex flex-wrap w-full justify-start md:justify-center">
            <TabsTrigger value="dashboard" className="gap-2">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">Transações</TabsTrigger>
            <TabsTrigger value="bills" className="gap-2">Contas</TabsTrigger>
            <TabsTrigger value="receivables" className="gap-2">A Receber</TabsTrigger>
            <TabsTrigger value="reconciliation" className="gap-2 bg-blue-50 text-blue-700 data-[state=active]:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
              Conciliação
            </TabsTrigger>
          </TabsList>

          <div className="lg:hidden mb-2 w-full">
            <Select value={tab} onValueChange={setTab}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Selecione a visualização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="transactions">Transações</SelectItem>
                <SelectItem value="bills">Contas</SelectItem>
                <SelectItem value="receivables">A Receber</SelectItem>
                <SelectItem value="reconciliation">Conciliação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Professional Date Filter */}
          <div className="flex items-center gap-3">
            {/* Quick Buttons */}
            <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  monthFilter === "" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setMonthFilter("")}
              >
                Todos
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  monthFilter === ym(new Date()) ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => {
                  const now = new Date();
                  setMonthFilter(ym(now));
                  setFilterYear(now.getFullYear());
                  setFilterMonth(now.getMonth());
                }}
              >
                Este mês
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  monthFilter === "next3" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setMonthFilter("next3")}
              >
                Próx. 3 meses
              </button>
            </div>

            {/* Month/Year Navigator */}
            <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-l-xl transition-colors"
                onClick={() => {
                  let newMonth = filterMonth - 1;
                  let newYear = filterYear;
                  if (newMonth < 0) { newMonth = 11; newYear--; }
                  setFilterMonth(newMonth);
                  setFilterYear(newYear);
                  setMonthFilter(`${newYear}-${String(newMonth + 1).padStart(2, "0")}`);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold min-w-[110px] text-center transition-all ${
                  monthFilter && monthFilter !== "next3" && monthFilter !== "" ? "text-primary" : "text-gray-700"
                }`}
                onClick={() => {
                  setMonthFilter(`${filterYear}-${String(filterMonth + 1).padStart(2, "0")}`);
                }}
              >
                <CalendarIcon className="h-3 w-3 inline-block mr-1.5 -mt-0.5" />
                {new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(
                  new Date(filterYear, filterMonth, 1)
                )}
              </button>
              <button
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl transition-colors"
                onClick={() => {
                  let newMonth = filterMonth + 1;
                  let newYear = filterYear;
                  if (newMonth > 11) { newMonth = 0; newYear++; }
                  setFilterMonth(newMonth);
                  setFilterYear(newYear);
                  setMonthFilter(`${newYear}-${String(newMonth + 1).padStart(2, "0")}`);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <TabsContent value="dashboard" className="space-y-6 focus-visible:ring-0 outline-none">
          {/* KPI Cards */}
          <KPICards
            totalReceitas={totalReceitas}
            totalDespesas={totalDespesas}
            lucro={lucro}
            pendingReceivables={totalPendingReceivables}
          />

          {/* Charts Section */}
          <FinancialCharts data={chartData} />

          {/* Recent Transactions Preview (Top 5) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transações Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setTab("transactions")}>Ver todas</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryTransactions.slice(0, 5).map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDate(t.date)}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>
                          {(() => {
                            const cat = getCategory(t.categoryId);
                            return cat ? (
                              <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }}>
                                {cat.name}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 focus-visible:ring-0 outline-none">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Todas Transações</CardTitle>
                {/* Could add specific filters here */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryTransactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge className={t.type === 'receita' ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                            {t.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell>{formatCurrency(t.value)}</TableCell>
                        <TableCell>{formatDate(t.date)}</TableCell>
                        <TableCell>{t.projectId ? <Link href={`/projetos/${t.projectId}`}><span className="text-primary hover:underline cursor-pointer">{getProjectName(t.projectId)}</span></Link> : '-'}</TableCell>
                        <TableCell>
                          {(() => {
                            const cat = getCategory(t.categoryId);
                            return cat ? (
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                {cat.name}
                              </div>
                            ) : <span className="text-muted-foreground">-</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setViewingTransaction(t); setOpenViewFiles(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setAttachingTransaction(t); setOpenAttachFile(true); }}>
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4 focus-visible:ring-0 outline-none">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Contas a Pagar e Receber</CardTitle>
                <Button size="sm" onClick={() => setOpenNewBill(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Conta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryBills.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{formatDate(b.dueDate)}</TableCell>
                        <TableCell>{statusBadge(b.status)}</TableCell>
                        <TableCell className="font-medium">{b.description}</TableCell>
                        <TableCell>
                          {(() => {
                            const cat = getCategory(b.categoryId);
                            return cat ? (
                              <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }}>
                                {cat.name}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(b.value)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {b.status !== 'pago' && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => markPaidMutation.mutate(b.id)}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteBillMutation.mutate(b.id)}>Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables" className="space-y-4 focus-visible:ring-0 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>Valores a Receber de Obras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Contratado</TableHead>
                      <TableHead>Já Recebido</TableHead>
                      <TableHead>A Receber</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saldoPorProjeto.map((p, i) => (
                      <TableRow key={p.projeto.id}>
                        <TableCell>
                          <Link href={`/projetos/${p.projeto.id}`}>
                            <span className="font-medium text-primary hover:underline cursor-pointer">{p.projeto.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{formatCurrency(p.valorContrato)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(p.recebido)}</TableCell>
                        <TableCell className="font-bold text-amber-600">{formatCurrency(p.aReceber)}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4 focus-visible:ring-0 outline-none">
          <BankReconciliation transactions={transactions} categories={categories} projects={projects} />
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      <Dialog open={openNewBill} onOpenChange={setOpenNewBill}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>
              Preencha os dados da conta abaixo.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createBillMutation.mutate({
                description: formData.get("description") as string,
                value: formData.get("value") as string,
                dueDate: formData.get("dueDate") as string,
                installments: newBillInstallments,
                projectId: newBillProjectId === "none" ? null : newBillProjectId,
                categoryId: newBillCategoryId === "none" ? null : newBillCategoryId,
                type: newBillType,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Tipo</Label>
              <ToggleGroup type="single" value={newBillType} onValueChange={(v) => v && setNewBillType(v as "pagar" | "receber")} className="justify-start">
                <ToggleGroupItem value="pagar">A Pagar</ToggleGroupItem>
                <ToggleGroupItem value="receber">A Receber</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input name="description" required placeholder="Ex: Vemar AutoCenter" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <Input name="value" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label>Nº de Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={newBillInstallments}
                  onChange={(e) => setNewBillInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
            {newBillInstallments > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium">
                  💡 Serão criadas {newBillInstallments} parcelas de{" "}
                  <span className="font-bold">
                    {(() => {
                      const val = parseFloat((document.querySelector('input[name="value"]') as HTMLInputElement)?.value || "0");
                      const perInstallment = val / newBillInstallments;
                      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(perInstallment || 0);
                    })()}
                  </span>{" "}
                  com vencimentos mensais consecutivos.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{newBillInstallments > 1 ? "Vencimento da 1ª Parcela" : "Vencimento"}</Label>
              <Input name="dueDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Projeto (opcional)</Label>
              <Select value={newBillProjectId} onValueChange={setNewBillProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem projeto</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newBillCategoryId} onValueChange={setNewBillCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.filter(c => c.type === (newBillType === "pagar" ? "despesa" : "receita")).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setOpenNewBill(false); setNewBillInstallments(1); }}>Cancelar</Button>
              <Button type="submit" disabled={createBillMutation.isPending}>
                {createBillMutation.isPending ? "Criando..." : newBillInstallments > 1 ? `Criar ${newBillInstallments} Parcelas` : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* File Dialogs */}
      <Dialog open={openAttachFile} onOpenChange={setOpenAttachFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Arquivo</DialogTitle>
          </DialogHeader>
          {attachingTransaction && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Clique para anexar arquivo</p>
                <input
                  type="file"
                  accept=".pdf,.xml,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Logic reused from previous implementation
                      const uploadParams = await handleGetUploadParameters();
                      const uploadResponse = await fetch(uploadParams.url, {
                        method: uploadParams.method,
                        body: file,
                        headers: { 'Content-Type': file.type || 'application/octet-stream' }
                      });
                      if (uploadResponse.ok) {
                        handleUploadComplete({
                          successful: [{
                            name: file.name, type: file.type, size: file.size, uploadURL: uploadParams.url
                          }]
                        });
                      }
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </label>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openViewFiles} onOpenChange={setOpenViewFiles}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivos Anexados</DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              {getTransactionFiles(viewingTransaction.id).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum arquivo.</p>
              ) : (
                getTransactionFiles(viewingTransaction.id).map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="text-sm truncate max-w-[200px]">{file.fileName}</div>
                    <Button size="sm" variant="outline" onClick={() => window.open(getFileUrl(file.objectPath), '_blank')}>Abrir</Button>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}