import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data - todo: remove mock functionality
const mockProjects = [
  { id: "1", name: "Fachada Comercial - Edifício Central", status: "execucao" as const },
  { id: "2", name: "Box de Banheiro Residencial", status: "aprovado" as const },
  { id: "3", name: "Espelhos Decorativos - Loja Shopping", status: "orcamento" as const },
];

const mockTransactions = [
  { id: "1", type: "receita" as const, description: "Pagamento inicial - 50%", value: 15000, date: "10/10/2025" },
  { id: "2", type: "despesa" as const, description: "Compra de vidros temperados", value: 8000, date: "12/10/2025" },
  { id: "3", type: "despesa" as const, description: "Mão de obra - instalação", value: 3500, date: "15/10/2025" },
  { id: "4", type: "receita" as const, description: "Pagamento final - 50%", value: 15000, date: "20/10/2025" },
  { id: "5", type: "despesa" as const, description: "Ferragens e acabamentos", value: 1200, date: "18/10/2025" },
];

export default function Financeiro() {
  const [selectedProject, setSelectedProject] = useState("1");
  const [openReceita, setOpenReceita] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const { toast } = useToast();

  const currentProject = mockProjects.find(p => p.id === selectedProject);

  const handleAddTransaction = (type: "receita" | "despesa") => {
    console.log(`${type} adicionada`);
    toast({
      title: `${type === "receita" ? "Receita" : "Despesa"} registrada!`,
      description: `A ${type} foi adicionada ao cartão de obras.`,
    });
    type === "receita" ? setOpenReceita(false) : setOpenDespesa(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Controle financeiro por projeto - Cartão de Obras</p>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger data-testid="select-projeto-financeiro">
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {mockProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Project Status */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>Status do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusWorkflow currentStatus={currentProject.status} />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Dialog open={openReceita} onOpenChange={setOpenReceita}>
          <DialogTrigger asChild>
            <Button variant="default" data-testid="button-add-receita">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Receita
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Receita</DialogTitle>
              <DialogDescription>Adicione uma receita ao cartão de obras</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAddTransaction("receita"); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receita-desc">Descrição</Label>
                <Input id="receita-desc" placeholder="Ex: Pagamento inicial" data-testid="input-receita-desc" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-value">Valor (R$)</Label>
                <Input id="receita-value" type="number" placeholder="0.00" data-testid="input-receita-value" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-date">Data</Label>
                <Input id="receita-date" type="date" data-testid="input-receita-date" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-receita">
                Adicionar Receita
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-add-despesa">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Despesa</DialogTitle>
              <DialogDescription>Adicione uma despesa ao cartão de obras</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAddTransaction("despesa"); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="despesa-desc">Descrição</Label>
                <Input id="despesa-desc" placeholder="Ex: Compra de materiais" data-testid="input-despesa-desc" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-value">Valor (R$)</Label>
                <Input id="despesa-value" type="number" placeholder="0.00" data-testid="input-despesa-value" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="despesa-date">Data</Label>
                <Input id="despesa-date" type="date" data-testid="input-despesa-date" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-despesa">
                Adicionar Despesa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cartão de Obras */}
      <CartaoObras 
        projectName={currentProject?.name || "Selecione um projeto"}
        transactions={mockTransactions}
      />
    </div>
  );
}
