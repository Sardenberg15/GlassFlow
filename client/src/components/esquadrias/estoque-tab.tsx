import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { useAluminumLines, useAluminumProfiles } from "@/hooks/use-esquadrias";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AluminumStock } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function useAluminumStock() {
    return useQuery<AluminumStock[]>({ queryKey: ["/api/aluminum-stock"] });
}

function useCreateStockItem() {
    return useMutation({
        mutationFn: async (data: Partial<AluminumStock>) => {
            const res = await apiRequest("POST", "/api/aluminum-stock", data);
            return res.json();
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/aluminum-stock"] }); },
    });
}

function useDeleteStockItem() {
    return useMutation({
        mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/aluminum-stock/${id}`); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/aluminum-stock"] }); },
    });
}

export function EstoqueTab() {
    const { toast } = useToast();
    const { data: stock = [] } = useAluminumStock();
    const { data: profiles = [] } = useAluminumProfiles();
    const { data: lines = [] } = useAluminumLines();
    const createItem = useCreateStockItem();
    const deleteItem = useDeleteStockItem();

    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [isOpen, setIsOpen] = useState(false);
    const [profileId, setProfileId] = useState("");
    const [length, setLength] = useState("6000");
    const [qty, setQty] = useState("1");
    const [type, setType] = useState("barra");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const save = () => {
        if (!profileId || !length || !qty) return;
        createItem.mutate({ profileId, length: parseInt(length), quantity: parseInt(qty), type }, {
            onSuccess: () => { toast({ title: "Item adicionado ao estoque!" }); setIsOpen(false); setProfileId(""); setLength("6000"); setQty("1"); }
        });
    };

    const filtered = stock.filter(s => {
        const profile = profiles.find(p => p.id === s.profileId);
        if (filterType !== "all" && s.type !== filterType) return false;
        if (search && profile && !profile.code.toLowerCase().includes(search.toLowerCase()) && !profile.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalBars = stock.filter(s => s.type === "barra").reduce((sum, s) => sum + s.quantity, 0);
    const totalScraps = stock.filter(s => s.type === "retalho").reduce((sum, s) => sum + s.quantity, 0);

    return (
        <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <Card className="p-4"><p className="text-xs text-muted-foreground">Barras (6m)</p><p className="text-2xl font-bold">{totalBars}</p></Card>
                <Card className="p-4"><p className="text-xs text-muted-foreground">Retalhos</p><p className="text-2xl font-bold text-amber-600">{totalScraps}</p></Card>
                <Card className="p-4"><p className="text-xs text-muted-foreground">Total de Itens</p><p className="text-2xl font-bold">{stock.length}</p></Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Estoque de Perfis & Retalhos</CardTitle>
                            <CardDescription className="text-xs">Controle barras inteiras e retalhos para otimização de corte.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar perfil..." className="pl-9 h-9 w-[200px]" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="barra">Barras</SelectItem>
                                    <SelectItem value="retalho">Retalhos</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Entrada</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-muted/50 text-muted-foreground text-xs">
                                <th className="text-left px-4 py-2.5">Perfil</th>
                                <th className="text-left px-4 py-2.5">Linha</th>
                                <th className="text-center px-4 py-2.5">Tipo</th>
                                <th className="text-right px-4 py-2.5">Comprimento</th>
                                <th className="text-right px-4 py-2.5">Quantidade</th>
                                <th className="w-12"></th>
                            </tr></thead>
                            <tbody>
                                {filtered.map(item => {
                                    const profile = profiles.find(p => p.id === item.profileId);
                                    const line = profile ? lines.find(l => l.id === profile.lineId) : null;
                                    return (
                                        <tr key={item.id} className="border-t hover:bg-muted/30 group">
                                            <td className="px-4 py-2.5 font-mono font-semibold text-primary">{profile?.code || "?"} <span className="font-normal text-muted-foreground">- {profile?.name}</span></td>
                                            <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{line?.name || "—"}</Badge></td>
                                            <td className="px-4 py-2.5 text-center">
                                                <Badge className={`text-[10px] ${item.type === "barra" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}`}>
                                                    {item.type === "barra" ? "Barra 6m" : "Retalho"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono">{item.length}mm <span className="text-muted-foreground text-xs">({(item.length / 1000).toFixed(2)}m)</span></td>
                                            <td className="px-4 py-2.5 text-right font-bold">{item.quantity}</td>
                                            <td className="px-2 py-2.5"><Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum item no estoque.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Entrada de Estoque</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Perfil *</Label>
                            <Select value={profileId} onValueChange={setProfileId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                                <SelectContent>{profiles.map(p => {
                                    const ln = lines.find(l => l.id === p.lineId);
                                    return <SelectItem key={p.id} value={p.id}>{p.code} - {p.name} ({ln?.name})</SelectItem>;
                                })}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={type} onValueChange={v => { setType(v); if (v === "barra") setLength("6000"); }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="barra">Barra (6m)</SelectItem>
                                        <SelectItem value="retalho">Retalho</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Comprimento (mm)</Label>
                                <Input type="number" value={length} onChange={e => setLength(e.target.value)} disabled={type === "barra"} />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={save} disabled={createItem.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Item?</AlertDialogTitle>
                        <AlertDialogDescription>Este item será removido do estoque.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                            if (deleteId) deleteItem.mutate(deleteId, { onSuccess: () => { toast({ title: "Item removido!" }); setDeleteId(null); } });
                        }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
