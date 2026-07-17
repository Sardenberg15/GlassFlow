import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ruler, Plus, Trash2, Calculator, ArrowRight } from "lucide-react";
import { useAluminumLines, useAluminumProfiles, useTypologies, useTypologyMaterials, useAllTypologyMaterials } from "@/hooks/use-esquadrias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CutItem {
    typologyId: string;
    typologyName: string;
    width: number;
    height: number;
    qty: number;
}

function evaluateFormula(formula: string, L: number, H: number): number {
    try {
        const expr = formula.replace(/L/gi, String(L)).replace(/H/gi, String(H));
        return Math.round(Function(`"use strict"; return (${expr})`)());
    } catch { return 0; }
}

export function PlanoCorteTab() {
    const { data: typologies = [] } = useTypologies();
    const { data: profiles = [] } = useAluminumProfiles();
    const { data: lines = [] } = useAluminumLines();
    const { data: allMaterials = [] } = useAllTypologyMaterials();

    const [items, setItems] = useState<CutItem[]>([]);
    const [selTypologyId, setSelTypologyId] = useState("");
    const [selWidth, setSelWidth] = useState("1200");
    const [selHeight, setSelHeight] = useState("1200");
    const [selQty, setSelQty] = useState("1");
    const [barLength] = useState(6000); // 6m standard

    const addItem = () => {
        if (!selTypologyId) return;
        const t = typologies.find(tp => tp.id === selTypologyId);
        if (!t) return;
        setItems([...items, { typologyId: selTypologyId, typologyName: t.name, width: parseInt(selWidth) || 0, height: parseInt(selHeight) || 0, qty: parseInt(selQty) || 1 }]);
    };

    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    // Calculate all cuts grouped by profile
    const cutPlan = useMemo(() => {
        const profileCuts: Record<string, { profileCode: string; profileName: string; cuts: { length: number; source: string }[] }> = {};

        for (const item of items) {
            const mats = allMaterials.filter(m => m.typologyId === item.typologyId);
            for (const mat of mats) {
                const cutLen = evaluateFormula(mat.formula, item.width, item.height);
                const matQty = evaluateFormula(mat.quantityFormula, item.width, item.height);
                if (cutLen <= 0) continue;
                const profile = profiles.find(p => p.id === mat.profileId);
                if (!profile) continue;
                if (!profileCuts[profile.id]) {
                    profileCuts[profile.id] = { profileCode: profile.code, profileName: profile.name, cuts: [] };
                }
                for (let i = 0; i < matQty * item.qty; i++) {
                    profileCuts[profile.id].cuts.push({ length: cutLen, source: item.typologyName });
                }
            }
        }
        return profileCuts;
    }, [items, allMaterials, profiles]);

    // Simple bar allocation (first-fit decreasing)
    const barAllocation = useMemo(() => {
        const result: Record<string, { bars: { cuts: number[]; waste: number }[] }> = {};
        for (const [profileId, data] of Object.entries(cutPlan)) {
            const sorted = [...data.cuts].sort((a, b) => b.length - a.length);
            const bars: { cuts: number[]; waste: number }[] = [];
            for (const cut of sorted) {
                let placed = false;
                for (const bar of bars) {
                    const used = bar.cuts.reduce((s, c) => s + c, 0);
                    if (used + cut.length <= barLength) {
                        bar.cuts.push(cut.length);
                        bar.waste = barLength - (used + cut.length);
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    bars.push({ cuts: [cut.length], waste: barLength - cut.length });
                }
            }
            result[profileId] = { bars };
        }
        return result;
    }, [cutPlan, barLength]);

    const totalBars = Object.values(barAllocation).reduce((s, d) => s + d.bars.length, 0);
    const totalWaste = Object.values(barAllocation).reduce((s, d) => s + d.bars.reduce((bs, b) => bs + b.waste, 0), 0);
    const totalUsed = Object.values(barAllocation).reduce((s, d) => s + d.bars.reduce((bs, b) => bs + b.cuts.reduce((cs, c) => cs + c, 0), 0), 0);
    const efficiency = totalUsed + totalWaste > 0 ? ((totalUsed / (totalUsed + totalWaste)) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-6">
            {/* Add items */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Montar Plano de Corte</CardTitle>
                    <CardDescription className="text-xs">Adicione esquadrias com suas dimensões para calcular o plano de corte otimizado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-3 flex-wrap">
                        <div className="space-y-1 flex-1 min-w-[200px]">
                            <Label className="text-xs">Tipologia</Label>
                            <Select value={selTypologyId} onValueChange={setSelTypologyId}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a esquadria" /></SelectTrigger>
                                <SelectContent>{typologies.map(t => {
                                    const ln = lines.find(l => l.id === t.lineId);
                                    return <SelectItem key={t.id} value={t.id}>{t.name} ({ln?.name})</SelectItem>;
                                })}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 w-28">
                            <Label className="text-xs">Largura (mm)</Label>
                            <Input type="number" className="h-9" value={selWidth} onChange={e => setSelWidth(e.target.value)} />
                        </div>
                        <div className="space-y-1 w-28">
                            <Label className="text-xs">Altura (mm)</Label>
                            <Input type="number" className="h-9" value={selHeight} onChange={e => setSelHeight(e.target.value)} />
                        </div>
                        <div className="space-y-1 w-20">
                            <Label className="text-xs">Qtd</Label>
                            <Input type="number" min="1" className="h-9" value={selQty} onChange={e => setSelQty(e.target.value)} />
                        </div>
                        <Button onClick={addItem} className="h-9"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                    </div>

                    {items.length > 0 && (
                        <div className="mt-4 rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-muted/50 text-muted-foreground text-xs">
                                    <th className="text-left px-3 py-2">Esquadria</th>
                                    <th className="text-right px-3 py-2">L (mm)</th>
                                    <th className="text-right px-3 py-2">H (mm)</th>
                                    <th className="text-right px-3 py-2">Qtd</th>
                                    <th className="w-10"></th>
                                </tr></thead>
                                <tbody>{items.map((item, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="px-3 py-2 text-xs font-medium">{item.typologyName}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs">{item.width}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs">{item.height}</td>
                                        <td className="px-3 py-2 text-right text-xs">{item.qty}x</td>
                                        <td className="px-2 py-2"><Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {items.length > 0 && Object.keys(cutPlan).length > 0 && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="p-4"><p className="text-xs text-muted-foreground">Barras Necessárias</p><p className="text-2xl font-bold">{totalBars}</p></Card>
                        <Card className="p-4"><p className="text-xs text-muted-foreground">Aproveitamento</p><p className="text-2xl font-bold text-emerald-600">{efficiency}%</p></Card>
                        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Utilizado</p><p className="text-2xl font-bold">{(totalUsed / 1000).toFixed(2)}m</p></Card>
                        <Card className="p-4"><p className="text-xs text-muted-foreground">Sobra/Retalho</p><p className="text-2xl font-bold text-amber-600">{(totalWaste / 1000).toFixed(2)}m</p></Card>
                    </div>

                    {/* Visual bars */}
                    {Object.entries(barAllocation).map(([profileId, data]) => {
                        const info = cutPlan[profileId];
                        return (
                            <Card key={profileId}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-mono">{info.profileCode} <span className="font-normal text-muted-foreground">- {info.profileName}</span></CardTitle>
                                    <CardDescription className="text-xs">{data.bars.length} barra(s) de {barLength / 1000}m — {info.cuts.length} cortes</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {data.bars.map((bar, bi) => {
                                        const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500"];
                                        return (
                                            <div key={bi}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] text-muted-foreground font-medium w-16">Barra {bi + 1}</span>
                                                    <div className="flex-1 h-8 bg-muted/30 rounded-md border overflow-hidden flex">
                                                        {bar.cuts.map((cut, ci) => {
                                                            const pct = (cut / barLength) * 100;
                                                            return (
                                                                <div key={ci} className={`${colors[ci % colors.length]} h-full flex items-center justify-center text-white text-[9px] font-bold border-r border-white/30`} style={{ width: `${pct}%` }} title={`${cut}mm`}>
                                                                    {pct > 5 ? `${cut}` : ""}
                                                                </div>
                                                            );
                                                        })}
                                                        {bar.waste > 0 && (
                                                            <div className="h-full flex items-center justify-center text-[9px] text-muted-foreground bg-muted/50" style={{ width: `${(bar.waste / barLength) * 100}%` }}>
                                                                {bar.waste > 300 ? `${bar.waste}mm` : ""}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        );
                    })}
                </>
            )}

            {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Ruler className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">Adicione esquadrias acima para gerar o plano de corte</p>
                </div>
            )}
        </div>
    );
}
