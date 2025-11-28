import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Clock, DollarSign, FileText, Plus, Calendar as CalendarIcon, Trash2, Upload, Eye, Paperclip } from "lucide-react";
import type { Bill, Transaction, Project } from "@shared/schema";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number | string) => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numValue || 0);
};

const statusBadge = (status: string) => {
  if (status === "pago") return <Badge className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">Pago</Badge>;
  if (status === "atrasado") return <Badge variant="destructive" className="text-xs">Atrasado</Badge>;
  return <Badge className="text-xs bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400">Pendente</Badge>;
};

export default function Financeiro() {
  const { toast } = useToast();
  const [tab, setTab] = useState("saldo");
  const [openNewBill, setOpenNewBill] = useState(false);
  const [newBillType, setNewBillType] = useState<"pagar" | "receber">("pagar");
  const [newBillProjectId, setNewBillProjectId] = useState<string>("none");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [preset, setPreset] = useState<"todos" | "este" | "ultimo">("todos");
  const [openMonthPicker, setOpenMonthPicker] = useState(false);
  const [attachingTransaction, setAttachingTransaction] = useState<Transaction | null>(null);
  const [openAttachFile, setOpenAttachFile] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [openViewFiles, setOpenViewFiles] = useState(false);

  const ym = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };
  const monthLabel = (ymStr: string) => {
    if (!ymStr) return "Todos";
    const [y, m] = ymStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  };

  const { data: bills = [], isLoading: loadingBills } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: transactionFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions/files"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (billId: string) => {
      await apiRequest("PATCH", `/api/bills/${billId}`, { status: "pago" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      await apiRequest("DELETE", `/api/bills/${billId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
  });

  // File upload functionality
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      fields: data.fields || {}
    };
  };

  const handleAttachFileMutation = useMutation({
    mutationFn: async (fileData: { transactionId: string; fileName: string; fileType: string; fileSize: number; objectPath: string }) => {
      await apiRequest("POST", "/api/transactions/files", fileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/files"] });
      toast({ title: "Arquivo anexado com sucesso!" });
      setOpenAttachFile(false);
      setAttachingTransaction(null);
    },
  });

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      if (file.name && file.uploadURL && attachingTransaction) {
        handleAttachFileMutation.mutate({
          transactionId: attachingTransaction.id,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          objectPath: file.uploadURL
        });
      }
    }
  };

  const getTransactionFiles = (transactionId: string) => {
    return transactionFiles.filter((file: any) => file.transactionId === transactionId);
  };

  

  

  const billsComputed = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return bills.map((b) => {
      let st = b.status;
      if (st !== "pago" && b.dueDate < today) st = "atrasado";
      return { ...b, status: st } as Bill;
    });
  }, [bills]);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "Sem projeto";
    const p = projects.find((x) => x.id === projectId);
    return p?.name || "Projeto desconhecido";
  };

  const concludedProjectIds = useMemo(() => {
    return new Set(
      projects
        .filter(p => p.status === "finalizado" || p.status === "concluido")
        .map(p => p.id)
    );
  }, [projects]);

  const baseTransactions = useMemo(() => {
    return transactions.filter(t => !t.projectId || concludedProjectIds.has(t.projectId));
  }, [transactions, concludedProjectIds]);

  const summaryTransactions = useMemo(() => {
    if (!monthFilter) return baseTransactions;
    return baseTransactions.filter(t => (t.date || "").startsWith(monthFilter));
  }, [baseTransactions, monthFilter]);

  const summaryBillsBase = useMemo(() => {
    return billsComputed.filter(b => !b.projectId || concludedProjectIds.has(b.projectId));
  }, [billsComputed, concludedProjectIds]);

  const summaryBills = useMemo(() => {
    if (!monthFilter) return summaryBillsBase;
    return summaryBillsBase.filter(b => (b.dueDate || "").startsWith(monthFilter));
  }, [summaryBillsBase, monthFilter]);

  const totalReceitas = useMemo(() => summaryTransactions.filter(t => t.type === "receita").reduce((s, t) => s + parseFloat(String(t.value)), 0), [summaryTransactions]);
  const totalDespesasTransacoes = useMemo(() => summaryTransactions.filter(t => t.type === "despesa").reduce((s, t) => s + parseFloat(String(t.value)), 0), [summaryTransactions]);
  const totalDespesasBills = useMemo(() => summaryBills.filter(b => b.type === "pagar").reduce((s, b) => s + parseFloat(String(b.value)), 0), [summaryBills]);
  const totalDespesas = totalDespesasTransacoes + totalDespesasBills;
  const lucro = totalReceitas - totalDespesas;

  const filteredTransactions = useMemo(() => {
    const list = baseTransactions;
    if (!monthFilter) return list;
    return list.filter(t => (t.date || "").startsWith(monthFilter));
  }, [baseTransactions, monthFilter]);

  const filteredBills = useMemo(() => {
    const list = billsComputed.filter(b => !b.projectId || concludedProjectIds.has(b.projectId));
    if (!monthFilter) return list;
    return list.filter(b => (b.dueDate || "").startsWith(monthFilter));
  }, [billsComputed, monthFilter, concludedProjectIds]);

  const saldoPorProjeto = useMemo(() => {
    const projetosConcluidos = projects.filter(p => p.status === "finalizado" || p.status === "concluido");
    return projetosConcluidos.map(p => {
      const receitasProj = transactions
        .filter(t => t.projectId === p.id && t.type === "receita")
        .reduce((s, t) => s + parseFloat(String(t.value)), 0);
      const valorContrato = parseFloat(String(p.value));
      const aReceber = Math.max(0, valorContrato - receitasProj);
      const percentual = valorContrato > 0 ? Math.min(100, (receitasProj / valorContrato) * 100) : 0;
      let status: "pago" | "pendente" | "atrasado" = "pendente";
      if (percentual >= 100) status = "pago";
      else if ((p.status === "finalizado" || p.status === "concluido") && aReceber > 0 && new Date(p.date) < new Date()) status = "atrasado";
      return { projeto: p, valorContrato, recebido: receitasProj, aReceber, percentual, status };
    }).sort((a, b) => b.aReceber - a.aReceber);
  }, [projects, transactions]);

  const createBillMutation = useMutation({
    mutationFn: async (payload: Partial<Bill>) => {
      const today = new Date().toISOString().split("T")[0];
      const body = {
        type: payload.type || newBillType,
        description: payload.description || "",
        value: payload.value,
        dueDate: payload.dueDate,
        status: payload.status || "pendente",
        projectId: payload.projectId || null,
        date: payload.date || today,
      };
      await apiRequest("POST", "/api/bills", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setOpenNewBill(false);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" /> Financeiro</h1>
          <p className="text-sm text-muted-foreground">Acompanhe transações e contas a pagar/receber</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">Receitas</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceitas)}</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">Despesas</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDespesas)}</div>
          </div>
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground">Lucro</div>
            <div className="text-2xl font-bold">{formatCurrency(lucro)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" value={preset} onValueChange={(v) => {
          if (!v) return;
          setPreset(v as any);
          if (v === "todos") setMonthFilter("");
          if (v === "este") setMonthFilter(ym(new Date()));
          if (v === "ultimo") {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            setMonthFilter(ym(d));
          }
        }}>
          <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
          <ToggleGroupItem value="este">Este mês</ToggleGroupItem>
          <ToggleGroupItem value="ultimo">Último mês</ToggleGroupItem>
        </ToggleGroup>
        <Popover open={openMonthPicker} onOpenChange={setOpenMonthPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" /> {monthLabel(monthFilter)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={monthFilter ? new Date(Number(monthFilter.split("-")[0]), Number(monthFilter.split("-")[1]) - 1, 1) : undefined}
              onSelect={(date) => {
                if (date) {
                  const v = ym(date);
                  setMonthFilter(v);
                  setPreset("todos");
                  setOpenMonthPicker(false);
                }
              }}
              captionLayout="dropdown"
              fromYear={2020}
              toYear={new Date().getFullYear() + 1}
            />
          </PopoverContent>
        </Popover>
        {monthFilter && (
          <Badge variant="secondary">Filtro: {monthLabel(monthFilter)}</Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="saldo" className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Saldo a Receber</TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Transações</TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="saldo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Obras — Saldo a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              {saldoPorProjeto.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum projeto</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Contratado</TableHead>
                      <TableHead>Recebido</TableHead>
                      <TableHead>A Receber</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saldoPorProjeto.map(({ projeto, valorContrato, recebido, aReceber, status }) => (
                      <TableRow key={projeto.id}>
                        <TableCell>
                          <Link href={`/projetos/${projeto.id}`}>
                            <span className="hover:underline">{projeto.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setViewingTransaction(t);
                                    setOpenViewFiles(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver arquivos</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAttachingTransaction(t);
                                    setOpenAttachFile(true);
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Anexar arquivo</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionFiles(t.id).length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {getTransactionFiles(t.id).length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setViewingTransaction(t);
                                    setOpenViewFiles(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver arquivos</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAttachingTransaction(t);
                                    setOpenAttachFile(true);
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Anexar arquivo</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionFiles(t.id).length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {getTransactionFiles(t.id).length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setViewingTransaction(t);
                                    setOpenViewFiles(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver arquivos</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAttachingTransaction(t);
                                    setOpenAttachFile(true);
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Anexar arquivo</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(valorContrato)}</TableCell>
                        <TableCell>{formatCurrency(recebido)}</TableCell>
                        <TableCell className={aReceber > 0 ? "text-orange-600 font-semibold" : ""}>{formatCurrency(aReceber)}</TableCell>
                        <TableCell>{statusBadge(status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma transação registrada</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Arquivos</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge className={`text-xs ${t.type === "receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate">{t.description}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(t.value)}</TableCell>
                        <TableCell>{t.date}</TableCell>
                        <TableCell>
                          {t.projectId ? (
                            <Link href={`/projetos/${t.projectId}`}>
                              <span className="hover:underline">{getProjectName(t.projectId)}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Sem projeto</span>
                          )}
                        </TableCell>
                        
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contas a Pagar e Receber</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setOpenNewBill(true)}>
                  <Plus className="h-4 w-4" /> Adicionar Conta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBills ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma conta registrada</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.dueDate}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${b.type === "receber" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{b.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate">{b.description}</TableCell>
                        <TableCell>
                          {b.projectId ? (
                            <Link href={`/projetos/${b.projectId}`}>
                              <span className="hover:underline">{getProjectName(b.projectId)}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Sem projeto</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(b.status)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(b.value)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={b.status === "pago" || markPaidMutation.isPending}
                              onClick={() => markPaidMutation.mutate(b.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" /> Marcar como pago
                            </Button>
                            
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteBillMutation.mutate(b.id)} disabled={deleteBillMutation.isPending}>Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Dialog open={openNewBill} onOpenChange={setOpenNewBill}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Conta</DialogTitle>
                <DialogDescription>Cadastre uma despesa de escritório ou um recebimento.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget as HTMLFormElement);
                  const description = String(fd.get("description") || "").trim();
                  const value = String(fd.get("value") || "0");
                  const dueDate = String(fd.get("dueDate") || "");
                  const projectId = newBillProjectId === "none" ? null : newBillProjectId;
                  createBillMutation.mutate({ type: newBillType, description, value, dueDate, status: "pendente", projectId });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newBillType} onValueChange={(v) => setNewBillType(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pagar">Pagar (Despesa)</SelectItem>
                      <SelectItem value="receber">Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input name="description" required />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input name="value" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input name="dueDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label>Projeto (opcional)</Label>
                  <Select value={newBillProjectId} onValueChange={setNewBillProjectId}>
                    <SelectTrigger className="w-full">
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenNewBill(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createBillMutation.isPending}>Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma transação registrada</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Arquivos</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge className={`text-xs ${t.type === "receita" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t.type.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate">{t.description}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(t.value)}</TableCell>
                        <TableCell>{t.date}</TableCell>
                        <TableCell>
                          {t.projectId ? (
                            <Link href={`/projetos/${t.projectId}`}>
                              <span className="hover:underline">{getProjectName(t.projectId)}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Sem projeto</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionFiles(t.id).length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {getTransactionFiles(t.id).length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setViewingTransaction(t);
                                    setOpenViewFiles(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver arquivos</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAttachingTransaction(t);
                                    setOpenAttachFile(true);
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Anexar arquivo</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Upload Dialog */}
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
                  R$ {parseFloat(attachingTransaction.value).toFixed(2)} - {new Date(attachingTransaction.date).toLocaleDateString('pt-BR')}
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
                  setAttachingTransaction(null);
                  setOpenAttachFile(false);
                }}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* File Viewing Dialog */}
      <Dialog open={openViewFiles} onOpenChange={setOpenViewFiles}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivos Anexados</DialogTitle>
            <DialogDescription>
              Veja e abra os arquivos anexados a esta transação
            </DialogDescription>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{viewingTransaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {parseFloat(viewingTransaction.value).toFixed(2)} - {new Date(viewingTransaction.date).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="space-y-2">
                {getTransactionFiles(viewingTransaction.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo anexado a esta transação.</p>
                ) : (
                  getTransactionFiles(viewingTransaction.id).map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileType} - {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.objectPath, '_blank')}
                      >
                        Abrir
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <Button 
                variant="outline" 
                onClick={() => {
                  setViewingTransaction(null);
                  setOpenViewFiles(false);
                }}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Separator />
      <div className="text-xs text-muted-foreground">Gerencie suas finanças com clareza.</div>
    </div>
  );
}