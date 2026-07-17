import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
    Plus,
    Search,
    Settings,
    FileText,
    Trash2,
    Package,
    Factory
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProductionBatch, QuoteItem, Quote, Client } from "@shared/schema";

export default function Producao() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [newBatchCode, setNewBatchCode] = useState("");
    const [newBatchObs, setNewBatchObs] = useState("");

    const { data: batches = [], isLoading } = useQuery<ProductionBatch[]>({
        queryKey: ["/api/production-batches"],
    });

    const { data: quotes = [] } = useQuery<Quote[]>({
        queryKey: ["/api/quotes"],
    });

    const { data: allItems = [] } = useQuery<QuoteItem[]>({
        queryKey: ["/api/quote-items"],
    });

    const { data: clients = [] } = useQuery<Client[]>({
        queryKey: ["/api/clients"],
    });

    // Filter items that belong to approved quotes and have calculated materials (meaning they are typologies/esquadrias)
    const approvedQuotes = quotes.filter(q => q.status === "aprovado");
    const approvedQuoteIds = new Set(approvedQuotes.map(q => q.id));

    const availableItems = allItems.filter(item =>
        approvedQuoteIds.has(item.quoteId) && item.calculatedMaterials
    );

    const createBatchMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                code: newBatchCode || `LOTE-${format(new Date(), "yyyyMMdd")}`,
                status: "pendente",
                observations: newBatchObs,
                expectedDate: new Date().toISOString().split('T')[0],
                itemIds: selectedItems
            };
            await apiRequest("POST", "/api/production-batches", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
            toast({ title: "Sucesso", description: "Lote de produção criado." });
            setIsCreateOpen(false);
            setSelectedItems([]);
            setNewBatchCode("");
            setNewBatchObs("");
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível criar o lote.", variant: "destructive" });
        }
    });

    const handleCreateBatch = () => {
        if (selectedItems.length === 0) {
            toast({ title: "Atenção", description: "Selecione ao menos um item.", variant: "destructive" });
            return;
        }
        createBatchMutation.mutate();
    };

    const toggleItemSelection = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredBatches = batches.filter(batch =>
        batch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (batch.observations && batch.observations.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Helper to find quote and client name for an item
    const getItemDetails = (item: QuoteItem) => {
        const quote = quotes.find(q => q.id === item.quoteId);
        const client = clients.find(c => c.id === quote?.clientId);
        return {
            quoteNumber: quote?.number || "N/A",
            clientName: client?.name || "Desconhecido"
        };
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1>Plano de Corte & Produção</h1>
                        <p className="text-gray-500 mt-2">Gerencie lotes de produção e gere listas de corte otimizadas.</p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                Novo Lote de Produção
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Mapear Novo Lote de Produção</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Código do Lote</Label>
                                        <Input
                                            placeholder={`LOTE-${format(new Date(), "yyyyMMdd")}`}
                                            value={newBatchCode}
                                            onChange={e => setNewBatchCode(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Observações</Label>
                                        <Input
                                            placeholder="Identificador ou prioridade..."
                                            value={newBatchObs}
                                            onChange={e => setNewBatchObs(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Label className="text-base">Selecione os Itens (Orçamentos Aprovados)</Label>
                                    <p className="text-sm text-gray-500 mb-4">Apenas esquadrias parametrizadas de orçamentos aprovados aparecem aqui.</p>

                                    <div className="border rounded-md divide-y overflow-hidden max-h-[300px] overflow-y-auto">
                                        {availableItems.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500">Nenhum item aprovado pendente.</div>
                                        ) : (
                                            availableItems.map(item => {
                                                const { quoteNumber, clientName } = getItemDetails(item);
                                                return (
                                                    <div key={item.id} className="p-3 flex items-start gap-4 hover:bg-gray-50">
                                                        <Checkbox
                                                            id={`item-${item.id}`}
                                                            checked={selectedItems.includes(item.id)}
                                                            onCheckedChange={() => toggleItemSelection(item.id)}
                                                            className="mt-1"
                                                        />
                                                        <div className="flex-1 space-y-1">
                                                            <Label htmlFor={`item-${item.id}`} className="font-medium cursor-pointer">
                                                                {item.description} ({item.quantity}x)
                                                            </Label>
                                                            <div className="text-xs text-gray-500 flex gap-2">
                                                                <Badge variant="outline" className="text-[10px]">{quoteNumber}</Badge>
                                                                <span>Cliente: {clientName}</span>
                                                                <span>Ambiente: {item.environment || "N/A"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateBatch} disabled={createBatchMutation.isPending || selectedItems.length === 0}>
                                    {createBatchMutation.isPending ? "Criando..." : "Criar Lote"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar lote por código ou observação..."
                            className="pl-9 bg-gray-50/50 border-gray-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Factory className="h-5 w-5 text-gray-600" />
                            <CardTitle className="text-lg font-medium">Lotes de Produção Recentes</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-white">{batches.length} lotes</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[100px]">Código</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data de Criação</TableHead>
                                    <TableHead>Observações</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            Carregando lotes...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBatches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                            <p className="text-lg font-medium text-gray-900 mb-1">Nenhum lote encontrado</p>
                                            <p>Crie um novo lote de produção para começar.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBatches.map((batch) => (
                                        <TableRow key={batch.id} className="group hover:bg-gray-50/50">
                                            <TableCell className="font-medium">{batch.code}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    batch.status === 'pendente' ? 'secondary' :
                                                        batch.status === 'em_corte' ? 'default' : 'outline'
                                                }>
                                                    {batch.status === 'pendente' ? 'Pendente' :
                                                        batch.status === 'em_corte' ? 'Em Corte' : 'Finalizado'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(batch.createdAt), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-gray-500">
                                                {batch.observations || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setLocation(`/producao/${batch.id}`)}
                                                >
                                                    Listas de Corte / Compras
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
