import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderOpen, Upload, Search, FileText, FileSpreadsheet, File, Download,
  Trash2, Plus, Tag, FolderPlus, Eye, BarChart3, X, Archive,
} from "lucide-react";

interface VirtualFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  objectPath: string;
  folder: string;
  tags: string | null;
  description: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

const FOLDERS = [
  "Geral",
  "Recibos",
  "Notas Fiscais",
  "Contratos",
  "Planilhas",
  "RH / Funcionários",
  "Compras / Equipamentos",
  "Documentos Legais",
];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getFileIcon = (type: string, name: string) => {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || type.includes("spreadsheet"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (lower.endsWith(".docx") || lower.endsWith(".doc") || type.includes("word"))
    return <FileText className="h-5 w-5 text-blue-600" />;
  if (type.startsWith("image/"))
    return <Eye className="h-5 w-5 text-purple-500" />;
  if (type === "application/pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

export default function ArquivoVirtual() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VirtualFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadFolder, setUploadFolder] = useState("Geral");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [customFolder, setCustomFolder] = useState("");

  const { data: files = [], isLoading } = useQuery<VirtualFile[]>({
    queryKey: ["/api/virtual-files"],
    queryFn: async () => {
      const r = await fetch("/api/virtual-files");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/virtual-files/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/virtual-files"] });
      toast({ title: "Arquivo excluído" });
      setDeleteTarget(null);
    },
  });

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      // 1. Get upload URL
      const urlRes = await fetch("/api/objects/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!urlRes.ok) throw new Error("Falha ao obter URL de upload");
      const { uploadURL } = await urlRes.json();

      // 2. Upload file
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
        body: uploadFile,
      });

      // 3. Register in virtual files
      const folder = uploadFolder === "__custom" ? customFolder : uploadFolder;
      const r = await fetch("/api/virtual-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadFile.name,
          fileType: uploadFile.type || "application/octet-stream",
          fileSize: uploadFile.size,
          objectPath: uploadURL,
          folder: folder || "Geral",
          tags: uploadTags || null,
          description: uploadDesc || null,
        }),
      });
      if (!r.ok) throw new Error("Falha ao registrar arquivo");

      qc.invalidateQueries({ queryKey: ["/api/virtual-files"] });
      toast({ title: "Arquivo enviado com sucesso!" });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTags("");
      setUploadDesc("");
      setCustomFolder("");
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadFolder, uploadTags, uploadDesc, customFolder, qc, toast]);

  const handleDownload = (f: VirtualFile) => {
    const a = document.createElement("a");
    a.href = f.objectPath;
    a.download = f.fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportDRE = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const end = now.toISOString().split("T")[0];
    window.open(`/api/dre/export?startDate=${start}&endDate=${end}`, "_blank");
  };

  // Derived data
  const folders = [...new Set([...FOLDERS, ...files.map((f) => f.folder)])];
  const filtered = files.filter((f) => {
    if (activeFolder && f.folder !== activeFolder) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        f.fileName.toLowerCase().includes(s) ||
        (f.tags || "").toLowerCase().includes(s) ||
        (f.description || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const folderCounts: Record<string, number> = {};
  files.forEach((f) => {
    folderCounts[f.folder] = (folderCounts[f.folder] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-3">
            <Archive className="h-7 w-7 text-primary" />
            Arquivo Virtual
          </h1>
          <p>Gerencie recibos, notas fiscais, planilhas e documentos da empresa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDRE} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Exportar DRE (.xlsx)
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Enviar Arquivo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi-card animate-slide-up stagger-1">
          <div className="kpi-accent bg-blue-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total de Arquivos
            </span>
            <p className="text-2xl font-bold mt-1">{files.length}</p>
          </CardContent>
        </div>
        <div className="kpi-card animate-slide-up stagger-2">
          <div className="kpi-accent bg-emerald-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pastas
            </span>
            <p className="text-2xl font-bold mt-1">{Object.keys(folderCounts).length || 0}</p>
          </CardContent>
        </div>
        <div className="kpi-card animate-slide-up stagger-3">
          <div className="kpi-accent bg-amber-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Planilhas
            </span>
            <p className="text-2xl font-bold mt-1">
              {files.filter((f) => f.fileName.match(/\.(xlsx?|csv)$/i)).length}
            </p>
          </CardContent>
        </div>
        <div className="kpi-card animate-slide-up stagger-4">
          <div className="kpi-accent bg-purple-500" />
          <CardContent className="p-4 pl-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tamanho Total
            </span>
            <p className="text-2xl font-bold mt-1">
              {formatSize(files.reduce((s, f) => s + (f.fileSize || 0), 0))}
            </p>
          </CardContent>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar - Folders */}
        <Card className="border-none shadow-sm lg:w-64 flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Pastas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeFolder ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60"
              }`}
            >
              Todos os Arquivos
              <Badge variant="secondary" className="ml-2 text-[10px]">{files.length}</Badge>
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeFolder === folder ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60"
                }`}
              >
                {folder}
                {folderCounts[folder] && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">{folderCounts[folder]}</Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, tag ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* File list */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum arquivo encontrado</p>
                  <p className="text-xs mt-1">Envie seu primeiro arquivo clicando em "Enviar Arquivo"</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((f) => (
                    <div key={f.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex-shrink-0">{getFileIcon(f.fileType, f.fileName)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{f.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatSize(f.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(f.createdAt).toLocaleDateString("pt-BR")}</span>
                          {f.folder && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{f.folder}</Badge>
                            </>
                          )}
                          {f.tags && f.tags.split(",").map((t) => (
                            <Badge key={t.trim()} variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Tag className="h-2.5 w-2.5 mr-0.5" />{t.trim()}
                            </Badge>
                          ))}
                        </div>
                        {f.description && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{f.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(f)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(f)}>
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
              <Upload className="h-5 w-5" /> Enviar Arquivo
            </DialogTitle>
            <DialogDescription>
              Envie recibos, notas fiscais, planilhas (.xlsx) ou qualquer documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo *</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.docx,.doc,.pdf,.png,.jpg,.jpeg,.csv,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Pasta</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  <SelectItem value="__custom">
                    <span className="flex items-center gap-1"><FolderPlus className="h-3 w-3" /> Nova pasta...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {uploadFolder === "__custom" && (
                <Input
                  placeholder="Nome da nova pasta"
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                placeholder="recibo, abril, funcionário"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Recibo de pagamento João - Abril/2026"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo "{deleteTarget?.fileName}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
