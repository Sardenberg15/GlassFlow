import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, Calendar, User, Trash2 } from "lucide-react";
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

export default function Projetos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
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
    const projectTransactions = transactions.filter(t => t.projectId === project.id);
    const client = clients.find(c => c.id === project.clientId);
    return {
      ...project,
      client: client || { id: project.clientId, name: "Cliente não encontrado", contact: "", email: "", phone: "", createdAt: new Date() },
      transactions: projectTransactions,
    };
  });

  // Filter projects
  const filteredProjetos = projectsWithData.filter(projeto => {
    const matchesSearch = projeto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || projeto.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  // Update project status mutation
  const updateProjectStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Status atualizado!",
        description: "O status do projeto foi alterado com sucesso.",
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

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Projeto excluído!",
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

  // Create transaction mutation
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

  const calculateProjectFinancials = (projectId: string) => {
    const projectTransactions = transactions.filter(t => t.projectId === projectId);
    const receitas = projectTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
    const despesas = projectTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
    const profit = receitas - despesas;
    const margin = receitas > 0 ? (profit / receitas) * 100 : 0;
    return { receitas, despesas, profit, margin };
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gerencie orçamentos e projetos em andamento</p>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-projeto"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-status">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="orcamento">Orçamento</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="execucao">Em Execução</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              {searchTerm || statusFilter !== "todos" 
                ? "Tente ajustar os filtros de busca" 
                : "Comece criando um novo projeto"}
            </p>
          </div>
        </Card>
      )}

      {/* Projects Grid */}
      {!isLoading && filteredProjetos.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjetos.map((projeto) => (
            <Card 
              key={projeto.id} 
              className="hover-elevate cursor-pointer transition-all" 
              onClick={() => setSelectedProject(projeto)}
              data-testid={`card-projeto-${projeto.id}`}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{projeto.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <ProjectStatusBadge status={projeto.status as ProjectStatus} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-delete-projeto-${projeto.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">{projeto.client.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{projeto.date}</span>
                </div>
                <div className="pt-2 border-t">
                  {(() => {
                    const financials = calculateProjectFinancials(projeto.id);
                    if (financials.receitas === 0 && financials.despesas === 0) {
                      return <p className="text-2xl font-bold font-mono">{formatCurrency(projeto.value)}</p>;
                    }
                    return (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold font-mono" data-testid={`text-profit-${projeto.id}`}>
                          {formatCurrency(financials.profit)}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-margin-${projeto.id}`}>
                          Margem: {financials.margin.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalhes do Projeto */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
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
                  </SelectContent>
                </Select>
              </div>
              {selectedProject && <StatusWorkflow currentStatus={selectedProject.status as "orcamento" | "aprovado" | "execucao" | "finalizado"} />}
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-4">
              <Dialog open={openReceita} onOpenChange={setOpenReceita}>
                <DialogTrigger asChild>
                  <Button data-testid="button-modal-add-receita">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Receita
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Receita</DialogTitle>
                    <DialogDescription>Adicione uma receita ao projeto</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => handleAddTransaction(e, "receita")} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receita-desc">Descrição</Label>
                      <Input 
                        id="receita-desc" 
                        name="description"
                        placeholder="Ex: Pagamento inicial" 
                        data-testid="input-modal-receita-desc"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receita-value">Valor (R$)</Label>
                      <Input 
                        id="receita-value" 
                        name="value"
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        data-testid="input-modal-receita-value"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receita-date">Data</Label>
                      <Input 
                        id="receita-date" 
                        name="date"
                        type="date" 
                        data-testid="input-modal-receita-date"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="button-modal-submit-receita"
                      disabled={createTransactionMutation.isPending}
                    >
                      {createTransactionMutation.isPending ? "Adicionando..." : "Adicionar Receita"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-modal-add-despesa">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Despesa</DialogTitle>
                    <DialogDescription>Adicione uma despesa ao projeto</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => handleAddTransaction(e, "despesa")} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="despesa-desc">Descrição</Label>
                      <Input 
                        id="despesa-desc" 
                        name="description"
                        placeholder="Ex: Compra de materiais" 
                        data-testid="input-modal-despesa-desc"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="despesa-value">Valor (R$)</Label>
                      <Input 
                        id="despesa-value" 
                        name="value"
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        data-testid="input-modal-despesa-value"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="despesa-date">Data</Label>
                      <Input 
                        id="despesa-date" 
                        name="date"
                        type="date" 
                        data-testid="input-modal-despesa-date"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="button-modal-submit-despesa"
                      disabled={createTransactionMutation.isPending}
                    >
                      {createTransactionMutation.isPending ? "Adicionando..." : "Adicionar Despesa"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Cartão de Obras */}
            {selectedProject && (
              <CartaoObras 
                projectId={selectedProject.id}
                projectName={selectedProject.name}
                transactions={selectedProject.transactions.map(t => ({
                  ...t,
                  type: t.type as "receita" | "despesa",
                  value: typeof t.value === 'string' ? parseFloat(t.value) : t.value
                }))}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
