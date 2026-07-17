import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GestaoObraPanel } from "@/components/gestao-obra-panel";
import { ProjectDocuments } from "@/components/project-documents";
import { ProjectCanvas } from "@/components/project-canvas";
import { FileText, DollarSign, Package, TrendingUp, Edit, Trash2, Paperclip, Upload, Eye, PenTool, LayoutDashboard, Wallet, Receipt, Hexagon, Download, AlertTriangle, CheckCircle2, Clock, Archive, FolderOpen, Search, Tag, Image, FileSpreadsheet, File as FileIcon, Plus } from "lucide-react";
import type { Project, Transaction, Client } from "@shared/schema";

export default function ProjetoDetalhe() {
  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const { toast } = useToast();
  const [, params] = useRoute("/projetos/:id");
  const projectId = params?.id || "";

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!res.ok) return undefined;
      return res.json();
    },
    enabled: !!projectId
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["transactions", projectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions?projectId=${projectId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId
  });

  const { data: transactionFiles = [] } = useQuery({
    queryKey: ["transaction-files", projectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions/files?projectId=${projectId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: bankAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/bank-accounts"],
  });

  const { data: bills = [], isLoading: loadingBills } = useQuery({
    queryKey: ["bills", projectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bills?projectId=${projectId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId
  });

  const [openReceita, setOpenReceita] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [openEditTransaction, setOpenEditTransaction] = useState(false);
  const [openAttachFile, setOpenAttachFile] = useState(false);
  const [attachingTransaction, setAttachingTransaction] = useState<Transaction | null>(null);
  const [fileObservation, setFileObservation] = useState("");
  const [openViewFiles, setOpenViewFiles] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [previewingFile, setPreviewingFile] = useState<any | null>(null);
  const [openEditValue, setOpenEditValue] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [openEditCost, setOpenEditCost] = useState(false);
  const [editCost, setEditCost] = useState("");
  const [openEditBill, setOpenEditBill] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);

  const [openManageInstallments, setOpenManageInstallments] = useState(false);
  const [customInstallments, setCustomInstallments] = useState<Array<{ description: string; value: string; dueDate: string }>>([]);

  const handleManageInstallmentsMutation = useMutation({
    mutationFn: async (installments: any[]) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/custom-installments`, { installments });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Parcelas atualizadas com sucesso!" });
      setOpenManageInstallments(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar parcelas", variant: "destructive" });
    }
  });

  const handleMarkBillAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/bills/${id}`, { status: "pago" });
      const res = await apiRequest("POST", `/api/bills/${id}/ensure-transaction`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Recebimento baixado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao baixar recebimento", variant: "destructive" });
    }
  });

  const handleEditBillMutation = useMutation({
    mutationFn: async (payload: { id: string; description: string; value: string; dueDate: string }) => {
      const { id, ...data } = payload;
      const res = await apiRequest("PATCH", `/api/bills/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      toast({ title: "Parcela atualizada com sucesso!" });
      setOpenEditBill(false);
      setEditingBill(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar parcela", variant: "destructive" });
    }
  });

  const handleDeleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      toast({ title: "Parcela excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir parcela", variant: "destructive" });
    }
  });

  const handleAddTransactionMutation = useMutation({
    mutationFn: async (payload: { type: "receita" | "despesa"; description: string; value: string; date: string; categoryId?: string | null; paymentMethod?: string; bankAccountId?: string | null }) => {
      console.log("POST /api/transactions payload", { ...payload, projectId });
      const response = await apiRequest("POST", "/api/transactions", { ...payload, projectId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      toast({
        title: "Sucesso",
        description: "Transação adicionada com sucesso.",
      });
      setOpenReceita(false);
      setOpenDespesa(false);
    },
    onError: (error: any) => {
      let description = error?.message || "Erro ao adicionar transação";
      try {
        const jsonPart = description.split(": ").slice(1).join(": ");
        const parsed = JSON.parse(jsonPart);
        if (parsed?.details) description = parsed.details;
        else if (parsed?.error) description = parsed.error;
      } catch { }
      toast({ title: "Erro ao adicionar transação", description, variant: "destructive" });
      console.error("Add transaction error:", error);
    }
  });

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>, type: "receita" | "despesa") => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawCategoryId = formData.get("categoryId") as string | null;
    const rawBankAccountId = formData.get("bankAccountId") as string | null;
    const data = {
      type,
      description: formData.get("description") as string,
      value: formData.get("value") as string,
      date: formData.get("date") as string,
      categoryId: (rawCategoryId && rawCategoryId !== "none") ? rawCategoryId : null,
      paymentMethod: formData.get("paymentMethod") as string,
      bankAccountId: (rawBankAccountId && rawBankAccountId !== "none") ? rawBankAccountId : null,
    };
    handleAddTransactionMutation.mutate(data);
  };

  const handleAddExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.isPartialPayment) {
        if (parseFloat(payload.signalValue) > 0) {
          await apiRequest("POST", "/api/transactions", {
            type: "despesa",
            description: `Sinal: ${payload.description}`,
            value: payload.signalValue,
            date: payload.date, 
            categoryId: payload.categoryId,
            paymentMethod: payload.paymentMethod,
            bankAccountId: payload.bankAccountId,
            projectId,
          });
        }
        
        const remainder = parseFloat(payload.totalValue) - parseFloat(payload.signalValue);
        if (remainder > 0) {
          await apiRequest("POST", "/api/bills", {
            type: "pagar",
            description: `Saldo: ${payload.description}`,
            value: remainder.toString(),
            dueDate: payload.dueDate,
            date: payload.date,
            categoryId: payload.categoryId,
            projectId,
            status: "pendente"
          });
        }
        return { success: true };
      } else {
        const response = await apiRequest("POST", "/api/transactions", {
          type: "despesa",
          description: payload.description,
          value: payload.totalValue,
          date: payload.date,
          categoryId: payload.categoryId,
          paymentMethod: payload.paymentMethod,
          bankAccountId: payload.bankAccountId,
          projectId,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["bills", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Despesa registrada com sucesso." });
      setOpenDespesa(false);
      setIsPartialPayment(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar despesa", description: error.message, variant: "destructive" });
    }
  });

  const handleAddExpenseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawCategoryId = formData.get("categoryId") as string | null;
    const rawBankAccountId = formData.get("bankAccountId") as string | null;
    
    handleAddExpenseMutation.mutate({
      isPartialPayment,
      description: formData.get("description") as string,
      totalValue: formData.get("totalValue") as string,
      signalValue: formData.get("signalValue") as string || "0",
      date: formData.get("date") as string, 
      dueDate: formData.get("dueDate") as string || "", 
      categoryId: (rawCategoryId && rawCategoryId !== "none") ? rawCategoryId : null,
      paymentMethod: formData.get("paymentMethod") as string,
      bankAccountId: (rawBankAccountId && rawBankAccountId !== "none") ? rawBankAccountId : null,
    });
  };

  const handleEditTransactionMutation = useMutation({
    mutationFn: async (payload: { id: string; description: string; value: string; date: string }) => {
      const { id, ...data } = payload;
      const response = await apiRequest("PATCH", `/api/transactions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      toast({ title: "Transação atualizada com sucesso!" });
      setOpenEditTransaction(false);
      setEditingTransaction(null);
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao atualizar transação";
      toast({ title: "Erro", description: message, variant: "destructive" });
      console.error("Edit transaction error:", error);
    }
  });

  const handleChangeCategoryMutation = useMutation({
    mutationFn: async (payload: { id: string; categoryId: string | null }) => {
      const response = await apiRequest("PATCH", `/api/transactions/${payload.id}`, { categoryId: payload.categoryId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      toast({ title: "Categoria atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
    }
  });

  const handleDeleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/transactions/${id}`);
      // DELETE returns 204 No Content; do not parse JSON
      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      toast({ title: "Transação excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir transação", variant: "destructive" });
    }
  });

  const handleAttachFileMutation = useMutation({
    mutationFn: async (payload: { transactionId: string; fileName: string; fileType: string; fileSize: number; objectPath: string; observations?: string }) => {
      const response = await apiRequest("POST", "/api/transactions/files", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-files", projectId] });
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
      method: "PUT" as const,
      url: data.uploadURL,
      fields: data.fields || {}
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      if (file.name && file.uploadURL && attachingTransaction) {
        handleAttachFileMutation.mutate({
          transactionId: attachingTransaction.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size || 0,
          objectPath: file.uploadURL,
          observations: fileObservation
        });
      }
    }
  };

  const handleStatusChangeMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  });

  const handleUpdateProjectValueMutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, { value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Valor do projeto atualizado com sucesso!" });
      setOpenEditValue(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar valor do projeto", variant: "destructive" });
    }
  });

  const handleUpdateCostForecastMutation = useMutation({
    mutationFn: async (estimatedCost: string) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, { estimatedCost });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Previsão de custo atualizada com sucesso!" });
      setOpenEditCost(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar previsão de custo", variant: "destructive" });
    }
  });

  const getTransactionFiles = (transactionId: string) => {
    return transactionFiles.filter((file: any) => file.transactionId === transactionId);
  };

  // Build absolute server URL for file paths to bypass SPA router
  const getFileUrl = (objectPath: string) => {
    if (!objectPath) return '';
    if (objectPath.startsWith('http')) return objectPath;
    
    // Normalize Supabase-style paths stored in DB
    let normalizedPath = objectPath;
    const supabaseMatch = objectPath.match(/\/storage\/v1\/object\/(?:upload\/sign|public)\/uploads\/([^/?]+)/);
    if (supabaseMatch) {
      normalizedPath = `/objects/uploads/${supabaseMatch[1]}`;
    } else if (objectPath.startsWith('/storage/')) {
      const parts = objectPath.split('/');
      const uuid = parts[parts.length - 1];
      if (uuid) normalizedPath = `/objects/uploads/${uuid}`;
    }
    
    return `${window.location.origin}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
  };

  if (loadingProject || loadingTransactions) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Carregando...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Projeto não encontrado</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdminFolder = (project.description || '').toLowerCase().startsWith('pasta administrativa');
  const totalReceitas = transactions
    .filter((t: Transaction) => t.type === "receita")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.value), 0);

  const totalDespesas = transactions
    .filter((t: Transaction) => t.type === "despesa")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.value), 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Container Brando/Borda */}
      <Card className="shadow-sm border-gray-100">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-50 rounded-md border border-gray-100 text-gray-700">
                <Hexagon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-800">
                  {project.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{project.description || "Detalhes do Projeto"}</p>
              </div>
            </div>

            {!isAdminFolder && (
              <div className="flex items-center gap-3 shrink-0">
                <Label className="text-sm font-medium text-gray-500">Status:</Label>
                <Select
                  value={project.status}
                  onValueChange={(value) => handleStatusChangeMutation.mutate(value)}
                >
                  <SelectTrigger className="w-[160px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orcamento">Orçamento</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="execucao">Execução</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Cards de resumo financeiro (Top Horizontal) */}
          <div className="grid gap-5 md:grid-cols-3 mt-8">
            {!isAdminFolder && (
              <div className="flex flex-col p-6 bg-gradient-to-br from-[#f0fdf4] to-white border border-[#bbf7d0] rounded-2xl shadow-[0_4px_20px_-4px_rgba(22,101,52,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(22,101,52,0.15)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-800">Total Receitas</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-[#166534] tracking-tight">
                  {formatCurrency(totalReceitas)}
                </div>
              </div>
            )}

            <div className="flex flex-col p-6 bg-gradient-to-br from-[#fef2f2] to-white border border-[#fecaca] rounded-2xl shadow-[0_4px_20px_-4px_rgba(153,27,27,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(153,27,27,0.15)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-red-800">Total Despesas</span>
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-[#991b1b] tracking-tight">
                {formatCurrency(totalDespesas)}
              </div>
            </div>

            {!isAdminFolder && (
              <div className="flex flex-col p-6 bg-gradient-to-br from-[#fffbeb] to-white border border-[#fde68a] rounded-2xl shadow-[0_4px_20px_-4px_rgba(180,83,9,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(180,83,9,0.15)] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-amber-800">
                    Saldo
                  </span>
                  <Receipt className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-3xl font-bold text-[#92400e] tracking-tight">
                  {formatCurrency(saldo)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Abas de conteúdo ERP */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-gray-100/60 p-1.5 rounded-lg border border-gray-200 mb-6 flex overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex space-x-2">
            <TabsTrigger
              value="visao-geral"
              className="flex items-center gap-2 py-2.5 px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-gray-200 border border-transparent whitespace-nowrap"
            >
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="gestao-financeira"
              className="flex items-center gap-2 py-2.5 px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-gray-200 border border-transparent whitespace-nowrap"
            >
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Gestão Financeira</span>
            </TabsTrigger>

            <TabsTrigger
              value="design"
              className="flex items-center gap-2 py-2.5 px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-gray-200 border border-transparent whitespace-nowrap"
            >
              <PenTool className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Design</span>
            </TabsTrigger>
            <TabsTrigger
              value="arquivo-virtual"
              className="flex items-center gap-2 py-2.5 px-6 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-gray-200 border border-transparent whitespace-nowrap"
            >
              <Archive className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Arquivo Virtual</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visao-geral" className="mt-6">
          <div className="space-y-6">
            <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden">
              <CardTitle className="px-6 pt-6 text-xl font-bold text-gray-800">Detalhes do Projeto</CardTitle>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Nome do Projeto</Label>
                    <p className="text-base font-semibold text-gray-800">{project.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Status Atual</Label>
                    <p className="text-base font-semibold text-gray-800 capitalize">{project.status?.replace('-', ' ')}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Descrição</Label>
                    <p className="text-base text-gray-700">{project.description || 'Sem descrição'}</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="space-y-1 flex-1">
                      <Label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Valor do Projeto</Label>
                      <div className="flex items-center gap-2 group">
                        <p className="text-base font-semibold text-gray-800">{formatCurrency(parseFloat(project.value || '0'))}</p>
                        {!isAdminFolder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditValue(project.value || "0");
                              setOpenEditValue(true);
                            }}
                          >
                            <Edit className="h-3 w-3 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {!isAdminFolder && (
                      <div className="space-y-1 flex-1">
                        <Label className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          Previsão de Custo
                          <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Base</span>
                        </Label>
                        <div className="flex items-center gap-2 group">
                          <p className="text-base font-semibold text-gray-800">
                            {formatCurrency(parseFloat(project.estimatedCost || '0'))}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditCost(project.estimatedCost || "0");
                              setOpenEditCost(true);
                            }}
                          >
                            <Edit className="h-3 w-3 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isAdminFolder && (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-gray-800">Receitas do Projeto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Valor Total Contratado</p>
                          <p className="text-2xl font-bold text-gray-800">{formatCurrency(parseFloat(project.value || '0'))}</p>
                        </div>

                        <div className="pt-2">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Recebido <br /><span className="font-semibold text-green-600">{formatCurrency(totalReceitas)}</span></span>
                            <span className="text-right text-gray-600">A Receber <br /><span className="font-semibold text-orange-500">{formatCurrency(Math.max(0, parseFloat(project.value) - totalReceitas))}</span></span>
                          </div>
                          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, (totalReceitas / parseFloat(project.value || '1')) * 100)}%` }}
                            />
                          </div>
                          {totalReceitas >= parseFloat(project.value || '0') && parseFloat(project.value || '0') > 0 && (
                            <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-green-100">
                              <TrendingUp className="h-3 w-3" /> Pago
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-gray-800">Lucratividade Real</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-4xl font-bold ${saldo >= 0 ? "text-green-600" : "text-orange-500"}`}>
                              {totalReceitas > 0 ? ((saldo / totalReceitas) * 100).toFixed(1) : "0"}%
                            </span>
                            <TrendingUp className={`h-5 w-5 ${saldo >= 0 ? "text-green-600" : "text-orange-500"}`} />
                          </div>
                          <p className="text-sm text-gray-500">{formatCurrency(saldo)} de lucro</p>
                        </div>

                        <div className="flex justify-between items-center pt-5 border-t border-gray-100 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Receita</p>
                            <p className="font-semibold text-gray-800">{formatCurrency(totalReceitas)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Custos</p>
                            <p className="font-semibold text-gray-800">{formatCurrency(totalDespesas)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6 mt-8">
                  <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between py-4 bg-white border-b border-gray-50 rounded-t-xl">
                      <CardTitle className="text-lg font-bold text-gray-800">Contas a Pagar e Receber</CardTitle>
                      <div className="flex gap-2">
                        {project.paymentCondition === 'personalizado' && (
                          <>
                            <Button variant="outline" size="sm" type="button" onClick={(e) => {
                              console.log("BUTTON CLICKED! project.customInstallments = ", project.customInstallments);
                              e.preventDefault();
                              e.stopPropagation();
                              let current = [];
                              try {
                                if (typeof project.customInstallments === 'string') {
                                  current = JSON.parse(project.customInstallments);
                                } else if (Array.isArray(project.customInstallments)) {
                                  current = project.customInstallments;
                                }
                              } catch (err) {
                                console.error("Error parsing custom installments", err);
                              }
                              if (!Array.isArray(current)) current = [];
                              
                              const parsed = current.length > 0 ? current : [
                                { description: "Sinal", value: "", dueDate: "" },
                                { description: "Saldo", value: "", dueDate: "" }
                              ];
                              console.log("Parsed installments to set: ", parsed);
                              setCustomInstallments(parsed);
                              setOpenManageInstallments(true);
                              console.log("setOpenManageInstallments called!");
                            }}>
                              Gerenciar Parcelas
                            </Button>

                            <Dialog open={openManageInstallments} onOpenChange={setOpenManageInstallments}>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Gerenciar Parcelas Personalizadas</DialogTitle>
                                  <DialogDescription>
                                    Configure as parcelas deste projeto. As contas a receber existentes para este projeto serão recriadas.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="flex justify-end">
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 text-xs"
                                      onClick={() => setCustomInstallments([...customInstallments, { description: `Parcela ${customInstallments.length + 1}`, value: "", dueDate: "" }])}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Add Parcela
                                    </Button>
                                  </div>
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {customInstallments.map((inst, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <Input 
                                          placeholder="Descrição" 
                                          className="h-9 flex-1"
                                          value={inst.description || ""}
                                          onChange={(e) => {
                                            const newInsts = [...customInstallments];
                                            newInsts[idx].description = e.target.value;
                                            setCustomInstallments(newInsts);
                                          }}
                                        />
                                        <Input 
                                          placeholder="R$ ou %" 
                                          className="h-9 w-24"
                                          value={inst.value || ""}
                                          onChange={(e) => {
                                            const newInsts = [...customInstallments];
                                            newInsts[idx].value = e.target.value;
                                            setCustomInstallments(newInsts);
                                          }}
                                        />
                                        <Input 
                                          type="date"
                                          className="h-9 w-36"
                                          value={inst.dueDate || ""}
                                          onChange={(e) => {
                                            const newInsts = [...customInstallments];
                                            newInsts[idx].dueDate = e.target.value;
                                            setCustomInstallments(newInsts);
                                          }}
                                        />
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            const newInsts = [...customInstallments];
                                            newInsts.splice(idx, 1);
                                            setCustomInstallments(newInsts);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                    {customInstallments.length === 0 && (
                                      <div className="text-center py-4 text-sm text-gray-500">
                                        Nenhuma parcela configurada.
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-100 flex items-start gap-2 mt-4 text-xs">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>As contas a receber vinculadas a esta condição de pagamento serão substituídas. Parcelas que já foram recebidas ou editadas manualmente não serão afetadas, a menos que os valores totais não fechem.</p>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                  <Button variant="outline" onClick={() => setOpenManageInstallments(false)}>
                                    Cancelar
                                  </Button>
                                  <Button 
                                    className="bg-blue-600 hover:bg-blue-700" 
                                    onClick={() => handleManageInstallmentsMutation.mutate(customInstallments)}
                                    disabled={handleManageInstallmentsMutation.isPending}
                                  >
                                    {handleManageInstallmentsMutation.isPending ? "Salvando..." : "Salvar Parcelas"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                        <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setOpenReceita(true)}>
                          Registrar Recebimento
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 bg-white border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-4 font-medium">Tipo / Descrição</th>
                              <th className="px-6 py-4 font-medium text-right">Valor</th>
                              <th className="px-6 py-4 font-medium text-center">Vencimento</th>
                              <th className="px-6 py-4 font-medium text-center">Status</th>
                              <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bills.slice().sort((a: any, b: any) => {
                              if (!a.dueDate && !b.dueDate) return 0;
                              if (!a.dueDate) return 1;
                              if (!b.dueDate) return -1;
                              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                            }).map((b: any, i: number) => (
                              <tr key={b.id} className={`${i % 2 === 0 ? "bg-gray-50/50" : "bg-white"} group`}>
                                <td className="px-6 py-4 font-medium text-gray-800">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${b.type === 'receber' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {b.type === 'receber' ? 'Receber' : 'Pagar'}
                                    </span>
                                    {b.description}
                                  </div>
                                </td>
                                <td className={`px-6 py-4 font-bold text-right ${b.type === 'receber' ? 'text-green-700' : 'text-red-700'}`}>
                                  {b.type === 'receber' ? '+ ' : '- '}{formatCurrency(parseFloat(b.value))}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-center">{formatDate(b.dueDate)}</td>
                                <td className="px-6 py-4 text-center">
                                  {b.status === 'pago' ? (
                                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-green-100">
                                      <CheckCircle2 className="h-3 w-3" /> Pago
                                    </span>
                                  ) : !b.dueDate ? (
                                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-purple-100">
                                      <Clock className="h-3 w-3" /> A Definir
                                    </span>
                                  ) : new Date(b.dueDate) < new Date() ? (
                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-red-100">
                                      <AlertTriangle className="h-3 w-3" /> Atrasado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-blue-100">
                                      <Clock className="h-3 w-3" /> Pendente
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {b.status !== 'pago' && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleMarkBillAsPaidMutation.mutate(b.id)}
                                        title="Baixar recebimento"
                                        disabled={handleMarkBillAsPaidMutation.isPending}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                      onClick={() => {
                                        setEditingBill(b);
                                        setOpenEditBill(true);
                                      }}
                                      title="Editar parcela"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => {
                                        if (confirm('Tem certeza que deseja excluir esta parcela?')) {
                                          handleDeleteBillMutation.mutate(b.id);
                                        }
                                      }}
                                      title="Excluir parcela"
                                      disabled={handleDeleteBillMutation.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {bills.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma conta a pagar ou receber registrada.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between py-4 bg-white border-b border-gray-50 rounded-t-xl">
                      <CardTitle className="text-lg font-bold text-gray-800">Custos Detalhados</CardTitle>
                      <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setOpenDespesa(true)}>
                        Lançar Despesa
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 bg-white border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-4 font-medium">Categoria</th>
                              <th className="px-6 py-4 font-medium text-right">Real</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Aggregating expenses by description/category for demonstration mimicking ERP grouping */}
                            {Array.from(
                              transactions.filter((t: Transaction) => t.type === 'despesa').reduce((acc: Map<string, number>, curr: Transaction) => {
                                // Default fallback to description keyword grouping for presentation,
                                let cat = "Despesas Extras";

                                // Lookup category name if available
                                if (curr.categoryId) {
                                  const c = categories.find((c: any) => c.id === curr.categoryId);
                                  if (c) cat = c.name;
                                } else {
                                  const descLow = curr.description.toLowerCase();
                                  if (descLow.includes('vidro') || descLow.includes('alum') || descLow.includes('perfil') || descLow.includes('ferragem')) cat = "Materiais (Vidro, Alumínio, Ferragens)";
                                  else if (descLow.includes('pessoal') || descLow.includes('hora') || descLow.includes('ajudante')) cat = "Mão de Obra (Horas)";
                                }

                                acc.set(cat, (acc.get(cat) || 0) + parseFloat(curr.value));
                                return acc;
                              }, new Map()).entries() as any[]
                            ).map(([categoria, valor], i) => (
                              <tr key={categoria} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50 border-t border-gray-50"}>
                                <td className="px-6 py-4 font-medium text-gray-800">{categoria}</td>
                                <td className="px-6 py-4 font-bold text-gray-800 text-right">{formatCurrency((valor as number))}</td>
                              </tr>
                            ))}
                            {transactions.filter((t: Transaction) => t.type === 'despesa').length === 0 && (
                              <tr>
                                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">Nenhum custo registrado.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gestao-financeira" className="mt-6">
          <div className="space-y-6">
            <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6">
                <CardTitle className="text-xl font-bold text-gray-800">
                  Transações Financeiras
                </CardTitle>
                <div className="flex gap-2">
                  {!isAdminFolder && (
                    <Button
                      onClick={() => setOpenReceita(true)}
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" /> Receita
                    </Button>
                  )}
                  <Button
                    onClick={() => setOpenDespesa(true)}
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <DollarSign className="h-4 w-4 mr-2" /> Despesa
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 bg-gray-50/50 rounded-lg border border-dashed">Nenhuma transação registrada nesta obra.</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction: Transaction) => {
                      const files = getTransactionFiles(transaction.id);
                      const isReceita = transaction.type === 'receita';
                      return (
                        <div key={transaction.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-4 md:gap-0">
                          <div className="flex items-center gap-4 flex-1">
                            {/* Pill Type */}
                            <div className={`shrink-0 w-2.5 h-12 rounded-full ${isReceita ? 'bg-green-500' : 'bg-red-500'}`} />

                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold tracking-wider uppercase mb-0.5 ${isReceita ? 'text-green-600' : 'text-red-500'}`}>
                                {isReceita ? 'Receita' : 'Despesa'}
                              </span>
                              <p className="text-sm font-bold text-gray-800 line-clamp-1">{transaction.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  {formatDate(transaction.date)}
                                </span>
                                <Select
                                  value={transaction.categoryId || "none"}
                                  onValueChange={(val) => {
                                    handleChangeCategoryMutation.mutate({
                                      id: transaction.id,
                                      categoryId: val === "none" ? null : val,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-6 w-auto min-w-[110px] max-w-[180px] px-2 text-[11px] rounded-full border-gray-200 bg-gray-50 text-gray-600 gap-1 [&>svg]:h-3 [&>svg]:w-3">
                                    <span className="flex items-center gap-1.5 truncate">
                                      {(() => {
                                        const cat = categories.find((c: any) => c.id === transaction.categoryId);
                                        return (
                                          <>
                                            <span
                                              className="h-2 w-2 rounded-full shrink-0"
                                              style={{ backgroundColor: cat?.color || "#CBD5E1" }}
                                            />
                                            <span className="truncate">{cat?.name || "Sem categoria"}</span>
                                          </>
                                        );
                                      })()}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem categoria</SelectItem>
                                    {categories
                                      .filter((c: any) => c.type === transaction.type)
                                      .map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                            {c.name}
                                          </span>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {files.length > 0 && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 hover:underline"
                                    onClick={() => {
                                      setViewingTransaction(transaction);
                                      setOpenViewFiles(true);
                                    }}
                                  >
                                    <Paperclip className="h-3 w-3 text-blue-500" />
                                    <span className="text-[10px] text-blue-600 font-medium">{files.length} anexo(s)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-6 md:pl-0 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                            <div className={`text-lg font-bold ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
                              {isReceita ? '+' : '-'} {formatCurrency(parseFloat(transaction.value))}
                            </div>

                            <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setAttachingTransaction(transaction);
                                  setOpenAttachFile(true);
                                }}
                                title="Anexar arquivo"
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  setEditingTransaction(transaction);
                                  setOpenEditTransaction(true);
                                }}
                                title="Editar transação"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir esta transação?')) {
                                    handleDeleteTransactionMutation.mutate(transaction.id);
                                  }
                                }}
                                title="Excluir transação"
                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="design" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Estúdio de Design</h2>
                <p className="text-muted-foreground">Configure visualmente os itens do projeto.</p>
              </div>
            </div>
            <ProjectCanvas projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="arquivo-virtual" className="mt-6">
          <ProjectVirtualFiles projectId={projectId} projectName={project.name} />
        </TabsContent>
      </Tabs>

      {/* Dialogs modais */}
      <Dialog open={openReceita} onOpenChange={setOpenReceita}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Receita</DialogTitle>
            <DialogDescription>Preencha os dados da receita (Recebimento)</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleAddTransaction(e, "receita")} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receita-desc">Descrição</Label>
              <Select name="description" required defaultValue="Entrada">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou digite..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Sinal">Sinal</SelectItem>
                  <SelectItem value="Saldo Final">Saldo Final</SelectItem>
                  <SelectItem value="Saldo 30 dias">Saldo 30 dias</SelectItem>
                  <SelectItem value="1ª Parcela">1ª Parcela</SelectItem>
                  <SelectItem value="2ª Parcela">2ª Parcela</SelectItem>
                  <SelectItem value="3ª Parcela">3ª Parcela</SelectItem>
                  <SelectItem value="Recebimento Integral">Recebimento Integral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receita-value">Valor (R$)</Label>
                <Input id="receita-value" name="value" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita-date">Data de Recebimento</Label>
                <Input id="receita-date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receita-paymentMethod">Forma de Pagamento</Label>
              <Select name="paymentMethod" required defaultValue="pix">
                <SelectTrigger>
                  <SelectValue placeholder="Forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receita-bankAccountId">Conta Destino</Label>
              <Select name="bankAccountId" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conta bancária</SelectItem>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={handleAddTransactionMutation.isPending} className="w-full">
              {handleAddTransactionMutation.isPending ? "Registrando..." : "Registrar Recebimento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Despesa</DialogTitle>
            <DialogDescription>Preencha os dados do custo da obra</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="despesa-categoryId">Centro de Custo (Categoria)</Label>
              <Select name="categoryId" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.filter((c: any) => c.type === 'despesa').map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="despesa-desc">Descrição / Fornecedor *</Label>
              <Input id="despesa-desc" name="description" required placeholder="Ex: Compra de vidros, Instalação..." />
            </div>
            
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md border border-gray-200">
              <input 
                type="checkbox" 
                id="isPartialPayment" 
                checked={isPartialPayment}
                onChange={(e) => setIsPartialPayment(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <Label htmlFor="isPartialPayment" className="font-medium text-gray-700 cursor-pointer mb-0">
                Pagamento Parcelado / Sinal + Saldo a Pagar
              </Label>
            </div>

            {isPartialPayment ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="despesa-totalValue">Valor Total da Compra (R$) *</Label>
                  <Input id="despesa-totalValue" name="totalValue" type="number" step="0.01" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="despesa-signalValue">Sinal Pago Agora (R$)</Label>
                    <Input id="despesa-signalValue" name="signalValue" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="despesa-date">Data do Sinal *</Label>
                    <Input id="despesa-date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despesa-dueDate">Data Vencimento Saldo *</Label>
                  <Input id="despesa-dueDate" name="dueDate" type="date" required />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="despesa-totalValue">Valor (R$) *</Label>
                  <Input id="despesa-totalValue" name="totalValue" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="despesa-date">Data de Pagamento *</Label>
                  <Input id="despesa-date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="despesa-paymentMethod">Forma de Pagamento</Label>
              <Select name="paymentMethod" defaultValue="pix">
                <SelectTrigger>
                  <SelectValue placeholder="Forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="despesa-bankAccountId">Conta de Origem</Label>
              <Select name="bankAccountId" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conta bancária</SelectItem>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={handleAddExpenseMutation.isPending} className="w-full">
              {handleAddExpenseMutation.isPending ? "Registrando..." : "Registrar Despesa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={openEditTransaction} onOpenChange={setOpenEditTransaction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Edite os dados da transação
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEditTransactionMutation.mutate({
                  id: editingTransaction.id,
                  description: formData.get("description") as string,
                  value: formData.get("value") as string,
                  date: formData.get("date") as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  name="description"
                  defaultValue={editingTransaction.description}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-value">Valor</Label>
                <Input
                  id="edit-value"
                  name="value"
                  type="number"
                  step="0.01"
                  defaultValue={editingTransaction.value}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  name="date"
                  type="date"
                  defaultValue={editingTransaction.date}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenEditTransaction(false);
                    setEditingTransaction(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Anexo de Arquivo */}
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
                  {formatCurrency(parseFloat(attachingTransaction.value))} - {formatDate(attachingTransaction.date)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileObservationProj">Observação (Opcional)</Label>
                <Textarea
                  id="fileObservationProj"
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
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
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

      <Dialog open={openEditValue} onOpenChange={setOpenEditValue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Valor do Projeto</DialogTitle>
            <DialogDescription>
              Atualize o valor total do projeto
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateProjectValueMutation.mutate(editValue);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="project-value">Valor</Label>
              <Input
                id="project-value"
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditValue(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Editing Cost Forecast */}
      <Dialog open={openEditCost} onOpenChange={setOpenEditCost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Previsão de Custo Base</DialogTitle>
            <DialogDescription>
              Atualize a previsão de custo base do projeto
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateCostForecastMutation.mutate(editCost);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="cost-forecast">Previsão de Custo</Label>
              <Input
                id="cost-forecast"
                type="number"
                step="0.01"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditCost(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
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
                    {formatCurrency(parseFloat(String(viewingTransaction.value)))} • {viewingTransaction.date ? formatDate(viewingTransaction.date.toString().substring(0, 10)) : "-"}
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

      {/* Modal de Edição de Parcela */}
      <Dialog open={openEditBill} onOpenChange={setOpenEditBill}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>
              Edite os dados da parcela
            </DialogDescription>
          </DialogHeader>
          {editingBill && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleEditBillMutation.mutate({
                  id: editingBill.id,
                  description: formData.get("description") as string,
                  value: formData.get("value") as string,
                  dueDate: formData.get("dueDate") as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="edit-bill-description">Descrição</Label>
                <Input
                  id="edit-bill-description"
                  name="description"
                  defaultValue={editingBill.description}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-bill-value">Valor (R$)</Label>
                  <Input
                    id="edit-bill-value"
                    name="value"
                    type="number"
                    step="0.01"
                    defaultValue={parseFloat(editingBill.value).toString()}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-bill-date">Vencimento</Label>
                  <Input
                    id="edit-bill-date"
                    name="dueDate"
                    type="date"
                    defaultValue={editingBill.dueDate}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditBill(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={handleEditBillMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {handleEditBillMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Project Virtual Files — Arquivo Virtual integrado ao projeto
// ══════════════════════════════════════════════════════════
const PROJECT_FOLDERS = ["Fotos de Obra", "Contratos", "Orçamentos Assinados", "Documentos Gerais"];

const getFileIcon2 = (type: string, name: string) => {
  const lower = (name || "").toLowerCase();
  if (lower.match(/\.(xlsx?|csv)$/)) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (lower.match(/\.(docx?|odt)$/)) return <FileText className="h-5 w-5 text-blue-600" />;
  if (lower.match(/\.(jpe?g|png|gif|webp|bmp|svg)$/)) return <Image className="h-5 w-5 text-purple-500" />;
  if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <FileIcon className="h-5 w-5 text-gray-400" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};


// Re-use already-imported hooks from top of file (useQuery, useMutation from @tanstack/react-query)

interface VFFile {
  id: string; fileName: string; fileType: string; fileSize: number;
  objectPath: string; folder: string; tags: string | null;
  description: string | null; uploadedBy: string | null; createdAt: string;
}

function ProjectVirtualFiles({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadFolder, setUploadFolder] = useState(PROJECT_FOLDERS[0]);
  const [uploadDesc, setUploadDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VFFile | null>(null);
  const [previewFile, setPreviewFile] = useState<VFFile | null>(null);

  // Fetch all virtual files and filter by project tag
  const { data: allFiles = [], isLoading } = useQuery<VFFile[]>({
    queryKey: ["/api/virtual-files"],
    queryFn: async () => {
      const r = await fetch("/api/virtual-files");
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });


  // Filter files that belong to this project (tagged with projectId or project name)
  const projectFiles = allFiles.filter(f => {
    const tags = (f.tags || "").toLowerCase();
    return tags.includes(projectId.toLowerCase()) || tags.includes(projectName.toLowerCase());
  });

  const filtered = projectFiles.filter(f => {
    if (activeFolder && f.folder !== activeFolder) return false;
    if (search) {
      const s = search.toLowerCase();
      return f.fileName.toLowerCase().includes(s) || (f.description || "").toLowerCase().includes(s);
    }
    return true;
  });

  const folderCounts: Record<string, number> = {};
  projectFiles.forEach(f => { folderCounts[f.folder] = (folderCounts[f.folder] || 0) + 1; });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/virtual-files/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/virtual-files"] });
      toast({ title: "Arquivo excluído" });
      setDeleteTarget(null);
    },
  });

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const urlRes = await fetch("/api/objects/upload", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!urlRes.ok) throw new Error("Falha ao obter URL de upload");
      const { uploadURL } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
        body: uploadFile,
      });

      await fetch("/api/virtual-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadFile.name,
          fileType: uploadFile.type || "application/octet-stream",
          fileSize: uploadFile.size,
          objectPath: uploadURL,
          folder: uploadFolder,
          tags: `${projectId},${projectName}`,
          description: uploadDesc || null,
        }),
      });

      qc.invalidateQueries({ queryKey: ["/api/virtual-files"] });
      toast({ title: "Arquivo enviado com sucesso!" });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadDesc("");
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Archive className="h-5 w-5" /> Arquivo Virtual do Projeto
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fotos de obra, contratos assinados, orçamentos e documentos do projeto
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Enviar Arquivo
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Folders sidebar */}
        <Card className="border-gray-200/60 shadow-sm lg:w-56 flex-shrink-0">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
              <FolderOpen className="h-4 w-4" /> Pastas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeFolder ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              Todos ({projectFiles.length})
            </button>
            {PROJECT_FOLDERS.map(folder => (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeFolder === folder ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                {folder}
                {folderCounts[folder] ? (
                  <Badge variant="secondary" className="ml-2 text-[10px]">{folderCounts[folder]}</Badge>
                ) : null}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Files list */}
        <div className="flex-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar arquivos do projeto..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          <Card className="border-gray-200/60 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum arquivo neste projeto</p>
                  <p className="text-xs mt-1">Envie fotos de obra, contratos ou orçamentos assinados</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map(f => (
                    <div key={f.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0">
                      <div className="flex-shrink-0">
                        {f.fileType.startsWith("image/") ? (
                          <img src={f.objectPath} alt={f.fileName} className="h-10 w-10 object-cover rounded-md border border-gray-200" />
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center bg-gray-100 rounded-md border border-gray-200">
                            {getFileIcon2(f.fileType, f.fileName)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{f.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{formatFileSize(f.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(f.createdAt).toLocaleDateString("pt-BR")}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50/50 text-blue-700 border-blue-200/50">{f.folder}</Badge>
                        </div>
                        {f.description && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{f.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setPreviewFile(f)} title="Pré-visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          onClick={() => { const a = document.createElement("a"); a.href = f.objectPath; a.download = f.fileName; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove(); }} title="Baixar">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(f)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Enviar Arquivo ao Projeto
            </DialogTitle>
            <DialogDescription>
              Envie fotos de obra, contratos assinados, orçamentos ou outros documentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo *</Label>
              <Input type="file"
                accept=".xlsx,.xls,.docx,.doc,.pdf,.png,.jpg,.jpeg,.csv,.txt,.webp,.gif,.bmp"
                onChange={e => setUploadFile(e.target.files?.[0] || null)} className="mt-1" />
            </div>
            <div>
              <Label>Pasta</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input placeholder="Ex: Foto da instalação - Sala principal"
                value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>O arquivo "{deleteTarget?.fileName}" será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b shrink-0 bg-white">
            <DialogTitle className="truncate pr-8">{previewFile?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center relative p-6">
            {previewFile?.fileType.startsWith("image/") ? (
              <img src={previewFile.objectPath} alt={previewFile.fileName} className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
            ) : previewFile?.fileType === "application/pdf" ? (
              <iframe src={previewFile.objectPath} className="w-full h-full border-0 rounded-md shadow-sm" title={previewFile.fileName} />
            ) : (
              <div className="text-center text-gray-500 flex flex-col items-center">
                <FileIcon className="h-16 w-16 mb-4 opacity-50" />
                <p className="font-medium text-gray-700">Pré-visualização não disponível para este tipo de arquivo.</p>
                <p className="text-sm mt-1 mb-6">Por favor, faça o download para visualizar o conteúdo.</p>
                <Button onClick={() => {
                  if (!previewFile) return;
                  const a = document.createElement("a");
                  a.href = previewFile.objectPath;
                  a.download = previewFile.fileName;
                  a.target = "_blank";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}>
                  <Download className="h-4 w-4 mr-2" /> Baixar Arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}