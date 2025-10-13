import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, Calendar, User } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Mock data - todo: remove mock functionality
const mockProjetos = [
  { 
    id: "1", 
    name: "Fachada Comercial - Edifício Central", 
    client: "Construtora ABC", 
    status: "execucao" as const, 
    value: 30000, 
    date: "15/10/2025",
    transactions: [
      { id: "1", type: "receita" as const, description: "Pagamento inicial - 50%", value: 15000, date: "10/10/2025" },
      { id: "2", type: "despesa" as const, description: "Compra de vidros temperados", value: 8000, date: "12/10/2025" },
      { id: "3", type: "despesa" as const, description: "Mão de obra - instalação", value: 3500, date: "15/10/2025" },
    ]
  },
  { 
    id: "2", 
    name: "Box de Banheiro Residencial", 
    client: "João Silva", 
    status: "aprovado" as const, 
    value: 3500, 
    date: "18/10/2025",
    transactions: [
      { id: "4", type: "receita" as const, description: "Pagamento integral", value: 3500, date: "18/10/2025" },
    ]
  },
  { 
    id: "3", 
    name: "Espelhos Decorativos - Loja Shopping", 
    client: "Decorações Premium", 
    status: "orcamento" as const, 
    value: 12000, 
    date: "20/10/2025",
    transactions: []
  },
  { 
    id: "4", 
    name: "Reparo de Vidraça - Escritório", 
    client: "Empresa XYZ", 
    status: "finalizado" as const, 
    value: 850, 
    date: "10/10/2025",
    transactions: [
      { id: "5", type: "receita" as const, description: "Pagamento à vista", value: 850, date: "10/10/2025" },
      { id: "6", type: "despesa" as const, description: "Vidro e mão de obra", value: 550, date: "10/10/2025" },
    ]
  },
  { 
    id: "5", 
    name: "Janelas Residenciais - Casa Jardim", 
    client: "Maria Fernandes", 
    status: "aprovado" as const, 
    value: 8500, 
    date: "22/10/2025",
    transactions: []
  },
];

export default function Projetos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [openNew, setOpenNew] = useState(false);
  const [selectedProject, setSelectedProject] = useState<typeof mockProjetos[0] | null>(null);
  const [openReceita, setOpenReceita] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const { toast } = useToast();

  const filteredProjetos = mockProjetos.filter(projeto => {
    const matchesSearch = projeto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || projeto.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Projeto criado");
    toast({
      title: "Projeto criado!",
      description: "O orçamento foi gerado com sucesso.",
    });
    setOpenNew(false);
  };

  const handleAddTransaction = (type: "receita" | "despesa") => {
    console.log(`${type} adicionada ao projeto ${selectedProject?.id}`);
    toast({
      title: `${type === "receita" ? "Receita" : "Despesa"} registrada!`,
      description: `A ${type} foi adicionada ao projeto.`,
    });
    type === "receita" ? setOpenReceita(false) : setOpenDespesa(false);
  };

  const handleStatusChange = (newStatus: string) => {
    console.log(`Status do projeto ${selectedProject?.id} alterado para ${newStatus}`);
    toast({
      title: "Status atualizado!",
      description: `O projeto foi movido para ${newStatus}.`,
    });
  };

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
                  <Input id="project-name" placeholder="Ex: Fachada Comercial" data-testid="input-projeto-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select>
                    <SelectTrigger data-testid="select-cliente">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Construtora ABC</SelectItem>
                      <SelectItem value="2">João Silva</SelectItem>
                      <SelectItem value="3">Decorações Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" placeholder="Descreva o projeto..." data-testid="input-projeto-description" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor Estimado</Label>
                  <Input id="value" type="number" placeholder="0.00" data-testid="input-projeto-value" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select>
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
              <Button type="submit" className="w-full" data-testid="button-submit-projeto">
                Criar Projeto
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

      {/* Projects Grid - Cards clicáveis */}
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
                <ProjectStatusBadge status={projeto.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="truncate">{projeto.client}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{projeto.date}</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-2xl font-bold font-mono">{formatCurrency(projeto.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Detalhes do Projeto */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              Cliente: {selectedProject?.client} | Data: {selectedProject?.date}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Workflow */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Status do Projeto</h3>
                <Select value={selectedProject?.status} onValueChange={handleStatusChange}>
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
              {selectedProject && <StatusWorkflow currentStatus={selectedProject.status} />}
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
                  <form onSubmit={(e) => { e.preventDefault(); handleAddTransaction("receita"); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receita-desc">Descrição</Label>
                      <Input id="receita-desc" placeholder="Ex: Pagamento inicial" data-testid="input-modal-receita-desc" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receita-value">Valor (R$)</Label>
                      <Input id="receita-value" type="number" placeholder="0.00" data-testid="input-modal-receita-value" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receita-date">Data</Label>
                      <Input id="receita-date" type="date" data-testid="input-modal-receita-date" />
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-modal-submit-receita">
                      Adicionar Receita
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
                  <form onSubmit={(e) => { e.preventDefault(); handleAddTransaction("despesa"); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="despesa-desc">Descrição</Label>
                      <Input id="despesa-desc" placeholder="Ex: Compra de materiais" data-testid="input-modal-despesa-desc" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="despesa-value">Valor (R$)</Label>
                      <Input id="despesa-value" type="number" placeholder="0.00" data-testid="input-modal-despesa-value" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="despesa-date">Data</Label>
                      <Input id="despesa-date" type="date" data-testid="input-modal-despesa-date" />
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-modal-submit-despesa">
                      Adicionar Despesa
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Cartão de Obras */}
            {selectedProject && (
              <CartaoObras 
                projectName={selectedProject.name}
                transactions={selectedProject.transactions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
