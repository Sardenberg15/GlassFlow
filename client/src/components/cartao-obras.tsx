import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownCircle, ArrowUpCircle, Upload, FileText, Trash2, Download } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";
import type { ProjectFile, Transaction } from "@shared/schema";

interface CartaoObrasProps {
  projectId: string;
  projectName: string;
  transactions: Transaction[];
}

const FILE_CATEGORIES = {
  comprovante: "Comprovante de Pagamento",
  nota_fiscal_recebida: "Nota Fiscal Recebida",
  nota_fiscal_emitida: "Nota Fiscal Emitida",
} as const;

type FileCategory = keyof typeof FILE_CATEGORIES;

export function CartaoObras({ projectId, projectName, transactions }: CartaoObrasProps) {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("comprovante");
  const { toast } = useToast();

  const receitas = transactions.filter(t => t.type === "receita");
  const despesas = transactions.filter(t => t.type === "despesa");
  
  const totalReceitas = receitas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
  const totalDespesas = despesas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
  const saldo = totalReceitas - totalDespesas;

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Fetch project files
  const { data: projectFiles = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/projects", projectId, "files"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  // Upload mutation
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const createFileMutation = useMutation({
    mutationFn: async (fileData: {
      projectId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      category: string;
      objectPath: string;
    }) => {
      const response = await apiRequest("POST", "/api/project-files", fileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({
        title: "Arquivo enviado!",
        description: "O arquivo foi salvo com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/project-files/${fileId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({
        title: "Arquivo excluído!",
        description: "O arquivo foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      if (file.name && file.uploadURL) {
        createFileMutation.mutate({
          projectId,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size || 0,
          category: selectedCategory,
          objectPath: file.uploadURL,
        });
      }
    }
  };

  const filesByCategory = projectFiles.filter(f => f.category === selectedCategory);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cartão de Obras - {projectName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Receitas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-chart-2" />
              <h3 className="font-semibold text-chart-2">Receitas</h3>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-3">
                {receitas.length > 0 ? (
                  receitas.map((receita) => (
                    <div key={receita.id} className="space-y-1" data-testid={`receita-${receita.id}`}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{receita.description}</p>
                        <p className="text-sm font-semibold text-chart-2">{formatCurrency(receita.value)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{receita.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma receita registrada</p>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-lg font-bold text-chart-2" data-testid="total-receitas">{formatCurrency(totalReceitas)}</span>
            </div>
          </div>

          {/* Despesas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-chart-4" />
              <h3 className="font-semibold text-chart-4">Despesas</h3>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-3">
                {despesas.length > 0 ? (
                  despesas.map((despesa) => (
                    <div key={despesa.id} className="space-y-1" data-testid={`despesa-${despesa.id}`}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{despesa.description}</p>
                        <p className="text-sm font-semibold text-chart-4">{formatCurrency(despesa.value)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{despesa.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-lg font-bold text-chart-4" data-testid="total-despesas">{formatCurrency(totalDespesas)}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className={`flex justify-between items-center p-4 rounded-md ${saldo >= 0 ? 'bg-chart-2/10' : 'bg-chart-4/10'}`}>
          <span className="text-lg font-semibold">Saldo do Projeto:</span>
          <span className={`text-2xl font-bold ${saldo >= 0 ? 'text-chart-2' : 'text-chart-4'}`} data-testid="saldo-projeto">
            {formatCurrency(saldo)}
          </span>
        </div>

        <Separator />

        {/* Arquivos do Projeto */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Documentos do Projeto</h3>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as FileCategory)}>
              <SelectTrigger className="w-[250px]" data-testid="select-file-category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FILE_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>Enviar Arquivo</span>
            </ObjectUploader>
          </div>

          <ScrollArea className="h-[150px] rounded-md border p-4">
            <div className="space-y-2">
              {filesByCategory.length > 0 ? (
                filesByCategory.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-2 rounded-md hover-elevate active-elevate-2"
                    data-testid={`file-${file.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => window.open(file.objectPath, '_blank')}
                        data-testid={`button-download-${file.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteFileMutation.mutate(file.id)}
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum arquivo de "{FILE_CATEGORIES[selectedCategory]}" enviado
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
