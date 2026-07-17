import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar as CalendarIcon, Filter, Upload, Paperclip, Eye, FileText, Download, Receipt, Trash2, TrendingUp, BarChart3 } from "lucide-react";
import { FinancialStats } from "@/components/financeiro/financial-stats";
import { TransactionList } from "@/components/financeiro/transaction-list";
import { AccountsView } from "@/components/financeiro/accounts-view";
import { FinancialCharts } from "@/components/financeiro/financial-charts";
import { CategoryManager } from "@/components/financeiro/category-manager";
import { BankReconciliation } from "@/components/financeiro/bank-reconciliation";
import { BankAccountsManager } from "@/components/financeiro/bank-accounts-manager";
import { CashFlow } from "@/components/financeiro/cash-flow";
import type { Bill, Transaction, Project, Category, Client } from "@shared/schema";
import { Link } from "wouter";
import { format, subMonths, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function FinanceiroV2() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [monthFilter, setMonthFilter] = useState<string>("__pending__");
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // New Bill State
    const [openNewBill, setOpenNewBill] = useState(false);
    const [newBillType, setNewBillType] = useState<"pagar" | "receber">("pagar");
    const [newBillProjectId, setNewBillProjectId] = useState<string>("none");
    const [newBillCategoryId, setNewBillCategoryId] = useState<string>("none");
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>("none");
    const [newBankAccountId, setNewBankAccountId] = useState<string>("none");
    const [newBillInstallments, setNewBillInstallments] = useState<number>(1);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [splittingBill, setSplittingBill] = useState<Bill | null>(null);
    const [installmentsCount, setInstallmentsCount] = useState<number>(2);
    const [firstDueDate, setFirstDueDate] = useState<string>("");

    // Files State
    const [openAttachFile, setOpenAttachFile] = useState(false);
    const [attachingTransaction, setAttachingTransaction] = useState<Transaction | null>(null);
    const [fileObservation, setFileObservation] = useState("");
    const [openViewFiles, setOpenViewFiles] = useState(false);
    const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
    const [previewingFile, setPreviewingFile] = useState<any | null>(null);

    // --- Data Fetching ---
    const { data: bills = [] } = useQuery<Bill[]>({ queryKey: ["/api/bills"] });
    const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
    const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
    const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
    const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
    const { data: bankAccounts = [] } = useQuery<any[]>({ queryKey: ["/api/bank-accounts"] });

    // Global transaction files (no projectId required anymore)
    const { data: transactionFiles = [] } = useQuery<any[]>({ queryKey: ["/api/transactions/files"] });

    // Auto-detect last month with transactions when data loads
    const effectiveMonthFilter = useMemo(() => {
        if (monthFilter !== "__pending__") return monthFilter;
        if (transactions.length === 0) return format(new Date(), "yyyy-MM");
        // Find the most recent month that has transactions
        const months = transactions
            .filter(t => t.date)
            .map(t => t.date!.substring(0, 7))
            .sort((a, b) => b.localeCompare(a));
        return months[0] || format(new Date(), "yyyy-MM");
    }, [monthFilter, transactions]);

    // Once we detect the real month, update the state so the Select shows correctly
    const resolvedMonthFilter = effectiveMonthFilter;

    // Compute saldo atual from bank accounts
    const saldoAtual = useMemo(() => {
        return bankAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
    }, [bankAccounts]);

    // --- Filtering Logic ---
    const globalFilteredTransactions = useMemo(() => {
        let result = [...transactions];
        if (projectFilter !== "all") result = result.filter(t => t.projectId === projectFilter);
        if (categoryFilter !== "all") result = result.filter(t => t.categoryId === categoryFilter);
        return result;
    }, [transactions, projectFilter, categoryFilter]);

    // Use resolvedMonthFilter everywhere instead of monthFilter

    const filteredData = useMemo(() => {
        const filteredTransactions = resolvedMonthFilter === "all"
            ? globalFilteredTransactions
            : globalFilteredTransactions.filter(t => t.date && t.date.startsWith(resolvedMonthFilter));
        let filteredBills = resolvedMonthFilter === "all"
            ? [...bills]
            : bills.filter(b => b.dueDate && b.dueDate.startsWith(resolvedMonthFilter));

        if (projectFilter !== "all") {
            filteredBills = filteredBills.filter(b => b.projectId === projectFilter);
        }
        if (categoryFilter !== "all") {
            filteredBills = filteredBills.filter(b => b.categoryId === categoryFilter);
        }

        return {
            transactions: filteredTransactions,
            bills: filteredBills
        };
    }, [globalFilteredTransactions, bills, resolvedMonthFilter, projectFilter, categoryFilter]);
    const stats = useMemo(() => {
        const totalReceitas = filteredData.transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + Number(t.value), 0);
        const totalDespesas = filteredData.transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + Number(t.value), 0);

        // Global Pending Receivables (Keep as global metric for now)
        const pendingReceivables = projects.reduce((acc, p) => {
            if (p.status === 'finalizado' || p.status === 'concluido' || p.status === 'aprovado') {
                const received = transactions.filter(t => t.projectId === p.id && t.type === 'receita').reduce((s, t) => s + Number(t.value), 0);
                const remaining = Math.max(0, Number(p.value) - received);
                return acc + remaining;
            }
            return acc;
        }, 0);

        return {
            receitas: totalReceitas,
            despesas: totalDespesas,
            lucro: totalReceitas - totalDespesas,
            pendingReceivables
        };
    }, [filteredData.transactions, projects, transactions]);

    // --- Actions ---
    const markPaidMutation = useMutation({
        mutationFn: async (billId: string) => {
            await apiRequest("PATCH", `/api/bills/${billId}`, { status: "pago" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
            toast({ title: "Conta marcada como paga!" });
        },
    });

    const createBillMutation = useMutation({
        mutationFn: async (payload: { description: string; value: string; dueDate: string; installments: number; type: string; projectId: string | null; categoryId: string | null; paymentMethod: string | null; bankAccountId: string | null }) => {
            const today = new Date().toISOString().split("T")[0];
            const totalValue = parseFloat(payload.value) || 0;
            const installments = Math.max(1, payload.installments);
            const installmentValue = (totalValue / installments).toFixed(2);

            for (let i = 0; i < installments; i++) {
                const baseDate = new Date(payload.dueDate + "T00:00:00");
                baseDate.setMonth(baseDate.getMonth() + i);
                const dueDateStr = baseDate.toISOString().split("T")[0];

                const desc = installments > 1
                    ? `${payload.description} (Parc. ${String(i + 1).padStart(2, "0")}/${String(installments).padStart(2, "0")})`
                    : payload.description;

                const body = {
                    type: payload.type,
                    description: desc,
                    value: installmentValue,
                    dueDate: dueDateStr,
                    status: "pendente",
                    projectId: payload.projectId,
                    categoryId: payload.categoryId,
                    paymentMethod: payload.paymentMethod,
                    bankAccountId: payload.bankAccountId,
                    date: today,
                };
                await apiRequest("POST", "/api/bills", body);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            setOpenNewBill(false);
            setNewBillInstallments(1);
            toast({ title: "Conta(s) criada(s) com sucesso!" });
            resetForm();
        },
    });

    const updateBillMutation = useMutation({
        mutationFn: async (payload: Partial<Bill> & { id: string }) => {
            const { id, ...data } = payload;
            await apiRequest("PATCH", `/api/bills/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            setOpenNewBill(false);
            toast({ title: "Conta atualizada com sucesso!" });
        },
    });


    const splitBillMutation = useMutation({
        mutationFn: async ({ originalBill, count, firstDate }: { originalBill: Bill, count: number, firstDate: string }) => {
            // 1. Delete original bill
            await apiRequest("DELETE", `/api/bills/${originalBill.id}`);

            // 2. Create N new bills
            const totalValue = Number(originalBill.value);
            const installmentValue = Math.floor((totalValue / count) * 100) / 100;
            const remainder = Math.round((totalValue - (installmentValue * count)) * 100) / 100;

            for (let i = 0; i < count; i++) {
                let value = installmentValue;
                if (i === 0) value += remainder; // Add remainder to first installment

                const date = addMonths(parseISO(firstDate), i);
                const dueDate = format(date, "yyyy-MM-dd");

                const payload = {
                    type: originalBill.type,
                    description: `${originalBill.description} (${i + 1}/${count})`,
                    value: value.toFixed(2),
                    dueDate: dueDate,
                    status: "pendente",
                    projectId: originalBill.projectId,
                    categoryId: originalBill.categoryId,
                    date: new Date().toISOString().split("T")[0],
                };

                await apiRequest("POST", "/api/bills", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            setSplittingBill(null);
            toast({ title: "Conta parcelada com sucesso!" });
        },
        onError: (e) => {
            toast({ title: "Erro ao parcelar conta", variant: "destructive" });
        }
    });

    const deleteBillMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/bills/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            toast({ title: "Conta excluída com sucesso!" });
        },
    });

    const deleteTransactionMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/transactions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            toast({ title: "Transação excluída com sucesso!" });
        },
        onError: () => {
            toast({ title: "Erro ao excluir transação", variant: "destructive" });
        },
    });

    // --- File Upload Logic ---
    const handleAttachFileMutation = useMutation({
        mutationFn: async (payload: { transactionId: string; fileName: string; fileType: string; fileSize: number; objectPath: string; observations?: string }) => {
            const response = await apiRequest("POST", "/api/transactions/files", payload);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/transactions/files"] });
            toast({ title: "Arquivo anexado com sucesso!" });
            setOpenAttachFile(false);
            setAttachingTransaction(null);
            setFileObservation("");
        },
        onError: () => {
            toast({ title: "Erro ao anexar arquivo", variant: "destructive" });
        }
    });

    const handleGetUploadParameters = async () => {
        const response = await apiRequest("POST", "/api/objects/upload", {});
        const data = await response.json();
        return {
            method: "PUT",
            url: data.uploadURL,
            publicUrl: data.uploadURL,
        };
    };

    const handleUploadComplete = (result: any) => {
        if (result.successful?.length > 0) {
            const file = result.successful[0];
            if (file.name && file.uploadURL && attachingTransaction) {
                const url = new URL(file.uploadURL);
                const pathname = url.pathname;

                handleAttachFileMutation.mutate({
                    transactionId: attachingTransaction.id,
                    fileName: file.name,
                    fileType: file.type || 'application/octet-stream',
                    fileSize: file.size || 0,
                    objectPath: pathname,
                    observations: fileObservation
                });
            }
        }
    };

    // --- Helpers ---
    const getTransactionFiles = (transactionId: string) => {
        return transactionFiles.filter((file: any) => file.transactionId === transactionId);
    };

    // Build absolute server URL for file paths to bypass SPA router
    const getFileUrl = (objectPath: string) => {
        if (!objectPath) return '';
        // If already an absolute URL, return as-is
        if (objectPath.startsWith('http')) return objectPath;
        
        // Normalize Supabase-style paths stored in DB
        // e.g. /storage/v1/object/upload/sign/uploads/<uuid> -> /objects/uploads/<uuid>
        let normalizedPath = objectPath;
        const supabaseMatch = objectPath.match(/\/storage\/v1\/object\/(?:upload\/sign|public)\/uploads\/([^/?]+)/);
        if (supabaseMatch) {
            normalizedPath = `/objects/uploads/${supabaseMatch[1]}`;
        } else if (objectPath.startsWith('/storage/')) {
            // Generic fallback for other /storage/ paths - extract last UUID segment
            const parts = objectPath.split('/');
            const uuid = parts[parts.length - 1];
            if (uuid) normalizedPath = `/objects/uploads/${uuid}`;
        }
        
        // Build full server URL so the browser fetches from Express, not the SPA router
        return `${window.location.origin}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (date: Date) => {
        return format(date, "dd/MM/yyyy", { locale: ptBR });
    };

    const resetForm = () => {
        setNewBillType("pagar");
        setNewBillProjectId("none");
        setNewBillCategoryId("none");
        setNewPaymentMethod("none");
        setNewBankAccountId("none");
        setNewBillInstallments(1);
        setEditingBill(null);
    };

    const handleEdit = (bill: Bill) => {
        setEditingBill(bill);
        setNewBillType(bill.type as "pagar" | "receber");
        setNewBillProjectId(bill.projectId || "none");
        setNewBillCategoryId(bill.categoryId || "none");
        setNewPaymentMethod((bill as any).paymentMethod || "none");
        setNewBankAccountId((bill as any).bankAccountId || "none");
        setOpenNewBill(true);
    };

    const handleSplit = (bill: Bill) => {
        setSplittingBill(bill);
        setInstallmentsCount(2);
        setFirstDueDate(bill.dueDate);
    };

    const handleDelete = (bill: Bill) => {
        if (confirm("Tem certeza que deseja excluir esta conta?")) {
            deleteBillMutation.mutate(bill.id);
        }
    };

    // Calculate Installments Preview
    const installmentsPreview = useMemo(() => {
        if (!splittingBill || !firstDueDate) return [];

        const totalValue = Number(splittingBill.value);
        const installmentValue = Math.floor((totalValue / installmentsCount) * 100) / 100;
        const remainder = Math.round((totalValue - (installmentValue * installmentsCount)) * 100) / 100;

        const previews = [];
        for (let i = 0; i < installmentsCount; i++) {
            let value = installmentValue;
            if (i === 0) value += remainder;

            const date = addMonths(parseISO(firstDueDate), i);
            previews.push({
                index: i + 1,
                date: format(date, "dd/MM/yyyy"),
                value: value.toFixed(2)
            });
        }
        return previews;
    }, [splittingBill, installmentsCount, firstDueDate]);

    // Generate Month Options (12 months ahead, 12 months back + "Todos")
    const months = useMemo(() => {
        const list: { value: string; label: string }[] = [
            { value: "all", label: "Todos os meses" }
        ];
        for (let i = -12; i < 13; i++) {
            const d = subMonths(new Date(), i);
            const monthName = format(d, "MMMM yyyy", { locale: ptBR });
            list.push({
                value: format(d, "yyyy-MM"),
                label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
            });
        }
        // Sort chrono ("all" first, then by date descending)
        return list.sort((a, b) => {
            if (a.value === "all") return -1;
            if (b.value === "all") return 1;
            return b.value.localeCompare(a.value);
        });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/30 p-8 space-y-8 animate-in fade-in duration-500" >

            {/* Header */}
            <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1>Financeiro</h1>
                    <p>Gestão inteligente do fluxo de caixa e lançamentos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dre">
                        <Button variant="outline" size="sm" className="gap-2">
                            <BarChart3 className="h-4 w-4" /> DRE
                        </Button>
                    </Link>
                    <CategoryManager />
                    <Button className="shadow-sm" onClick={() => setOpenNewBill(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
                    </Button>
                </div>
            </div>

            {/* Filter Section */}
            {/* Filter Section */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm z-20 relative overflow-x-auto hide-scrollbar">

                <div className="flex items-center justify-center bg-gray-50/80 text-gray-500 p-2 rounded-lg border border-gray-100 h-9 px-3">
                    <Filter className="h-4 w-4 mr-1.5 text-primary/80" />
                    <span className="text-xs font-semibold tracking-tight">Filtros</span>
                </div>

                <div className="flex flex-1 items-center gap-2 min-w-max">
                    <div className="flex items-center bg-gray-50/50 hover:bg-gray-100/50 transition-colors rounded-lg border border-gray-100 pl-3 pr-1 py-1 h-9">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mr-1 select-none">Data</span>
                        <Select value={resolvedMonthFilter} onValueChange={setMonthFilter}>
                            <SelectTrigger className="h-7 border-0 bg-transparent shadow-none hover:bg-white data-[state=open]:bg-white text-sm font-semibold text-gray-700 w-auto px-2 gap-1.5 focus:ring-0">
                                <CalendarIcon className="w-3.5 h-3.5 text-primary/70" />
                                <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value} className="text-[13px] font-medium py-1.5">
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center bg-gray-50/50 hover:bg-gray-100/50 transition-colors rounded-lg border border-gray-100 pl-3 pr-1 py-1 h-9">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mr-1 select-none">Projeto</span>
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                            <SelectTrigger className="h-7 border-0 bg-transparent shadow-none hover:bg-white data-[state=open]:bg-white text-sm font-semibold text-gray-700 w-auto px-2 gap-1.5 focus:ring-0 max-w-[200px]">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px] w-[260px]">
                                <SelectItem value="all" className="text-[13px] font-semibold text-emerald-600 py-1.5">Todos os Projetos</SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-[13px] font-medium py-1.5 truncate">
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center bg-gray-50/50 hover:bg-gray-100/50 transition-colors rounded-lg border border-gray-100 pl-3 pr-1 py-1 h-9">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mr-1 select-none">Custo</span>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-7 border-0 bg-transparent shadow-none hover:bg-white data-[state=open]:bg-white text-sm font-semibold text-gray-700 w-auto px-2 gap-1.5 focus:ring-0 max-w-[200px]">
                                <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                                <SelectItem value="all" className="text-[13px] font-semibold text-emerald-600 py-1.5">Todas as Categorias</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-[13px] font-medium py-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* KPI Stats */}
            < FinancialStats
                receitas={stats.receitas}
                despesas={stats.despesas}
                lucro={stats.lucro}
                pendingReceivables={stats.pendingReceivables}
                saldoAtual={saldoAtual}
            />

            {/* Main Content Tabs */}
            < Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6" >
                <div className="flex items-center justify-between border-b pb-px">
                    <TabsList className="bg-transparent h-12 p-0 -mb-px gap-6">
                        <TabsTrigger
                            value="overview"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-1 py-3 text-base font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                            Visão Geral
                        </TabsTrigger>
                        <TabsTrigger
                            value="cashflow"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-1 py-3 text-base font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                            Fluxo de Caixa
                        </TabsTrigger>
                        <TabsTrigger
                            value="transactions"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-1 py-3 text-base font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                            Lançamentos
                        </TabsTrigger>
                        <TabsTrigger
                            value="accounts"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-1 py-3 text-base font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                            Contas a Pagar/Receber
                        </TabsTrigger>
                        <TabsTrigger
                            value="bank-accounts"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-1 py-3 text-base font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                            Contas Bancárias
                        </TabsTrigger>
                        <TabsTrigger
                            value="reconciliation"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-1 py-3 text-base font-medium text-muted-foreground transition-all hover:text-foreground"
                        >
                            Conciliação
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6 outline-none">
                    <FinancialCharts
                        transactions={globalFilteredTransactions}
                        categories={categories}
                        monthFilter={resolvedMonthFilter}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-gray-800">Últimos Lançamentos</h3>
                                <Button variant="ghost" onClick={() => setActiveTab("transactions")}>Ver todos</Button>
                            </div>
                            <TransactionList
                                transactions={filteredData.transactions.slice(0, 5)}
                                categories={categories}
                                projects={projects}
                                clients={clients}
                                onAttachFile={(t) => {
                                    setAttachingTransaction(t);
                                    setOpenAttachFile(true);
                                }}
                                onViewFiles={(t) => {
                                    setViewingTransaction(t);
                                    setOpenViewFiles(true);
                                }}
                                getTransactionFiles={getTransactionFiles}
                                onDelete={(t) => deleteTransactionMutation.mutate(t.id)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-gray-800">Próximos Vencimentos</h3>
                                <Button variant="ghost" onClick={() => setActiveTab("accounts")}>Gerenciar contas</Button>
                            </div>
                            <AccountsView bills={filteredData.bills} projects={projects} clients={clients} categories={categories} onMarkPaid={(id) => markPaidMutation.mutate(id)} onEdit={handleEdit} onSplit={handleSplit} onDelete={handleDelete} compact={true} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="cashflow" className="outline-none">
                    <CashFlow bills={bills} transactions={transactions} bankAccounts={bankAccounts} />
                </TabsContent>

                <TabsContent value="transactions" className="outline-none">
                    {/* Show active filter info in tab content as well */}
                    <div className="mb-4 text-sm text-muted-foreground">
                        Exibindo lançamentos de <span className="font-medium text-gray-900">{resolvedMonthFilter === "all" ? "todos os meses" : format(parseISO(resolvedMonthFilter + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}</span>
                    </div>
                    <TransactionList
                        transactions={filteredData.transactions}
                        categories={categories}
                        projects={projects}
                        clients={clients}
                        onAttachFile={(t) => {
                            setAttachingTransaction(t);
                            setOpenAttachFile(true);
                        }}
                        onViewFiles={(t) => {
                            setViewingTransaction(t);
                            setOpenViewFiles(true);
                        }}
                        getTransactionFiles={getTransactionFiles}
                        onDelete={(t) => deleteTransactionMutation.mutate(t.id)}
                    />
                </TabsContent>

                <TabsContent value="accounts" className="outline-none">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
                        <CalendarIcon className="w-4 h-4" />
                        Exibindo contas com vencimento em <strong>{resolvedMonthFilter === "all" ? "todos os meses" : format(parseISO(resolvedMonthFilter + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}</strong>
                    </div>
                    <AccountsView bills={filteredData.bills} projects={projects} clients={clients} categories={categories} onMarkPaid={(id) => markPaidMutation.mutate(id)} onEdit={handleEdit} onSplit={handleSplit} onDelete={handleDelete} />
                </TabsContent>

                <TabsContent value="bank-accounts" className="outline-none">
                    <BankAccountsManager />
                </TabsContent>

                <TabsContent value="reconciliation" className="outline-none">
                    <BankReconciliation transactions={transactions} categories={categories} projects={projects} />
                </TabsContent>
            </Tabs >

            {/* Dialog for New Bill */}
            <Dialog open={openNewBill} onOpenChange={(open) => {
                setOpenNewBill(open);
                if (!open) {
                    resetForm();
                    setNewPaymentMethod("none");
                    setNewBankAccountId("none");
                }
            }}>
                <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl shadow-2xl border-0">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold text-gray-800">
                            {editingBill ? "Editar Conta" : "Novo Lançamento"}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {editingBill ? "Atualize os detalhes da transação financeira." : "Registre uma nova despesa ou receita."}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const payload = {
                                description: formData.get("description") as string,
                                value: formData.get("value") as string,
                                dueDate: formData.get("dueDate") as string,
                                installments: newBillInstallments,
                                projectId: newBillProjectId === "none" ? null : newBillProjectId,
                                categoryId: newBillCategoryId === "none" ? null : newBillCategoryId,
                                paymentMethod: newPaymentMethod === "none" ? null : newPaymentMethod,
                                bankAccountId: newBankAccountId === "none" ? null : newBankAccountId,
                                type: newBillType,
                            };

                            if (editingBill) {
                                updateBillMutation.mutate({ ...payload, id: editingBill.id });
                            } else {
                                createBillMutation.mutate(payload);
                            }
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700">Tipo de Lançamento</Label>
                            <ToggleGroup type="single" value={newBillType} onValueChange={(v) => v && setNewBillType(v as "pagar" | "receber")} className="justify-start gap-3 bg-gray-50/50 p-1.5 rounded-lg border">
                                <ToggleGroupItem value="pagar" className="data-[state=on]:bg-red-500 data-[state=on]:text-white data-[state=on]:shadow-md transition-all flex-1 py-2">
                                    Despesa (A Pagar)
                                </ToggleGroupItem>
                                <ToggleGroupItem value="receber" className="data-[state=on]:bg-green-500 data-[state=on]:text-white data-[state=on]:shadow-md transition-all flex-1 py-2">
                                    Receita (A Receber)
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Descrição</Label>
                            <Input name="description" required placeholder="Ex: Pagamento Fornecedor" defaultValue={editingBill?.description} className="h-11 bg-gray-50/50" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Valor Total</Label>
                                <Input name="value" type="number" step="0.01" required placeholder="0,00" defaultValue={editingBill?.value} className="h-11 bg-gray-50/50" />
                            </div>
                            {!editingBill && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Nº de Parcelas</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={newBillInstallments}
                                        onChange={(e) => setNewBillInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="h-11 bg-gray-50/50"
                                    />
                                </div>
                            )}
                            {editingBill && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Vencimento</Label>
                                    <Input name="dueDate" type="date" required defaultValue={editingBill?.dueDate} className="h-11 bg-gray-50/50" />
                                </div>
                            )}
                        </div>
                        {!editingBill && newBillInstallments > 1 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                                <p className="text-xs text-blue-700 font-medium">
                                    💡 Serão criadas <strong>{newBillInstallments} parcelas</strong> com vencimentos mensais consecutivos a partir da data informada abaixo.
                                </p>
                            </div>
                        )}
                        {!editingBill && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">{newBillInstallments > 1 ? "Vencimento da 1ª Parcela" : "Vencimento"}</Label>
                                <Input name="dueDate" type="date" required className="h-11 bg-gray-50/50" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Projeto (opcional)</Label>
                            <Select value={newBillProjectId} onValueChange={setNewBillProjectId}>
                                <SelectTrigger className="w-full h-11 bg-gray-50/50">
                                    <SelectValue placeholder="Sem projeto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem projeto</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">Categoria</Label>
                            <Select value={newBillCategoryId} onValueChange={setNewBillCategoryId}>
                                <SelectTrigger className="w-full h-11 bg-gray-50/50">
                                    <SelectValue placeholder="Sem categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem categoria</SelectItem>
                                    {categories.filter(c => c.type === (newBillType === "pagar" ? "despesa" : "receita")).map(c => (
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Forma de Pag. (opcional)</Label>
                                <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                    <SelectTrigger className="w-full h-11 bg-gray-50/50">
                                        <SelectValue placeholder="Forma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Não definida</SelectItem>
                                        <SelectItem value="pix">PIX</SelectItem>
                                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                        <SelectItem value="boleto">Boleto Bancário</SelectItem>
                                        <SelectItem value="transferencia">Transferência TED/DOC</SelectItem>
                                        <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                                        <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Conta (Origem/Destino)</Label>
                                <Select value={newBankAccountId} onValueChange={setNewBankAccountId}>
                                    <SelectTrigger className="w-full h-11 bg-gray-50/50">
                                        <SelectValue placeholder="Conta bancária" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Não vinculada</SelectItem>
                                        {bankAccounts.filter(a => a.isActive !== "false").map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
                                                    {acc.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                            <Button type="button" variant="ghost" className="hover:bg-gray-100" onClick={() => { setOpenNewBill(false); resetForm(); }}>Cancelar</Button>
                            <Button type="submit" className="min-w-[120px] shadow-sm" disabled={createBillMutation.isPending || updateBillMutation.isPending}>
                                {(createBillMutation.isPending || updateBillMutation.isPending)
                                    ? "Salvando..."
                                    : (!editingBill && newBillInstallments > 1)
                                        ? `Criar ${newBillInstallments} Parcelas`
                                        : "Salvar Lançamento"
                                }
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog for Splitting Bill */}
            <Dialog open={!!splittingBill} onOpenChange={(open) => !open && setSplittingBill(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Parcelar Conta</DialogTitle>
                        <DialogDescription>
                            Divida o valor de <strong>{splittingBill && new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(splittingBill.value))}</strong> em parcelas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número de Parcelas</Label>
                                <Select value={String(installmentsCount)} onValueChange={(v) => setInstallmentsCount(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24].map(n => (
                                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>1ª Vencimento</Label>
                                <Input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="border rounded-md p-3 bg-gray-50/50 space-y-2 max-h-[200px] overflow-y-auto text-sm">
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Simulação</p>
                            {installmentsPreview.map((inst) => (
                                <div key={inst.index} className="flex justify-between items-center text-gray-700">
                                    <span>Parcela {inst.index} ({inst.date})</span>
                                    <span className="font-medium">R$ {inst.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSplittingBill(null)}>Cancelar</Button>
                        <Button
                            onClick={() => splittingBill && splitBillMutation.mutate({
                                originalBill: splittingBill,
                                count: installmentsCount,
                                firstDate: firstDueDate
                            })}
                            disabled={splitBillMutation.isPending}
                        >
                            {splitBillMutation.isPending ? "Processando..." : "Confirmar Parcelamento"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog for Viewing Files */}
            <Dialog open={openViewFiles} onOpenChange={setOpenViewFiles}>
                <DialogContent className="sm:max-w-[600px] border-none shadow-2xl overflow-hidden p-0">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl font-semibold mb-1">Arquivos Anexados</DialogTitle>
                            <DialogDescription className="text-blue-100/80 m-0">
                                Documentos e comprovantes desta transação
                            </DialogDescription>
                        </div>
                    </div>

                    {viewingTransaction && (
                        <div className="p-6 space-y-6">
                            {/* Resumo da Transação */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">{viewingTransaction.description}</p>
                                    <p className="text-sm text-slate-500">
                                        {formatCurrency(parseFloat(String(viewingTransaction.value)))} • {viewingTransaction.date ? formatDate(new Date(viewingTransaction.date)) : "-"}
                                    </p>
                                </div>
                            </div>

                            {/* Lista de Arquivos */}
                            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {getTransactionFiles(viewingTransaction.id).length === 0 ? (
                                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                        <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-slate-600">Nenhum arquivo encontrado</p>
                                        <p className="text-xs text-slate-400">Os documentos anexados aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    getTransactionFiles(viewingTransaction.id).map((file: any) => (
                                        <div key={file.id} className="group relative overflow-hidden flex flex-col p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex items-start gap-4 flex-1 overflow-hidden">
                                                    <div className="mt-1 h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                                                        <FileText className="h-5 w-5 text-indigo-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate" title={file.fileName}>
                                                            {file.fileName}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 font-normal text-[10px] px-1.5 shadow-none border-slate-200 rounded font-mono">
                                                                {(file.fileSize / 1024).toFixed(1)} KB
                                                            </Badge>
                                                            <span className="text-slate-300 text-xs">•</span>
                                                            <p className="text-xs text-slate-500">
                                                                {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : "-"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setPreviewingFile(file);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1.5" /> Abrir
                                                    </Button>
                                                    <a
                                                        href={getFileUrl(file.objectPath)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                    >
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Observações em destaque */}
                                            {file.observations && (
                                                <div className="mt-3 ml-14 bg-amber-50/80 border border-amber-100 rounded-lg p-3 relative">
                                                    <div className="absolute -left-[5px] top-4 w-2 h-2 bg-amber-50 border-t border-l border-amber-100 rotate-45 transform"></div>
                                                    <p className="text-sm text-amber-900 font-medium">Nota / Observação:</p>
                                                    <p className="text-sm text-amber-800 leading-relaxed mt-0.5">
                                                        {file.observations}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setOpenViewFiles(false);
                                    setViewingTransaction(null);
                                }}
                                className="w-full font-medium"
                            >
                                Fechar
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog for Attaching Files */}
            <Dialog open={openAttachFile} onOpenChange={setOpenAttachFile}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Anexar Arquivo à Transação</DialogTitle>
                        <DialogDescription>
                            Anexe documentos fiscais, comprovantes ou outros arquivos relacionados a esta transação
                        </DialogDescription>
                    </DialogHeader>
                    {attachingTransaction && (
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{attachingTransaction.description}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatCurrency(parseFloat(String(attachingTransaction.value)))} - {attachingTransaction.date ? formatDate(new Date(attachingTransaction.date)) : "-"}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fileObservation">Observação (Opcional)</Label>
                                <Textarea
                                    id="fileObservation"
                                    placeholder="Ex: Nota fiscal paga com juros por atraso..."
                                    value={fileObservation}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFileObservation(e.target.value)}
                                    className="h-20 resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Esta anotação ficará visível ao visualizar este anexo.
                                </p>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-2">Clique para anexar arquivo</p>
                                <input
                                    type="file"
                                    accept=".pdf,.xml,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const uploadParams = await handleGetUploadParameters();
                                            const uploadResponse = await fetch(uploadParams.url, {
                                                method: uploadParams.method,
                                                body: file,
                                                headers: {
                                                    'Content-Type': file.type || 'application/octet-stream'
                                                }
                                            });
                                            if (uploadResponse.ok) {
                                                const result = {
                                                    successful: [{
                                                        name: file.name,
                                                        type: file.type,
                                                        size: file.size,
                                                        uploadURL: uploadParams.url
                                                    }]
                                                };
                                                handleUploadComplete(result);
                                            } else {
                                                toast({ title: "Erro ao fazer upload do arquivo", variant: "destructive" });
                                            }
                                        }
                                    }}
                                    className="hidden"
                                    id="file-upload-f2"
                                />
                                <label htmlFor="file-upload-f2" className="cursor-pointer">
                                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload-f2')?.click()}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Selecionar Arquivo
                                    </Button>
                                </label>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Formatos aceitos: PDF, XML, JPG, PNG, DOC (máx. 10MB)
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setOpenAttachFile(false);
                                    setAttachingTransaction(null);
                                }}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog for Immersive Inline File Preview */}
            <Dialog open={!!previewingFile} onOpenChange={(open) => !open && setPreviewingFile(null)}>
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100 border-none shadow-2xl">
                    {previewingFile && (
                        <>
                            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-10 shrink-0 shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden pr-4">
                                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <DialogTitle className="text-base font-semibold truncate text-slate-900 border-none m-0 shadow-none">
                                            {previewingFile.fileName}
                                        </DialogTitle>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                            <span>Modificado: {new Date(previewingFile.uploadedAt).toLocaleDateString('pt-BR')}</span>
                                            <span>•</span>
                                            <span>{(previewingFile.fileSize / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a href={getFileUrl(previewingFile.objectPath)} target="_blank" rel="noopener noreferrer" download>
                                        <Button variant="outline" size="sm" className="h-9 font-medium shadow-sm">
                                            <Download className="h-4 w-4 mr-2" />
                                            Baixar Arquivo
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-4">
                                {(previewingFile.fileType?.toLowerCase().startsWith('image/') || previewingFile.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img
                                            src={getFileUrl(previewingFile.objectPath)}
                                            alt={previewingFile.fileName}
                                            className="max-w-full max-h-full object-contain rounded drop-shadow-lg"
                                        />
                                    </div>
                                ) : (previewingFile.fileType?.toLowerCase() === 'application/pdf' || previewingFile.fileName?.toLowerCase().endsWith('.pdf')) ? (
                                    <iframe
                                        src={getFileUrl(previewingFile.objectPath)}
                                        className="w-full h-full rounded shadow-sm border border-slate-200 bg-white"
                                        title={previewingFile.fileName}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
                                        <div className="h-20 w-20 bg-slate-50 border-2 border-slate-100 rounded-full flex items-center justify-center mb-6">
                                            <FileText className="h-10 w-10 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Visualização não suportada</h3>
                                        <p className="text-slate-500 mb-8 max-w-[250px]">
                                            O tipo de arquivo <strong className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{previewingFile.fileType}</strong> não possui renderização nativa em tela cheia no momento.
                                        </p>
                                        <a href={getFileUrl(previewingFile.objectPath)} target="_blank" rel="noopener noreferrer" download className="w-full flex">
                                            <Button className="w-full font-medium shadow" size="lg">
                                                <Download className="h-5 w-5 mr-2" />
                                                Baixar para o Computador
                                            </Button>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    );
}
