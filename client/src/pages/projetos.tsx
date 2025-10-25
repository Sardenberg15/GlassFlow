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
import { Plus, Search, Calendar, User, Trash2, DollarSign, AlertCircle, CheckCircle2, Clock, TrendingUp, AlertTriangle, FileText } from "lucide-react";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { CartaoObras } from "@/components/cartao-obras";
import { StatusWorkflow } from "@/components/status-workflow";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            {filteredProjetos.length} {filteredProjetos.length === 1 ? "projeto encontrado" : "projetos encontrados"}
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

      {/* Metrics Cards */}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                {formatCurrency(metrics.totalFaltaReceber)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pendente de recebimento
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamento Pendente</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.projetosPendentes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.projetosPendentes === 1 ? "projeto" : "projetos"} com valores pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics.projetosAtrasados}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Finalizados sem pagamento total
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total em Projetos</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalValor)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.totalProjetos} {metrics.totalProjetos === 1 ? "projeto" : "projetos"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por projeto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-projeto"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="orcamento">Orçamento</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="execucao">Em Execução</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-payment">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Pagamentos</SelectItem>
              <SelectItem value="pago">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Pago</span>
                </div>
              </SelectItem>
              <SelectItem value="pendente">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Pendente</span>
                </div>
              </SelectItem>
              <SelectItem value="atrasado">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>Atrasado</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProjetos.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "todos" || paymentFilter !== "todos"
                ? "Tente ajustar os filtros de busca" 
                : "Comece criando um novo projeto"}
            </p>
          </div>
        </Card>
      )}

      {/* Projects Grid */}
      {!isLoading && filteredProjetos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjetos.map((projeto) => {
            const hasPaymentPending = projeto.faltaReceber > 0;
            const isOverdue = projeto.paymentStatus === "atrasado";
            const isPaid = projeto.paymentStatus === "pago";
            
            return (
              <Card 
                key={projeto.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedProject(projeto)}
                data-testid={`card-projeto-${projeto.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ProjectStatusBadge status={projeto.status as ProjectStatus} />
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Atrasado
                          </Badge>
                        )}
                        {isPaid && (
                          <Badge className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pago
                          </Badge>
                        )}
                        {hasPaymentPending && !isPaid && !isOverdue && (
                          <Badge className="text-xs bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg line-clamp-2 leading-tight">{projeto.name}</CardTitle>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          data-testid={`button-delete-projeto-${projeto.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O projeto "{projeto.name}" e todas as suas transações serão permanentemente removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteProjectMutation.mutate(projeto.id)}
                            data-testid="button-confirm-delete"
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 pb-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="truncate">{projeto.client.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{projeto.date}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Financial Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Valor Total</span>
                      <span className="text-sm font-semibold font-mono">{formatCurrency(projeto.valorCobrado)}</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Recebido</span>
                        <span className="font-medium text-green-600 dark:text-green-500">
                          {formatCurrency(projeto.receitas)}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(projeto.percentualRecebido, 100)} 
                        className="h-1.5"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{Math.min(projeto.percentualRecebido, 100).toFixed(0)}% recebido</span>
                        {hasPaymentPending && (
                          <span className="font-medium text-orange-600 dark:text-orange-500">
                            Falta: {formatCurrency(projeto.faltaReceber)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid={`button-add-receita-${projeto.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(projeto);
                      setOpenReceita(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Receita
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid={`button-add-despesa-${projeto.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(projeto);
                      setOpenDespesa(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Despesa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    data-testid={`button-view-details-${projeto.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(projeto);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Projeto */}
      <Dialog open={!!selectedProject && !openReceita && !openDespesa} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              Cliente: {selectedProject?.client.name} | Data: {selectedProject?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Workflow */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Status do Projeto</h3>
                <Select 
                  value={selectedProject?.status} 
                  onValueChange={handleStatusChange}
                  disabled={updateProjectStatusMutation.isPending}
                >
                  <SelectTrigger className="w-[200px]" data-testid="select-edit-status">
                    <SelectValue />
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
              {selectedProject && selectedProject.status !== "cancelado" && (
                <StatusWorkflow currentStatus={selectedProject.status as "orcamento" | "aprovado" | "execucao" | "finalizado"} />
              )}
              {selectedProject?.status === "cancelado" && (
                <div className="text-center py-4 text-muted-foreground">
                  Projeto cancelado
                </div>
              )}
            </div>

            {/* Cartão de Obras */}
            {selectedProject && (
              <CartaoObras
                projectId={selectedProject.id}
                projectName={selectedProject.name}
                transactions={selectedProject.transactions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Receita */}
      <Dialog open={openReceita} onOpenChange={setOpenReceita}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Receita</DialogTitle>
            <DialogDescription>Adicione uma receita ao projeto {selectedProject?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleAddTransaction(e, "receita")} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receita-description">Descrição</Label>
              <Input 
                id="receita-description" 
                name="description"
                placeholder="Ex: Pagamento parcial" 
                data-testid="input-receita-description"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receita-value">Valor</Label>
              <Input 
                id="receita-value" 
                name="value"
                type="number" 
                step="0.01"
                placeholder="0.00" 
                data-testid="input-receita-value"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receita-date">Data</Label>
              <Input 
                id="receita-date" 
                name="date"
                type="date" 
                data-testid="input-receita-date"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              data-testid="button-submit-receita"
              disabled={createTransactionMutation.isPending}
            >
              {createTransactionMutation.isPending ? "Registrando..." : "Registrar Receita"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Despesa */}
      <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Despesa</DialogTitle>
            <DialogDescription>Adicione uma despesa ao projeto {selectedProject?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleAddTransaction(e, "despesa")} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="despesa-description">Descrição</Label>
              <Input 
                id="despesa-description" 
                name="description"
                placeholder="Ex: Materiais" 
                data-testid="input-despesa-description"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="despesa-value">Valor</Label>
              <Input 
                id="despesa-value" 
                name="value"
                type="number" 
                step="0.01"
                placeholder="0.00" 
                data-testid="input-despesa-value"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="despesa-date">Data</Label>
              <Input 
                id="despesa-date" 
                name="date"
                type="date" 
                data-testid="input-despesa-date"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              data-testid="button-submit-despesa"
              disabled={createTransactionMutation.isPending}
            >
              {createTransactionMutation.isPending ? "Registrando..." : "Registrar Despesa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
