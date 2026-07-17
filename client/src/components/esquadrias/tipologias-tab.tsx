import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Box, Calculator, Eye, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useAluminumLines, useAluminumProfiles, useTypologies, useTypologyMaterials, useCreateTypology, useUpdateTypology, useDeleteTypology, useCreateTypologyMaterial, useDeleteTypologyMaterial } from "@/hooks/use-esquadrias";
import type { Typology, TypologyMaterial } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const TYPE_LABELS: Record<string, string> = { janela: "Janela", porta: "Porta", esquadria: "Esquadria", portao: "Portão", fixo: "Fixo" };
const TYPE_COLORS: Record<string, string> = { janela: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", porta: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", esquadria: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", portao: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", fixo: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
const MATERIAL_TYPES = ["marco", "trilho", "folha", "baguete", "arremate", "travessa", "grapa", "outro"];
const ORIENTATIONS = [{ value: "altura", label: "Altura (H)" }, { value: "largura", label: "Largura (L)" }];

// SVG thumbnails for known typologies
const SVG_MAP: Record<string, string> = {
    "jc200": "/typologias/jc200.svg", "jc300": "/typologias/jc300.svg", "jc400": "/typologias/jc400.svg",
    "jcb200": "/typologias/jcb200.svg", "max": "/typologias/max.svg", "max2": "/typologias/max2.svg",
    "fixo": "/typologias/fixo.svg", "pc200": "/typologias/pc200.svg", "pc300": "/typologias/pc300.svg",
    "pc400": "/typologias/pc400.svg", "pc600": "/typologias/pc600.svg", "pg100": "/typologias/pg100.svg", "pg200": "/typologias/pg200.svg",
};

function getTypologySvg(t: Typology): string | null {
    if (t.imageUrl) return t.imageUrl;
    for (const [key, url] of Object.entries(SVG_MAP)) {
        if (t.name.toLowerCase().includes(key)) return url;
    }
    return null;
}

function evaluateFormula(formula: string, L: number, H: number): number {
    try {
        const expr = formula.replace(/L/gi, String(L)).replace(/H/gi, String(H));
        return Math.round(Function(`"use strict"; return (${expr})`)());
    } catch { return 0; }
}

// ─── Calculator Panel ───────────────────────────────────────────────────────────
function CalculatorPanel({ typologyId }: { typologyId: string }) {
    const { data: materials = [] } = useTypologyMaterials(typologyId);
    const { data: profiles = [] } = useAluminumProfiles();
    const [width, setWidth] = useState("1200");
    const [height, setHeight] = useState("1200");
    const L = parseInt(width) || 0;
    const H = parseInt(height) || 0;

    const cuts = useMemo(() => {
        if (!L || !H) return [];
        return materials.map(mat => {
            const profile = profiles.find(p => p.id === mat.profileId);
            const cutLength = evaluateFormula(mat.formula, L, H);
            const qty = evaluateFormula(mat.quantityFormula, L, H);
            const weightPerMeter = parseFloat(profile?.weightPerMeter || "0");
            const totalWeight = (cutLength / 1000) * qty * weightPerMeter;
            return { mat, profile, cutLength, qty, totalWeight };
        });
    }, [materials, profiles, L, H]);

    const totalWeight = cuts.reduce((sum, c) => sum + c.totalWeight, 0);

    return (
        <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">Calculadora de Cortes</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <Label className="text-xs">Largura (mm)</Label>
                    <Input type="number" value={width} onChange={e => setWidth(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                    <Label className="text-xs">Altura (mm)</Label>
                    <Input type="number" value={height} onChange={e => setHeight(e.target.value)} className="h-8 text-sm" />
                </div>
            </div>
            {L > 0 && H > 0 && cuts.length > 0 && (
                <div className="rounded-md border overflow-hidden bg-background">
                    <table className="w-full text-xs">
                        <thead><tr className="bg-muted/60 text-muted-foreground"><th className="text-left px-3 py-1.5">Perfil</th><th className="text-right px-3 py-1.5">Corte</th><th className="text-right px-3 py-1.5">Qtd</th><th className="text-right px-3 py-1.5">Peso</th></tr></thead>
                        <tbody>
                            {cuts.map((c, i) => (
                                <tr key={i} className="border-t">
                                    <td className="px-3 py-1.5 font-medium">{c.profile?.code || "?"}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-blue-600 font-semibold">{c.cutLength} mm</td>
                                    <td className="px-3 py-1.5 text-right">{c.qty}x</td>
                                    <td className="px-3 py-1.5 text-right font-mono">{c.totalWeight.toFixed(3)} kg</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot><tr className="border-t bg-muted/30 font-semibold"><td colSpan={3} className="px-3 py-1.5">Peso Total</td><td className="px-3 py-1.5 text-right font-mono">{totalWeight.toFixed(3)} kg</td></tr></tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Material List ──────────────────────────────────────────────────────────────
function MaterialList({ typologyId }: { typologyId: string }) {
    const { toast } = useToast();
    const { data: materials = [] } = useTypologyMaterials(typologyId);
    const { data: profiles = [], data: allProfiles } = useAluminumProfiles();
    const { data: lines = [] } = useAluminumLines();
    const createMaterial = useCreateTypologyMaterial();
    const deleteMaterial = useDeleteTypologyMaterial();

    const [isOpen, setIsOpen] = useState(false);
    const [profileId, setProfileId] = useState("");
    const [formula, setFormula] = useState("");
    const [qtyFormula, setQtyFormula] = useState("1");
    const [type, setType] = useState("marco");
    const [orientation, setOrientation] = useState("largura");

    const save = () => {
        if (!profileId || !formula) return;
        createMaterial.mutate({ typologyId, profileId, formula, quantityFormula: qtyFormula, type, orientation }, {
            onSuccess: () => { toast({ title: "Material adicionado!" }); setProfileId(""); setFormula(""); setQtyFormula("1"); setIsOpen(false); }
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-muted-foreground">Materiais / Fórmulas de Corte</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
            </div>
            {materials.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 border rounded-md bg-muted/20">Nenhum material cadastrado</p>
            ) : (
                <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-xs">
                        <thead><tr className="bg-muted/50 text-muted-foreground">
                            <th className="text-left px-3 py-2">Perfil</th>
                            <th className="text-left px-3 py-2">Tipo</th>
                            <th className="text-left px-3 py-2">Fórmula</th>
                            <th className="text-center px-3 py-2">Qtd</th>
                            <th className="text-left px-3 py-2">Eixo</th>
                            <th className="w-10 px-2 py-2"></th>
                        </tr></thead>
                        <tbody>{materials.map(mat => {
                            const p = profiles.find(pr => pr.id === mat.profileId);
                            return (
                                <tr key={mat.id} className="border-t hover:bg-muted/20 group">
                                    <td className="px-3 py-2 font-mono font-semibold text-primary">{p?.code} <span className="font-normal text-muted-foreground">- {p?.name}</span></td>
                                    <td className="px-3 py-2 capitalize"><Badge variant="outline" className="text-[10px]">{mat.type}</Badge></td>
                                    <td className="px-3 py-2 font-mono text-blue-600 font-bold">{mat.formula}</td>
                                    <td className="px-3 py-2 text-center">{mat.quantityFormula}x</td>
                                    <td className="px-3 py-2 capitalize">{mat.orientation === "altura" ? "↕ H" : "↔ L"}</td>
                                    <td className="px-2 py-2">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                            onClick={() => deleteMaterial.mutate({ id: mat.id, typologyId })}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                </div>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar Perfil à Receita</DialogTitle></DialogHeader>
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
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Tipo do Corte *</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{MATERIAL_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Orientação *</Label>
                                <Select value={orientation} onValueChange={setOrientation}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{ORIENTATIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Fórmula de Corte *</Label>
                                <Input value={formula} onChange={e => setFormula(e.target.value)} placeholder="Ex: L/2 - 50" />
                                <p className="text-[10px] text-muted-foreground">L = Largura, H = Altura (em mm)</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantidade</Label>
                                <Input value={qtyFormula} onChange={e => setQtyFormula(e.target.value)} placeholder="Ex: 2" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={save} disabled={createMaterial.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Typology Card ──────────────────────────────────────────────────────────────
function TypologyCard({ typology, onEdit, onDelete }: { typology: Typology; onEdit: () => void; onDelete: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const { data: lines = [] } = useAluminumLines();
    const { data: materials = [] } = useTypologyMaterials(typology.id);
    const line = lines.find(l => l.id === typology.lineId);
    const svgUrl = getTypologySvg(typology);

    return (
        <Card className={`overflow-hidden transition-all duration-200 ${expanded ? 'ring-2 ring-primary/30' : 'hover:shadow-md'}`}>
            <div className="flex items-start gap-4 p-4">
                {/* SVG Preview */}
                <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border flex items-center justify-center overflow-hidden">
                    {svgUrl ? <img src={svgUrl} alt={typology.name} className="w-16 h-16 object-contain" /> : <Box className="h-8 w-8 text-muted-foreground/30" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-semibold leading-tight truncate">{typology.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-[10px] ${TYPE_COLORS[typology.type] || TYPE_COLORS.esquadria}`}>{TYPE_LABELS[typology.type] || typology.type}</Badge>
                                <Badge variant="outline" className="text-[10px]">{line?.name || "—"}</Badge>
                                <Badge variant="secondary" className="text-[10px]">{materials.length} perfis</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                    </div>
                    {typology.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{typology.description}</p>}
                    {typology.accessories && <p className="text-[10px] text-muted-foreground mt-0.5">🔩 {typology.accessories}</p>}
                </div>
            </div>
            {/* Expand/Collapse */}
            <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground border-t hover:bg-muted/50 transition-colors">
                {expanded ? <><ChevronUp className="h-3 w-3" /> Recolher</> : <><ChevronDown className="h-3 w-3" /> Materiais & Calculadora</>}
            </button>
            {expanded && (
                <div className="p-4 pt-2 space-y-4 border-t bg-muted/10">
                    <MaterialList typologyId={typology.id} />
                    <CalculatorPanel typologyId={typology.id} />
                </div>
            )}
        </Card>
    );
}

// ─── Main Tab ───────────────────────────────────────────────────────────────────
export function TipologiasTab() {
    const { toast } = useToast();
    const { data: lines = [] } = useAluminumLines();
    const { data: typologies = [] } = useTypologies();
    const createTypology = useCreateTypology();
    const updateTypology = useUpdateTypology();
    const deleteTypology = useDeleteTypology();

    const [search, setSearch] = useState("");
    const [filterLine, setFilterLine] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Typology | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form
    const [name, setName] = useState("");
    const [lineId, setLineId] = useState("");
    const [type, setType] = useState("esquadria");
    const [desc, setDesc] = useState("");
    const [accessories, setAccessories] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const openDialog = (t?: Typology) => {
        if (t) {
            setEditing(t); setName(t.name); setLineId(t.lineId); setType(t.type);
            setDesc(t.description || ""); setAccessories(t.accessories || ""); setImageUrl(t.imageUrl || "");
        } else {
            setEditing(null); setName(""); setLineId(""); setType("esquadria"); setDesc(""); setAccessories(""); setImageUrl("");
        }
        setIsDialogOpen(true);
    };

    const save = () => {
        if (!name || !lineId) return;
        const data = { name, lineId, type, description: desc || null, accessories: accessories || null, imageUrl: imageUrl || null };
        if (editing) {
            updateTypology.mutate({ id: editing.id, ...data }, { onSuccess: () => { toast({ title: "Tipologia atualizada!" }); setIsDialogOpen(false); } });
        } else {
            createTypology.mutate(data, { onSuccess: () => { toast({ title: "Tipologia criada!" }); setIsDialogOpen(false); } });
        }
    };

    const filtered = typologies.filter(t => {
        if (filterLine !== "all" && t.lineId !== filterLine) return false;
        if (filterType !== "all" && t.type !== filterType) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const types = Array.from(new Set(typologies.map(t => t.type)));

    return (
        <>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar tipologia..." className="pl-9 h-9 w-[220px]" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Select value={filterLine} onValueChange={setFilterLine}>
                        <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Linha" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas Linhas</SelectItem>
                            {lines.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos Tipos</SelectItem>
                            {types.map(t => <SelectItem key={t} value={t} className="capitalize">{TYPE_LABELS[t] || t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Badge variant="secondary">{filtered.length} tipologias</Badge>
                </div>
                <Button onClick={() => openDialog()}>
                    <Plus className="h-4 w-4 mr-2" /> Nova Tipologia
                </Button>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Box className="h-12 w-12 mb-3 opacity-20" />
                    <p>Nenhuma tipologia encontrada</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filtered.map(t => (
                        <TypologyCard key={t.id} typology={t} onEdit={() => openDialog(t)} onDelete={() => setDeleteId(t.id)} />
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Tipologia</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2"><Label>Nome da Esquadria *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="JC200 - Janela Correr 2 Folhas" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Linha *</Label>
                                <Select value={lineId} onValueChange={setLineId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>{lines.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo *</Label>
                                <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                            </div>
                        </div>
                        <div className="space-y-2"><Label>Descrição</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Detalhes da esquadria..." /></div>
                        <div className="space-y-2"><Label>Acessórios</Label><Input value={accessories} onChange={e => setAccessories(e.target.value)} placeholder="Kit roldanas, fecho concha, gaxetas..." /></div>
                        <div className="space-y-2"><Label>Imagem (URL ou caminho SVG)</Label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="/typologias/jc200.svg" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={save} disabled={createTypology.isPending || updateTypology.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Tipologia?</AlertDialogTitle>
                        <AlertDialogDescription>Todas as fórmulas de corte associadas serão removidas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                            if (deleteId) deleteTypology.mutate(deleteId, { onSuccess: () => { toast({ title: "Tipologia excluída!" }); setDeleteId(null); } });
                        }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
