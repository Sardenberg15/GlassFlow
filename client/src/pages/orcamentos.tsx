import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Download, Trash2, Eye, Image as ImageIcon, Upload } from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
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

export default function Orcamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<Array<{ description: string; quantity: string; unitPrice: string; imageUrl?: string }>>([
    { description: "", quantity: "1", unitPrice: "0" }
  ]);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
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
  const { data: allItems = [] } = useQuery<QuoteItem[]>({
    queryKey: ["/api/quote-items"],
  });

  // Get items for selected quote
  const selectedQuoteItems = selectedQuote 
    ? allItems.filter(item => item.quoteId === selectedQuote.id)
    : [];

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const client = clients.find(c => c.id === quote.clientId);
    const matchesSearch = quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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
      const quoteData = {
        clientId: data.get("clientId") as string,
        number: generateQuoteNumber(),
        status: "pendente",
        validUntil: data.get("validUntil") as string,
        local: data.get("local") as string || "",
        tipo: data.get("tipo") as string || "",
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
            unitPrice: item.unitPrice,
            total: total.toString(),
            imageUrl: item.imageUrl || null,
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

  const handleSubmitNew = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createQuoteMutation.mutate(formData);
  };

  const addItem = () => {
    setQuoteItems([...quoteItems, { description: "", quantity: "1", unitPrice: "0" }]);
  };

  const removeItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...quoteItems];
    updated[index] = { ...updated[index], [field]: value };
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
      const uploadResponse = await apiRequest("POST", "/api/objects/upload");
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
      const pathParts = pathname.split('/uploads/');
      const objectId = pathParts[pathParts.length - 1].split('?')[0];
      const publicPath = `/objects/uploads/${objectId}`;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Orçamentos</h1>
          <p className="text-muted-foreground">Gere e gerencie orçamentos padronizados</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-quote">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Orçamento</DialogTitle>
              <DialogDescription>Preencha os dados para gerar o orçamento em PDF</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente *</Label>
                  <Select name="clientId" required>
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
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Válido até *</Label>
                  <Input 
                    id="validUntil" 
                    name="validUntil" 
                    type="date" 
                    data-testid="input-valid-until"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="local">Local/Ambiente</Label>
                  <Input 
                    id="local" 
                    name="local" 
                    placeholder="Ex: Banheiro Social"
                    data-testid="input-local"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Input 
                    id="tipo" 
                    name="tipo" 
                    placeholder="Ex: Box de Vidro"
                    data-testid="input-tipo"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Itens do Orçamento</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-24">Qtd.</TableHead>
                      <TableHead className="w-32">Valor Unit.</TableHead>
                      <TableHead className="w-32">Total</TableHead>
                      <TableHead className="w-32">Imagem</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            placeholder="Ex: Vidro temperado 8mm"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            data-testid={`input-item-desc-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            data-testid={`input-item-qty-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                            data-testid={`input-item-price-${index}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(parseFloat(item.quantity) * parseFloat(item.unitPrice))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
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
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={addItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total do Orçamento</p>
                    <p className="text-2xl font-bold" data-testid="text-quote-total">
                      {formatCurrency(calculateTotal())}
                    </p>
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
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                data-testid="button-submit-quote"
                disabled={createQuoteMutation.isPending}
              >
                {createQuoteMutation.isPending ? "Gerando..." : "Gerar Orçamento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar orçamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Quotes List */}
      {quotesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-sm text-muted-foreground">Crie seu primeiro orçamento clicando no botão acima</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuotes.map(quote => {
            const client = clients.find(c => c.id === quote.clientId);
            const quoteItems = allItems.filter(item => item.quoteId === quote.id);
            return (
              <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{quote.number}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{client?.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusBadge(quote.status)}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-delete-quote-${quote.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Válido até:</span>
                    <span>{new Date(quote.validUntil).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedQuote(quote)}
                      data-testid={`button-view-quote-${quote.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                    {client && quoteItems.length > 0 && (
                      <PDFDownloadLink
                        document={<QuotePDF quote={quote} client={client} items={quoteItems} />}
                        fileName={`${quote.number}.pdf`}
                        className="flex-1"
                      >
                        {({ loading }) => (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full"
                            disabled={loading}
                            data-testid={`button-download-pdf-${quote.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {loading ? 'Gerando...' : 'PDF'}
                          </Button>
                        )}
                      </PDFDownloadLink>
                    )}
                  </div>
                  {quote.status === 'pendente' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'aprovado' })}
                        data-testid={`button-approve-${quote.id}`}
                      >
                        Aprovar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'recusado' })}
                        data-testid={`button-reject-${quote.id}`}
                      >
                        Recusar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
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

              <div>
                <h3 className="font-semibold mb-2">Itens</h3>
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
                <div className="text-right mt-4">
                  <p className="text-lg font-bold">
                    Total: {formatCurrency(selectedQuoteItems.reduce((sum, item) => sum + parseFloat(String(item.total)), 0))}
                  </p>
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
