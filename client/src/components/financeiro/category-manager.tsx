import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2, Tag, Info, Pencil, Check } from "lucide-react";
import { type Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CategoryManager() {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryType, setNewCategoryType] = useState<"receita" | "despesa">("despesa");
    const [newCategoryColor, setNewCategoryColor] = useState("#808080");
    const [newFixedVariable, setNewFixedVariable] = useState("variavel");
    const [newCostType, setNewCostType] = useState("operacional");
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const createCategoryMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/categories", {
                name: newCategoryName,
                type: newCategoryType,
                color: newCategoryColor,
                fixedVariable: newCategoryType === "despesa" ? newFixedVariable : null,
                costType: newCategoryType === "despesa" ? newCostType : null,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            setNewCategoryName("");
            setNewCategoryColor("#808080");
            setNewFixedVariable("variavel");
            setNewCostType("operacional");
            toast({ title: "Categoria criada com sucesso!" });
        },
        onError: () => {
            toast({ title: "Erro ao criar categoria", variant: "destructive" });
        }
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
            await apiRequest("PATCH", `/api/categories/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dre"] });
            setEditingId(null);
            toast({ title: "Categoria atualizada!" });
        },
        onError: () => {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            toast({ title: "Categoria removida!" });
        },
        onError: () => {
            toast({ title: "Erro ao remover", variant: "destructive" });
        }
    });

    const fixedVarLabel = (v: string | null) => {
        if (v === "fixo") return { text: "Fixo", cls: "bg-blue-50 text-blue-700 border-blue-200" };
        return { text: "Variável", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    };

    const costTypeLabel = (v: string | null) => {
        const map: Record<string, { text: string; cls: string }> = {
            direto: { text: "Direto", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
            indireto: { text: "Indireto", cls: "bg-violet-50 text-violet-700 border-violet-200" },
            operacional: { text: "Operacional", cls: "bg-slate-50 text-slate-700 border-slate-200" },
            financeiro: { text: "Financeiro", cls: "bg-orange-50 text-orange-700 border-orange-200" },
            imposto: { text: "Imposto", cls: "bg-rose-50 text-rose-700 border-rose-200" },
        };
        return map[v || "operacional"] || map.operacional;
    };

    const despesas = categories.filter(c => c.type === "despesa");
    const receitas = categories.filter(c => c.type === "receita");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" /> Categorias
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Centros de Custo & Categorias</DialogTitle>
                    <DialogDescription>
                        Configure categorias para classificação DRE. Cada despesa deve ser classificada como Fixa/Variável.
                    </DialogDescription>
                </DialogHeader>

                {/* DRE Info Banner */}
                <div className="flex items-start gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                        <strong>Configuração do DRE:</strong> Classifique despesas como <strong>Fixa</strong> (aluguel, salários) ou <strong>Variável</strong> (materiais, comissões). Clique em <Pencil className="inline h-3 w-3" /> para editar categorias existentes.
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2 flex-1 min-h-0">
                    {/* Form */}
                    <div className="space-y-3 border p-4 rounded-lg h-fit">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Nova Categoria
                        </h3>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Nome</Label>
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Ex: Material, Transporte"
                                className="h-9"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as "receita" | "despesa")}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="despesa">Despesa</SelectItem>
                                    <SelectItem value="receita">Receita</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {newCategoryType === "despesa" && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Classificação DRE</Label>
                                    <Select value={newFixedVariable} onValueChange={setNewFixedVariable}>
                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="variavel">Variável (custos que mudam com vendas)</SelectItem>
                                            <SelectItem value="fixo">Fixo (custos recorrentes/mensais)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Tipo de Custo</Label>
                                    <Select value={newCostType} onValueChange={setNewCostType}>
                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="operacional">Operacional</SelectItem>
                                            <SelectItem value="direto">Direto (matéria-prima)</SelectItem>
                                            <SelectItem value="indireto">Indireto (overhead)</SelectItem>
                                            <SelectItem value="financeiro">Financeiro (juros, tarifas)</SelectItem>
                                            <SelectItem value="imposto">Imposto (IR, CSLL)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs">Cor</Label>
                            <div className="flex gap-2 flex-wrap">
                                {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${newCategoryColor === color ? 'border-black dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewCategoryColor(color)}
                                    />
                                ))}
                            </div>
                        </div>

                        <Button
                            onClick={() => createCategoryMutation.mutate()}
                            disabled={!newCategoryName || createCategoryMutation.isPending}
                            className="w-full"
                        >
                            Adicionar
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="md:col-span-2 flex flex-col min-h-0">
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Tag className="h-4 w-4" /> Categorias ({categories.length})
                        </h3>
                        <div className="border rounded-md flex-1 overflow-hidden">
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">Cor</TableHead>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>DRE</TableHead>
                                            <TableHead>Custo</TableHead>
                                            <TableHead className="text-right w-20">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    Nenhuma categoria cadastrada.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            categories.map((category) => {
                                                const fv = fixedVarLabel(category.fixedVariable);
                                                const ct = costTypeLabel(category.costType);
                                                const isEditing = editingId === category.id;

                                                return (
                                                    <TableRow key={category.id} className={isEditing ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                                                        <TableCell>
                                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                                                        </TableCell>
                                                        <TableCell className="font-medium text-sm">{category.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[10px] ${category.type === 'receita' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                {category.type === 'receita' ? 'Receita' : 'Despesa'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {category.type === 'despesa' && (
                                                                isEditing ? (
                                                                    <Select
                                                                        defaultValue={category.fixedVariable || "variavel"}
                                                                        onValueChange={(v) => updateCategoryMutation.mutate({ id: category.id, data: { fixedVariable: v } })}
                                                                    >
                                                                        <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="variavel">Variável</SelectItem>
                                                                            <SelectItem value="fixo">Fixo</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <Badge variant="outline" className={`text-[10px] ${fv.cls}`}>{fv.text}</Badge>
                                                                )
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {category.type === 'despesa' && (
                                                                isEditing ? (
                                                                    <Select
                                                                        defaultValue={category.costType || "operacional"}
                                                                        onValueChange={(v) => updateCategoryMutation.mutate({ id: category.id, data: { costType: v } })}
                                                                    >
                                                                        <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="operacional">Operacional</SelectItem>
                                                                            <SelectItem value="direto">Direto</SelectItem>
                                                                            <SelectItem value="indireto">Indireto</SelectItem>
                                                                            <SelectItem value="financeiro">Financeiro</SelectItem>
                                                                            <SelectItem value="imposto">Imposto</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <Badge variant="outline" className={`text-[10px] ${ct.cls}`}>{ct.text}</Badge>
                                                                )
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {category.type === 'despesa' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={`h-7 w-7 ${isEditing ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'}`}
                                                                        onClick={() => setEditingId(isEditing ? null : category.id)}
                                                                    >
                                                                        {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
