import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Landmark, Pencil, Check, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const COMMON_BANKS = [
    { id: "itau", name: "Itaú Unibanco", domain: "itau.com.br", color: "#EC7000" },
    { id: "bb", name: "Banco do Brasil", domain: "bb.com.br", color: "#F9D71C" },
    { id: "bradesco", name: "Bradesco", domain: "bradesco.com.br", color: "#CC092F" },
    { id: "santander", name: "Santander", domain: "santander.com.br", color: "#EC0000" },
    { id: "caixa", name: "Caixa Econômica", domain: "caixa.gov.br", color: "#005CA9" },
    { id: "nubank", name: "Nubank", domain: "nubank.com.br", color: "#8A05BE" },
    { id: "inter", name: "Banco Inter", domain: "bancointer.com.br", color: "#FF7A00" },
    { id: "btg", name: "BTG Pactual", domain: "btgpactual.com", color: "#002B49" },
    { id: "c6", name: "C6 Bank", domain: "c6bank.com.br", color: "#242424" },
    { id: "sicoob", name: "Sicoob", domain: "sicoob.com.br", color: "#00AE9D" },
    { id: "sicredi", name: "Sicredi", domain: "sicredi.com.br", color: "#32A041" },
    { id: "safra", name: "Banco Safra", domain: "safra.com.br", color: "#001A4E" },
    { id: "mercadopago", name: "Mercado Pago", domain: "mercadopago.com.br", color: "#009EE3" },
    { id: "pagbank", name: "PagBank / PagSeguro", domain: "pagbank.com.br", color: "#9BB52A" },
    { id: "asaas", name: "Asaas", domain: "asaas.com", color: "#1E6BE5" },
];

// Format cents integer to BRL display string
const formatCurrencyDisplay = (cents: number) => {
    const abs = Math.abs(cents);
    const reais = Math.floor(abs / 100);
    const centavos = abs % 100;
    const sign = cents < 0 ? "-" : "";
    const reaisStr = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}R$ ${reaisStr},${centavos.toString().padStart(2, "0")}`;
};

// Parse a float string (e.g. "2745.27") to cents integer
const floatToCents = (val: string | number) => Math.round(parseFloat(String(val || "0")) * 100);

// Parse cents integer back to float string for API
const centsToFloat = (cents: number) => (cents / 100).toFixed(2);

function CurrencyInput({ value, onChange, className, ...props }: {
    value: number; // cents
    onChange: (cents: number) => void;
    className?: string;
    [key: string]: any;
}) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            onChange(Math.trunc(value / 10));
            return;
        }
        if (e.key === "-") {
            e.preventDefault();
            onChange(-value);
            return;
        }
        const digit = parseInt(e.key);
        if (!isNaN(digit)) {
            e.preventDefault();
            const sign = value < 0 ? -1 : 1;
            onChange((Math.abs(value) * 10 + digit) * sign);
        }
    };

    return (
        <Input
            type="text"
            inputMode="numeric"
            value={formatCurrencyDisplay(value)}
            onKeyDown={handleKeyDown}
            onChange={() => {}} // controlled via onKeyDown
            className={className}
            {...props}
        />
    );
}

export function BankAccountsManager() {
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [selectedBankId, setSelectedBankId] = useState<string>("none");
    const [name, setName] = useState("");
    const [bankCode, setBankCode] = useState("");
    const [agency, setAgency] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [initialBalanceCents, setInitialBalanceCents] = useState(0);
    const [color, setColor] = useState("#2563EB");

    const handleBankSelect = (val: string) => {
        setSelectedBankId(val);
        if (val !== "none" && val !== "other") {
            const bank = COMMON_BANKS.find(b => b.id === val);
            if (bank) {
                setName(bank.name);
                setColor(bank.color);
            }
        } else {
            setName("");
            setColor("#2563EB");
        }
    };

    const { data: accounts = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/bank-accounts"],
    });

    const createAccountMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/bank-accounts", {
                name,
                bankCode,
                agency,
                accountNumber,
                initialBalance: centsToFloat(initialBalanceCents),
                color,
                isActive: "true"
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
            setIsCreating(false);
            resetForm();
            toast({ title: "Conta bancária adicionada!" });
        },
        onError: () => {
            toast({ title: "Erro ao adicionar conta", variant: "destructive" });
        }
    });

    const updateAccountMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            await apiRequest("PATCH", `/api/bank-accounts/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
            setEditingId(null);
            toast({ title: "Conta bancária atualizada!" });
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/bank-accounts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
            toast({ title: "Conta removida!" });
        },
    });

    const resetForm = () => {
        setSelectedBankId("none");
        setName("");
        setBankCode("");
        setAgency("");
        setAccountNumber("");
        setInitialBalanceCents(0);
        setColor("#2563EB");
    };

    const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const getBankDomain = (accountName: string) => {
        const bank = COMMON_BANKS.find(b => accountName.toLowerCase().includes(b.name.toLowerCase()));
        return bank ? bank.domain : null;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Contas Bancárias</h3>
                    <p className="text-sm text-muted-foreground">Gerencie suas contas e saldos iniciais</p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Nova Conta
                    </Button>
                )}
            </div>

            {isCreating && (
                <Card className="border-blue-100 bg-blue-50/30 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Adicionar Conta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label>Instituição Financeira</Label>
                                <Select value={selectedBankId} onValueChange={handleBankSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o banco" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Selecione o banco</SelectItem>
                                        {COMMON_BANKS.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5 rounded-sm">
                                                        <AvatarImage src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${bank.domain}&size=128`} />
                                                        <AvatarFallback className="text-[10px] rounded-sm bg-gray-100"><Landmark className="h-3 w-3" /></AvatarFallback>
                                                    </Avatar>
                                                    {bank.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="other">Outro Banco / Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label>Nome/Identificação da Conta</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Conta Principal - Inter" />
                            </div>
                            <div className="space-y-2">
                                <Label>Saldo Atualizado</Label>
                                <CurrencyInput
                                    value={initialBalanceCents}
                                    onChange={setInitialBalanceCents}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cor de Identificação</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#F97316"].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-primary ring-2 ring-primary/30 ring-offset-1 scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Código Banco (Opcional)</Label>
                                <Input value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="077" />
                            </div>
                            <div className="space-y-2">
                                <Label>Agência (Opcional)</Label>
                                <Input value={agency} onChange={e => setAgency(e.target.value)} placeholder="0001" />
                            </div>
                            <div className="space-y-2">
                                <Label>Conta (Opcional)</Label>
                                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="12345-6" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="ghost" onClick={() => { setIsCreating(false); resetForm(); }}>Cancelar</Button>
                            <Button onClick={() => createAccountMutation.mutate()} disabled={!name || createAccountMutation.isPending}>
                                Salvar Conta
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Banco</TableHead>
                                <TableHead>Conta</TableHead>
                                <TableHead>Ag/Cc</TableHead>
                                <TableHead className="text-right">Saldo Atual (Base)</TableHead>
                                <TableHead className="w-20 text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        <Landmark className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                        Nenhuma conta bancária cadastrada.
                                    </TableCell>
                                </TableRow>
                            ) : accounts.map((acc: any) => {
                                const isEditing = editingId === acc.id;
                                const domain = getBankDomain(acc.name);
                                
                                return (
                                    <TableRow key={acc.id} className={isEditing ? "bg-muted/50" : ""}>
                                        <TableCell>
                                            <Avatar className="h-8 w-8 rounded-md ring-1 ring-black/5" style={{ backgroundColor: domain ? 'transparent' : acc.color }}>
                                                {domain ? (
                                                    <AvatarImage src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`} className="object-contain bg-white" />
                                                ) : null}
                                                <AvatarFallback className="bg-transparent text-white"><Building2 className="h-4 w-4" /></AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {isEditing ? (
                                                <Input 
                                                    defaultValue={acc.name} 
                                                    className="h-8"
                                                    onBlur={(e) => updateAccountMutation.mutate({ id: acc.id, data: { name: e.target.value }})}
                                                />
                                            ) : acc.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {acc.bankCode ? `${acc.bankCode} / ${acc.agency || '-'} / ${acc.accountNumber || '-'}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {isEditing ? (
                                                <CurrencyInput
                                                    value={floatToCents(acc.initialBalance)}
                                                    onChange={(cents) => updateAccountMutation.mutate({ id: acc.id, data: { initialBalance: centsToFloat(cents) }})}
                                                    className="h-8 w-40 ml-auto text-right"
                                                />
                                            ) : fmt(parseFloat(acc.initialBalance || 0))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8"
                                                    onClick={() => setEditingId(isEditing ? null : acc.id)}
                                                >
                                                    {isEditing ? <Check className="h-4 w-4 text-green-600" /> : <Pencil className="h-4 w-4" />}
                                                </Button>
                                                {!isEditing && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (confirm('Excluir esta conta baterá o saldo. Tem certeza?')) {
                                                                deleteAccountMutation.mutate(acc.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
