import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Calendar, User, Trash2, DollarSign, AlertCircle, CheckCircle2, Clock, TrendingUp, TrendingDown, AlertTriangle, FileText, MoreHorizontal, GripVertical, Edit } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ProjectStatusBadge } from "@/components/project-status-badge";
// import { CartaoObras } from "@/components/cartao-obras";
// import { GestaoObraPanel } from "@/components/gestao-obra-panel";
import { StatusWorkflow } from "@/components/status-workflow";
import { useTypologies } from "@/hooks/use-esquadrias";
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
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [sortBy, setSortBy] = useState<"recent" | "valor_desc" | "valor_asc" | "recebido_desc" | "custom">("recent");
  const [kindFilter, setKindFilter] = useState<"todos" | "obra" | "administrativo">("todos");
  const [monthFilter, setMonthFilter] = useState<string>("todos");
  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTransactions | null>(null);
  const [openReceita, setOpenReceita] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const [newProjectType, setNewProjectType] = useState<string>("esquadria");
  const [newPaymentCondition, setNewPaymentCondition] = useState<string>("a_vista");
  const [customInstallments, setCustomInstallments] = useState<Array<{ description: string; value: string; dueDate: string }>>([
    { description: "Sinal", value: "", dueDate: "" },
    { description: "Saldo", value: "", dueDate: "" }
  ]);
  const [quoteNumber, setQuoteNumber] = useState<string>("");
  const [projectItems, setProjectItems] = useState<Array<{ description: string; quantity: string; width: string; height: string; typologyId: string; unitPrice: string; }>>([]);
  const { toast } = useToast();

  const { data: typologies = [] } = useTypologies();

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

  // Fetch categories for expenses/income
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts"],
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
        updatedAt: null,
        createdAt: new Date()
      },
      transactions: projectTransactions,
    };
  });

  // Calculate payment status for each project
  const projectsWithPaymentStatus = useMemo(() => {
    return projectsWithData.map(projeto => {
      const isAdminFolder = (projeto.client?.name || "").toLowerCase() === "administrativo" || projeto.type === "administrativo";
      const valorCobrado = parseFloat(String(projeto.value)) || 0;
      const receitas = projeto.transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
      
      const faltaReceber = isAdminFolder ? 0 : Math.max(0, valorCobrado - receitas);
      const percentualRecebido = isAdminFolder ? (receitas > 0 ? 100 : 0) : (valorCobrado > 0 ? (receitas / valorCobrado) * 100 : 0);

      let paymentStatus: "pago" | "pendente" | "atrasado" = "pendente";
      if (!isAdminFolder && percentualRecebido >= 100) {
        paymentStatus = "pago";
      } else if (isAdminFolder) {
        paymentStatus = "pago"; // Pastas administrativas não ficam pendentes
      } else {
        const isFinalizado = projeto.status === "finalizado" || projeto.status === "concluido";
        const isPrazoVencido = new Date(projeto.date) < new Date();
        if (isFinalizado && faltaReceber > 0 && isPrazoVencido) {
          paymentStatus = "atrasado";
        }
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

  const filteredProjetos = useMemo(() => {
    return projectsWithPaymentStatus.filter(projeto => {
      const matchesSearch = projeto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projeto.client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || projeto.status === statusFilter;
      const matchesPayment = paymentFilter === "todos" || projeto.paymentStatus === paymentFilter;
      const isAdminFolder = (projeto.client.name || "").toLowerCase() === "administrativo" || projeto.type === "administrativo";
      const matchesKind =
        kindFilter === "todos" ||
        (kindFilter === "administrativo" ? isAdminFolder : !isAdminFolder);

      const projectDate = new Date(projeto.date || projeto.createdAt);
      const projectMonth = (projectDate.getMonth() + 1).toString(); // 1 a 12
      const matchesMonth = monthFilter === "todos" || projectMonth === monthFilter;

      return matchesSearch && matchesStatus && matchesPayment && matchesKind && matchesMonth;
    });
  }, [projectsWithPaymentStatus, searchTerm, statusFilter, paymentFilter, kindFilter, monthFilter]);

  // Calculate overview metrics based on FILTERED projects
  const metrics = useMemo(() => {
    const totalProjetos = filteredProjetos.length;
    const totalFaltaReceber = filteredProjetos.reduce((sum, p) => sum + p.faltaReceber, 0);
    const projetosPendentes = filteredProjetos.filter(p => p.paymentStatus === "pendente").length;
    const projetosAtrasados = filteredProjetos.filter(p => p.paymentStatus === "atrasado").length;
    const totalValor = filteredProjetos.reduce((sum, p) => sum + p.valorCobrado, 0);

    return {
      totalProjetos,
      totalFaltaReceber,
      projetosPendentes,
      projetosAtrasados,
      totalValor,
    };
  }, [filteredProjetos]);

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
    mutationFn: async (data: { formData: FormData; items: any[]; customInstallments?: any[] }) => {
      const { formData, items, customInstallments } = data;
      const clientId = formData.get("clientId") as string | null;
      const base = {
        name: formData.get("name") as string,
        quoteNumber: formData.get("quoteNumber") as string,
        description: (formData.get("description") as string) || "",
        value: formData.get("value") as string,
        type: formData.get("type") as string,
        status: "orcamento",
        date: new Date().toISOString().split('T')[0],
        paymentCondition: formData.get("paymentCondition") as string || "personalizado",
        paymentConditionEntry: formData.get("paymentConditionEntry") as string || null,
        items: items,
        customInstallments: customInstallments,
      } as Record<string, any>;
      if (clientId) base.clientId = clientId;
      const response = await apiRequest("POST", "/api/projects", base);
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

  const editProjectMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!selectedProject) throw new Error("Nenhum projeto selecionado");
      const response = await apiRequest("PATCH", `/api/projects/${selectedProject.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Projeto atualizado",
        description: "As informações foram salvas com sucesso.",
      });
      setOpenEdit(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderProjectsMutation = useMutation({
    mutationFn: async (updates: { id: number, orderIndex: number }[]) => {
      const response = await apiRequest("PATCH", `/api/projects/reorder`, { updates });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
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
    createProjectMutation.mutate({ 
      formData, 
      items: projectItems, 
      customInstallments: newPaymentCondition === 'personalizado' ? customInstallments : undefined 
    });
  };

  const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const quoteNumber = formData.get("quoteNumber") as string;
    const data = {
      name: formData.get("name") as string,
      saleNumber: quoteNumber,
      saleDate: formData.get("saleDate") as string || null,
      quoteNumber: quoteNumber,
      date: formData.get("date") as string,
    };
    editProjectMutation.mutate(data);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const newOrdered = Array.from(orderedProjetos);
    const [moved] = newOrdered.splice(sourceIndex, 1);
    newOrdered.splice(destIndex, 0, moved);

    // Apply the visual update optimistically if you prefer, or rely on React Query.
    // For now we just gather the IDs and send the backend update.
    const updates = newOrdered.map((proj, idx) => ({
      id: Number(proj.id),
      orderIndex: idx
    }));

    reorderProjectsMutation.mutate(updates);
  };

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>, type: "receita" | "despesa") => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawCategoryId = formData.get("categoryId") as string | null;
    const rawBankAccountId = formData.get("bankAccountId") as string | null;
    const data = {
      type,
      description: formData.get("description") as string,
      value: formData.get("value") as string,
      date: formData.get("date") as string,
      categoryId: (rawCategoryId && rawCategoryId !== "none") ? rawCategoryId : null,
      paymentMethod: formData.get("paymentMethod") as string,
      bankAccountId: (rawBankAccountId && rawBankAccountId !== "none") ? rawBankAccountId : null,
    };
    createTransactionMutation.mutate(data as any);
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
          <h1>Projetos & Pastas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe obras e pastas administrativas em um só lugar.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={(open) => {
          setOpenNew(open);
          if (open) {
            setProjectItems([]);
            // Fetch next quote number
            fetch("/api/projects/next-number").then(r => r.json()).then(data => {
              if (data.number) setQuoteNumber(data.number);
            }).catch(console.error);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-projeto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Projeto/Orçamento</DialogTitle>
              <DialogDescription>Preencha os dados do projeto</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNew} className="space-y-6">
              {/* Seção 1: Identificação */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Identificação do Projeto
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quoteNumber">Nº Orçamento / Venda</Label>
                    <Input id="quoteNumber" name="quoteNumber" value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} required />
                    <p className="text-[10px] text-muted-foreground">O número da venda será o mesmo do orçamento.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saleDate">Data de Lançamento</Label>
                    <Input id="saleDate" name="saleDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados do Projeto */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Dados do Cliente & Projeto
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Nome do Projeto (Opcional)</Label>
                    <Input id="project-name" name="name" placeholder="Será gerado automaticamente se vazio" data-testid="input-projeto-name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição / Local</Label>
                  <Textarea id="description" name="description" placeholder="Descreva o local ou ambiente..." data-testid="input-projeto-description" />
                </div>
              </div>

              {/* Seção 3: Tipo e Valor */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  Classificação e Valor
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Projeto *</Label>
                    <Select name="type" value={newProjectType} onValueChange={(v) => setNewProjectType(v)}>
                      <SelectTrigger data-testid="select-tipo">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vidro">🪟 Vidros</SelectItem>
                        <SelectItem value="espelho">🪞 Espelhos</SelectItem>
                        <SelectItem value="esquadria">🏗️ Esquadrias de Alumínio</SelectItem>
                        <SelectItem value="reparo">🔧 Reparo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Valor Estimado (R$) *</Label>
                    <Input id="value" name="value" type="number" step="0.01" placeholder="0.00" data-testid="input-projeto-value" required />
                  </div>
                </div>
              </div>


              {/* Seção 5: Condição de Pagamento */}
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Condição de Pagamento
                </h4>
                <input type="hidden" name="paymentCondition" value={newPaymentCondition} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "a_vista", label: "À Vista (100%)", icon: "💰" },
                    { id: "pix", label: "PIX à Vista", icon: "📱" },
                    { id: "entrada_saldo_30", label: "Entrada + Saldo 30d", icon: "📋" },
                    { id: "entrada_25_saldo", label: "Ent. + 25% + Saldo", icon: "📋" },
                    { id: "sinal_boleto_30_60_90", label: "Sinal + Boleto 30/60/90", icon: "📋" },
                    { id: "boleto_30_60_90", label: "Boleto 30/60/90", icon: "📋" },
                    { id: "cheque", label: "Cheque", icon: "📝" },
                    { id: "personalizado", label: "Personalizado", icon: "✏️" }
                  ].map((cond) => (
                    <div
                      key={cond.id}
                      onClick={() => setNewPaymentCondition(cond.id)}
                      className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center text-center gap-1 transition-all ${
                        newPaymentCondition === cond.id
                          ? "border-blue-500 bg-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
                          : "bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xl">{cond.icon}</span>
                      <span className="text-[11px] font-medium leading-tight">{cond.label}</span>
                    </div>
                  ))}
                </div>
                
                {/* Campos adicionais de pagamento dependendo da condição */}
                {(newPaymentCondition === 'entrada_saldo_30' || newPaymentCondition === 'entrada_25_saldo' || newPaymentCondition === 'sinal_boleto_30_60_90') && (
                  <div className="space-y-2 mt-4 max-w-[200px]">
                    <Label htmlFor="paymentConditionEntry">% Entrada/Sinal</Label>
                    <div className="relative">
                      <Input
                        id="paymentConditionEntry"
                        name="paymentConditionEntry"
                        type="number"
                        step="0.01"
                        placeholder={newPaymentCondition === 'sinal_boleto_30_60_90' ? "10" : "50"}
                        defaultValue={newPaymentCondition === 'sinal_boleto_30_60_90' ? "10" : "50"}
                        data-testid="input-payment-condition-entry"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Percentual pago no ato.</p>
                  </div>
                )}
                
                {/* Construtor de Parcelas Personalizadas */}
                {newPaymentCondition === 'personalizado' && (
                  <div className="space-y-3 mt-4 border rounded-md p-3 bg-white">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-semibold">Configurar Parcelas</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => setCustomInstallments([...customInstallments, { description: `Parcela ${customInstallments.length + 1}`, value: "", dueDate: "" }])}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Parcela
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {customInstallments.map((inst, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input 
                            placeholder="Descrição" 
                            className="h-8 text-xs flex-1"
                            value={inst.description}
                            onChange={(e) => {
                              const newInsts = [...customInstallments];
                              newInsts[idx].description = e.target.value;
                              setCustomInstallments(newInsts);
                            }}
                          />
                          <Input 
                            placeholder="R$ ou %" 
                            className="h-8 text-xs w-24"
                            value={inst.value}
                            onChange={(e) => {
                              const newInsts = [...customInstallments];
                              newInsts[idx].value = e.target.value;
                              setCustomInstallments(newInsts);
                            }}
                          />
                          <Input 
                            type="date"
                            className="h-8 text-xs w-32"
                            value={inst.dueDate}
                            onChange={(e) => {
                              const newInsts = [...customInstallments];
                              newInsts[idx].dueDate = e.target.value;
                              setCustomInstallments(newInsts);
                            }}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => {
                              const newInsts = [...customInstallments];
                              newInsts.splice(idx, 1);
                              setCustomInstallments(newInsts);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Insira os valores em R$. A data pode ficar em branco (ex: para parcelas apenas na conclusão).</p>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-2 bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  As parcelas financeiras serão geradas automaticamente na aba de Gestão Financeira após a criação do projeto.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                <Button
                  type="submit"
                  data-testid="button-submit-projeto"
                  disabled={createProjectMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createProjectMutation.isPending ? "Criando..." : "Finalizar Cadastro"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(metrics.totalValor)}</div>}
            <p className="text-xs text-muted-foreground">Soma de todos os projetos</p>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(metrics.totalFaltaReceber)}</div>}
            <p className="text-xs text-muted-foreground">Valor pendente de todos os projetos</p>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.totalProjetos}</div>}
            <p className="text-xs text-muted-foreground">Número total de orçamentos e obras</p>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-yellow-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm hover:border-yellow-400 hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pag. Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{metrics.projetosPendentes}</div>}
            <p className="text-xs text-muted-foreground">Projetos aguardando pagamento</p>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-red-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm hover:border-red-400 hover:shadow-[0_8px_30px_-4px_rgba(239,68,68,0.15)] transition-all h-full">
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
        <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl bg-white/50 backdrop-blur-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* Search and Toggle */}
            <div className="flex flex-col sm:flex-row flex-1 items-center gap-4">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por projeto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white/60 border-gray-200 focus-visible:ring-primary/20"
                />
              </div>
              <ToggleGroup type="single" value={kindFilter} onValueChange={(v) => v && setKindFilter(v as any)} className="bg-white/60 p-1 rounded-lg border border-gray-200/60">
                <ToggleGroupItem value="todos" className="data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-md px-3">Todos</ToggleGroupItem>
                <ToggleGroupItem value="obra" className="data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-md px-3">Obras</ToggleGroupItem>
                <ToggleGroupItem value="administrativo" className="data-[state=on]:bg-white data-[state=on]:shadow-sm rounded-md px-3">Pastas</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[170px] bg-white/60 border-gray-200">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Meses</SelectItem>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px] bg-white/60 border-gray-200">
                  <SelectValue placeholder="Status" />
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
                <SelectTrigger className="w-[180px] bg-white/60 border-gray-200">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Pagamentos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>

              <div className="h-6 w-px bg-gray-200 hidden xl:block mx-1"></div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Ordenar:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[160px] bg-white/60 border-gray-200">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais Recentes</SelectItem>
                    <SelectItem value="valor_desc">Maior Valor</SelectItem>
                    <SelectItem value="valor_asc">Menor Valor</SelectItem>
                    <SelectItem value="recebido_desc">Mais Recebido (%)</SelectItem>
                    <SelectItem value="custom">Manual (Arrastar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {
          isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[280px] w-full" />)}
            </div>
          ) : filteredProjetos.length > 0 ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="projetos" isDropDisabled={sortBy !== "custom"}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {orderedProjetos.map((projeto, index) => {
                      const isAdminFolder = (projeto.client.name || "").toLowerCase() === "administrativo" || projeto.type === "administrativo";
                      const despesas = projeto.transactions
                        .filter(t => t.type === 'despesa')
                        .reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
                      const lucro = projeto.receitas - despesas;
                      const aReceber = Math.max(0, projeto.valorCobrado - projeto.receitas);

                      return (
                        <Draggable key={projeto.id} draggableId={String(projeto.id)} index={index} isDragDisabled={sortBy !== "custom"}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                zIndex: snapshot.isDragging ? 50 : 1,
                              }}
                            >
                              <Card
                                className={`flex flex-col justify-between group overflow-hidden rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 bg-white/50 backdrop-blur-sm hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] transition-all duration-300 h-full ${snapshot.isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                              >
                                <CardHeader
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div {...provided.dragHandleProps} className={`cursor-grab active:cursor-grabbing p-1 -ml-2 text-gray-400 hover:text-gray-700 ${sortBy !== 'custom' ? 'hidden' : ''}`}>
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      {isAdminFolder ? (
                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Pasta Administrativa</Badge>
                                      ) : (
                                        <ProjectStatusBadge status={projeto.status} />
                                      )}
                                    </div>
                                    {!isAdminFolder && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        {projeto.paymentStatus === 'pago' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                        {projeto.paymentStatus === 'atrasado' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                        {projeto.paymentStatus === 'pendente' && <Clock className="h-3 w-3 text-yellow-500" />}
                                        <span className="capitalize">{projeto.paymentStatus}</span>
                                      </div>
                                    )}
                                  </div>
                                  <CardTitle
                                    className="text-lg font-semibold pt-2 group-hover:text-primary transition-colors hover:underline"
                                    onClick={() => navigate(`/projetos/${projeto.id}`)}
                                  >
                                    {projeto.name}
                                  </CardTitle>
                                  {!isAdminFolder && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                      <User className="h-3 w-3" /> {projeto.client.name}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> {new Date(projeto.date || projeto.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                  {projeto.saleDate && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Calendar className="h-3 w-3 text-blue-500" />
                                      <span>Lanç. Venda: {new Date(projeto.saleDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                    </p>
                                  )}
                                </CardHeader>
                                <CardContent
                                  className="cursor-pointer flex-grow"
                                  onClick={() => navigate(`/projetos/${projeto.id}`)}
                                >
                                  <Separator className="my-3" />
                                  <div className="space-y-2 text-sm">
                                    {isAdminFolder ? (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Despesas</span>
                                          <span className="font-medium text-red-600">{formatCurrency(despesas)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Movimentos</span>
                                          <span className="font-medium">{projeto.transactions.length}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Valor</span>
                                          <span className="font-medium">{formatCurrency(projeto.valorCobrado)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Recebido</span>
                                          <span className="font-medium text-green-600">{formatCurrency(projeto.receitas)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">A receber</span>
                                          <span className="font-medium text-blue-600">{formatCurrency(aReceber)}</span>
                                        </div>
                                        {projeto.status === 'finalizado' && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground font-bold">Lucro</span>
                                            <span className={`font-bold ${lucro >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                              {formatCurrency(lucro)}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {!isAdminFolder && (
                                    <>
                                      <Progress value={projeto.percentualRecebido} className="mt-4 h-2" />
                                      <p className="text-xs text-muted-foreground mt-1 text-right">{projeto.percentualRecebido.toFixed(0)}% recebido</p>
                                    </>
                                  )}
                                </CardContent>
                                <CardFooter className="bg-muted/40 px-6 py-3 transition-all duration-300 opacity-0 group-hover:opacity-100">
                                  <div className="flex w-full justify-end gap-2">
                                    <TooltipProvider>
                                      {!isAdminFolder && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="sm" onClick={() => { setOpenReceita(true); setSelectedProject(projeto); }}>
                                              <TrendingUp className="h-4 w-4 text-green-500" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent><p>Adicionar Receita</p></TooltipContent>
                                        </Tooltip>
                                      )}
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
                                          <Button variant="ghost" size="sm" onClick={() => { setOpenEdit(true); setSelectedProject(projeto); }}>
                                            <Edit className="h-4 w-4 text-primary" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Editar Projeto</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${projeto.id}`)}>
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
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">Nenhum projeto encontrado.</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou o termo de busca.</p>
            </div>
          )
        }

        {/* Removido modal de detalhes do projeto — clique navega para página completa */}

        {/* Modal de edição de projeto */}
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>Altere as informações abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Override (Opcional)</Label>
                <Input id="edit-name" name="name" defaultValue={selectedProject?.name} />
                <p className="text-xs text-muted-foreground">Deixe em branco ou edite para mudar como aparece na tela.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quoteNumber">Nº Orçamento / Venda</Label>
                  <Input id="edit-quoteNumber" name="quoteNumber" defaultValue={selectedProject?.quoteNumber || selectedProject?.saleNumber || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-saleDate">Dt. Lançamento</Label>
                  <Input id="edit-saleDate" name="saleDate" type="date" defaultValue={selectedProject?.saleDate || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Data de Cadastro</Label>
                <Input id="edit-date" name="date" type="date" required defaultValue={selectedProject?.date ? new Date(selectedProject.date).toISOString().split('T')[0] : (selectedProject?.createdAt ? new Date(selectedProject.createdAt).toISOString().split('T')[0] : "")} />
              </div>
              <Button type="submit" disabled={editProjectMutation.isPending} className="w-full">
                {editProjectMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de receita */}
        <Dialog open={openReceita} onOpenChange={setOpenReceita}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Receita</DialogTitle>
              <DialogDescription>Preencha os dados da receita (Recebimento)</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleAddTransaction(e, "receita")} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receita-desc">Descrição</Label>
                <Select name="description" required defaultValue="Entrada">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou digite..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem>
                    <SelectItem value="Sinal">Sinal</SelectItem>
                    <SelectItem value="Saldo Final">Saldo Final</SelectItem>
                    <SelectItem value="Saldo 30 dias">Saldo 30 dias</SelectItem>
                    <SelectItem value="1ª Parcela">1ª Parcela</SelectItem>
                    <SelectItem value="2ª Parcela">2ª Parcela</SelectItem>
                    <SelectItem value="3ª Parcela">3ª Parcela</SelectItem>
                    <SelectItem value="Recebimento Integral">Recebimento Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receita-value">Valor (R$)</Label>
                  <Input id="receita-value" name="value" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receita-date">Data de Recebimento</Label>
                  <Input id="receita-date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-paymentMethod">Forma de Pagamento</Label>
                <Select name="paymentMethod" required defaultValue="pix">
                  <SelectTrigger>
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-bankAccountId">Conta Destino</Label>
                <Select name="bankAccountId" defaultValue="none">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta bancária</SelectItem>
                    {bankAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createTransactionMutation.isPending} className="w-full">
                {createTransactionMutation.isPending ? "Registrando..." : "Registrar Recebimento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de despesa */}
        <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Despesa</DialogTitle>
              <DialogDescription>Preencha os dados do custo da obra</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => handleAddTransaction(e, "despesa")} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="despesa-categoryId">Centro de Custo (Categoria)</Label>
                <Select name="categoryId" defaultValue="none">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.filter((c: any) => c.type === 'despesa').map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-desc">Descrição / Fornecedor *</Label>
                <Input id="despesa-desc" name="description" required placeholder="Ex: Compra de vidros, Instalação..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="despesa-value">Valor (R$) *</Label>
                  <Input id="despesa-value" name="value" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despesa-date">Data de Pagamento *</Label>
                  <Input id="despesa-date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-paymentMethod">Forma de Pagamento</Label>
                <Select name="paymentMethod" defaultValue="pix">
                  <SelectTrigger>
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-bankAccountId">Conta de Origem</Label>
                <Select name="bankAccountId" defaultValue="none">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta bancária</SelectItem>
                    {bankAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createTransactionMutation.isPending} className="w-full">
                {createTransactionMutation.isPending ? "Registrando..." : "Registrar Despesa"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div >
    </div >
  );
}