
import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Quote, Client, QuoteItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, RotateCcw, Download, Eye } from "lucide-react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { QuotePDF } from "@/components/quote-pdf";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

export default function QuoteEditor() {
    const [, params] = useRoute("/orcamentos/:id/editor");
    const id = params?.id;
    const { toast } = useToast();

    const { data: quote, isLoading: loadingQuote } = useQuery<Quote>({
        queryKey: ["/api/quotes", id],
        enabled: !!id,
    });

    const { data: client, isLoading: loadingClient } = useQuery<Client>({
        queryKey: ["/api/clients", quote?.clientId],
        enabled: !!quote?.clientId,
    });

    const { data: items = [], isLoading: loadingItems } = useQuery<QuoteItem[]>({
        queryKey: ["/api/quote-items", id],
        enabled: !!id,
    });

    // Local state for editing
    const [editedQuote, setEditedQuote] = useState<Quote | null>(null);
    const [editedClient, setEditedClient] = useState<Client | null>(null);
    const [editedItems, setEditedItems] = useState<QuoteItem[]>([]);

    // Initialize local state when data loads
    useEffect(() => {
        if (quote) setEditedQuote(quote);
    }, [quote]);

    useEffect(() => {
        if (client) setEditedClient(client);
    }, [client]);

    useEffect(() => {
        if (items.length > 0) setEditedItems(items);
    }, [items]);

    const handleDownload = async () => {
        if (!editedQuote || !editedClient) return;
        try {
            const blob = await pdf(<QuotePDF quote={editedQuote} client={editedClient} items={editedItems} />).toBlob();
            const cleanNumber = editedQuote.number ? editedQuote.number.replace(/[^a-zA-Z0-9-_]/g, '-') : 'orcamento';
            saveAs(blob, `${cleanNumber}-editado.pdf`);
            toast({ title: "PDF baixado com sucesso!" });
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast({ title: "Erro ao gerar PDF", variant: "destructive" });
        }
    };

    const handleReset = () => {
        if (confirm("Tem certeza? Isso desfazerá todas as alterações não salvas.")) {
            if (quote) setEditedQuote(quote);
            if (client) setEditedClient(client);
            if (items.length > 0) setEditedItems(items);
            toast({ title: "Edições resetadas para o original." });
        }
    };

    if (loadingQuote || loadingClient || loadingItems || !editedQuote || !editedClient) {
        return <div className="flex items-center justify-center h-screen">Carregando editor...</div>;
    }

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
            {/* Left Panel - Editor */}
            <div className="w-1/2 flex flex-col border-r h-full">
                <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold">Editor de Documento</h1>
                            <p className="text-xs text-muted-foreground">{editedQuote.number}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Resetar
                        </Button>
                        <Button size="sm" onClick={handleDownload} className="bg-black hover:bg-zinc-800">
                            <Download className="h-4 w-4 mr-2" /> Baixar PDF
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Dados do Documento</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Número</Label>
                                        <Input
                                            value={editedQuote.number}
                                            onChange={(e) => setEditedQuote({ ...editedQuote, number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Validade</Label>
                                        <Input
                                            type="date"
                                            value={editedQuote.validUntil.split('T')[0]}
                                            onChange={(e) => setEditedQuote({ ...editedQuote, validUntil: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Observações Gerais</Label>
                                    <Textarea
                                        value={editedQuote.observations || ''}
                                        onChange={(e) => setEditedQuote({ ...editedQuote, observations: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Desconto (%)</Label>
                                        <Input
                                            type="number"
                                            value={editedQuote.discount || 0}
                                            onChange={(e) => setEditedQuote({ ...editedQuote, discount: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Dados do Cliente (Neste PDF)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome</Label>
                                    <Input
                                        value={editedClient.name}
                                        onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Contato</Label>
                                        <Input
                                            value={editedClient.contact}
                                            onChange={(e) => setEditedClient({ ...editedClient, contact: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Telefone</Label>
                                        <Input
                                            value={editedClient.phone}
                                            onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Endereço</Label>
                                    <Input
                                        value={editedClient.address || ''}
                                        onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens do Orçamento</h3>
                            {editedItems.map((item, index) => (
                                <Card key={item.id} className="overflow-hidden">
                                    <Accordion type="single" collapsible>
                                        <AccordionItem value={`item-${index}`} className="border-0">
                                            <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 hover:no-underline">
                                                <span className="font-medium text-sm truncate mr-2">
                                                    Item {index + 1}: {item.description.substring(0, 30)}...
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 space-y-4 border-t">
                                                <div className="space-y-2">
                                                    <Label>Descrição</Label>
                                                    <Textarea
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            const newItems = [...editedItems];
                                                            newItems[index] = { ...item, description: e.target.value };
                                                            setEditedItems(newItems);
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Largura</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.width || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...editedItems];
                                                                newItems[index] = { ...item, width: e.target.value };
                                                                setEditedItems(newItems);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Altura</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.height || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...editedItems];
                                                                newItems[index] = { ...item, height: e.target.value };
                                                                setEditedItems(newItems);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Qtd</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const newItems = [...editedItems];
                                                                const qty = parseFloat(e.target.value) || 0;
                                                                const total = qty * parseFloat(String(item.unitPrice || 0));
                                                                newItems[index] = { ...item, quantity: e.target.value, total: total.toFixed(2) };
                                                                setEditedItems(newItems);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Unitário</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => {
                                                                const newItems = [...editedItems];
                                                                const price = parseFloat(e.target.value) || 0;
                                                                const total = price * parseFloat(String(item.quantity || 1));
                                                                newItems[index] = { ...item, unitPrice: e.target.value, total: total.toFixed(2) };
                                                                setEditedItems(newItems);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Total (Calc)</Label>
                                                        <Input
                                                            value={item.total}
                                                            disabled
                                                            className="bg-muted"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Observações do Item</Label>
                                                    <Input
                                                        value={item.itemObservations || ''}
                                                        onChange={(e) => {
                                                            const newItems = [...editedItems];
                                                            newItems[index] = { ...item, itemObservations: e.target.value };
                                                            setEditedItems(newItems);
                                                        }}
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </Card>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-1/2 bg-zinc-100 flex flex-col h-full border-l">
                <div className="p-3 bg-zinc-200 border-b text-xs font-mono text-center text-zinc-500 uppercase tracking-widest">
                    Pré-visualização em Tempo Real
                </div>
                <div className="flex-1 p-0">
                    <PDFViewer width="100%" height="100%" showToolbar={false} className="border-none">
                        <QuotePDF quote={editedQuote} client={editedClient} items={editedItems} />
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
