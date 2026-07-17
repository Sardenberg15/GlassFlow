
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, ArrowUpDown, Paperclip, Eye, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Transaction, Category, Project, Client } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionListProps {
    transactions: Transaction[];
    categories: Category[];
    projects: Project[];
    clients: Client[];
    onAttachFile: (t: Transaction) => void;
    onViewFiles: (t: Transaction) => void;
    getTransactionFiles: (id: string) => any[];
    onDelete?: (t: Transaction) => void;
}

export function TransactionList({ transactions, categories, projects = [], clients = [], onAttachFile, onViewFiles, getTransactionFiles, onDelete }: TransactionListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const getCategoryName = (id: string | null) => {
        if (!id) return "-";
        return categories.find(c => c.id === id)?.name || "-";
    };

    const getCategoryColor = (id: string | null) => {
        return categories.find(c => c.id === id)?.color || "#94a3b8";
    };

    const getProjectInfo = (projectId: string | null) => {
        if (!projectId) return null;
        const project = projects.find(p => p.id === projectId);
        if (!project) return null;
        const client = clients.find(c => c.id === project.clientId);
        return { project, client };
    };

    const filtered = transactions
        .filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getCategoryName(t.categoryId).toLowerCase().includes(searchTerm.toLowerCase());

            // Also search by project/client name if available
            const info = getProjectInfo(t.projectId);
            const matchesProject = info?.project.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClient = info?.client?.name.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch || matchesProject || matchesClient;
        })
        .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar transações, cliente ou projeto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-gray-50/50 border-gray-200 focus-visible:ring-1 focus-visible:ring-primary shadow-inner h-9"
                    />
                </div>
                <Button variant="outline" size="sm" className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm h-9">
                    <Download className="h-4 w-4 text-gray-500" /> Exportar CSV
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-b-gray-100">
                            <TableHead className="w-[120px] cursor-pointer hover:text-primary transition-colors font-medium text-xs text-muted-foreground uppercase tracking-wider" onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}>
                                <div className="flex items-center gap-1">
                                    Data
                                    <ArrowUpDown className="h-3 w-3" />
                                </div>
                            </TableHead>
                            <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Descrição / Origem</TableHead>
                            <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Centro de Custo</TableHead>
                            <TableHead className="text-right font-medium text-xs text-muted-foreground uppercase tracking-wider">Valor</TableHead>
                            <TableHead className="text-center w-[120px] font-medium text-xs text-muted-foreground uppercase tracking-wider">Tipo</TableHead>
                            <TableHead className="text-right w-[100px] font-medium text-xs text-muted-foreground uppercase tracking-wider">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="p-3 bg-gray-50 rounded-full">
                                            <Search className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p>Nenhuma transação encontrada.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((t) => {
                                const info = getProjectInfo(t.projectId);
                                return (
                                    <TableRow key={t.id} className="hover:bg-gray-50/50 transition-colors group border-b-gray-100">
                                        <TableCell className="font-medium text-gray-600 whitespace-nowrap align-middle py-4">
                                            {t.date ? format(new Date(t.date), "dd MMM, yyyy", { locale: ptBR }) : "-"}
                                        </TableCell>
                                        <TableCell className="align-middle py-4">
                                            <span className="font-medium text-gray-900 block">{t.description}</span>
                                            {info ? (
                                                <Link href={`/projetos/${info.project.id}`} className="text-[11px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 mt-1 transition-colors w-max">
                                                    <span className="truncate max-w-[280px] inline-block">{info.client?.name} • {info.project.name}</span>
                                                </Link>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 bg-gray-50 w-max px-1.5 py-0.5 rounded border border-gray-100">Lançamento Avulso</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-middle py-4">
                                            {t.categoryId ? (
                                                <div
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
                                                    style={{
                                                        backgroundColor: `${getCategoryColor(t.categoryId)}15`,
                                                        borderColor: `${getCategoryColor(t.categoryId)}30`,
                                                        color: getCategoryColor(t.categoryId)
                                                    }}
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: getCategoryColor(t.categoryId) }} />
                                                    {getCategoryName(t.categoryId)}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-gray-100 bg-gray-50 text-gray-500">Sem categoria</span>
                                            )}
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold tabular-nums tracking-tight align-middle py-4 ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'receita' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(String(t.value)))}
                                        </TableCell>
                                        <TableCell className="text-center align-middle py-4">
                                            <span className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border ${t.type === 'receita' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {t.type === 'receita' ? 'RECEITA' : 'DESPESA'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right align-middle py-4 space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => onAttachFile(t)}
                                                title="Anexar arquivo"
                                            >
                                                <Paperclip className="h-4 w-4" />
                                            </Button>
                                            {getTransactionFiles(t.id).length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 relative"
                                                    onClick={() => onViewFiles(t)}
                                                    title="Ver arquivos anexados"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                        {getTransactionFiles(t.id).length}
                                                    </span>
                                                </Button>
                                            )}
                                            {onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => {
                                                        if (confirm(`Excluir transação "${t.description}"?`)) {
                                                            onDelete(t);
                                                        }
                                                    }}
                                                    title="Excluir transação"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
