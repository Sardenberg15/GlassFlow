import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Mock data - todo: remove mock functionality
const mockClientes = [
  { id: "1", name: "Construtora ABC Ltda", contact: "Maria Santos", email: "maria@abc.com.br", phone: "(11) 98765-4321", projects: 12 },
  { id: "2", name: "João Silva", contact: "João Silva", email: "joao@email.com", phone: "(11) 91234-5678", projects: 3 },
  { id: "3", name: "Decorações Premium", contact: "Ana Costa", email: "ana@decoracoes.com.br", phone: "(11) 99876-5432", projects: 8 },
  { id: "4", name: "Empresa XYZ S.A.", contact: "Carlos Oliveira", email: "carlos@xyz.com.br", phone: "(11) 94567-8901", projects: 5 },
];

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const filteredClientes = mockClientes.filter(cliente =>
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Cliente adicionado");
    toast({
      title: "Cliente cadastrado!",
      description: "O cliente foi adicionado com sucesso.",
    });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cliente">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              <DialogDescription>Preencha os dados do cliente abaixo</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome/Razão Social</Label>
                <Input id="name" placeholder="Nome do cliente" data-testid="input-cliente-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contato Principal</Label>
                <Input id="contact" placeholder="Nome do contato" data-testid="input-cliente-contact" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="email@exemplo.com" data-testid="input-cliente-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" placeholder="(11) 99999-9999" data-testid="input-cliente-phone" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-cliente">
                Cadastrar Cliente
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-cliente"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClientes.map((cliente) => (
          <Card key={cliente.id} className="hover-elevate" data-testid={`card-cliente-${cliente.id}`}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-base">{cliente.name}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{cliente.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{cliente.phone}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{cliente.projects}</span> projeto(s) realizado(s)
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
