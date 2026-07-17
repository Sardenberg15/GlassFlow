import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, PlusCircle, XCircle, Zap, Landmark, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const formatCurrency = (value: number | string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numValue || 0);
};

const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
};

export function BankReconciliation({ transactions, categories, projects }: any) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

    // Match / Create State
    const [actionLine, setActionLine] = useState<any>(null);
    const [openMatch, setOpenMatch] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [selectedTxMatch, setSelectedTxMatch] = useState<string>("");
    const [createCategoryId, setCreateCategoryId] = useState<string>("none");
    const [createProjectId, setCreateProjectId] = useState<string>("none");

    const { data: statements = [] } = useQuery<any[]>({
        queryKey: ["/api/bank-statements"],
    });

    const { data: lines = [] } = useQuery<any[]>({
        queryKey: [`/api/bank-statements/${selectedStatementId}/lines`],
        enabled: !!selectedStatementId,
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const content = await file.text();
            const res = await apiRequest("POST", "/api/bank-statements/upload", {
                fileName: file.name,
                content,
            });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/bank-statements"] });
            setSelectedStatementId(data.id);
            toast({ title: "Extrato importado com sucesso!" });
        },
        onError: (err: any) => {
            toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
        },
        onSettled: () => setUploading(false)
    });

    const reconcileMutation = useMutation({
        mutationFn: async (payload: any) => {
            await apiRequest("POST", `/api/bank-statements/${selectedStatementId}/reconcile`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/bank-statements/${selectedStatementId}/lines`] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            setOpenMatch(false);
            setOpenCreate(false);
            toast({ title: "Linha conciliada com sucesso!" });
        }
    });

    const ignoreMutation = useMutation({
        mutationFn: async (lineId: string) => {
            await apiRequest("POST", `/api/bank-statements/${selectedStatementId}/ignore`, { lineId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/bank-statements/${selectedStatementId}/lines`] });
            toast({ title: "Linha ignorada." });
        }
    });

    const autoReconcileMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", `/api/bank-statements/${selectedStatementId}/auto-reconcile`, {});
            return res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: [`/api/bank-statements/${selectedStatementId}/lines`] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            toast({ 
                title: `Auto-conciliação: ${data.matched} vinculadas`,
                description: `${data.remaining} linhas restantes de ${data.total} totais.`
            });
        },
        onError: () => {
            toast({ title: "Erro na auto-conciliação", variant: "destructive" });
        }
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        uploadMutation.mutate(file);
        e.target.value = ''; // reset
    };

    const handleMatch = (line: any) => {
        setActionLine(line);
        setSelectedTxMatch("");
        setOpenMatch(true);
    };

    const handleCreateNew = (line: any) => {
        setActionLine(line);
        setCreateCategoryId("none");
        setCreateProjectId("none");
        setOpenCreate(true);
    };

    // Find exact match suggestions initially (same amount & within 3 days)
    const getSuggestions = (line: any) => {
        if (!line) return [];
        const lineAmtStr = Math.abs(parseFloat(line.amount)).toFixed(2);
        const lineTime = new Date(line.date).getTime();
        return transactions.filter((t: any) => {
            if (t.reconciled === "true") return false; // Already matched
            const tAmtStr = Math.abs(parseFloat(t.value)).toFixed(2);
            if (tAmtStr !== lineAmtStr) return false;
            const tTime = new Date(t.date).getTime();
            const diffDays = Math.abs(tTime - lineTime) / (1000 * 3600 * 24);
            return diffDays <= 7;
        });
    };

    const unmatchedLines = lines.filter((l: any) => l.status === "unmatched");
    const matchedLines = lines.filter((l: any) => l.status === "matched");

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="flex-1 w-full max-w-sm space-y-2">
                    <Label>Selecione um Arquivo de Extrato (OFX/CSV)</Label>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept=".ofx,.qfo,.csv"
                            id="ofx-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label htmlFor="ofx-upload" className="flex-1">
                            <Button type="button" variant="outline" className="w-full justify-start" disabled={uploading} onClick={() => document.getElementById('ofx-upload')?.click()}>
                                <Upload className="h-4 w-4 mr-2" />
                                {uploading ? "Importando..." : "Importar Extrato"}
                            </Button>
                        </label>
                    </div>
                </div>

                {statements.length > 0 && (
                    <div className="flex-1 w-full max-w-sm space-y-2">
                        <Label>Extratos Anteriores</Label>
                        <Select value={selectedStatementId || ""} onValueChange={setSelectedStatementId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um extrato..." />
                            </SelectTrigger>
                            <SelectContent>
                                {statements.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.fileName} ({formatDate(s.date.split('T')[0])})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {selectedStatementId && (
                <>
                {/* Summary */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        {unmatchedLines.length} pendente{unmatchedLines.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                        {matchedLines.length} conciliada{matchedLines.length !== 1 ? 's' : ''}
                    </Badge>
                    {lines.filter((l: any) => l.status === "ignored").length > 0 && (
                        <Badge variant="outline" className="text-xs">
                            {lines.filter((l: any) => l.status === "ignored").length} ignorada(s)
                        </Badge>
                    )}
                    <div className="flex-1" />
                    {unmatchedLines.length > 0 && (
                        <Button
                            onClick={() => autoReconcileMutation.mutate()}
                            disabled={autoReconcileMutation.isPending}
                            className="gap-2"
                            size="sm"
                        >
                            <Zap className="h-4 w-4" />
                            {autoReconcileMutation.isPending ? "Conciliando..." : "Auto-Conciliar"}
                        </Button>
                    )}
                </div>

                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Linhas para Conciliar ({unmatchedLines.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lines.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">Nenhuma linha encontrada neste extrato.</div>
                        ) : (
                            <div className="rounded-md border max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950 z-10">
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Descrição (Banco)</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unmatchedLines.map((line: any) => {
                                            const suggestions = getSuggestions(line);
                                            const isCredit = line.type === "CREDIT";

                                            return (
                                                <TableRow key={line.id}>
                                                    <TableCell>{formatDate(line.date)}</TableCell>
                                                    <TableCell className="font-medium text-sm">
                                                        {line.description}
                                                        {suggestions.length > 0 && (
                                                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-200">
                                                                {suggestions.length} sugestões
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                                        {isCredit ? '+' : '-'}{formatCurrency(line.amount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-none">
                                                            Pendente
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <Button size="sm" variant="outline" className="mr-2" onClick={() => handleMatch(line)}>
                                                            <CheckCircle2 className="h-4 w-4 mr-1 text-primary" /> Lincar
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="mr-2" onClick={() => handleCreateNew(line)}>
                                                            <PlusCircle className="h-4 w-4 mr-1 text-green-600" /> Nova
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => ignoreMutation.mutate(line.id)}>
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {/* Show Matched at the bottom faintly */}
                                        {matchedLines.length > 0 && (
                                            <TableRow className="bg-gray-50 dark:bg-zinc-900/50">
                                                <TableCell colSpan={5} className="text-xs font-semibold text-center text-muted-foreground py-2">
                                                    LINHAS JÁ CONCILIADAS ({matchedLines.length})
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {matchedLines.map((line: any) => (
                                            <TableRow key={line.id} className="opacity-50">
                                                <TableCell>{formatDate(line.date)}</TableCell>
                                                <TableCell>{line.description}</TableCell>
                                                <TableCell className={line.type === "CREDIT" ? 'text-green-600' : 'text-red-600'}>
                                                    {line.type === "CREDIT" ? '+' : '-'}{formatCurrency(line.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-green-100 text-green-700 border-none">Conciliado</Badge>
                                                </TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                </>
            )}

            {/* Match Dialog */}
            <Dialog open={openMatch} onOpenChange={setOpenMatch}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vincular com Transação Existente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-md flex justify-between items-center text-sm">
                            <span>{actionLine?.description}</span>
                            <span className="font-bold">{formatCurrency(actionLine?.amount || 0)}</span>
                        </div>

                        <div className="space-y-2">
                            <Label>Transações do Sistema</Label>
                            <Select value={selectedTxMatch} onValueChange={setSelectedTxMatch}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma transação..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {transactions.filter((t: any) => t.reconciled !== "true").map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {formatDate(t.date)} - {t.description} ({formatCurrency(t.value)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenMatch(false)}>Cancelar</Button>
                            <Button
                                type="button"
                                disabled={!selectedTxMatch || reconcileMutation.isPending}
                                onClick={() => reconcileMutation.mutate({ lineId: actionLine?.id, transactionId: selectedTxMatch })}
                            >
                                Confirmar Vínculo
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create New Dialog */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Transação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-md flex justify-between items-center text-sm">
                            <span>{actionLine?.description}</span>
                            <span className="font-bold">{formatCurrency(actionLine?.amount || 0)}</span>
                        </div>

                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={createCategoryId} onValueChange={setCreateCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Opcional..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem categoria</SelectItem>
                                    {categories.filter((c: any) => c.type === (actionLine?.type === "CREDIT" ? "receita" : "despesa")).map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                                                {c.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Projeto</Label>
                            <Select value={createProjectId} onValueChange={setCreateProjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Opcional..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem projeto</SelectItem>
                                    {projects.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                            <Button
                                type="button"
                                disabled={reconcileMutation.isPending}
                                onClick={() => reconcileMutation.mutate({
                                    lineId: actionLine?.id,
                                    createTransaction: true,
                                    categoryId: createCategoryId === "none" ? null : createCategoryId,
                                    projectId: createProjectId === "none" ? null : createProjectId
                                })}
                            >
                                Criar e Vincular
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
