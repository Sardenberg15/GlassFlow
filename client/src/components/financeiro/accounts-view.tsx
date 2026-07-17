import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, MoreHorizontal, Pencil, Scissors, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import type { Bill, Project, Client, Category } from "@shared/schema";

interface AccountsViewProps {
    bills: Bill[];
    onMarkPaid: (id: string) => void;
    onEdit?: (bill: Bill) => void;
    onSplit?: (bill: Bill) => void;
    onDelete?: (bill: Bill) => void;
    compact?: boolean;
    projects: Project[];
    clients: Client[];
    categories?: Category[];
}

export function AccountsView({ bills, onMarkPaid, onEdit, onSplit, onDelete, compact = false, projects = [], clients = [], categories = [] }: AccountsViewProps) {

    const safeFormat = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
        } catch (e) {
            return "-";
        }
    };

    const isBillOverdue = (dateStr: string) => {
        if (!dateStr) return false;
        try {
            return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr));
        } catch { return false; }
    }

    const isBillPending = (dateStr: string) => {
        if (!dateStr) return false;
        try {
            return !isPast(parseISO(dateStr)) || isToday(parseISO(dateStr));
        } catch { return false }
    }

    const getProjectInfo = (projectId?: string | null) => {
        if (!projectId) return null;
        const project = projects.find(p => p.id === projectId);
        if (!project) return null;
        const client = clients.find(c => c.id === project.clientId);
        return { project, client };
    };

    const overdue = bills.filter(b => b.status !== 'pago' && isBillOverdue(b.dueDate));
    const pending = bills.filter(b => b.status !== 'pago' && isBillPending(b.dueDate));
    const paid = bills.filter(b => b.status === 'pago');

    // Card with ABSOLUTE positioned actions - they will NEVER move
    const BillCard = ({ bill }: { bill: Bill }) => {
        const info = getProjectInfo(bill.projectId);
        const categoryColor = bill.categoryId ? categories?.find((c: any) => c.id === bill.categoryId)?.color || "#94a3b8" : "#94a3b8";
        const categoryName = bill.categoryId ? categories?.find((c: any) => c.id === bill.categoryId)?.name || "Categoria" : "";

        return (
            <div className="relative p-4 pr-20 border border-gray-100 rounded-xl bg-white hover:shadow-md transition-all duration-200 mb-3 shadow-sm group">
                {/* Status bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${bill.status === 'pago' ? 'bg-emerald-500' :
                    isBillOverdue(bill.dueDate) ? 'bg-rose-500' : 'bg-amber-400'
                    }`} />

                {/* Content */}
                <div className="space-y-2 pl-1">
                    <div>
                        <p className="font-semibold text-gray-800 leading-tight pr-2 line-clamp-2" title={bill.description}>
                            {bill.description}
                        </p>
                        {info && (
                            <Link href={`/projetos/${info.project.id}`} className="text-xs text-primary hover:underline block truncate mt-1">
                                {info.client?.name} • {info.project.name}
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-gray-100">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {safeFormat(bill.dueDate)}
                        </span>

                        {bill.categoryId && (
                            <div
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border"
                                style={{
                                    backgroundColor: `${categoryColor}15`,
                                    borderColor: `${categoryColor}30`,
                                    color: categoryColor
                                }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: categoryColor }} />
                                <span className="truncate max-w-[80px]">{categoryName}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-50">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bill.type === 'receber' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {bill.type === 'receber' ? 'Receber' : 'Pagar'}
                        </span>
                        <span className={`font-bold text-sm tracking-tight ${bill.type === 'receber' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(bill.value))}
                        </span>
                    </div>
                </div>

                {/* ABSOLUTELY POSITIONED ACTIONS - ANCHORED TO TOP RIGHT */}
                {bill.status !== 'pago' && (
                    <div className="absolute top-2 right-2 flex flex-col items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"
                            onClick={() => onMarkPaid(bill.id)}
                            title="Marcar como Pago"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-gray-100">
                                {onSplit && bill.type === 'receber' && (
                                    <DropdownMenuItem onClick={() => onSplit(bill)} className="text-gray-600">
                                        <Scissors className="mr-2 w-4 h-4 text-gray-400" /> Parcelar
                                    </DropdownMenuItem>
                                )}
                                {onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(bill)} className="text-gray-600">
                                        <Pencil className="mr-2 w-4 h-4 text-gray-400" /> Editar
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <DropdownMenuItem onClick={() => onDelete(bill)} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                                        <Trash2 className="mr-2 w-4 h-4" /> Excluir
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>

            {/* Coluna Atrasadas */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Atrasadas</h3>
                    <Badge variant="destructive" className="ml-auto">{overdue.length}</Badge>
                </div>
                <div className="min-h-[80px] bg-red-50/50 p-2 rounded-lg">
                    {overdue.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-6">Nenhuma atrasada!</p>
                    ) : overdue.map(b => <BillCard key={b.id} bill={b} />)}
                </div>
            </div>

            {/* Coluna A Vencer */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800">A Vencer</h3>
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">{pending.length}</Badge>
                </div>
                <div className="min-h-[80px] bg-amber-50/50 p-2 rounded-lg">
                    {pending.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-6">Nada pendente.</p>
                    ) : pending.map(b => <BillCard key={b.id} bill={b} />)}
                </div>
            </div>

            {/* Coluna Pagas */}
            {!compact && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-green-200">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Concluídas</h3>
                        <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">{paid.length}</Badge>
                    </div>
                    <div className="min-h-[80px] bg-green-50/50 p-2 rounded-lg opacity-80">
                        {paid.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-6">Nenhuma paga.</p>
                        ) : paid.slice(0, 10).map(b => <BillCard key={b.id} bill={b} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
