import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
    ArrowLeft,
    Factory,
    Printer,
    PackageSearch,
    CheckCircle2,
    ListOrdered
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProductionBatch, ProductionBatchItem, QuoteItem, Quote, Client } from "@shared/schema";
import { useMemo } from "react";

interface CutDemand {
    size: number; // in mm
    qty: number;
}

interface ProfileAggregation {
    code: string;
    name: string;
    weightPerMeter: number;
    cuts: CutDemand[];
    totalBarsNeeded: number;
    totalLengthNeeded: number;
    totalWeight: number;
}

export default function ProducaoDetalhe() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: batch, isLoading: isBatchLoading } = useQuery<ProductionBatch>({
        queryKey: [`/api/production-batches/${id}`],
    });

    const { data: batchItems = [], isLoading: isItemsLoading } = useQuery<ProductionBatchItem[]>({
        queryKey: [`/api/production-batches/${id}/items`],
        enabled: !!id,
    });

    const { data: allQuoteItems = [] } = useQuery<QuoteItem[]>({
        queryKey: ["/api/quote-items"],
    });

    const { data: quotes = [] } = useQuery<Quote[]>({
        queryKey: ["/api/quotes"],
    });

    const { data: clients = [] } = useQuery<Client[]>({
        queryKey: ["/api/clients"],
    });

    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            await apiRequest("PATCH", `/api/production-batches/${id}`, { status: newStatus });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/production-batches/${id}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/production-batches"] });
            toast({ title: "Status Atualizado", description: "O status do lote foi alterado com sucesso." });
        }
    });

    // Combine items and run cutting logic
    const { cuttingMap, purchaseList } = useMemo(() => {
        const profilesMap = new Map<string, ProfileAggregation>();

        // 1. Gather all cuts across all items inside this batch
        for (const batchItem of batchItems) {
            const quoteItem = allQuoteItems.find(qi => qi.id === batchItem.quoteItemId);
            if (!quoteItem || !quoteItem.calculatedMaterials) continue;

            let mats: any[] = [];
            const calcMats = quoteItem.calculatedMaterials as any;

            try {
                if (Array.isArray(calcMats)) {
                    mats = calcMats;
                } else if (calcMats.materials) {
                    mats = typeof calcMats.materials === 'string'
                        ? JSON.parse(calcMats.materials)
                        : calcMats.materials;
                }
            } catch (e) {
                console.error("Failed to parse calculated materials array:", e);
                continue;
            }

            if (!Array.isArray(mats)) continue;

            for (const mat of mats) {
                const profileCode = (mat.profile?.code || mat.code || mat.profileCode || "N/A").toUpperCase();
                // Ignore "vidro" or non-aluminum items using duck typing or simple filters if needed
                // Assuming all materials here are Aluminum Profiles
                if (mat.type === 'vidro') continue;

                if (!profilesMap.has(profileCode)) {
                    profilesMap.set(profileCode, {
                        code: profileCode,
                        name: mat.profile?.name || mat.name || "Perfil sem nome",
                        weightPerMeter: parseFloat(mat.profile?.weightPerMeter || mat.weightPerMeter || mat.weight || "0"),
                        cuts: [],
                        totalBarsNeeded: 0,
                        totalLengthNeeded: 0,
                        totalWeight: 0,
                    });
                }

                const profileAgg = profilesMap.get(profileCode)!;

                const cutSize = parseFloat(mat.calculatedSize || mat.cutSize) || 0;
                const cutQty = parseInt(mat.calculatedQuantity || mat.quantity) || 0;
                const itemQty = parseInt(String(quoteItem.quantity)) || 1;
                const totalCuts = cutQty * itemQty;

                if (totalCuts > 0 && cutSize > 0) {
                    // Check if we already have this size to group it
                    const existingCut = profileAgg.cuts.find(c => c.size === cutSize);
                    if (existingCut) {
                        existingCut.qty += totalCuts;
                    } else {
                        profileAgg.cuts.push({ size: cutSize, qty: totalCuts });
                    }
                }
            }
        }

        // 2. Reduce inside each profile to calculate Bars Needed (Greedy 1D Cutting Stock)
        const aggregatedProfiles = Array.from(profilesMap.values());
        for (const agg of aggregatedProfiles) {
            let totalLen = 0;
            for (const c of agg.cuts) {
                totalLen += (c.size * c.qty);
            }

            // Expand cuts into a 1D array of sizes
            const expandedCuts = agg.cuts.flatMap(c => Array(c.qty).fill(c.size)).sort((a, b) => b - a); // sort descending
            const bars: number[] = []; // remaining length of each bar (started at 6000mm)

            // Standard bar length is 6 meters (6000mm)
            const BAR_LENGTH = 6000;

            for (const cut of expandedCuts) {
                let placed = false;
                // Find first fit
                for (let i = 0; i < bars.length; i++) {
                    if (bars[i] >= cut) {
                        bars[i] -= cut;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    // open a new bar
                    bars.push(BAR_LENGTH - cut);
                }
            }

            agg.totalBarsNeeded = bars.length;
            agg.totalLengthNeeded = totalLen; // in mm
            agg.totalWeight = (totalLen / 1000) * agg.weightPerMeter; // kg
        }

        // Sort cuts size desc for better visual
        aggregatedProfiles.forEach(agg => {
            agg.cuts.sort((a, b) => b.size - a.size);
        });

        return {
            cuttingMap: aggregatedProfiles,
            purchaseList: aggregatedProfiles.filter(p => p.totalBarsNeeded > 0).sort((a, b) => b.totalBarsNeeded - a.totalBarsNeeded)
        };
    }, [batchItems, allQuoteItems]);

    if (isBatchLoading) return <div className="p-8">Carregando lote...</div>;
    if (!batch) return <div className="p-8">Lote não encontrado.</div>;

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setLocation("/producao")}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{batch.code}</h1>
                                <Badge variant={
                                    batch.status === 'pendente' ? 'secondary' :
                                        batch.status === 'em_corte' ? 'default' : 'outline'
                                } className="text-sm">
                                    {batch.status === 'pendente' ? 'Pendente' :
                                        batch.status === 'em_corte' ? 'Em Corte' : 'Finalizado'}
                                </Badge>
                            </div>
                            <p className="text-gray-500 mt-1">
                                Lote de Produção • Criado em {format(new Date(batch.createdAt), "dd/MM/yyyy")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                            <Printer className="h-4 w-4" />
                            Imprimir
                        </Button>

                        {batch.status === 'pendente' && (
                            <Button onClick={() => updateStatusMutation.mutate('em_corte')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Factory className="h-4 w-4" />
                                Iniciar Produção
                            </Button>
                        )}
                        {batch.status === 'em_corte' && (
                            <Button onClick={() => updateStatusMutation.mutate('finalizado')} className="gap-2 bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Marcar Finalizado
                            </Button>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <ListOrdered className="h-4 w-4" />
                                Total de Esquadrias
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{batchItems.length}</div>
                            <p className="text-sm text-gray-500">Itens agrupados neste lote</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                <PackageSearch className="h-4 w-4" />
                                Barras Requeridas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">
                                {purchaseList.reduce((acc, curr) => acc + curr.totalBarsNeeded, 0)}
                            </div>
                            <p className="text-sm text-gray-500">Barras de 6m no total</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Previsão</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold">
                                {batch.expectedDate ? format(new Date(batch.expectedDate), "dd/MM/yyyy") : "Não definida"}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{batch.observations || "Sem observações"}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 align-top items-start">

                    {/* Main Left: Cutting Plan */}
                    <div className="xl:col-span-2 space-y-6">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                                <CardTitle className="text-xl">Plano de Corte Otimizado</CardTitle>
                                <CardDescription>Cortes exatos agrupados por perfil de alumínio. Otimização considerou barras de 6m.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 divide-y divide-gray-100">
                                {cuttingMap.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">Este lote não possui perfis de alumínio mapeados.</div>
                                ) : (
                                    cuttingMap.map(profile => (
                                        <div key={profile.code} className="p-6 hover:bg-gray-50/30 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                        {profile.code}
                                                        <Badge variant="outline">{profile.name}</Badge>
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-600 mb-1">Total Necessário:</p>
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-3 py-1">
                                                        {profile.totalBarsNeeded} {profile.totalBarsNeeded === 1 ? 'barra' : 'barras'} de 6m
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                {profile.cuts.map((cut, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                                                        <span className="font-mono font-medium text-gray-900">{cut.size} <span className="text-xs text-gray-500 font-sans">mm</span></span>
                                                        <span className="text-gray-400">×</span>
                                                        <span className="font-bold text-gray-700">{cut.qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Right: Purchase List & Grouped Items info */}
                    <div className="space-y-6">
                        <Card className="border-blue-100 shadow-sm bg-blue-50/30">
                            <CardHeader className="pb-3 border-b border-blue-100/50">
                                <CardTitle className="text-lg text-blue-900">Lista de Compras</CardTitle>
                                <CardDescription className="text-blue-700/70">Resumo de barras para o fornecedor</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {purchaseList.length === 0 ? (
                                    <p className="text-blue-500 text-sm">Nenhum alumínio necessário.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {purchaseList.map(item => (
                                            <li key={item.code} className="flex justify-between items-center text-sm border-b border-blue-100/50 pb-2 last:border-0 last:pb-0">
                                                <span className="font-medium text-blue-900">{item.code}</span>
                                                <span className="text-blue-800 font-bold">{item.totalBarsNeeded} <span className="font-normal text-xs uppercase ml-0.5">Barras</span></span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader className="pb-3 border-b border-gray-100">
                                <CardTitle className="text-lg">Esquadrias do Lote</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <Table>
                                    <TableBody>
                                        {batchItems.map(item => {
                                            const quoteItem = allQuoteItems.find(qi => qi.id === item.quoteItemId);
                                            const quote = quotes.find(q => q.id === quoteItem?.quoteId);
                                            const client = clients.find(c => c.id === quote?.clientId);

                                            return (
                                                <TableRow key={item.id} className="hover:bg-gray-50">
                                                    <TableCell className="py-3">
                                                        <p className="font-medium text-sm text-gray-900 line-clamp-1">{quoteItem?.description || "Item Removido"}</p>
                                                        <p className="text-xs text-gray-500 mt-1">Qtde: {quoteItem?.quantity}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 text-xs text-gray-500 max-w-[120px]">
                                                        <p className="truncate">{client?.name}</p>
                                                        <p className="mt-1 font-mono">{quote?.number}</p>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
