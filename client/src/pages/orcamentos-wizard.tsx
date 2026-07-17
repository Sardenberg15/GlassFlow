import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PageHeader from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTypologies, useAllTypologyMaterials, useAluminumProfiles } from "@/hooks/use-esquadrias";
import { Parser } from 'expr-eval';
import type { Client, Typology, AluminumLine } from "@shared/schema";

export default function OrcamentosWizard() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const totalSteps = 5;

    const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
    const { data: typologies = [] } = useQuery<Typology[]>({ queryKey: ["/api/typologies"] });
    const { data: quotes = [] } = useQuery<any[]>({ queryKey: ["/api/quotes"] });
    const { data: allTypologyMaterials = [] } = useAllTypologyMaterials();
    const { data: aluminumProfiles = [] } = useAluminumProfiles();

    const [wizardData, setWizardData] = useState({
        clientId: "",
        projectName: "",
        typologyId: "",
        lineId: "",
        width: "",
        height: "",
        profileColor: "",
        glassType: "",
        aluminumPrice: "45", // Suggested defaults
        glassPrice: "120",
        accessoriesPrice: "80",
        installationCostSqm: "0",
        fabricationCostKg: "0",
        profitMargin: "40",
        materialsCost: 0,
    });

    // Helper para realizar o levantamento de material da Tipologia
    const calculateTypologyMaterials = () => {
        if (!wizardData.typologyId || !wizardData.width || !wizardData.height) return null;
        const w = parseFloat(wizardData.width);
        const h = parseFloat(wizardData.height);
        if (isNaN(w) || isNaN(h)) return null;

        const materials = allTypologyMaterials.filter(m => m.typologyId === wizardData.typologyId);

        return materials.map(mat => {
            const profile = aluminumProfiles.find(p => p.id === mat.profileId);
            let calculatedSize = 0;
            let calculatedQuantity = 0;
            try {
                const parser = new Parser();
                calculatedSize = parser.evaluate(mat.formula, { L: w, H: h });
                calculatedQuantity = parser.parse(mat.quantityFormula || "1").evaluate({ L: w, H: h });
            } catch (e) {
                console.error("Formula error", e);
            }

            const weightPerMeter = profile ? parseFloat(String(profile.weightPerMeter)) : 0;
            const totalWeight = (calculatedSize / 1000) * calculatedQuantity * weightPerMeter;

            return {
                ...mat,
                profile,
                calculatedSize,
                calculatedQuantity,
                totalWeight
            };
        });
    };

    const generateQuoteNumber = () => {
        const year = new Date().getFullYear();
        const count = quotes.length + 1;
        return `ORC-${year}-${String(count).padStart(3, '0')}`;
    };

    const createQuoteMutation = useMutation({
        mutationFn: async () => {
            const quoteData = {
                clientId: wizardData.clientId,
                number: generateQuoteNumber(),
                status: "pendente",
                validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                local: wizardData.projectName,
                tipo: "Vidros e Esquadrias",
                discount: "0",
                observations: "Orçamento gerado via Wizard Profissional",
            };

            const response = await apiRequest("POST", "/api/quotes", quoteData);
            const quote = await response.json();

            // Calculate final price based on markup
            const calcMats = calculateTypologyMaterials() || [];
            const totalKg = calcMats.reduce((acc, cur) => acc + (cur.totalWeight || 0), 0);
            const wM = parseFloat(wizardData.width || "0") / 1000;
            const hM = parseFloat(wizardData.height || "0") / 1000;
            const glassArea = wM * hM;
            const aluCost = totalKg * parseFloat(wizardData.aluminumPrice || "0");
            const glsCost = glassArea * parseFloat(wizardData.glassPrice || "0");
            const accCost = parseFloat(wizardData.accessoriesPrice || "0");
            const instCost = glassArea * parseFloat(wizardData.installationCostSqm || "0");
            const fabCost = totalKg * parseFloat(wizardData.fabricationCostKg || "0");
            const rawCost = aluCost + glsCost + accCost + instCost + fabCost;
            
            const profitStr = wizardData.profitMargin || "0";
            const profit = parseFloat(profitStr);
            const finalPrice = rawCost / (1 - (profit / 100));
            const unitPrice = isNaN(finalPrice) || !isFinite(finalPrice) ? "0" : finalPrice.toFixed(2);
            const tipologia = typologies.find(t => t.id === wizardData.typologyId);

            await apiRequest("POST", "/api/quote-items", {
                quoteId: quote.id,
                description: tipologia?.name || "Esquadria Sob Medida",
                quantity: "1",
                width: wizardData.width,
                height: wizardData.height,
                profileColor: wizardData.profileColor,
                line: "Suprema/Gold",
                environment: wizardData.projectName,
                typologyId: wizardData.typologyId,
                imageUrl: tipologia?.imageUrl || null,
                unitPrice: unitPrice,
                total: unitPrice,
                calculatedMaterials: {
                    materials: calcMats,
                    costs: {
                        aluminumPricePerKg: wizardData.aluminumPrice,
                        glassPricePerSqm: wizardData.glassPrice,
                        accessoriesPrice: wizardData.accessoriesPrice,
                        installationCostSqm: wizardData.installationCostSqm,
                        fabricationCostKg: wizardData.fabricationCostKg,
                        profitMargin: wizardData.profitMargin
                    }
                }
            });

            return quote;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
            toast({
                title: "Orçamento Criado com Sucesso",
                description: "O fluxo finalizou e seu orçamento está na lista geral.",
            });
            setLocation('/orcamentos');
        },
        onError: (error: Error) => {
            toast({
                title: "Erro ao criar orçamento",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
            <PageHeader
                title="Novo Orçamento Profissional"
                description="Assistente passo-a-passo para elaboração do orçamento"
            />

            {/* Stepper Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-white border-b sticky top-0 z-10">
                {[
                    { num: 1, label: "Cliente & Obra" },
                    { num: 2, label: "Tipologias" },
                    { num: 3, label: "Dimensões e Linha" },
                    { num: 4, label: "Custos dos Materiais" },
                    { num: 5, label: "Resumo Final" }
                ].map((s) => (
                    <div key={s.num} className="flex flex-col items-center gap-2 relative flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300 ${step > s.num
                            ? 'bg-primary text-white border-primary'
                            : step === s.num
                                ? 'border-primary text-primary'
                                : 'border-muted-foreground text-muted-foreground'
                            }`}>
                            {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                        </div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${step >= s.num ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                            {s.label}
                        </span>
                        {s.num !== 5 && (
                            <div className={`absolute top-5 left-[60%] w-[80%] h-0.5 -z-10 ${step > s.num ? 'bg-primary' : 'bg-border'
                                }`} />
                        )}
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-6 bg-muted/20">
                <div className="max-w-6xl mx-auto">
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Passo 1: Cliente e Projeto</CardTitle>
                                <CardDescription>Selecione o cliente e a obra para este orçamento.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <div className="space-y-2">
                                    <Label>Selecione o Cliente *</Label>
                                    <Select
                                        value={wizardData.clientId}
                                        onValueChange={(val) => setWizardData(d => ({ ...d, clientId: val }))}
                                    >
                                        <SelectTrigger className="h-12 text-lg">
                                            <SelectValue placeholder="Busque ou selecione um cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="text-lg py-2">
                                                    {c.name} {c.document ? `- ${c.document}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Nome da Obra / Identificação *</Label>
                                    <Input
                                        placeholder="Ex: Casa Condomínio Alphaville Lote 10"
                                        className="h-12 text-lg"
                                        value={wizardData.projectName}
                                        onChange={(e) => setWizardData(d => ({ ...d, projectName: e.target.value }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {step === 2 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Passo 2: Catálogo de Tipologias</CardTitle>
                                <CardDescription>Selecione o modelo da esquadria no catálogo visual.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                                    {typologies.map((tipo) => (
                                        <Card
                                            key={tipo.id}
                                            className={`cursor-pointer transition-all hover:border-primary/50 overflow-hidden ${wizardData.typologyId === tipo.id ? 'ring-2 ring-primary border-primary' : ''}`}
                                            onClick={() => setWizardData(d => ({ ...d, typologyId: tipo.id }))}
                                        >
                                            <div className="aspect-video w-full bg-muted relative">
                                                {tipo.imageUrl ? (
                                                    <img src={tipo.imageUrl} alt={tipo.name} className="w-full h-full object-contain p-4 mix-blend-multiply" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-12 h-12 text-muted-foreground/30" /></div>
                                                )}
                                                {wizardData.typologyId === tipo.id && (
                                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                        <div className="bg-primary text-white p-2 rounded-full shadow-lg"><Check className="w-6 h-6" /></div>
                                                    </div>
                                                )}
                                            </div>
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-sm leading-tight">{tipo.name}</CardTitle>
                                                <CardDescription className="text-xs line-clamp-2 mt-1">{tipo.description}</CardDescription>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {step === 3 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Passo 3: Dimensões e Especificações</CardTitle>
                                <CardDescription>Defina L, H e a linha de alumínio (Suprema/Gold).</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium border-b pb-2">Dimensões do Vão</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Largura (L) mm *</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 1500"
                                                    className="h-14 text-2xl"
                                                    value={wizardData.width}
                                                    onChange={e => setWizardData(d => ({ ...d, width: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Altura (H) mm *</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 1200"
                                                    className="h-14 text-2xl"
                                                    value={wizardData.height}
                                                    onChange={e => setWizardData(d => ({ ...d, height: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium border-b pb-2">Perfis e Vidros (Opcional)</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Acabamento do Alumínio</Label>
                                                <Select value={wizardData.profileColor} onValueChange={v => setWizardData(d => ({ ...d, profileColor: v }))}>
                                                    <SelectTrigger className="h-10 text-md"><SelectValue placeholder="Ex: Branco Brilhante RAL9003" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Branco">Branco</SelectItem>
                                                        <SelectItem value="Preto Fosco">Preto Fosco</SelectItem>
                                                        <SelectItem value="Bronze">Bronze</SelectItem>
                                                        <SelectItem value="Fosco">Fosco (Natural)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tipo de Vidro</Label>
                                                <Select value={wizardData.glassType} onValueChange={v => setWizardData(d => ({ ...d, glassType: v }))}>
                                                    <SelectTrigger className="h-10 text-md"><SelectValue placeholder="Selecione o Vidro" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Temperado Incolor">Temperado Incolor</SelectItem>
                                                        <SelectItem value="Temperado Fumê">Temperado Fumê</SelectItem>
                                                        <SelectItem value="Temperado Verde">Temperado Verde</SelectItem>
                                                        <SelectItem value="Comum Incolor">Comum Incolor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {step === 4 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Passo 4: Lista de Materiais e Custos</CardTitle>
                                <CardDescription>Revise os perfis, componentes, vidros e insira os custos de compra.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead>Consumo Estimado</TableHead>
                                            <TableHead>Custo Unitário (R$)</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                            const calcMats = calculateTypologyMaterials();
                                            const totalKg = calcMats?.reduce((acc, cur) => acc + (cur.totalWeight || 0), 0) || 0;
                                            const wM = parseFloat(wizardData.width || "0") / 1000;
                                            const hM = parseFloat(wizardData.height || "0") / 1000;
                                            const glassArea = wM * hM;

                                            const aluCost = totalKg * parseFloat(wizardData.aluminumPrice || "0");
                                            const glsCost = glassArea * parseFloat(wizardData.glassPrice || "0");
                                            const accCost = parseFloat(wizardData.accessoriesPrice || "0");
                                            const instCost = glassArea * parseFloat(wizardData.installationCostSqm || "0");
                                            const fabCost = totalKg * parseFloat(wizardData.fabricationCostKg || "0");

                                            const tipologia = typologies.find(t => t.id === wizardData.typologyId);

                                            return (
                                                <>
                                                    {tipologia?.accessories && (
                                                        <TableRow className="bg-muted/30">
                                                            <TableCell colSpan={4} className="text-sm">
                                                                <span className="font-semibold text-muted-foreground mr-2">Acessórios Necessários sugeridos pelo Sistema:</span>
                                                                {tipologia.accessories}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    <TableRow>
                                                        <TableCell className="font-medium">Perfis de Alumínio</TableCell>
                                                        <TableCell>{totalKg.toFixed(2)} kg</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span>R$</span>
                                                                <Input
                                                                    type="number" className="w-24 h-9"
                                                                    value={wizardData.aluminumPrice}
                                                                    onChange={e => setWizardData(d => ({ ...d, aluminumPrice: e.target.value }))}
                                                                />
                                                                <span className="text-sm text-muted-foreground">/ kg</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">R$ {aluCost.toFixed(2)}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell className="font-medium">Vidros</TableCell>
                                                        <TableCell>{glassArea.toFixed(2)} m²</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span>R$</span>
                                                                <Input
                                                                    type="number" className="w-24 h-9"
                                                                    value={wizardData.glassPrice}
                                                                    onChange={e => setWizardData(d => ({ ...d, glassPrice: e.target.value }))}
                                                                />
                                                                <span className="text-sm text-muted-foreground">/ m²</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">R$ {glsCost.toFixed(2)}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell className="font-medium">Componentes & Acessórios</TableCell>
                                                        <TableCell>1 Kit</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span>R$</span>
                                                                <Input
                                                                    type="number" className="w-24 h-9"
                                                                    value={wizardData.accessoriesPrice}
                                                                    onChange={e => setWizardData(d => ({ ...d, accessoriesPrice: e.target.value }))}
                                                                />
                                                                <span className="text-sm text-muted-foreground">/ kit</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">R$ {accCost.toFixed(2)}</TableCell>
                                                    </TableRow>

                                                    {/* Custos de Mão de Obra */}
                                                    <TableRow>
                                                        <TableCell className="font-medium">Mão de Obra: Instalação</TableCell>
                                                        <TableCell>{glassArea.toFixed(2)} m²</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span>R$</span>
                                                                <Input 
                                                                    type="number" className="w-24 h-9" 
                                                                    value={wizardData.installationCostSqm} 
                                                                    onChange={e => setWizardData(d => ({...d, installationCostSqm: e.target.value}))}
                                                                />
                                                                <span className="text-sm text-muted-foreground">/ m²</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">R$ {instCost.toFixed(2)}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell className="font-medium">Mão de Obra: Fabricação</TableCell>
                                                        <TableCell>{totalKg.toFixed(2)} kg</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span>R$</span>
                                                                <Input 
                                                                    type="number" className="w-24 h-9" 
                                                                    value={wizardData.fabricationCostKg} 
                                                                    onChange={e => setWizardData(d => ({...d, fabricationCostKg: e.target.value}))}
                                                                />
                                                                <span className="text-sm text-muted-foreground">/ kg</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">R$ {fabCost.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                    
                                                    <TableRow className="bg-muted/50">
                                                        <TableCell colSpan={3} className="text-right font-bold text-lg">Custo Total Previsto:</TableCell>
                                                        <TableCell className="text-right font-bold text-lg text-primary">R$ {(aluCost + glsCost + accCost + instCost + fabCost).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                </>
                                            );
                                        })()}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {step === 5 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Passo 5: Resumo e Salvar</CardTitle>
                                <CardDescription>Revise o total com a margem de lucro e finalize o orçamento.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {(() => {
                                    const calcMats = calculateTypologyMaterials();
                                    const totalKg = calcMats?.reduce((acc, cur) => acc + (cur.totalWeight || 0), 0) || 0;
                                    const wM = parseFloat(wizardData.width || "0") / 1000;
                                    const hM = parseFloat(wizardData.height || "0") / 1000;
                                    const glassArea = wM * hM;

                                    const aluCost = totalKg * parseFloat(wizardData.aluminumPrice || "0");
                                    const glsCost = glassArea * parseFloat(wizardData.glassPrice || "0");
                                    const accCost = parseFloat(wizardData.accessoriesPrice || "0");
                                    const instCost = glassArea * parseFloat(wizardData.installationCostSqm || "0");
                                    const fabCost = totalKg * parseFloat(wizardData.fabricationCostKg || "0");
                                    const custoTotal = aluCost + glsCost + accCost + instCost + fabCost;

                                    const lucro = parseFloat(wizardData.profitMargin || "0");
                                    const precoVenda = custoTotal / (1 - (lucro / 100));
                                    const client = clients.find(c => c.id === wizardData.clientId);
                                    const tipologia = typologies.find(t => t.id === wizardData.typologyId);

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <h3 className="text-lg font-medium border-b pb-2">Resumo da Proposta</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Cliente:</span>
                                                        <span className="font-medium text-right">{client?.name}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Projeto/Local:</span>
                                                        <span className="font-medium text-right">{wizardData.projectName}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Tipologia:</span>
                                                        <span className="font-medium text-right">{tipologia?.name}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Dimensões:</span>
                                                        <span className="font-medium text-right">{wizardData.width}mm x {wizardData.height}mm</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Custo de Materiais Presumido:</span>
                                                        <span className="font-medium text-right text-destructive">R$ {custoTotal.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-6 bg-primary/5 p-6 rounded-lg border border-primary/20">
                                                <h3 className="text-lg font-medium text-primary border-b border-primary/20 pb-2">Formação de Preço</h3>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label>Margem de Lucro Bruta (%)</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                className="h-12 text-lg w-32"
                                                                value={wizardData.profitMargin}
                                                                onChange={e => setWizardData(d => ({ ...d, profitMargin: e.target.value }))}
                                                            />
                                                            <span className="text-muted-foreground">%</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">Markup Divisor aplicado sobre os Custos.</p>
                                                    </div>
                                                    <div className="pt-4 border-t border-primary/20 flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm">
                                                        <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preço de Venda Sugerido</span>
                                                        <span className="text-4xl font-bold text-emerald-600 mt-2">R$ {(isNaN(precoVenda) || !isFinite(precoVenda)) ? "0.00" : precoVenda.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-4 bg-white border-t flex justify-between items-center px-8">
                <Button variant="outline" onClick={() => {
                    if (step === 1) setLocation('/orcamentos');
                    else prevStep();
                }}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {step === 1 ? 'Cancelar Orçamento' : 'Voltar'}
                </Button>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setLocation('/orcamentos')}>
                        Salvar Rascunho
                    </Button>
                    <Button
                        disabled={
                            createQuoteMutation.isPending ||
                            (step === 1 && (!wizardData.clientId || !wizardData.projectName)) ||
                            (step === 2 && !wizardData.typologyId) ||
                            (step === 3 && (!wizardData.width || !wizardData.height))
                        }
                        onClick={() => {
                            if (step === totalSteps) {
                                createQuoteMutation.mutate();
                            } else {
                                nextStep();
                            }
                        }}
                    >
                        {createQuoteMutation.isPending ? 'Salvando...' : step === totalSteps ? 'Finalizar e Gerar Orçamento' : 'Próximo Passo'}
                        {step !== totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
