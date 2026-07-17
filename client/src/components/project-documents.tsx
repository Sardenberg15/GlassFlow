
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Download, Eye, Image as ImageIcon, FileCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ProjectFile } from "@shared/schema";

interface ProjectDocumentsProps {
    projectId: string;
}

const FILE_CATEGORIES = {
    contrato: { label: "Contrato", icon: FileCheck, color: "text-blue-600", bg: "bg-blue-100" },
    orcamento_assinado: { label: "Orçamento Assinado", icon: FileText, color: "text-purple-600", bg: "bg-purple-100" },
    previsao_custo: { label: "Planilha de Previsão", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-100" },
    foto_obra: { label: "Fotos da Obra", icon: ImageIcon, color: "text-amber-600", bg: "bg-amber-100" },
    nota_fiscal_recebida: { label: "Nota Fiscal Recebida", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
    nota_fiscal_emitida: { label: "Nota Fiscal Emitida", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
    comprovante: { label: "Comprovante", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
} as const;

type FileCategory = keyof typeof FILE_CATEGORIES;

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
    const { toast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState<FileCategory>("contrato");
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<ProjectFile | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch project files
    const { data: projectFiles = [] } = useQuery<ProjectFile[]>({
        queryKey: ["/api/projects", projectId, "files"],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}/files`);
            if (!response.ok) throw new Error("Failed to fetch files");
            return response.json();
        },
    });

    // Fetch quotes
    const { data: project } = useQuery({
        queryKey: ["project", projectId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/projects/${projectId}`);
            if (!res.ok) return undefined;
            return res.json();
        },
    });

    const { data: quotes = [] } = useQuery({
        queryKey: ["/api/clients", project?.clientId, "quotes"],
        queryFn: async () => {
            if (!project?.clientId) return [];
            const res = await apiRequest("GET", `/api/clients/${project.clientId}/quotes`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!project?.clientId
    });

    // File mutations
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
            quoteId?: string | null;
        }) => {
            const response = await apiRequest("POST", "/api/project-files", fileData);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
            toast({ title: "Arquivo salvo com sucesso!" });
            setSelectedQuoteId(null);
            setIsUploading(false);
        },
        onError: (error: Error) => {
            toast({ title: "Erro ao salvar arquivo", description: error.message, variant: "destructive" });
            setIsUploading(false);
        },
    });

    const deleteFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            await apiRequest("DELETE", `/api/project-files/${fileId}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
            toast({ title: "Arquivo excluído!" });
        },
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const uploadParams = await handleGetUploadParameters();

            const uploadResponse = await fetch(uploadParams.url, {
                method: uploadParams.method,
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream'
                }
            });

            if (!uploadResponse.ok) {
                throw new Error("Falha no upload para o storage");
            }

            // Extract object path or assume the URL is linked
            // logic matching project-detalhe: use the uploadURL as objectPath
            createFileMutation.mutate({
                projectId,
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
                fileSize: file.size,
                category: selectedCategory,
                objectPath: uploadParams.url,
                quoteId: selectedCategory === 'orcamento_assinado' ? selectedQuoteId : null
            });

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Erro no upload",
                description: "Não foi possível enviar o arquivo. Tente novamente.",
                variant: "destructive"
            });
            setIsUploading(false);
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerUpload = (category: FileCategory) => {
        setSelectedCategory(category);
        setTimeout(() => fileInputRef.current?.click(), 0);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const contracts = projectFiles.filter(f => f.category === 'contrato');
    const signedQuotes = projectFiles.filter(f => f.category === 'orcamento_assinado');
    const photos = projectFiles.filter(f => f.category === 'foto_obra');
    const otherDocs = projectFiles.filter(f => !['contrato', 'orcamento_assinado', 'foto_obra'].includes(f.category));

    return (
        <div className="space-y-8">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept={selectedCategory === 'foto_obra' ? "image/*" : selectedCategory === 'previsao_custo' ? ".xlsx,.xls,.csv,.pdf" : ".pdf,.xml,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"}
            />

            {/* Seção de Contratos e Upload Inicial */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Card de Contrato */}
                <Card className="border-l-4 border-l-blue-500 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <FileCheck className="h-5 w-5 text-blue-600" />
                            </div>
                            Contrato do Projeto
                        </CardTitle>
                        <CardDescription>Gerencie o contrato assinado com o cliente</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {contracts.length > 0 ? (
                            <div className="space-y-3">
                                {contracts.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate text-sm">{file.fileName}</p>
                                                <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={() => window.open(file.objectPath, '_blank')}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteFileMutation.mutate(file.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                <p className="text-sm text-muted-foreground mb-4">Nenhum contrato anexado</p>
                                <Button onClick={() => triggerUpload('contrato')} disabled={isUploading}>
                                    {isUploading && selectedCategory === 'contrato' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                    Upload do Contrato
                                </Button>
                            </div>
                        )}
                        {contracts.length > 0 && (
                            <div className="mt-4 pt-4 border-t flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => triggerUpload('contrato')} disabled={isUploading}>
                                    Substituir/Adicionar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Card de Orçamentos Assinados */}
                <Card className="border-l-4 border-l-purple-500 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-full">
                                <FileText className="h-5 w-5 text-purple-600" />
                            </div>
                            Orçamentos Assinados
                        </CardTitle>
                        <CardDescription>Vincule documentos assinados aos orçamentos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {signedQuotes.length > 0 && (
                            <ScrollArea className="h-[120px]">
                                <div className="space-y-2">
                                    {signedQuotes.map(file => {
                                        const quote = quotes.find((q: any) => q.id === file.quoteId);
                                        return (
                                            <div key={file.id} className="flex items-center justify-between p-2 bg-purple-50/50 rounded border border-purple-100 text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{file.fileName}</p>
                                                        {quote && <Badge variant="outline" className="text-[10px] h-5 px-1 bg-white">{quote.number}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(file.objectPath, '_blank')}>
                                                        <Download className="h-3 w-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => deleteFileMutation.mutate(file.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Vincular a Orçamento (Opcional)</Label>
                            <Select value={selectedQuoteId || "none"} onValueChange={(v) => setSelectedQuoteId(v === "none" ? null : v)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Selecione um orçamento..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem vínculo</SelectItem>
                                    {quotes.map((q: any) => (
                                        <SelectItem key={q.id} value={q.id}>{q.number} - {q.status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => triggerUpload('orcamento_assinado')}
                                disabled={isUploading}
                            >
                                {isUploading && selectedCategory === 'orcamento_assinado' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                Upload Orçamento Assinado
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Nova Seção: Planilha de Previsão de Custo */}
            <Card className="border-l-4 border-l-indigo-500 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 rounded-full">
                                <FileText className="h-5 w-5 text-indigo-600" />
                            </div>
                            Planilha de Previsão de Custo
                        </CardTitle>
                        <CardDescription>Suba seus estudos e metas orçamentárias iniciais</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => triggerUpload('previsao_custo')} disabled={isUploading}>
                        {isUploading && selectedCategory === 'previsao_custo' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Anexar Planilha
                    </Button>
                </CardHeader>
                <CardContent className="pt-4">
                    {(() => {
                        const docs = projectFiles.filter(f => f.category === 'previsao_custo');
                        if (docs.length === 0) {
                            return (
                                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50/50">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Nenhuma planilha anexada até o momento.</p>
                                </div>
                            );
                        }
                        return (
                            <div className="space-y-2">
                                {docs.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate text-sm">{file.fileName}</p>
                                                <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100" onClick={() => window.open(file.objectPath, '_blank')}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteFileMutation.mutate(file.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>

            {/* Galeria de Fotos */}
            <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-amber-600" />
                                Fotos da Obra
                            </CardTitle>
                            <CardDescription>Galeria de imagens do progresso</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => triggerUpload('foto_obra')} disabled={isUploading}>
                            {isUploading && selectedCategory === 'foto_obra' ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Upload className="h-3 w-3 mr-2" />}
                            Adicionar Fotos
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {photos.map(file => (
                                <div key={file.id} className="group relative aspect-square rounded-lg border bg-muted overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <img
                                        src={file.objectPath}
                                        alt={file.fileName}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => setViewingImage(file)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => deleteFileMutation.mutate(file.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>Nenhuma foto adicionada</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Documentos Fiscais e Outros */}
            <Card className="shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-gray-200/60 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium text-muted-foreground uppercase tracking-wide">Outros Documentos</CardTitle>
                        <div className="flex gap-2">
                            <Select value={selectedCategory} onValueChange={(v) => {
                                if (['nota_fiscal_recebida', 'nota_fiscal_emitida', 'comprovante'].includes(v)) {
                                    setSelectedCategory(v as FileCategory);
                                }
                            }}>
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                    <SelectValue placeholder="Tipo de arquivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nota_fiscal_recebida">Nota Fiscal Recebida</SelectItem>
                                    <SelectItem value="nota_fiscal_emitida">Nota Fiscal Emitida</SelectItem>
                                    <SelectItem value="comprovante">Comprovante</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => triggerUpload(selectedCategory)} disabled={isUploading}>
                                {isUploading && ['nota_fiscal_recebida', 'nota_fiscal_emitida', 'comprovante'].includes(selectedCategory) ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Upload className="h-3 w-3 mr-2" />}
                                Upload
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        {otherDocs.length > 0 ? (
                            otherDocs.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg group transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded ${FILE_CATEGORIES[file.category as FileCategory]?.bg || 'bg-gray-100'}`}>
                                            {(() => {
                                                const CatIcon = FILE_CATEGORIES[file.category as FileCategory]?.icon || FileText;
                                                const color = FILE_CATEGORIES[file.category as FileCategory]?.color || "text-gray-500";
                                                return <CatIcon className={`h-4 w-4 ${color}`} />;
                                            })()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{file.fileName}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{FILE_CATEGORIES[file.category as FileCategory]?.label || file.category}</Badge>
                                                <span>•</span>
                                                <span>{formatFileSize(file.fileSize)}</span>
                                                <span>•</span>
                                                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" onClick={() => window.open(file.objectPath, '_blank')}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deleteFileMutation.mutate(file.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum outro documento</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Visualizador de Imagem */}
            <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-black/95 border-none">
                    <div className="absolute right-4 top-4 z-50">
                        <Button size="icon" variant="secondary" className="rounded-full" onClick={() => setViewingImage(null)}>
                            <span className="sr-only">Fechar</span>
                            <span className="text-xl font-bold">×</span>
                        </Button>
                    </div>
                    {viewingImage && (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <img
                                src={viewingImage.objectPath}
                                alt={viewingImage.fileName}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    )}
                    {viewingImage && (
                        <div className="p-4 bg-black/50 text-white backdrop-blur-sm">
                            <h3 className="font-medium">{viewingImage.fileName}</h3>
                            <p className="text-sm text-white/70">{new Date(viewingImage.createdAt).toLocaleString()}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
