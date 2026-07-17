import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Download, Trash2, Eye, Image as ImageIcon, Upload, Pencil, MoreHorizontal, Copy, Ruler } from "lucide-react";
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { QuotePDF } from "@/components/quote-pdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Quote, QuoteItem, Client } from "@shared/schema";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import PageHeader from "@/components/layout/page-header";
import { useTypologies, useAllTypologyMaterials, useAluminumProfiles } from "@/hooks/use-esquadrias";
import { Parser } from 'expr-eval';

export default function Orcamentos() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "aprovado" | "recusado">("todos");
  const [sortBy, setSortBy] = useState<"data" | "validade" | "valor">("data");
  const [openNew, setOpenNew] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<Array<{
    description: string;
    quantity: string;
    width?: string;
    height?: string;
    colorThickness?: string;
    profileColor?: string;
    accessoryColor?: string;
    line?: string;
    deliveryDate?: string;
    itemObservations?: string;
    environment?: string;
    unitPrice: string;
    imageUrl?: string;
    typologyId?: string;
    calculatedMaterials?: any;
    aluminumPrice?: string;
    glassPrice?: string;
    accessoriesPrice?: string;
    profitMargin?: string;
  }>>([
    { description: "", quantity: "1", unitPrice: "0", aluminumPrice: "0", glassPrice: "0", accessoriesPrice: "0", profitMargin: "0" }
  ]);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [discount, setDiscount] = useState<string>("0");
  const { toast } = useToast();

  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch all quote items
  const { data: allItems = [], isLoading: itemsLoading } = useQuery<QuoteItem[]>({
    queryKey: ["/api/quote-items"],
  });

  // Fetch typologies and materials for calculation
  const { data: typologies = [] } = useTypologies();
  const { data: allTypologyMaterials = [] } = useAllTypologyMaterials();
  const { data: aluminumProfiles = [] } = useAluminumProfiles();

  // Get items for selected quote
  const selectedQuoteItems = selectedQuote
    ? allItems.filter(item => item.quoteId === selectedQuote.id)
    : [];

  // Filter quotes
  const filteredQuotes = quotes
    .filter(quote => {
      const client = clients.find(c => c.id === quote.clientId);
      const matchesSearch = quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "validade") {
        return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
      }
      if (sortBy === "valor") {
        const subtotalA = allItems.filter(i => i.quoteId === a.id).reduce((s, i) => s + parseFloat(String(i.total)), 0);
        const subtotalB = allItems.filter(i => i.quoteId === b.id).reduce((s, i) => s + parseFloat(String(i.total)), 0);
        const discA = parseFloat(String(a.discount || "0"));
        const discB = parseFloat(String(b.discount || "0"));
        const totalA = subtotalA - (subtotalA * discA) / 100;
        const totalB = subtotalB - (subtotalB * discB) / 100;
        return totalB - totalA; // maior valor primeiro
      }
      // default: data de criação
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da; // mais recente primeiro
    });

  // Generate quote number
  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const count = quotes.length + 1;
    return `ORC-${year}-${String(count).padStart(3, '0')}`;
  };

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Verify that we have at least one valid item with description
      const hasValidItems = quoteItems.some(item => item.description && item.description.trim());
      if (!hasValidItems) {
        throw new Error("Adicione pelo menos um item com descrição antes de salvar");
      }

      const quoteData = {
        clientId: data.get("clientId") as string,
        number: generateQuoteNumber(),
        status: "pendente",
        validUntil: data.get("validUntil") as string,
        local: data.get("local") as string || "",
        tipo: data.get("tipo") as string || "",
        discount: data.get("discount") as string || "0",
        observations: data.get("observations") as string || "",
      };

      const response = await apiRequest("POST", "/api/quotes", quoteData);
      const quote = await response.json();

      // Create quote items
      for (const item of quoteItems) {
        if (item.description) {
          const total = parseFloat(item.quantity) * parseFloat(item.unitPrice);
          await apiRequest("POST", "/api/quote-items", {
            quoteId: quote.id,
            description: item.description,
            quantity: item.quantity,
            width: item.width || null,
            height: item.height || null,
            colorThickness: item.colorThickness || null,
            profileColor: item.profileColor || null,
            accessoryColor: item.accessoryColor || null,
            line: item.line || null,
            deliveryDate: item.deliveryDate || null,
            itemObservations: item.itemObservations || null,
            environment: item.environment || null,
            typologyId: item.typologyId || null,
            unitPrice: item.unitPrice,
            total: total.toString(),
            // Keep the raw stringified configuration inside calculated materials for historical records
            calculatedMaterials: item.calculatedMaterials ? {
              materials: item.calculatedMaterials,
              costs: {
                aluminumPricePerKg: item.aluminumPrice || "0",
                glassPricePerSqm: item.glassPrice || "0",
                accessoriesPrice: item.accessoriesPrice || "0",
                profitMargin: item.profitMargin || "0"
              }
            } : null,
          });
        }
      }

      return quote;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/quote-items"] });
      toast({
        title: "Orçamento criado!",
        description: "O orçamento foi gerado com sucesso.",
      });
      setOpenNew(false);
      setQuoteItems([{ description: "", quantity: "1", unitPrice: "0" }]);
      setDiscount("0");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update quote status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/quotes/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Status atualizado!",
        description: "O status do orçamento foi alterado.",
      });
    },
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-items"] });
      toast({
        title: "Orçamento excluído!",
        description: "O orçamento foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate quote mutation
  const duplicateQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/quotes/${id}/duplicate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-items"] });
      toast({
        title: "Orçamento duplicado!",
        description: "Uma cópia do orçamento foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao duplicar orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingQuote) throw new Error("No quote to edit");

      // Verify that we have at least one valid item with description
      const hasValidItems = quoteItems.some(item => item.description && item.description.trim());
      if (!hasValidItems) {
        throw new Error("Adicione pelo menos um item com descrição antes de salvar");
      }

      const quoteData = {
        clientId: data.get("clientId") as string,
        validUntil: data.get("validUntil") as string,
        local: data.get("local") as string || "",
        tipo: data.get("tipo") as string || "",
        discount: data.get("discount") as string || "0",
        observations: data.get("observations") as string || "",
      };

      const response = await apiRequest("PATCH", `/api/quotes/${editingQuote.id}`, quoteData);
      const quote = await response.json();

      // Delete existing items
      const existingItems = allItems.filter(item => item.quoteId === editingQuote.id);
      for (const item of existingItems) {
        await apiRequest("DELETE", `/api/quote-items/${item.id}`);
      }

      // Create new items
      for (const item of quoteItems) {
        if (item.description) {
          const total = parseFloat(item.quantity) * parseFloat(item.unitPrice);
          await apiRequest("POST", "/api/quote-items", {
            quoteId: quote.id,
            description: item.description,
            quantity: item.quantity,
            width: item.width || null,
            height: item.height || null,
            colorThickness: item.colorThickness || null,
            profileColor: item.profileColor || null,
            accessoryColor: item.accessoryColor || null,
            line: item.line || null,
            deliveryDate: item.deliveryDate || null,
            itemObservations: item.itemObservations || null,
            environment: item.environment || null,
            typologyId: item.typologyId || null,
            unitPrice: item.unitPrice,
            total: total.toString(),
            imageUrl: item.imageUrl || null,
            calculatedMaterials: item.calculatedMaterials ? {
              materials: item.calculatedMaterials,
              costs: {
                aluminumPricePerKg: item.aluminumPrice || "0",
                glassPricePerSqm: item.glassPrice || "0",
                accessoriesPrice: item.accessoriesPrice || "0",
                profitMargin: item.profitMargin || "0"
              }
            } : null,
          });
        }
      }

      return quote;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/quote-items"] });
      toast({
        title: "Orçamento atualizado!",
        description: "O orçamento foi atualizado com sucesso.",
      });
      setOpenNew(false);
      setEditingQuote(null);
      setQuoteItems([{ description: "", quantity: "1", unitPrice: "0", aluminumPrice: "0", glassPrice: "0", accessoriesPrice: "0", profitMargin: "0" }]);
      setDiscount("0");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitNew = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (editingQuote) {
      updateQuoteMutation.mutate(formData);
    } else {
      createQuoteMutation.mutate(formData);
    }
  };

  const addItem = () => {
    setQuoteItems([...quoteItems, { description: "", quantity: "1", unitPrice: "0" }]);
  };

  const removeItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const calculateTypologyMaterials = (typologyId: string, width: string, height: string) => {
    if (!typologyId || !width || !height) return null;
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (isNaN(w) || isNaN(h)) return null;

    const materials = allTypologyMaterials.filter(m => m.typologyId === typologyId);

    return materials.map(mat => {
      const profile = aluminumProfiles.find(p => p.id === mat.profileId);
      let calculatedSize = 0;
      let calculatedQuantity = 0;
      try {
        const parser = new Parser();
        calculatedSize = parser.evaluate(mat.formula, { L: w, H: h });
        calculatedQuantity = parser.parse(mat.quantityFormula || "1").evaluate({ L: w, H: h });
      } catch (e) {
        console.error("Formula error", e);
      }

      const weightPerMeter = profile ? parseFloat(String(profile.weightPerMeter)) : 0;
      const totalWeight = (calculatedSize / 1000) * calculatedQuantity * weightPerMeter;

      return {
        ...mat,
        profile,
        calculatedSize,
        calculatedQuantity,
        totalWeight
      };
    });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...quoteItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate materials and prices if dimensions or typology changes
    if (['width', 'height', 'typologyId', 'aluminumPrice', 'glassPrice', 'accessoriesPrice', 'profitMargin'].includes(field)) {
      const item = updated[index];
      if (item.typologyId) {
        const calc = calculateTypologyMaterials(item.typologyId, item.width || "", item.height || "");
        updated[index].calculatedMaterials = calc;

        // Calculate Unit Price
        if (calc) {
          const totalKg = calc.reduce((acc: number, cur: any) => acc + (cur.totalWeight || 0), 0);
          const aluminumCost = totalKg * parseFloat(item.aluminumPrice || "0");

          // Basic glass Area: (L/1000) * (H/1000)
          const wM = parseFloat(item.width || "0") / 1000;
          const hM = parseFloat(item.height || "0") / 1000;
          const glassArea = wM * hM;
          const glassCost = glassArea * parseFloat(item.glassPrice || "0");

          const accessoriesCost = parseFloat(item.accessoriesPrice || "0");
          const rawCost = aluminumCost + glassCost + accessoriesCost;

          const profit = parseFloat(item.profitMargin || "0");
          const finalPrice = rawCost / (1 - (profit / 100)); // Markup formulation

          updated[index].unitPrice = isNaN(finalPrice) || !isFinite(finalPrice) ? "0" : finalPrice.toFixed(2);
        }
      } else {
        updated[index].calculatedMaterials = null;
      }
    }

    // Auto-fill description when typology is selected
    if (field === 'typologyId' && value) {
      const tipologia = typologies.find(t => t.id === value);
      if (tipologia && !updated[index].description) {
        updated[index].description = tipologia.name;
      }
    }

    setQuoteItems(updated);
  };

  const calculateTotal = () => {
    return quoteItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice));
    }, 0);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingImage(index);

      // Get upload URL
      const uploadResponse = await apiRequest("POST", "/api/objects/upload", {
        bucketName: "project-files",
        pathPrefix: "quote-item-images"
      });
      const { uploadURL } = await uploadResponse.json();

      // Upload file
      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error("Erro ao fazer upload da imagem");
      }

      // Extract the object path from the upload URL to create a public access path
      // The upload URL is like: https://storage.googleapis.com/bucket/path/to/file?X-Goog-...
      // We need to convert it to: /objects/uploads/uuid
      const url = new URL(uploadURL);
      const pathname = url.pathname; // e.g., /bucket-name/PRIVATE_OBJECT_DIR/uploads/uuid

      // Extract the part after the bucket and private dir to create /objects/ path
      // URL format: .../bucketName/pathPrefix/uuid?token...
      // We want to store: /objects/bucketName/pathPrefix/uuid

      // Since we know the bucket and prefix we requested:
      const pathParts = pathname.split('/');
      const objectId = pathParts[pathParts.length - 1].split('?')[0];
      const targetPath = `/objects/project-files/quote-item-images/${objectId}`;
      const publicPath = targetPath;

      // Update item with normalized public path
      const updated = [...quoteItems];
      updated[index] = { ...updated[index], imageUrl: publicPath };
      setQuoteItems(updated);

      toast({
        title: "Imagem adicionada!",
        description: "A imagem foi carregada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao fazer upload",
        description: "Não foi possível carregar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleEditQuote = (quote: Quote) => {
    const items = allItems.filter(item => item.quoteId === quote.id);

    setEditingQuote(quote);
    setDiscount(quote.discount || "0");

    if (items.length > 0) {
      setQuoteItems(items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        width: item.width || "",
        height: item.height || "",
        colorThickness: item.colorThickness || "",
        profileColor: item.profileColor || "",
        accessoryColor: item.accessoryColor || "",
        line: item.line || "",
        deliveryDate: item.deliveryDate || "",
        itemObservations: item.itemObservations || "",
        environment: item.environment || "",
        unitPrice: item.unitPrice,
        imageUrl: item.imageUrl || "",
        typologyId: item.typologyId || "",
        calculatedMaterials: (item.calculatedMaterials as any)?.materials || null,
        aluminumPrice: (item.calculatedMaterials as any)?.costs?.aluminumPricePerKg || "0",
        glassPrice: (item.calculatedMaterials as any)?.costs?.glassPricePerSqm || "0",
        accessoriesPrice: (item.calculatedMaterials as any)?.costs?.accessoriesPrice || "0",
        profitMargin: (item.calculatedMaterials as any)?.costs?.profitMargin || "0",
      })));
    } else {
      setQuoteItems([{ description: "", quantity: "1", unitPrice: "0", aluminumPrice: "0", glassPrice: "0", accessoriesPrice: "0", profitMargin: "0" }]);
    }

    setOpenNew(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pendente: "secondary",
      aprovado: "default",
      recusado: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Orçamentos" subtitle="Crie e gerencie orçamentos para clientes">
        <div className="flex gap-2">
          <Button
            data-testid="button-new-quote"
            className="rounded-full"
            onClick={() => setLocation('/orcamentos/novo')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento (Wizard)
          </Button>

          <Button
            data-testid="button-new-express-quote"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setEditingQuote(null);
              setQuoteItems([{ description: "", quantity: "1", unitPrice: "0" }]);
              setDiscount("0");
              setOpenNew(true);
            }}
          >
            Avulso / Express
          </Button>
        </div>

        <Dialog open={openNew} onOpenChange={(open) => {
          setOpenNew(open);
          if (!open) {
            setEditingQuote(null);
            setQuoteItems([{ description: "", quantity: "1", unitPrice: "0" }]);
            setDiscount("0");
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuote ? 'Editar Orçamento' : 'Criar Novo Orçamento'}</DialogTitle>
              <DialogDescription>Preencha os dados para gerar o orçamento em PDF</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNew} className="space-y-4" key={editingQuote?.id || 'new'}>
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select name="clientId" required defaultValue={editingQuote?.clientId}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium">Endereço da Obra</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="local">Local/Ambiente</Label>
                    <Input
                      id="local"
                      name="local"
                      placeholder="Ex: Banheiro Social"
                      data-testid="input-local"
                      defaultValue={editingQuote?.local || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Input
                      id="tipo"
                      name="tipo"
                      placeholder="Ex: Box de Vidro"
                      data-testid="input-tipo"
                      defaultValue={editingQuote?.tipo || ""}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido até *</Label>
                <Input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  data-testid="input-valid-until"
                  defaultValue={editingQuote?.validUntil}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="Ex: 10 (para 10% de desconto)"
                  data-testid="input-discount"
                />
              </div>

              <div className="space-y-2">
                <Label>Itens do Orçamento</Label>
                {quoteItems.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-3">
                            <Label htmlFor={`env-${index}`}>Local/Ambiente</Label>
                            <Input
                              id={`env-${index}`}
                              placeholder="Ex: Sala de Estar, Cozinha..."
                              value={item.environment || ""}
                              onChange={(e) => updateItem(index, 'environment', e.target.value)}
                              data-testid={`input-item-env-${index}`}
                            />
                          </div>
                          <div className="col-span-3">
                            <Label htmlFor={`typology-${index}`}>Tipologia (Modelo Base)</Label>
                            <Select
                              value={item.typologyId || "livre"}
                              onValueChange={(val) => updateItem(index, 'typologyId', val === "livre" ? "" : val)}
                            >
                              <SelectTrigger id={`typology-${index}`}>
                                <SelectValue placeholder="Item Livre (Sem cálculo automático)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="livre">Item Livre (Sem cálculo automático)</SelectItem>
                                {typologies.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label htmlFor={`desc-${index}`}>Descrição do Item *</Label>
                            <Input
                              id={`desc-${index}`}
                              placeholder="Ex: BOX EM 'L', COM 05 FOLHAS..."
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              data-testid={`input-item-desc-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`qty-${index}`}>Qtde. *</Label>
                            <Input
                              id={`qty-${index}`}
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              data-testid={`input-item-qty-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`width-${index}`}>Largura (mm)</Label>
                            <Input
                              id={`width-${index}`}
                              type="number"
                              placeholder="Ex: 2300"
                              value={item.width || ""}
                              onChange={(e) => updateItem(index, 'width', e.target.value)}
                              data-testid={`input-item-width-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`height-${index}`}>Altura (mm)</Label>
                            <Input
                              id={`height-${index}`}
                              type="number"
                              placeholder="Ex: 1900"
                              value={item.height || ""}
                              onChange={(e) => updateItem(index, 'height', e.target.value)}
                              data-testid={`input-item-height-${index}`}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor={`color-${index}`}>Cor e Espessura</Label>
                            <Input
                              id={`color-${index}`}
                              placeholder="Ex: TEMP. INCOLOR 08MM"
                              value={item.colorThickness || ""}
                              onChange={(e) => updateItem(index, 'colorThickness', e.target.value)}
                              data-testid={`input-item-color-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`price-${index}`}>Vlr. Unit. *</Label>
                            <Input
                              id={`price-${index}`}
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                              data-testid={`input-item-price-${index}`}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor={`profile-${index}`}>*Cor Perfil</Label>
                            <Input
                              id={`profile-${index}`}
                              placeholder="Ex: BRANCO BRILHO RAL9003"
                              value={item.profileColor || ""}
                              onChange={(e) => updateItem(index, 'profileColor', e.target.value)}
                              data-testid={`input-item-profile-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`accessory-${index}`}>*Cor Acessório</Label>
                            <Input
                              id={`accessory-${index}`}
                              placeholder="Ex: BRANCO"
                              value={item.accessoryColor || ""}
                              onChange={(e) => updateItem(index, 'accessoryColor', e.target.value)}
                              data-testid={`input-item-accessory-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`line-${index}`}>Linha</Label>
                            <Input
                              id={`line-${index}`}
                              placeholder="Ex: DIVERSOS"
                              value={item.line || ""}
                              onChange={(e) => updateItem(index, 'line', e.target.value)}
                              data-testid={`input-item-line-${index}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`delivery-${index}`}>Data Entrega</Label>
                            <Input
                              id={`delivery-${index}`}
                              type="date"
                              value={item.deliveryDate || ""}
                              onChange={(e) => updateItem(index, 'deliveryDate', e.target.value)}
                              data-testid={`input-item-delivery-${index}`}
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <div className="h-9 px-3 flex items-center border rounded-md font-mono bg-muted">
                              {formatCurrency(parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0"))}
                            </div>
                          </div>

                          {item.calculatedMaterials && item.calculatedMaterials.length > 0 && (
                            <div className="col-span-3 mt-2 border rounded-md p-3 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
                              <h5 className="text-xs font-semibold flex items-center gap-2 text-primary">
                                <Ruler className="h-3.5 w-3.5" />
                                Memória de Cálculo (Automático)
                              </h5>
                              <div className="grid grid-cols-4 gap-4 bg-muted/30 p-3 rounded-md border">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Alumínio Base/Kg</Label>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-muted-foreground">R$</span>
                                    <Input
                                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                      value={item.aluminumPrice || ""}
                                      onChange={e => updateItem(index, 'aluminumPrice', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Vidro/m²</Label>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-muted-foreground">R$</span>
                                    <Input
                                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                      value={item.glassPrice || ""}
                                      onChange={e => updateItem(index, 'glassPrice', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Acessórios (Total)</Label>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-muted-foreground">R$</span>
                                    <Input
                                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                      value={item.accessoriesPrice || ""}
                                      onChange={e => updateItem(index, 'accessoriesPrice', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem de Lucro</Label>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Input
                                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                      value={item.profitMargin || ""}
                                      onChange={e => updateItem(index, 'profitMargin', e.target.value)}
                                    />
                                    <span className="text-xs font-medium">%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="border rounded overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="h-8">
                                      <TableHead className="text-[10px] p-2">Perfil</TableHead>
                                      <TableHead className="text-[10px] p-2">Corte (mm)</TableHead>
                                      <TableHead className="text-[10px] p-2 text-right">Qtd.</TableHead>
                                      <TableHead className="text-[10px] p-2 text-right">Peso (kg)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {item.calculatedMaterials.map((mat: any, i: number) => (
                                      <TableRow key={i} className="h-8">
                                        <TableCell className="text-[10px] p-2 font-medium">
                                          {mat.profile?.code}
                                        </TableCell>
                                        <TableCell className="text-[10px] p-2 text-blue-600 font-mono">
                                          {mat.calculatedSize.toFixed(1)}
                                        </TableCell>
                                        <TableCell className="text-[10px] p-2 text-right">
                                          {mat.calculatedQuantity}
                                        </TableCell>
                                        <TableCell className="text-[10px] p-2 text-right text-muted-foreground">
                                          {mat.totalWeight.toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/30">
                                      <TableCell colSpan={3} className="text-[10px] p-2 font-semibold text-right">Peso Total de Alumínio:</TableCell>
                                      <TableCell className="text-[10px] p-2 font-bold text-right">
                                        {item.calculatedMaterials.reduce((acc: number, cur: any) => acc + (cur.totalWeight || 0), 0).toFixed(2)} kg
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          <div className="col-span-3">
                            <Label htmlFor={`obs-${index}`}>Observações do Item</Label>
                            <Textarea
                              id={`obs-${index}`}
                              placeholder="Ex: *COM COLUNA DE 4' X 2', SUPERIOR."
                              value={item.itemObservations || ""}
                              onChange={(e) => updateItem(index, 'itemObservations', e.target.value)}
                              rows={2}
                              data-testid={`textarea-item-obs-${index}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <Label>Imagem</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(index, file);
                            }}
                            disabled={uploadingImage === index}
                            className="hidden"
                            id={`image-upload-${index}`}
                            data-testid={`input-item-image-${index}`}
                          />
                          <label htmlFor={`image-upload-${index}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingImage === index}
                              asChild
                            >
                              <span className="cursor-pointer">
                                {uploadingImage === index ? (
                                  "Enviando..."
                                ) : item.imageUrl ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                        {quoteItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={addItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                  <div className="text-right space-y-1">
                    {(() => {
                      const subtotal = calculateTotal();
                      const discountValue = (subtotal * parseFloat(discount || "0")) / 100;
                      const total = subtotal - discountValue;
                      return (
                        <>
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-mono">{formatCurrency(subtotal)}</span>
                          </div>
                          {parseFloat(discount || "0") > 0 && (
                            <div className="flex justify-between gap-4 text-sm">
                              <span className="text-muted-foreground">Desconto ({discount}%):</span>
                              <span className="font-mono text-red-600 dark:text-red-500">-{formatCurrency(discountValue)}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4 pt-1 border-t">
                            <span className="text-sm font-medium">Total:</span>
                            <span className="text-2xl font-bold font-mono" data-testid="text-quote-total">{formatCurrency(total)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  name="observations"
                  placeholder="Ex: Inclui instalação e garantia de 1 ano"
                  rows={3}
                  data-testid="textarea-observations"
                  defaultValue={editingQuote?.observations || ""}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                data-testid="button-submit-quote"
                disabled={editingQuote ? updateQuoteMutation.isPending : createQuoteMutation.isPending}
              >
                {editingQuote
                  ? (updateQuoteMutation.isPending ? "Atualizando..." : "Atualizar Orçamento")
                  : (createQuoteMutation.isPending ? "Gerando..." : "Gerar Orçamento")
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Toolbar: busca + filtros + ordenação */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full"
            data-testid="input-search"
          />
        </div>
        <ToggleGroup type="single" value={statusFilter} onValueChange={(v) => v && setStatusFilter(v as any)} aria-label="Filtrar por status">
          <ToggleGroupItem value="todos" className="rounded-full px-4">Todos</ToggleGroupItem>
          <ToggleGroupItem value="pendente" className="rounded-full px-4">Pendente</ToggleGroupItem>
          <ToggleGroupItem value="aprovado" className="rounded-full px-4">Aprovado</ToggleGroupItem>
          <ToggleGroupItem value="recusado" className="rounded-full px-4">Recusado</ToggleGroupItem>
        </ToggleGroup>
        <div className="w-[200px]">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger aria-label="Ordenar" className="rounded-full">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Mais recente</SelectItem>
              <SelectItem value="validade">Validade (asc)</SelectItem>
              <SelectItem value="valor">Valor (desc)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listagem em tabela */}
      {quotesLoading ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Orçamentos Criados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(4)].map((_, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : filteredQuotes.length === 0 ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Orçamentos Criados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou crie um novo orçamento</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Orçamentos Criados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map(quote => {
                    const client = clients.find(c => c.id === quote.clientId);
                    const items = allItems.filter(item => item.quoteId === quote.id);
                    const subtotal = items.reduce((sum, item) => sum + parseFloat(String(item.total)), 0);
                    const disc = parseFloat(String(quote.discount || "0"));
                    const total = subtotal - (subtotal * disc) / 100;
                    const dateStr = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pt-BR') : new Date(quote.validUntil).toLocaleDateString('pt-BR');
                    return (
                      <TableRow key={quote.id} data-testid={`row-quote-${quote.id}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{quote.number}</TableCell>
                        <TableCell>{client?.name}</TableCell>
                        <TableCell>{dateStr}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(total)}</TableCell>
                        <TableCell>{getStatusBadge(quote.status)}</TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setSelectedQuote(quote)}
                                    data-testid={`button-view-quote-${quote.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visualizar</TooltipContent>
                              </Tooltip>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Mais ações" className="rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditQuote(quote)} disabled={itemsLoading}>
                                    <Pencil className="h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  {client && items.length > 0 && (
                                    <DropdownMenuItem
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        try {
                                          const blob = await pdf(<QuotePDF quote={quote} client={client} items={items} />).toBlob();
                                          const cleanNumber = quote.number ? quote.number.replace(/[^a-zA-Z0-9-_]/g, '-') : 'orcamento';
                                          saveAs(blob, `${cleanNumber}.pdf`);
                                          toast({ title: "PDF baixado com sucesso!" });
                                        } catch (error) {
                                          console.error("Erro ao gerar PDF:", error);
                                          toast({
                                            title: "Erro ao gerar PDF",
                                            description: "Não foi possível criar o arquivo. Verifique se o logo está acessível.",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4" /> Baixar PDF
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setLocation(`/orcamentos/${quote.id}/editor`)}>
                                    <FileText className="h-4 w-4" /> Editar Documento
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateQuoteMutation.mutate(quote.id)} disabled={duplicateQuoteMutation.isPending}>
                                    <Copy className="h-4 w-4" /> Duplicar
                                  </DropdownMenuItem>
                                  {quote.status === 'pendente' && (
                                    <>
                                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'aprovado' })}>
                                        ✅ Aprovar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'recusado' })}>
                                        ❌ Recusar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-destructive" data-testid={`button-delete-quote-${quote.id}`}>
                                        <Trash2 className="h-4 w-4" /> Excluir
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta ação não pode ser desfeita. O orçamento "{quote.number}" será permanentemente removido do sistema.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteQuoteMutation.mutate(quote.id)}
                                          data-testid="button-confirm-delete"
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Quote Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuote?.number}</DialogTitle>
            <DialogDescription>
              Cliente: {clients.find(c => c.id === selectedQuote?.clientId)?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{getStatusBadge(selectedQuote.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Válido até</p>
                  <p className="font-medium">{new Date(selectedQuote.validUntil).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {(selectedQuote.local || selectedQuote.tipo) && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-3">Endereço da Obra</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedQuote.local && (
                      <div>
                        <p className="text-sm text-muted-foreground">Local/Ambiente</p>
                        <p className="font-medium">{selectedQuote.local}</p>
                      </div>
                    )}
                    {selectedQuote.tipo && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo</p>
                        <p className="font-medium">{selectedQuote.tipo}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Itens</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Valor Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuoteItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{parseFloat(String(item.quantity)).toFixed(2)}</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-right mt-4 space-y-1">
                  {(() => {
                    const subtotal = selectedQuoteItems.reduce((sum, item) => sum + parseFloat(String(item.total)), 0);
                    const discountPercent = parseFloat(String(selectedQuote.discount || "0"));
                    const discountValue = (subtotal * discountPercent) / 100;
                    const total = subtotal - discountValue;
                    return (
                      <>
                        <div className="flex justify-end gap-4 text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-mono">{formatCurrency(subtotal)}</span>
                        </div>
                        {discountPercent > 0 && (
                          <div className="flex justify-end gap-4 text-sm">
                            <span className="text-muted-foreground">Desconto ({discountPercent}%):</span>
                            <span className="font-mono text-red-600 dark:text-red-500">-{formatCurrency(discountValue)}</span>
                          </div>
                        )}
                        <div className="flex justify-end gap-4 pt-1 border-t">
                          <span className="font-medium">Total:</span>
                          <span className="text-lg font-bold font-mono">{formatCurrency(total)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {selectedQuote.observations && (
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm">{selectedQuote.observations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
