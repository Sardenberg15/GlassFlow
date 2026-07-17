import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Search,
    Trash2,
    Package,
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    ImageOff,
    Pencil
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Accessory } from "@shared/schema";

const EMPTY_FORM = {
    code: "",
    name: "",
    category: "Outros",
    supplier: "",
    line: "",
    unit: "un",
    imageUrl: "",
    quantity: "0",
    minQuantity: "0",
    location: "",
};

export default function AcessoriosTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("todas");
    const [supplierFilter, setSupplierFilter] = useState("todos");
    const [onlyLow, setOnlyLow] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Accessory | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [movementItem, setMovementItem] = useState<Accessory | null>(null);
    const [movementType, setMovementType] = useState<"entrada" | "saida">("entrada");
    const [movementQty, setMovementQty] = useState("1");
    const [movementNotes, setMovementNotes] = useState("");

    const { data: items = [], isLoading } = useQuery<Accessory[]>({
        queryKey: ["/api/accessories"],
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/accessories"] });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                code: form.code.trim(),
                name: form.name.trim(),
                category: form.category,
                supplier: form.supplier.trim() || null,
                line: form.line.trim() || null,
                unit: form.unit,
                imageUrl: form.imageUrl.trim() || null,
                quantity: parseInt(form.quantity) || 0,
                minQuantity: parseInt(form.minQuantity) || 0,
                location: form.location.trim() || null,
            };
            if (editing) {
                await apiRequest("PATCH", `/api/accessories/${editing.id}`, payload);
            } else {
                await apiRequest("POST", "/api/accessories", payload);
            }
        },
        onSuccess: () => {
            invalidate();
            toast({ title: "Sucesso", description: editing ? "Acessório atualizado." : "Acessório cadastrado." });
            setFormOpen(false);
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível salvar o acessório. Verifique se o código já existe.", variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/accessories/${id}`);
        },
        onSuccess: () => {
            invalidate();
            toast({ title: "Sucesso", description: "Acessório removido." });
        }
    });

    const movementMutation = useMutation({
        mutationFn: async () => {
            if (!movementItem) return;
            await apiRequest("POST", `/api/accessories/${movementItem.id}/movements`, {
                type: movementType,
                quantity: parseInt(movementQty) || 0,
                notes: movementNotes.trim() || null,
            });
        },
        onSuccess: () => {
            invalidate();
            toast({ title: "Sucesso", description: movementType === "entrada" ? "Entrada registrada." : "Saída registrada." });
            setMovementItem(null);
            setMovementQty("1");
            setMovementNotes("");
        },
        onError: () => {
            toast({ title: "Erro", description: "Não foi possível registrar. Verifique a quantidade em estoque.", variant: "destructive" });
        }
    });

    const categories = useMemo(
        () => Array.from(new Set(items.map(i => i.category))).sort(),
        [items]
    );
    const suppliers = useMemo(
        () => Array.from(new Set(items.map(i => i.supplier).filter(Boolean) as string[])).sort(),
        [items]
    );

    const filtered = items.filter(item => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = !q
            || item.code.toLowerCase().includes(q)
            || item.name.toLowerCase().includes(q);
        const matchesCategory = categoryFilter === "todas" || item.category === categoryFilter;
        const matchesSupplier = supplierFilter === "todos" || item.supplier === supplierFilter;
        const matchesLow = !onlyLow || (item.minQuantity > 0 && item.quantity < item.minQuantity);
        return matchesSearch && matchesCategory && matchesSupplier && matchesLow;
    });

    const lowCount = items.filter(i => i.minQuantity > 0 && i.quantity < i.minQuantity).length;
    const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormOpen(true);
    };

    const openEdit = (item: Accessory) => {
        setEditing(item);
        setForm({
            code: item.code,
            name: item.name,
            category: item.category,
            supplier: item.supplier || "",
            line: item.line || "",
            unit: item.unit,
            imageUrl: item.imageUrl || "",
            quantity: String(item.quantity),
            minQuantity: String(item.minQuantity),
            location: item.location || "",
        });
        setFormOpen(true);
    };

    const openMovement = (item: Accessory, type: "entrada" | "saida") => {
        setMovementItem(item);
        setMovementType(type);
        setMovementQty("1");
        setMovementNotes("");
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                            <Package className="h-4 w-4" />
                            Acessórios Cadastrados
                        </div>
                        <div className="text-3xl font-bold">{items.length}</div>
                        <p className="text-sm text-gray-500">{totalUnits} unidades em estoque</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Abaixo do Mínimo
                        </div>
                        <div className={`text-3xl font-bold ${lowCount > 0 ? "text-amber-600" : ""}`}>{lowCount}</div>
                        <p className="text-sm text-gray-500">Itens para repor</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                            <Search className="h-4 w-4" />
                            Categorias
                        </div>
                        <div className="text-3xl font-bold">{categories.length}</div>
                        <p className="text-sm text-gray-500">Roldanas, fechos, kits...</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por código ou nome..."
                        className="pl-9 bg-gray-50/50 border-gray-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[210px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas as categorias</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="w-[170px]">
                        <SelectValue placeholder="Fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos fornecedores</SelectItem>
                        {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button
                    variant={onlyLow ? "default" : "outline"}
                    className={onlyLow ? "bg-amber-600 hover:bg-amber-700" : ""}
                    onClick={() => setOnlyLow(v => !v)}
                >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Repor
                </Button>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Novo Acessório
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-500">Carregando acessórios...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-100">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-1">Nenhum acessório encontrado</p>
                    <p>Ajuste os filtros ou cadastre um novo acessório.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filtered.map(item => {
                        const low = item.minQuantity > 0 && item.quantity < item.minQuantity;
                        return (
                            <Card key={item.id} className="group overflow-hidden border-gray-200 hover:shadow-md transition-shadow">
                                <div className="h-36 bg-white border-b border-gray-100 flex items-center justify-center p-3 relative">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="max-h-full max-w-full object-contain"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <ImageOff className="h-10 w-10 text-gray-200" />
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-7 w-7 text-red-600"
                                            onClick={() => {
                                                if (confirm(`Remover ${item.code} do estoque?`)) {
                                                    deleteMutation.mutate(item.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    {item.supplier && (
                                        <Badge variant="outline" className="absolute top-2 left-2 bg-white/90 text-[10px]">
                                            {item.supplier}
                                        </Badge>
                                    )}
                                </div>
                                <CardContent className="p-3 space-y-2">
                                    <div>
                                        <p className="font-mono text-xs text-gray-500">{item.code}</p>
                                        <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2" title={item.name}>
                                            {item.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                                        {low && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <span className={`text-lg font-bold ${low ? "text-amber-600" : "text-gray-900"}`}>
                                            {item.quantity} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 text-green-700 hover:bg-green-50"
                                                title="Entrada"
                                                onClick={() => openMovement(item, "entrada")}
                                            >
                                                <ArrowDownToLine className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 text-red-700 hover:bg-red-50"
                                                title="Saída"
                                                onClick={() => openMovement(item, "saida")}
                                            >
                                                <ArrowUpFromLine className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Acessório" : "Novo Acessório"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Código</Label>
                                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="FEC46" />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Fechos e Contrafechos" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Fecho concha manual sem chave" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fornecedor</Label>
                                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Fermax" />
                            </div>
                            <div className="space-y-2">
                                <Label>Linha</Label>
                                <Input value={form.line} onChange={e => setForm({ ...form, line: e.target.value })} placeholder="Linha Suprema" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Unidade</Label>
                                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="un">Unidade</SelectItem>
                                        <SelectItem value="par">Par</SelectItem>
                                        <SelectItem value="jogo">Jogo</SelectItem>
                                        <SelectItem value="m">Metro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Est. Mínimo</Label>
                                <Input type="number" min="0" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Localização</Label>
                                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Prateleira A3" />
                            </div>
                            <div className="space-y-2">
                                <Label>Imagem (URL)</Label>
                                <Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="/acessorios/fx-fec46.png" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => {
                                if (!form.code.trim() || !form.name.trim()) {
                                    toast({ title: "Atenção", description: "Código e nome são obrigatórios.", variant: "destructive" });
                                    return;
                                }
                                saveMutation.mutate();
                            }}
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!movementItem} onOpenChange={(open) => !open && setMovementItem(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {movementType === "entrada" ? "Entrada de Estoque" : "Saída de Estoque"}
                        </DialogTitle>
                        <DialogDescription>
                            {movementItem?.code} — {movementItem?.name} (atual: {movementItem?.quantity} {movementItem?.unit})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input type="number" min="1" value={movementQty} onChange={e => setMovementQty(e.target.value)} autoFocus />
                        </div>
                        <div className="space-y-2">
                            <Label>Observação</Label>
                            <Textarea
                                value={movementNotes}
                                onChange={e => setMovementNotes(e.target.value)}
                                placeholder={movementType === "entrada" ? "Compra NF 1234" : "Obra Projecar"}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMovementItem(null)}>Cancelar</Button>
                        <Button
                            className={movementType === "entrada" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                            onClick={() => {
                                if ((parseInt(movementQty) || 0) <= 0) {
                                    toast({ title: "Atenção", description: "Informe uma quantidade válida.", variant: "destructive" });
                                    return;
                                }
                                movementMutation.mutate();
                            }}
                            disabled={movementMutation.isPending}
                        >
                            {movementMutation.isPending ? "Registrando..." : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
