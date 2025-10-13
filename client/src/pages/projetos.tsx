import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { ProjectStatusBadge } from "@/components/project-status-badge";
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
  { id: "1", name: "Fachada Comercial - Edifício Central", client: "Construtora ABC", status: "execucao" as const, value: 30000, date: "15/10/2025" },
  { id: "2", name: "Box de Banheiro Residencial", client: "João Silva", status: "aprovado" as const, value: 3500, date: "18/10/2025" },
  { id: "3", name: "Espelhos Decorativos - Loja Shopping", client: "Decorações Premium", status: "orcamento" as const, value: 12000, date: "20/10/2025" },
  { id: "4", name: "Reparo de Vidraça - Escritório", client: "Empresa XYZ", status: "finalizado" as const, value: 850, date: "10/10/2025" },
  { id: "5", name: "Janelas Residenciais - Casa Jardim", client: "Maria Fernandes", status: "aprovado" as const, value: 8500, date: "22/10/2025" },
];

export default function Projetos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const filteredProjetos = mockProjetos.filter(projeto => {
    const matchesSearch = projeto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || projeto.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Projeto criado");
    toast({
      title: "Projeto criado!",
      description: "O orçamento foi gerado com sucesso.",
    });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gerencie orçamentos e projetos em andamento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjetos.map((projeto) => (
          <Card key={projeto.id} className="hover-elevate" data-testid={`card-projeto-${projeto.id}`}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{projeto.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{projeto.client}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">{formatCurrency(projeto.value)}</p>
                    <p className="text-xs text-muted-foreground">{projeto.date}</p>
                  </div>
                  <ProjectStatusBadge status={projeto.status} />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
