import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Filter, Trash2, Calendar, Pencil, CheckCircle2, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Line, LineChart, Pie, PieChart, Cell } from "recharts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import type { Transaction, Project, Bill } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  activeProjects: number;
  totalClients: number;
  receitas: number;
  despesas: number;
  lucro: number;
  margem: number;
}

type PeriodFilter = "1month" | "3months" | "6months" | "1year" | "all";

export default function Financeiro() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("6months");
  const [typeFilter, setTypeFilter] = useState<"all" | "receita" | "despesa">("all");
  
  // Edit state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  
  // Form state for transaction creation/editing
  const [formType, setFormType] = useState<string>("");
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formValue, setFormValue] = useState<string>("");
  const [formDate, setFormDate] = useState<string>("");
  
  // Bill dialog state
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  
  // Form state for bill creation/editing
  const [billFormType, setBillFormType] = useState<string>("");
  const [billFormProjectId, setBillFormProjectId] = useState<string>("");
  const [billFormDescription, setBillFormDescription] = useState<string>("");
  const [billFormValue, setBillFormValue] = useState<string>("");
  const [billFormDate, setBillFormDate] = useState<string>("");
  const [billFormDueDate, setBillFormDueDate] = useState<string>("");
  const [billFormStatus, setBillFormStatus] = useState<string>("pendente");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      console.log("Financeiro PATCH /api/transactions", { id, data });
      return apiRequest("PATCH", `/api/transactions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] }); // Atualiza contas a receber automáticas
      toast({
        title: "Transação atualizada",
        description: "A transação foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Não foi possível atualizar a transação.";
      console.error("Financeiro updateTransaction error:", error);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] }); // Atualiza contas a receber automáticas
      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transação.",
        variant: "destructive",
      });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/bills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Conta atualizada",
        description: "A conta foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a conta.",
        variant: "destructive",
      });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Conta excluída",
        description: "A conta foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (periodFilter) {
      case "1month":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "3months":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
      default:
        cutoffDate.setFullYear(2000);
    }

    return transactions
      .filter(t => new Date(t.date) >= cutoffDate)
      .filter(t => typeFilter === "all" || t.type === typeFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, periodFilter, typeFilter]);

  // Aggregate data by month
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { receita: number; despesa: number }>();
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { receita: 0, despesa: 0 });
      }
      
      const data = monthMap.get(monthKey)!;
      if (t.type === "receita") {
        data.receita += parseFloat(t.value);
      } else {
        data.despesa += parseFloat(t.value);
      }
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return {
          month: monthNames[parseInt(monthNum) - 1],
          receita: data.receita,
          despesa: data.despesa,
        };
      });
  }, [filteredTransactions]);

  // Aggregate revenue by project type
  const categoryData = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    filteredTransactions
      .filter(t => t.type === "receita")
      .forEach(t => {
        const project = projects.find(p => p.id === t.projectId);
        const type = project?.type || "outros";
        typeMap.set(type, (typeMap.get(type) || 0) + parseFloat(t.value));
      });

    const colors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
    ];

    return Array.from(typeMap.entries()).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[index % colors.length],
    }));
  }, [filteredTransactions, projects]);

  const totalReceitas = stats?.receitas || 0;
  const totalDespesas = stats?.despesas || 0;
  const lucro = stats?.lucro || 0;
  const margemLucro = stats?.margem || 0;

  const resetForm = () => {
    setFormType("");
    setFormProjectId("");
    setFormDescription("");
    setFormValue("");
    setFormDate("");
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormType(transaction.type);
    setFormProjectId(transaction.projectId);
    setFormDescription(transaction.description);
    setFormValue(transaction.value);
    setFormDate(transaction.date.split('T')[0]);
    setIsDialogOpen(true);
  };

  const resetBillForm = () => {
    setBillFormType("");
    setBillFormProjectId("");
    setBillFormDescription("");
    setBillFormValue("");
    setBillFormDate("");
    setBillFormDueDate("");
    setBillFormStatus("pendente");
    setEditingBill(null);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setBillFormType(bill.type);
    setBillFormProjectId(bill.projectId || "");
    setBillFormDescription(bill.description);
    setBillFormValue(bill.value);
    setBillFormDate(bill.date.split('T')[0]);
    setBillFormDueDate(bill.dueDate.split('T')[0]);
    setBillFormStatus(bill.status);
    setIsBillDialogOpen(true);
  };

  const handleSubmitTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formType || !formProjectId || !formDescription || !formValue || !formDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingTransaction) {
        // Update existing transaction
        await updateTransactionMutation.mutateAsync({
          id: editingTransaction.id,
          data: {
            projectId: formProjectId,
            type: formType,
            description: formDescription,
            value: formValue,
            date: formDate,
          }
        });
      } else {
        // Create new transaction
        await apiRequest("POST", "/api/transactions", {
          projectId: formProjectId,
          type: formType,
          description: formDescription,
          value: formValue,
          date: formDate,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bills"] }); // Atualiza contas a receber automáticas
        
        toast({
          title: "Transação criada",
          description: "A transação foi adicionada com sucesso.",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: editingTransaction ? "Não foi possível atualizar a transação." : "Não foi possível criar a transação.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!billFormType || !billFormDescription || !billFormValue || !billFormDate || !billFormDueDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingBill) {
        await updateBillMutation.mutateAsync({
          id: editingBill.id,
          data: {
            projectId: billFormProjectId || null,
            type: billFormType,
            description: billFormDescription,
            value: billFormValue,
            date: billFormDate,
            dueDate: billFormDueDate,
            status: billFormStatus,
          }
        });
      } else {
        await apiRequest("POST", "/api/bills", {
          projectId: billFormProjectId || null,
          type: billFormType,
          description: billFormDescription,
          value: billFormValue,
          date: billFormDate,
          dueDate: billFormDueDate,
          status: billFormStatus,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
        
        toast({
          title: "Conta criada",
          description: "A conta foi adicionada com sucesso.",
        });
      }
      
      setIsBillDialogOpen(false);
      resetBillForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: editingBill ? "Não foi possível atualizar a conta." : "Não foi possível criar a conta.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    try {
      // Se for conta a receber vinculada a projeto, criar receita automaticamente
      if (bill.type === "receber" && bill.projectId) {
        await apiRequest("POST", "/api/transactions", {
          projectId: bill.projectId,
          type: "receita",
          description: bill.description,
          value: bill.value,
          date: new Date().toISOString().split('T')[0],
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }
      
      // Marcar conta como paga
      await updateBillMutation.mutateAsync({
        id: bill.id,
        data: {
          status: "pago",
        }
      });
      
      toast({
        title: bill.type === "receber" ? "Receita lançada!" : "Conta paga!",
        description: bill.type === "receber" && bill.projectId 
          ? "A conta foi marcada como paga e a receita foi lançada no projeto."
          : "A conta foi marcada como paga.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar como pago.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Visão geral das finanças da empresa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-transaction">
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={formType} onValueChange={setFormType} required>
                  <SelectTrigger id="type" data-testid="select-transaction-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectId">Projeto</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId} required>
                  <SelectTrigger id="projectId" data-testid="select-transaction-project">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição da transação"
                  data-testid="input-transaction-description"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input
                  id="value"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  data-testid="input-transaction-value"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  type="date"
                  data-testid="input-transaction-date"
                  required
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-transaction">
                {editingTransaction ? "Atualizar Transação" : "Criar Transação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
              data-testid="metric-total-revenue"
            />
            <MetricCard
              title="Despesas Totais"
              value={formatCurrency(totalDespesas)}
              icon={ArrowDownCircle}
              iconColor="bg-chart-4"
              data-testid="metric-total-expenses"
            />
            <MetricCard
              title="Lucro Líquido"
              value={formatCurrency(lucro)}
              icon={Wallet}
              iconColor="bg-primary"
              data-testid="metric-net-profit"
            />
            <MetricCard
              title="Margem de Lucro"
              value={`${margemLucro}%`}
              icon={TrendingUp}
              iconColor="bg-chart-3"
              data-testid="metric-profit-margin"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="period-filter">Período</Label>
              <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
                <SelectTrigger id="period-filter" data-testid="select-period-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Último mês</SelectItem>
                  <SelectItem value="3months">Últimos 3 meses</SelectItem>
                  <SelectItem value="6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="1year">Último ano</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="type-filter">Tipo</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                <SelectTrigger id="type-filter" data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma receita disponível para o período selecionado
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fluxo de Caixa */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
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
          )}
        </CardContent>
      </Card>

      {/* Tabs de Transações e Contas */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              Transações
            </TabsTrigger>
            <TabsTrigger value="bills" data-testid="tab-bills">
              Contas a Pagar/Receber
            </TabsTrigger>
          </TabsList>
          <Dialog open={isBillDialogOpen} onOpenChange={(open) => {
            setIsBillDialogOpen(open);
            if (!open) resetBillForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-bill">
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBill ? "Editar Conta" : "Nova Conta"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitBill} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bill-type">Tipo</Label>
                  <Select value={billFormType} onValueChange={setBillFormType} required>
                    <SelectTrigger id="bill-type" data-testid="select-bill-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receber">A Receber</SelectItem>
                      <SelectItem value="pagar">A Pagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-description">Descrição</Label>
                  <Input
                    id="bill-description"
                    value={billFormDescription}
                    onChange={(e) => setBillFormDescription(e.target.value)}
                    placeholder="Descrição da conta"
                    data-testid="input-bill-description"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-value">Valor</Label>
                  <Input
                    id="bill-value"
                    value={billFormValue}
                    onChange={(e) => setBillFormValue(e.target.value)}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    data-testid="input-bill-value"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-date">Data de Emissão</Label>
                  <Input
                    id="bill-date"
                    value={billFormDate}
                    onChange={(e) => setBillFormDate(e.target.value)}
                    type="date"
                    data-testid="input-bill-date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-due-date">Data de Vencimento</Label>
                  <Input
                    id="bill-due-date"
                    value={billFormDueDate}
                    onChange={(e) => setBillFormDueDate(e.target.value)}
                    type="date"
                    data-testid="input-bill-due-date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-project">Projeto (Opcional)</Label>
                  <Select value={billFormProjectId} onValueChange={setBillFormProjectId}>
                    <SelectTrigger id="bill-project" data-testid="select-bill-project">
                      <SelectValue placeholder="Sem Projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-status">Status</Label>
                  <Select value={billFormStatus} onValueChange={setBillFormStatus} required>
                    <SelectTrigger id="bill-status" data-testid="select-bill-status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" data-testid="button-submit-bill">
                  {editingBill ? "Atualizar Conta" : "Criar Conta"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Transações ({filteredTransactions.length})</CardTitle>
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
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-transactions">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
              <p className="text-sm text-muted-foreground">
                Crie transações para visualizar o histórico financeiro
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => {
                    const project = projects.find(p => p.id === transaction.projectId);
                    return (
                      <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                        <TableCell className="font-medium" data-testid={`transaction-date-${transaction.id}`}>
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === "receita" ? (
                              <ArrowUpCircle className="h-4 w-4 text-chart-2" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-chart-4" />
                            )}
                            <span className={transaction.type === "receita" ? "text-chart-2" : "text-chart-4"}>
                              {transaction.type === "receita" ? "Receita" : "Despesa"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`transaction-description-${transaction.id}`}>
                          {transaction.description}
                        </TableCell>
                        <TableCell data-testid={`transaction-project-${transaction.id}`}>
                          {project?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold" data-testid={`transaction-value-${transaction.id}`}>
                          <span className={transaction.type === "receita" ? "text-chart-2" : "text-chart-4"}>
                            {transaction.type === "receita" ? "+" : "-"}{formatCurrency(parseFloat(transaction.value))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTransaction(transaction)}
                              data-testid={`button-edit-transaction-${transaction.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                              data-testid={`button-delete-transaction-${transaction.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar e Receber ({bills.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {billsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`skeleton-bill-${i}`}>
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
              ) : bills.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-bills">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma conta encontrada</h3>
                  <p className="text-sm text-muted-foreground">
                    Crie contas a pagar ou receber para gerenciar suas finanças
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => {
                        const project = projects.find(p => p.id === bill.projectId);
                        const isOverdue = bill.status === "pendente" && new Date(bill.dueDate) < new Date();
                        
                        return (
                          <TableRow key={bill.id} data-testid={`bill-row-${bill.id}`}>
                            <TableCell className="font-medium" data-testid={`bill-due-date-${bill.id}`}>
                              {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {bill.type === "receber" ? (
                                  <ArrowUpCircle className="h-4 w-4 text-chart-2" />
                                ) : (
                                  <ArrowDownCircle className="h-4 w-4 text-chart-4" />
                                )}
                                <span className={bill.type === "receber" ? "text-chart-2" : "text-chart-4"}>
                                  {bill.type === "receber" ? "A Receber" : "A Pagar"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`bill-description-${bill.id}`}>
                              {bill.description}
                            </TableCell>
                            <TableCell data-testid={`bill-project-${bill.id}`}>
                              {project?.name || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  bill.status === "pago" ? "default" : 
                                  isOverdue ? "destructive" : 
                                  "secondary"
                                }
                                data-testid={`bill-status-${bill.id}`}
                              >
                                {bill.status === "pago" ? "Pago" : 
                                 isOverdue ? "Atrasado" : 
                                 "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold" data-testid={`bill-value-${bill.id}`}>
                              <span className={bill.type === "receber" ? "text-chart-2" : "text-chart-4"}>
                                {bill.type === "receber" ? "+" : "-"}{formatCurrency(parseFloat(bill.value))}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {bill.status !== "pago" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMarkAsPaid(bill)}
                                    data-testid={`button-mark-paid-${bill.id}`}
                                    title="Marcar como pago"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditBill(bill)}
                                  data-testid={`button-edit-bill-${bill.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteBillMutation.mutate(bill.id)}
                                  data-testid={`button-delete-bill-${bill.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
