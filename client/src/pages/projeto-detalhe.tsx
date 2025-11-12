import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GestaoObraPanel } from "@/components/gestao-obra-panel";
import { CartaoObras } from "@/components/cartao-obras";
import { FileText, DollarSign, Package, TrendingUp, Edit, Trash2, Paperclip, Upload, Download, Eye } from "lucide-react";
import type { Project, Transaction, Client } from "@shared/schema";

export default function ProjetoDetalhe() {
  const { toast } = useToast();
  const [, params] = useRoute("/projetos/:id");
  const projectId = params?.id || "";

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

  const [openReceita, setOpenReceita] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [openEditTransaction, setOpenEditTransaction] = useState(false);
  const [openAttachFile, setOpenAttachFile] = useState(false);
  const [attachingTransaction, setAttachingTransaction] = useState<Transaction | null>(null);
  const [openViewFiles, setOpenViewFiles] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);

  const handleAddTransactionMutation = useMutation({
    mutationFn: async (payload: { type: "receita" | "despesa"; description: string; value: string; date: string }) => {
      const response = await apiRequest("POST", "/api/transactions", { ...payload, projectId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", projectId] });
      toast({ title: "Transação adicionada com sucesso!" });
      setOpenReceita(false);
      setOpenDespesa(false);
    },
    onError: () => {
      toast({ title: "Erro ao adicionar transação", variant: "destructive" });
    }
  });

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
    mutationFn: async (payload: { transactionId: string; fileName: string; fileType: string; fileSize: number; objectPath: string }) => {
      const response = await apiRequest("POST", "/api/transactions/files", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-files", projectId] });
      toast({ title: "Arquivo anexado com sucesso!" });
      setOpenAttachFile(false);
      setAttachingTransaction(null);
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

  const getTransactionFiles = (transactionId: string) => {
    return transactionFiles.filter((file: any) => file.transactionId === transactionId);
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

  const totalReceitas = transactions
    .filter((t: Transaction) => t.type === "receita")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.value), 0);

  const totalDespesas = transactions
    .filter((t: Transaction) => t.type === "despesa")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.value), 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="p-6 space-y-6">
      {/* Header com informações principais */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="h-6 w-6" />
                {project.name}
              </CardTitle>
              <p className="text-muted-foreground mt-2">{project.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select
                value={project.status}
                onValueChange={(value) => handleStatusChangeMutation.mutate(value)}
              >
                <SelectTrigger className="w-40">
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
          </div>
        </CardHeader>
        <CardContent>
          {/* Cards de resumo financeiro */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Total Receitas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  R$ {totalReceitas.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-800">Total Despesas</CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  R$ {totalDespesas.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className={saldo >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={saldo >= 0 ? "text-sm font-medium text-blue-800" : "text-sm font-medium text-orange-800"}>
                  Saldo
                </CardTitle>
                <FileText className={saldo >= 0 ? "h-4 w-4 text-blue-600" : "h-4 w-4 text-orange-600"} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldo >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                  R$ {saldo.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Abas de conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="gestao-financeira" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Gestão Financeira
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos & Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nome do Projeto</Label>
                    <p className="text-lg font-medium">{project.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status Atual</Label>
                    <p className="text-lg font-medium capitalize">{project.status?.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                    <p className="text-lg font-medium">{project.description || 'Sem descrição'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Valor do Projeto</Label>
                    <p className="text-lg font-medium">R$ {parseFloat(project.value || '0').toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <GestaoObraPanel 
              project={{
                id: project.id,
                name: project.name,
                value: project.value,
                status: project.status,
                transactions: transactions
              }}
              onAddReceita={() => setOpenReceita(true)}
              onAddDespesa={() => setOpenDespesa(true)}
            />
          </div>
        </TabsContent>

        <TabsContent value="gestao-financeira" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Transações Financeiras</span>
                  <div className="flex gap-2">
                    <Button onClick={() => setOpenReceita(true)} variant="success" className="bg-green-600 hover:bg-green-700">
                      + Receita
                    </Button>
                    <Button onClick={() => setOpenDespesa(true)} variant="destructive">
                      + Despesa
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma transação registrada</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction: Transaction) => {
                        const files = getTransactionFiles(transaction.id);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  transaction.type === 'receita' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {transaction.type === 'receita' ? 'RECEITA' : 'DESPESA'}
                                </span>
                                <p className="font-medium">{transaction.description}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                              {files.length > 0 && (
                                <button
                                  type="button"
                                  className="flex items-center gap-2 mt-2 hover:underline"
                                  onClick={() => {
                                    setViewingTransaction(transaction);
                                    setOpenViewFiles(true);
                                  }}
                                  title="Ver arquivos anexados"
                                >
                                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{files.length} arquivo(s) anexado(s)</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`font-bold text-lg ${
                                transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                R$ {parseFloat(transaction.value).toFixed(2)}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAttachingTransaction(transaction);
                                    setOpenAttachFile(true);
                                  }}
                                  title="Anexar arquivo"
                                >
                                  <Paperclip className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setViewingTransaction(transaction);
                                    setOpenViewFiles(true);
                                  }}
                                  title="Ver arquivos"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingTransaction(transaction);
                                    setOpenEditTransaction(true);
                                  }}
                                  title="Editar transação"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Tem certeza que deseja excluir esta transação?')) {
                                      handleDeleteTransactionMutation.mutate(transaction.id);
                                    }
                                  }}
                                  title="Excluir transação"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <CartaoObras 
            projectId={projectId}
            projectName={project.name}
            transactions={transactions}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs modais */}
      <Dialog open={openReceita} onOpenChange={setOpenReceita}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Receita</DialogTitle>
            <DialogDescription>
              Adicione uma nova receita ao projeto
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddTransactionMutation.mutate({
                type: "receita",
                description: formData.get("description") as string,
                value: formData.get("value") as string,
                date: formData.get("date") as string,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="description-receita">Descrição</Label>
              <Input id="description-receita" name="description" required />
            </div>
            <div>
              <Label htmlFor="value-receita">Valor</Label>
              <Input id="value-receita" name="value" type="number" step="0.01" required />
            </div>
            <div>
              <Label htmlFor="date-receita">Data</Label>
              <Input id="date-receita" name="date" type="date" required />
            </div>
            <Button type="submit" className="w-full">
              Adicionar Receita
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Despesa</DialogTitle>
            <DialogDescription>
              Adicione uma nova despesa ao projeto
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddTransactionMutation.mutate({
                type: "despesa",
                description: formData.get("description") as string,
                value: formData.get("value") as string,
                date: formData.get("date") as string,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="description-despesa">Descrição</Label>
              <Input id="description-despesa" name="description" required />
            </div>
            <div>
              <Label htmlFor="value-despesa">Valor</Label>
              <Input id="value-despesa" name="value" type="number" step="0.01" required />
            </div>
            <div>
              <Label htmlFor="date-despesa">Data</Label>
              <Input id="date-despesa" name="date" type="date" required />
            </div>
            <Button type="submit" className="w-full">
              Adicionar Despesa
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

      {/* Modal de Visualização de Arquivos da Transação */}
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
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileType || 'arquivo'} • {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={file.objectPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 text-sm border rounded hover:bg-gray-50"
                          title="Abrir arquivo"
                        >
                          <Eye className="h-3 w-3 mr-1" /> Abrir
                        </a>
                        <a
                          href={file.objectPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center px-2 py-1 text-sm border rounded hover:bg-gray-50"
                          title="Baixar arquivo"
                        >
                          <Download className="h-3 w-3 mr-1" /> Baixar
                        </a>
                      </div>
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
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}