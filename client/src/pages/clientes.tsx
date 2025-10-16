import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, Building, Trash2, MapPin, FileText, Pencil } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { toast } = useToast();

  const { data: clientes = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; contact: string; email: string; phone: string; address?: string; cnpjCpf?: string }) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente cadastrado!",
        description: "O cliente foi adicionado com sucesso.",
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro ao cadastrar cliente",
        description: "Ocorreu um erro ao cadastrar o cliente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Cliente excluído!",
        description: "O cliente foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir cliente",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; contact: string; email: string; phone: string; address?: string; cnpjCpf?: string }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/clients/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente atualizado!",
        description: "O cliente foi atualizado com sucesso.",
      });
      setOpen(false);
      setEditingClient(null);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar cliente",
        description: "Ocorreu um erro ao atualizar o cliente.",
        variant: "destructive",
      });
    },
  });

  const filteredClientes = clientes.filter(cliente =>
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProjectCount = (clientId: string) => {
    return projects.filter((p: any) => p.clientId === clientId).length;
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      contact: formData.get("contact") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      cnpjCpf: formData.get("cnpjCpf") as string,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditingClient(null);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cliente">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
              <DialogDescription>Preencha os dados do cliente abaixo</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" key={editingClient?.id || 'new'}>
              <div className="space-y-2">
                <Label htmlFor="name">Nome/Razão Social</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Nome do cliente" 
                  required 
                  data-testid="input-cliente-name"
                  defaultValue={editingClient?.name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contato Principal</Label>
                <Input 
                  id="contact" 
                  name="contact" 
                  placeholder="Nome do contato" 
                  required 
                  data-testid="input-cliente-contact"
                  defaultValue={editingClient?.contact || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="email@exemplo.com" 
                  data-testid="input-cliente-email"
                  defaultValue={editingClient?.email || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  placeholder="(11) 99999-9999" 
                  required 
                  data-testid="input-cliente-phone"
                  defaultValue={editingClient?.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input 
                  id="address" 
                  name="address" 
                  placeholder="Rua, número, complemento, bairro, cidade" 
                  data-testid="input-cliente-address"
                  defaultValue={editingClient?.address || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpjCpf">CNPJ/CPF</Label>
                <Input 
                  id="cnpjCpf" 
                  name="cnpjCpf" 
                  placeholder="00.000.000/0000-00 ou 000.000.000-00" 
                  data-testid="input-cliente-cnpj-cpf"
                  defaultValue={editingClient?.cnpjCpf || ""}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={editingClient ? updateMutation.isPending : createMutation.isPending} 
                data-testid="button-submit-cliente"
              >
                {editingClient 
                  ? (updateMutation.isPending ? "Atualizando..." : "Atualizar Cliente")
                  : (createMutation.isPending ? "Cadastrando..." : "Cadastrar Cliente")
                }
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
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum cliente encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClientes.map((cliente) => (
            <Card key={cliente.id} className="hover-elevate" data-testid={`card-cliente-${cliente.id}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <span>{cliente.name}</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditClient(cliente)}
                    data-testid={`button-edit-cliente-${cliente.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-delete-cliente-${cliente.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O cliente "{cliente.name}" será permanentemente removido do sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(cliente.id)}
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
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{cliente.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{cliente.phone}</span>
                  </div>
                  {cliente.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{cliente.address}</span>
                    </div>
                  )}
                  {cliente.cnpjCpf && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{cliente.cnpjCpf}</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{getProjectCount(cliente.id)}</span> projeto(s) realizado(s)
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
