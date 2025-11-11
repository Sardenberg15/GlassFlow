import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Calendar, User, Trash2, DollarSign, AlertCircle, CheckCircle2, Clock, TrendingUp, TrendingDown, AlertTriangle, FileText, MoreHorizontal } from "lucide-react";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { CartaoObras } from "@/components/cartao-obras";
import { GestaoObraPanel } from "@/components/gestao-obra-panel";
import { StatusWorkflow } from "@/components/status-workflow";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Project, Transaction, Client } from "@shared/schema";

type ProjectStatus = "orcamento" | "aprovado" | "execucao" | "finalizado" | "cancelado";

type ProjectWithTransactions = Project & {
  client: Client;
  transactions: Transaction[];
};

type PaymentFilter = "todos" | "pago" | "pendente" | "atrasado";

export default function Projetos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [sortBy, setSortBy] = useState<"recent" | "valor_desc" | "valor_asc" | "recebido_desc">("recent");
  const [openNew, setOpenNew] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTransactions | null>(null);
  const [openReceita, setOpenReceita] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const { toast } = useToast();

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Merge projects with their transactions and client data
  const projectsWithData: ProjectWithTransactions[] = projects.map(project => {
    const projectTransactions = transactions.filter(t => t.projectId === project.id) as Transaction[];
    const client = clients.find(c => c.id === project.clientId);
    return {
      ...project,
      client: client || { 
        id: project.clientId, 
        name: "Cliente não encontrado", 
        contact: "", 
        email: null, 
        phone: "", 
        address: null,
        cnpjCpf: null,
        createdAt: new Date() 
      },
      transactions: projectTransactions,
    };
  });

  // Calculate payment status for each project
  const projectsWithPaymentStatus = useMemo(() => {
    return projectsWithData.map(projeto => {
      const valorCobrado = parseFloat(String(projeto.value));
      const receitas = projeto.transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
      const faltaReceber = valorCobrado - receitas;
      const percentualRecebido = valorCobrado > 0 ? (receitas / valorCobrado) * 100 : 0;
      
      let paymentStatus: "pago" | "pendente" | "atrasado" = "pendente";
      if (percentualRecebido >= 100) {
        paymentStatus = "pago";
      } else if (projeto.status === "finalizado" && faltaReceber > 0) {
        paymentStatus = "atrasado";
      }

      return {
        ...projeto,
        valorCobrado,
        receitas,
        faltaReceber,
        percentualRecebido,
        paymentStatus,
      };
    });
  }, [projectsWithData]);

  // Calculate overview metrics
  const metrics = useMemo(() => {
    const totalProjetos = projectsWithPaymentStatus.length;
    const totalFaltaReceber = projectsWithPaymentStatus.reduce((sum, p) => sum + p.faltaReceber, 0);
    const projetosPendentes = projectsWithPaymentStatus.filter(p => p.paymentStatus === "pendente").length;
    const projetosAtrasados = projectsWithPaymentStatus.filter(p => p.paymentStatus === "atrasado").length;
    const totalValor = projectsWithPaymentStatus.reduce((sum, p) => sum + p.valorCobrado, 0);

    return {
      totalProjetos,
      totalFaltaReceber,
      projetosPendentes,
      projetosAtrasados,
      totalValor,
    };
  }, [projectsWithPaymentStatus]);

  // Filter projects
  const filteredProjetos = projectsWithPaymentStatus.filter(projeto => {
    const matchesSearch = projeto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || projeto.status === statusFilter;
    const matchesPayment = paymentFilter === "todos" || projeto.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const orderedProjetos = useMemo(() => {
    const arr = [...filteredProjetos];
    if (sortBy === "valor_desc") {
      return arr.sort((a, b) => Number(b.valorCobrado) - Number(a.valorCobrado));
    }
    if (sortBy === "valor_asc") {
      return arr.sort((a, b) => Number(a.valorCobrado) - Number(b.valorCobrado));
    }
    if (sortBy === "recebido_desc") {
      return arr.sort((a, b) => Number(b.percentualRecebido) - Number(a.percentualRecebido));
    }
    // recent: best effort by using index order (API returns newest first usually)
    return arr;
  }, [filteredProjetos, sortBy]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const projectData = {
        name: data.get("name") as string,
        clientId: data.get("clientId") as string,
        description: data.get("description") as string || "",
        value: data.get("value") as string,
        type: data.get("type") as string,
        status: "orcamento",
        date: new Date().toLocaleDateString('pt-BR'),
      };
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] }); // Atualiza contas a receber automáticas
      toast({
        title: "Projeto criado!",
        description: "O orçamento foi gerado com sucesso.",
      });
      setOpenNew(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/projects/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] }); // Atualiza contas a receber automáticas
      toast({
        title: "Projeto excluído",
        description: "O projeto foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] }); // Atualiza contas a receber automáticas
      toast({
        title: "Status atualizado",
        description: "O status do projeto foi alterado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const transactionData = {
        projectId: selectedProject?.id as string,
        type: data.get("type") as string,
        description: data.get("description") as string,
        value: data.get("value") as string,
        date: data.get("date") as string,
      };
      const response = await apiRequest("POST", "/api/transactions", transactionData);
      return response.json();
    },
    onSuccess: (_, variables) => {
      const type = variables.get("type") as string;
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: `${type === "receita" ? "Receita" : "Despesa"} registrada!`,
        description: `A ${type} foi adicionada ao projeto.`,
      });
      type === "receita" ? setOpenReceita(false) : setOpenDespesa(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };

  const handleSubmitNew = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createProjectMutation.mutate(formData);
  };

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>, type: "receita" | "despesa") => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("type", type);
    createTransactionMutation.mutate(formData);
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedProject) {
      updateProjectStatusMutation.mutate({ id: selectedProject.id, status: newStatus as ProjectStatus });
    }
  };

  const isLoading = projectsLoading || transactionsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe e gerencie todos os seus projetos em um só lugar.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-projeto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto/Orçamento</DialogTitle>
              <DialogDescription>Preencha os dados do projeto</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Nome do Projeto</Label>
                  <Input 
                    id="project-name" 
                    name="name"
                    placeholder="Ex: Fachada Comercial" 
                    data-testid="input-projeto-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select name="clientId" required>
                    <SelectTrigger data-testid="select-cliente">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  name="description"
                  placeholder="Descreva o projeto..." 
                  data-testid="input-projeto-description" 
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Estimado</Label>
                  <Input 
                    id="value" 
                    name="value"
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    data-testid="input-projeto-value"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select name="type" required>
                    <SelectTrigger data-testid="select-tipo">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vidro">Vidros</SelectItem>
                      <SelectItem value="espelho">Espelhos</SelectItem>
                      <SelectItem value="reparo">Reparo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-submit-projeto"
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? "Criando..." : "Criar Projeto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:border-primary/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(metrics.totalValor)}</div>}
            <p className="text-xs text-muted-foreground">Soma de todos os projetos</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(metrics.totalFaltaReceber)}</div>}
            <p className="text-xs text-muted-foreground">Valor pendente de todos os projetos</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.totalProjetos}</div>}
            <p className="text-xs text-muted-foreground">Número total de orçamentos e obras</p>
          </CardContent>
        </Card>
        <Card className="hover:border-yellow-500/80 transition-colors border-yellow-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pag. Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.projetosPendentes}</div>}
            <p className="text-xs text-muted-foreground">Projetos aguardando pagamento</p>
          </CardContent>
        </Card>
        <Card className="hover:border-red-500/80 transition-colors border-red-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pag. Atrasado</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.projetosAtrasados}</div>}
            <p className="text-xs text-muted-foreground">Projetos com pagamento vencido</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Project List */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por projeto ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status do Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="execucao">Em Execução</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Pagamentos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ordenar por:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="valor_desc">Maior Valor</SelectItem>
                <SelectItem value="valor_asc">Menor Valor</SelectItem>
                <SelectItem value="recebido_desc">Mais Recebido (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[280px] w-full" />)}
          </div>
        ) : filteredProjetos.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orderedProjetos.map((projeto) => {
              const despesas = projeto.transactions
                .filter(t => t.type === 'despesa')
                .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
              const lucro = projeto.receitas - despesas;

              return (
                <Card 
                  key={projeto.id} 
                  className="flex flex-col justify-between group overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => setSelectedProject(projeto)}
                  >
                    <div className="flex items-start justify-between">
                      <ProjectStatusBadge status={projeto.status} />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {projeto.paymentStatus === 'pago' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        {projeto.paymentStatus === 'atrasado' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        {projeto.paymentStatus === 'pendente' && <Clock className="h-3 w-3 text-yellow-500" />}
                        <span className="capitalize">{projeto.paymentStatus}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold pt-2 group-hover:text-primary transition-colors">
                      {projeto.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" /> {projeto.client.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> {new Date(projeto.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardHeader>
                  <CardContent 
                    className="cursor-pointer flex-grow"
                    onClick={() => setSelectedProject(projeto)}
                  >
                    <Separator className="my-3" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor</span>
                        <span className="font-medium">{formatCurrency(projeto.valorCobrado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recebido</span>
                        <span className="font-medium text-green-600">{formatCurrency(projeto.receitas)}</span>
                      </div>
                      {projeto.status === 'finalizado' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-bold">Lucro</span>
                          <span className={`font-bold ${lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {formatCurrency(lucro)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Progress value={projeto.percentualRecebido} className="mt-4 h-2" />
                    <p className="text-xs text-muted-foreground mt-1 text-right">{projeto.percentualRecebido.toFixed(0)}% recebido</p>
                  </CardContent>
                  <CardFooter className="bg-muted/40 px-6 py-3 transition-all duration-300 opacity-0 group-hover:opacity-100">
                    <div className="flex w-full justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setOpenReceita(true); setSelectedProject(projeto); }}>
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Adicionar Receita</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setOpenDespesa(true); setSelectedProject(projeto); }}>
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Adicionar Despesa</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedProject(projeto)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Ver Detalhes</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-500" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Essa ação não pode ser desfeita. Isso excluirá permanentemente o projeto e todas as suas transações.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteProjectMutation.mutate(projeto.id)} 
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">Nenhum projeto encontrado.</p>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou o termo de busca.</p>
          </div>
        )}

        {/* Modal de detalhes do projeto */}
        <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) setSelectedProject(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Projeto</DialogTitle>
              <DialogDescription>Informações e status</DialogDescription>
            </DialogHeader>
            {selectedProject && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm"><strong>Projeto:</strong> {selectedProject.name}</p>
                  <p className="text-sm"><strong>Cliente:</strong> {selectedProject.client.name}</p>
                  <p className="text-sm"><strong>Data:</strong> {new Date(selectedProject.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedProject.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orcamento">Orçamento</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="execucao">Em Execução</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de receita */}
        <Dialog open={openReceita} onOpenChange={setOpenReceita}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Receita</DialogTitle>
              <DialogDescription>Preencha os dados da receita</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleAddTransaction(e, "receita")} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receita-desc">Descrição</Label>
                <Input id="receita-desc" name="description" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-value">Valor</Label>
                <Input id="receita-value" name="value" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-date">Data</Label>
                <Input id="receita-date" name="date" type="date" required />
              </div>
              <Button type="submit" disabled={createTransactionMutation.isPending}>
                {createTransactionMutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de despesa */}
        <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Despesa</DialogTitle>
              <DialogDescription>Preencha os dados da despesa</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleAddTransaction(e, "despesa")} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="despesa-desc">Descrição</Label>
                <Input id="despesa-desc" name="description" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-value">Valor</Label>
                <Input id="despesa-value" name="value" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-date">Data</Label>
                <Input id="despesa-date" name="date" type="date" required />
              </div>
              <Button type="submit" disabled={createTransactionMutation.isPending}>
                {createTransactionMutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
