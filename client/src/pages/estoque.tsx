import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    Plus,
    Search,
    Settings,
    Trash2,
    Package,
    Layers,
    ArrowRightLeft,
    Ruler
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AluminumStock, AluminumProfile } from "@shared/schema";
import AcessoriosTab from "@/components/estoque/acessorios-tab";

export default function Estoque() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [newStockItem, setNewStockItem] = useState<{
        profileId: string;
        length: string;
        quantity: string;
        type: "barra" | "retalho";
    }>({
        profileId: "",
        length: "6000",
        quantity: "1",
        type: "barra"
    });

    const { data: stockItems = [], isLoading: isStockLoading } = useQuery<AluminumStock[]>({
        queryKey: ["/api/aluminum-stock"],
    });

    const { data: profiles = [], isLoading: isProfilesLoading } = useQuery<AluminumProfile[]>({
        queryKey: ["/api/aluminum-profiles"],
    });

    const createStockMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                profileId: newStockItem.profileId,
                length: parseInt(newStockItem.length) || 0,
                quantity: parseInt(newStockItem.quantity) || 1,
                type: newStockItem.type
            };
            await apiRequest("POST", "/api/aluminum-stock", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-stock"] });
            toast({ title: "Sucesso", description: "Item adicionado ao estoque." });
            setIsCreateOpen(false);
            setNewStockItem({ profileId: "", length: "6000", quantity: "1", type: "barra" });
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível adicionar ao estoque.", variant: "destructive" });
        }
    });

    const deleteStockMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/aluminum-stock/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-stock"] });
            toast({ title: "Sucesso", description: "Item removido do estoque." });
        }
    });

    const handleCreateStock = () => {
        if (!newStockItem.profileId) {
            toast({ title: "Atenção", description: "Selecione um perfil de alumínio.", variant: "destructive" });
            return;
        }
        createStockMutation.mutate();
    };

    const filteredStock = stockItems.filter(item => {
        const profile = profiles.find(p => p.id === item.profileId);
        if (!profile) return false;

        return (
            profile.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-8">
                <Tabs defaultValue="aluminio">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1>Estoque</h1>
                        <p className="text-gray-500 mt-2">Perfis de alumínio e acessórios disponíveis na fábrica.</p>
                    </div>
                    <TabsList>
                        <TabsTrigger value="aluminio">Alumínio</TabsTrigger>
                        <TabsTrigger value="acessorios">Acessórios</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="aluminio" className="space-y-8">
                <div className="flex justify-end">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                Adicionar ao Estoque
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Entrada de Estoque Físico</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Perfil de Alumínio</Label>
                                    <Select
                                        value={newStockItem.profileId}
                                        onValueChange={(val) => setNewStockItem({ ...newStockItem, profileId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o perfil" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {profiles.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.code} - {p.description}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select
                                            value={newStockItem.type}
                                            onValueChange={(val: "barra" | "retalho") => setNewStockItem({
                                                ...newStockItem,
                                                type: val,
                                                length: val === "barra" ? "6000" : ""
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="barra">Barra Inteira (6m)</SelectItem>
                                                <SelectItem value="retalho">Retalho Customizado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Comprimento (mm)</Label>
                                        <Input
                                            type="number"
                                            value={newStockItem.length}
                                            onChange={e => setNewStockItem({ ...newStockItem, length: e.target.value })}
                                            disabled={newStockItem.type === "barra"}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Quantidade</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={newStockItem.quantity}
                                        onChange={e => setNewStockItem({ ...newStockItem, quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateStock} disabled={createStockMutation.isPending}>
                                    {createStockMutation.isPending ? "Adicionando..." : "Salvar Entrada"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                Barras Inteiras
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {stockItems.filter(i => i.type === 'barra').reduce((acc, curr) => acc + curr.quantity, 0)}
                            </div>
                            <p className="text-sm text-gray-500">Total de barras de 6m</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <Ruler className="h-4 w-4" />
                                Retalhos Físicos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">
                                {stockItems.filter(i => i.type === 'retalho').reduce((acc, curr) => acc + curr.quantity, 0)}
                            </div>
                            <p className="text-sm text-gray-500">Pedaços úteis para corte</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4" />
                                Total de Perfis Mapeados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold">
                                {new Set(stockItems.map(i => i.profileId)).size}
                            </div>
                            <p className="text-sm text-gray-500 truncate">Códigos de perfis distintos em estoque</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por código ou descrição do perfil..."
                            className="pl-9 bg-gray-50/50 border-gray-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-gray-600" />
                            <CardTitle className="text-lg font-medium">Itens Analíticos em Estoque</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Perfil</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Tipo de Lote</TableHead>
                                    <TableHead>Comprimento L.</TableHead>
                                    <TableHead>Quantidade (Físico)</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isStockLoading || isProfilesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            Carregando estoque...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredStock.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                            <p className="text-lg font-medium text-gray-900 mb-1">Nenhum item em estoque</p>
                                            <p>Adicione barras ou retalhos recém adquiridos à fábrica.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStock.map((item) => {
                                        const profile = profiles.find(p => p.id === item.profileId);
                                        return (
                                            <TableRow key={item.id} className="group hover:bg-gray-50/50">
                                                <TableCell className="font-medium font-mono">
                                                    {profile?.code || "Desconhecido"}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {profile?.description || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.type === 'barra' ? 'default' : 'secondary'}>
                                                        {item.type === 'barra' ? 'Barra 6m' : 'Retalho'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.length} mm
                                                </TableCell>
                                                <TableCell className="font-semibold text-gray-900">
                                                    {item.quantity} un
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (confirm('Remover este item do estoque físico?')) {
                                                                deleteStockMutation.mutate(item.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="acessorios" className="mt-6">
                    <AcessoriosTab />
                </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
