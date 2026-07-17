import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Layers, ChevronRight } from "lucide-react";
import { useAluminumLines, useAluminumProfiles, useCreateAluminumLine, useCreateAluminumProfile, useUpdateAluminumLine, useUpdateAluminumProfile, useDeleteAluminumLine, useDeleteAluminumProfile } from "@/hooks/use-esquadrias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { AluminumLine, AluminumProfile } from "@shared/schema";

export function LinhasPerfisTab() {
    const { toast } = useToast();
    const { data: lines = [] } = useAluminumLines();
    const { data: profiles = [] } = useAluminumProfiles();
    const createLine = useCreateAluminumLine();
    const updateLine = useUpdateAluminumLine();
    const deleteLine = useDeleteAluminumLine();
    const createProfile = useCreateAluminumProfile();
    const updateProfile = useUpdateAluminumProfile();
    const deleteProfile = useDeleteAluminumProfile();

    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [searchProfile, setSearchProfile] = useState("");

    // Line dialogs
    const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
    const [editingLine, setEditingLine] = useState<AluminumLine | null>(null);
    const [lineName, setLineName] = useState("");
    const [lineDesc, setLineDesc] = useState("");
    const [deleteLineId, setDeleteLineId] = useState<string | null>(null);

    // Profile dialogs
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<AluminumProfile | null>(null);
    const [profileCode, setProfileCode] = useState("");
    const [profileName, setProfileName] = useState("");
    const [profileWeight, setProfileWeight] = useState("");
    const [profileLineId, setProfileLineId] = useState("");
    const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);

    const openLineDialog = (line?: AluminumLine) => {
        if (line) { setEditingLine(line); setLineName(line.name); setLineDesc(line.description || ""); }
        else { setEditingLine(null); setLineName(""); setLineDesc(""); }
        setIsLineDialogOpen(true);
    };

    const saveLine = () => {
        if (!lineName.trim()) return;
        if (editingLine) {
            updateLine.mutate({ id: editingLine.id, name: lineName, description: lineDesc }, {
                onSuccess: () => { toast({ title: "Linha atualizada!" }); setIsLineDialogOpen(false); }
            });
        } else {
            createLine.mutate({ name: lineName, description: lineDesc }, {
                onSuccess: () => { toast({ title: "Linha criada!" }); setIsLineDialogOpen(false); }
            });
        }
    };

    const openProfileDialog = (profile?: AluminumProfile) => {
        if (profile) {
            setEditingProfile(profile); setProfileCode(profile.code); setProfileName(profile.name);
            setProfileWeight(profile.weightPerMeter); setProfileLineId(profile.lineId);
        } else {
            setEditingProfile(null); setProfileCode(""); setProfileName("");
            setProfileWeight(""); setProfileLineId(selectedLineId || "");
        }
        setIsProfileDialogOpen(true);
    };

    const saveProfile = () => {
        if (!profileCode || !profileName || !profileWeight || !profileLineId) return;
        const data = { code: profileCode, name: profileName, weightPerMeter: profileWeight, lineId: profileLineId };
        if (editingProfile) {
            updateProfile.mutate({ id: editingProfile.id, ...data }, {
                onSuccess: () => { toast({ title: "Perfil atualizado!" }); setIsProfileDialogOpen(false); }
            });
        } else {
            createProfile.mutate(data, {
                onSuccess: () => { toast({ title: "Perfil criado!" }); setIsProfileDialogOpen(false); }
            });
        }
    };

    const filteredProfiles = profiles.filter(p => {
        const matchLine = !selectedLineId || p.lineId === selectedLineId;
        const matchSearch = !searchProfile || p.code.toLowerCase().includes(searchProfile.toLowerCase()) || p.name.toLowerCase().includes(searchProfile.toLowerCase());
        return matchLine && matchSearch;
    });

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Linhas Sidebar */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Linhas de Alumínio</CardTitle>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openLineDialog()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription className="text-xs">Selecione para filtrar perfis</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1 p-3 pt-0">
                            <button
                                onClick={() => setSelectedLineId(null)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${!selectedLineId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                            >
                                <span className="flex items-center gap-2"><Layers className="h-4 w-4" /> Todas</span>
                                <Badge variant="secondary" className="text-xs">{profiles.length}</Badge>
                            </button>
                            {lines.map(line => {
                                const count = profiles.filter(p => p.lineId === line.id).length;
                                const isSelected = selectedLineId === line.id;
                                return (
                                    <div key={line.id} className={`group flex items-center rounded-lg transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                                        <button
                                            onClick={() => setSelectedLineId(line.id)}
                                            className={`flex-1 text-left px-3 py-2.5 text-sm flex items-center justify-between ${isSelected ? 'text-primary font-medium' : ''}`}
                                        >
                                            <span className="flex items-center gap-2"><ChevronRight className={`h-3 w-3 transition-transform ${isSelected ? 'rotate-90' : ''}`} /> {line.name}</span>
                                            <Badge variant="secondary" className="text-xs">{count}</Badge>
                                        </button>
                                        <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openLineDialog(line)}><Pencil className="h-3 w-3" /></Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteLineId(line.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {lines.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Nenhuma linha cadastrada</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Perfis Grid */}
                <div className="lg:col-span-9">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <CardTitle className="text-base">Perfis de Alumínio</CardTitle>
                                    <CardDescription className="text-xs">{filteredProfiles.length} perfis encontrados</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Buscar código ou nome..." className="pl-9 h-9 w-[250px]" value={searchProfile} onChange={e => setSearchProfile(e.target.value)} />
                                    </div>
                                    <Button size="sm" onClick={() => openProfileDialog()}>
                                        <Plus className="h-4 w-4 mr-1" /> Novo Perfil
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-muted-foreground">
                                            <th className="text-left px-4 py-2.5 font-medium">Código</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Descrição</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Linha</th>
                                            <th className="text-right px-4 py-2.5 font-medium">Peso (kg/m)</th>
                                            <th className="w-20 px-4 py-2.5"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProfiles.map(profile => {
                                            const line = lines.find(l => l.id === profile.lineId);
                                            return (
                                                <tr key={profile.id} className="border-t hover:bg-muted/30 group">
                                                    <td className="px-4 py-2.5 font-mono font-semibold text-primary">{profile.code}</td>
                                                    <td className="px-4 py-2.5">{profile.name}</td>
                                                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{line?.name || "—"}</Badge></td>
                                                    <td className="px-4 py-2.5 text-right font-mono">{profile.weightPerMeter}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="hidden group-hover:flex items-center justify-end gap-1">
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openProfileDialog(profile)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteProfileId(profile.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredProfiles.length === 0 && (
                                            <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Nenhum perfil encontrado.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Line Dialog */}
            <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingLine ? "Editar" : "Nova"} Linha de Alumínio</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Nome da Linha *</Label>
                            <Input value={lineName} onChange={e => setLineName(e.target.value)} placeholder="Ex: Suprema" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Input value={lineDesc} onChange={e => setLineDesc(e.target.value)} placeholder="Ex: Sistema 25mm" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLineDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={saveLine} disabled={createLine.isPending || updateLine.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile Dialog */}
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingProfile ? "Editar" : "Novo"} Perfil</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Linha *</Label>
                            <Select value={profileLineId} onValueChange={setProfileLineId}>
                                <SelectTrigger><SelectValue placeholder="Selecione a linha" /></SelectTrigger>
                                <SelectContent>{lines.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Código *</Label><Input value={profileCode} onChange={e => setProfileCode(e.target.value)} placeholder="SU-001" /></div>
                            <div className="space-y-2"><Label>Peso (kg/m) *</Label><Input type="number" step="0.001" value={profileWeight} onChange={e => setProfileWeight(e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Descrição *</Label><Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Trilho Superior" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={saveProfile} disabled={createProfile.isPending || updateProfile.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Line Alert */}
            <AlertDialog open={!!deleteLineId} onOpenChange={() => setDeleteLineId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Linha?</AlertDialogTitle>
                        <AlertDialogDescription>Todos os perfis e tipologias desta linha serão excluídos.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                            if (deleteLineId) deleteLine.mutate(deleteLineId, { onSuccess: () => { toast({ title: "Linha excluída!" }); setDeleteLineId(null); if (selectedLineId === deleteLineId) setSelectedLineId(null); } });
                        }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Profile Alert */}
            <AlertDialog open={!!deleteProfileId} onOpenChange={() => setDeleteProfileId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Perfil?</AlertDialogTitle>
                        <AlertDialogDescription>Este perfil será removido de todas as tipologias.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                            if (deleteProfileId) deleteProfile.mutate(deleteProfileId, { onSuccess: () => { toast({ title: "Perfil excluído!" }); setDeleteProfileId(null); } });
                        }}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
