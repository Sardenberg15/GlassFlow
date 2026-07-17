import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Trash2, Pencil, HardHat, DollarSign, TrendingUp, Star, Users,
  Phone, Mail, MapPin, FileText, Wallet, Clock, CalendarDays, ChevronRight,
  ChevronLeft, Archive, Download, Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Employee, EmployeePayment, EmployeeProductivity, Project } from "@shared/schema";
import { Link } from "wouter";

// ── Helpers ──────────────────────────────────────────────
const contractLabels: Record<string, string> = { clt: "CLT", pj: "PJ", chapa: "Chapa" };
const contractColors: Record<string, string> = { clt: "bg-blue-500/15 text-blue-700 dark:text-blue-300", pj: "bg-purple-500/15 text-purple-700 dark:text-purple-300", chapa: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
const statusLabels: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", desligado: "Desligado" };
const statusColors: Record<string, string> = { ativo: "bg-green-500/15 text-green-700 dark:text-green-300", inativo: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300", desligado: "bg-red-500/15 text-red-700 dark:text-red-300" };
const paymentTypeLabels: Record<string, string> = { salario: "Salário", adiantamento: "Adiantamento", ajuda_custo: "Ajuda de Custo", diaria: "Diária", bonificacao: "Bonificação", desconto: "Desconto", vale_transporte: "VT", vale_refeicao: "VR", hora_extra: "Hora Extra", outros: "Outros" };
const paymentStatusLabels: Record<string, string> = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
const paymentStatusColors: Record<string, string> = { pendente: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300", pago: "bg-green-500/15 text-green-700 dark:text-green-300", cancelado: "bg-red-500/15 text-red-700 dark:text-red-300" };
const fmt = (v: string | number | null | undefined) => { const n = parseFloat(String(v || "0")); return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-5 w-5 cursor-pointer transition-colors ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          onClick={() => onChange?.(i)} />
      ))}
    </div>
  );
}

// ── Month Helper ─────────────────────────────────────────
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function useMonthNav() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const key = `${year}-${String(month + 1).padStart(2, "0")}`; // "2026-04"
  const label = `${MONTH_NAMES[month]} ${year}`;
  return { year, month, key, label, prev, next };
}

// ── Main Page ────────────────────────────────────────────
export default function Funcionarios() {
  const [activeTab, setActiveTab] = useState<"cadastro" | "pagamentos" | "produtividade">("cadastro");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-3">
            <HardHat className="h-7 w-7 text-primary" /> Funcionários
          </h1>
          <p>Gerencie seus funcionários, chapas, pagamentos e produtividade</p>
        </div>
        <Link href="/arquivo-virtual">
          <Button variant="outline" className="gap-2">
            <Archive className="h-4 w-4" /> Arquivo Virtual
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {([
          { key: "cadastro", label: "Cadastro", icon: Users },
          { key: "pagamentos", label: "Pagamentos", icon: Wallet },
          { key: "produtividade", label: "Produtividade", icon: TrendingUp },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "cadastro" && <TabCadastro />}
      {activeTab === "pagamentos" && <TabPagamentos />}
      {activeTab === "produtividade" && <TabProdutividade />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB: CADASTRO
// ══════════════════════════════════════════════════════════
function TabCadastro() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/employees", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employees"] }); toast({ title: "Funcionário cadastrado!" }); setOpen(false); },
    onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: async (d: any) => { const { id, ...rest } = d; const r = await apiRequest("PATCH", `/api/employees/${id}`, rest); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employees"] }); toast({ title: "Funcionário atualizado!" }); setOpen(false); setEditing(null); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/employees/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employees"] }); toast({ title: "Funcionário excluído!" }); },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || (e.role || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.contractType === typeFilter;
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const g = (k: string) => { const v = fd.get(k) as string; return v === "" ? null : v; };
    const data: any = {
      name: fd.get("name") as string, cpf: g("cpf"), rg: g("rg"), phone: g("phone"), email: g("email"),
      address: g("address"), birthDate: g("birthDate"), role: g("role"),
      contractType: fd.get("contractType") as string, admissionDate: g("admissionDate"),
      terminationDate: g("terminationDate"), baseSalary: g("baseSalary"), dailyRate: g("dailyRate"),
      status: fd.get("status") as string, observations: g("observations"),
      emergencyContact: g("emergencyContact"), emergencyPhone: g("emergencyPhone"), pixKey: g("pixKey"),
    };
    if (editing) updateMut.mutate({ id: editing.id, ...data });
    else createMut.mutate(data);
  };

  const activeCount = employees.filter(e => e.status === "ativo").length;
  const chapaCount = employees.filter(e => e.contractType === "chapa").length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-primary/10 rounded-full p-2"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{employees.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-green-500/10 rounded-full p-2"><Users className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Ativos</p><p className="text-2xl font-bold">{activeCount}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-amber-500/10 rounded-full p-2"><HardHat className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Chapas</p><p className="text-2xl font-bold">{chapaCount}</p></div></CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar funcionários..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="clt">CLT</SelectItem>
              <SelectItem value="pj">PJ</SelectItem>
              <SelectItem value="chapa">Chapa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Funcionário</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Funcionário" : "Cadastrar Funcionário"}</DialogTitle>
              <DialogDescription>Preencha os dados abaixo</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id || "new"}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2"><Label>Nome Completo *</Label><Input name="name" required defaultValue={editing?.name || ""} /></div>
                <div className="space-y-2"><Label>CPF</Label><Input name="cpf" placeholder="000.000.000-00" defaultValue={editing?.cpf || ""} /></div>
                <div className="space-y-2"><Label>RG</Label><Input name="rg" defaultValue={editing?.rg || ""} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input name="phone" defaultValue={editing?.phone || ""} /></div>
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email || ""} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Endereço</Label><Input name="address" defaultValue={editing?.address || ""} /></div>
                <div className="space-y-2"><Label>Data Nascimento</Label><Input name="birthDate" type="date" defaultValue={editing?.birthDate || ""} /></div>
                <div className="space-y-2"><Label>Cargo</Label><Input name="role" placeholder="Montador, Cortador..." defaultValue={editing?.role || ""} /></div>
                <div className="space-y-2">
                  <Label>Tipo de Contrato *</Label>
                  <select name="contractType" defaultValue={editing?.contractType || "clt"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="clt">CLT</option><option value="pj">PJ</option><option value="chapa">Chapa (Freelancer)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <select name="status" defaultValue={editing?.status || "ativo"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="desligado">Desligado</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>Data Admissão</Label><Input name="admissionDate" type="date" defaultValue={editing?.admissionDate || ""} /></div>
                <div className="space-y-2"><Label>Data Desligamento</Label><Input name="terminationDate" type="date" defaultValue={editing?.terminationDate || ""} /></div>
                <div className="space-y-2"><Label>Salário Base (R$)</Label><Input name="baseSalary" type="number" step="0.01" defaultValue={editing?.baseSalary || ""} /></div>
                <div className="space-y-2"><Label>Diária (R$)</Label><Input name="dailyRate" type="number" step="0.01" defaultValue={editing?.dailyRate || ""} /></div>
                <div className="space-y-2"><Label>Chave PIX</Label><Input name="pixKey" defaultValue={editing?.pixKey || ""} /></div>
                <div className="space-y-2"><Label>Contato Emergência</Label><Input name="emergencyContact" defaultValue={editing?.emergencyContact || ""} /></div>
                <div className="space-y-2"><Label>Tel. Emergência</Label><Input name="emergencyPhone" defaultValue={editing?.emergencyPhone || ""} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Input name="observations" defaultValue={editing?.observations || ""} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? (updateMut.isPending ? "Atualizando..." : "Atualizar") : (createMut.isPending ? "Cadastrando..." : "Cadastrar")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum funcionário encontrado</p></CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Cargo</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Telefone</th>
                <th className="text-left p-3 font-medium">Salário/Diária</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr></thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{emp.name}</td>
                    <td className="p-3 text-muted-foreground">{emp.role || "—"}</td>
                    <td className="p-3"><Badge variant="outline" className={contractColors[emp.contractType] || ""}>{contractLabels[emp.contractType] || emp.contractType}</Badge></td>
                    <td className="p-3 text-muted-foreground">{emp.phone || "—"}</td>
                    <td className="p-3">{emp.contractType === "chapa" ? (emp.dailyRate ? `${fmt(emp.dailyRate)}/dia` : "—") : (emp.baseSalary ? fmt(emp.baseSalary) : "—")}</td>
                    <td className="p-3"><Badge variant="outline" className={statusColors[emp.status] || ""}>{statusLabels[emp.status] || emp.status}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(emp); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
                              <AlertDialogDescription>"{emp.name}" será permanentemente removido.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(emp.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB: PAGAMENTOS
// ══════════════════════════════════════════════════════════
function TabPagamentos() {
  const [empFilter, setEmpFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const monthNav = useMonthNav();
  const { toast } = useToast();

  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: payments = [], isLoading } = useQuery<EmployeePayment[]>({ queryKey: ["/api/employee-payments"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/employee-payments", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employee-payments"] }); toast({ title: "Pagamento registrado!" }); setOpen(false); },
    onError: () => toast({ title: "Erro ao registrar pagamento", variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: async (d: any) => { const { id, ...rest } = d; const r = await apiRequest("PATCH", `/api/employee-payments/${id}`, rest); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employee-payments"] }); toast({ title: "Pagamento atualizado!" }); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/employee-payments/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employee-payments"] }); toast({ title: "Pagamento excluído!" }); },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const filtered = payments.filter(p => {
    if (empFilter !== "all" && p.employeeId !== empFilter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    // Month filter: check date or referenceMonth
    const payMonth = (p.referenceMonth || p.date || "").substring(0, 7);
    if (payMonth && !payMonth.startsWith(monthNav.key)) return false;
    return true;
  });

  const totalPago = filtered.filter(p => p.status === "pago").reduce((s, p) => s + parseFloat(String(p.value || 0)), 0);
  const totalPendente = filtered.filter(p => p.status === "pendente").reduce((s, p) => s + parseFloat(String(p.value || 0)), 0);
  const empName = (id: string) => employees.find(e => e.id === id)?.name || "—";
  const projName = (id: string | null) => id ? projects.find(p => p.id === id)?.name || "—" : "—";

  const handleSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const g = (k: string) => { const v = fd.get(k) as string; return v === "" ? null : v; };
    createMut.mutate({
      employeeId: fd.get("employeeId"), type: fd.get("type"), description: fd.get("description"),
      value: fd.get("value"), date: fd.get("date"), referenceMonth: g("referenceMonth"),
      projectId: g("projectId"), status: fd.get("status"), paymentMethod: g("paymentMethod"),
      observations: g("observations"),
    });
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button variant="ghost" size="icon" onClick={monthNav.prev}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg min-w-[180px] text-center">
          {monthNav.label}
        </span>
        <Button variant="ghost" size="icon" onClick={monthNav.next}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-green-500/10 rounded-full p-2"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Total Pago</p><p className="text-2xl font-bold text-green-600">{fmt(totalPago)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-yellow-500/10 rounded-full p-2"><Clock className="h-5 w-5 text-yellow-600" /></div><div><p className="text-sm text-muted-foreground">Pendente</p><p className="text-2xl font-bold text-yellow-600">{fmt(totalPendente)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-primary/10 rounded-full p-2"><Wallet className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Geral</p><p className="text-2xl font-bold">{fmt(totalPago + totalPendente)}</p></div></CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={empFilter} onValueChange={setEmpFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Funcionário" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Pagamento</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle><DialogDescription>Preencha os dados do pagamento</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Funcionário *</Label>
                  <select name="employeeId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione...</option>{employees.filter(e => e.status === "ativo").map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <select name="type" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(paymentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <select name="status" defaultValue="pendente" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>Descrição *</Label><Input name="description" required /></div>
                <div className="space-y-2"><Label>Valor (R$) *</Label><Input name="value" type="number" step="0.01" required /></div>
                <div className="space-y-2"><Label>Data *</Label><Input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
                <div className="space-y-2"><Label>Mês Referência</Label><Input name="referenceMonth" type="month" /></div>
                <div className="space-y-2">
                  <Label>Método</Label>
                  <select name="paymentMethod" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">—</option><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option><option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Projeto (opcional)</Label>
                  <select name="projectId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Nenhum</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Input name="observations" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Registrando..." : "Registrar Pagamento"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum pagamento encontrado</p></CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium">Funcionário</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Descrição</th>
                <th className="text-right p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr></thead>
              <tbody>
                {filtered.map(pay => (
                  <tr key={pay.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{empName(pay.employeeId)}</td>
                    <td className="p-3"><Badge variant="outline">{paymentTypeLabels[pay.type] || pay.type}</Badge></td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">{pay.description}</td>
                    <td className="p-3 text-right font-mono font-medium">{fmt(pay.value)}</td>
                    <td className="p-3 text-muted-foreground">{pay.date}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`cursor-pointer ${paymentStatusColors[pay.status] || ""}`}
                        onClick={() => {
                          const next = pay.status === "pendente" ? "pago" : pay.status === "pago" ? "pendente" : pay.status;
                          updateMut.mutate({ id: pay.id, status: next });
                        }}>
                        {paymentStatusLabels[pay.status] || pay.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir pagamento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(pay.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB: PRODUTIVIDADE
// ══════════════════════════════════════════════════════════
function TabProdutividade() {
  const [empFilter, setEmpFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [ratingVal, setRatingVal] = useState(3);
  const monthNav = useMonthNav();
  const { toast } = useToast();

  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });
  const { data: records = [], isLoading } = useQuery<EmployeeProductivity[]>({ queryKey: ["/api/employee-productivity"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const createMut = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest("POST", "/api/employee-productivity", d); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employee-productivity"] }); toast({ title: "Registro adicionado!" }); setOpen(false); setRatingVal(3); },
    onError: () => toast({ title: "Erro ao registrar", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/employee-productivity/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/employee-productivity"] }); toast({ title: "Registro excluído!" }); },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const filtered = records.filter(r => {
    if (empFilter !== "all" && r.employeeId !== empFilter) return false;
    const recMonth = (r.date || "").substring(0, 7);
    if (recMonth && !recMonth.startsWith(monthNav.key)) return false;
    return true;
  });
  const empName = (id: string) => employees.find(e => e.id === id)?.name || "—";
  const projName = (id: string | null) => id ? projects.find(p => p.id === id)?.name || "—" : "—";
  const totalHours = filtered.reduce((s, r) => s + parseFloat(String(r.hoursWorked || 0)), 0);

  const handleSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const g = (k: string) => { const v = fd.get(k) as string; return v === "" ? null : v; };
    createMut.mutate({
      employeeId: fd.get("employeeId"), projectId: g("projectId"),
      date: fd.get("date"), hoursWorked: g("hoursWorked"),
      description: g("description"), rating: ratingVal, observations: g("observations"),
    });
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button variant="ghost" size="icon" onClick={monthNav.prev}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg min-w-[180px] text-center">
          {monthNav.label}
        </span>
        <Button variant="ghost" size="icon" onClick={monthNav.next}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-primary/10 rounded-full p-2"><CalendarDays className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Registros</p><p className="text-2xl font-bold">{filtered.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><div className="bg-blue-500/10 rounded-full p-2"><Clock className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Horas Totais</p><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p></div></CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <Select value={empFilter} onValueChange={setEmpFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Funcionário" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setRatingVal(3); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Registro</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Registrar Produtividade</DialogTitle><DialogDescription>Registre horas e avaliação</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Funcionário *</Label>
                  <select name="employeeId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione...</option>{employees.filter(e => e.status === "ativo").map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label>Data *</Label><Input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} /></div>
                <div className="space-y-2"><Label>Horas Trabalhadas</Label><Input name="hoursWorked" type="number" step="0.5" min="0" max="24" /></div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Projeto</Label>
                  <select name="projectId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Nenhum</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>O que foi feito</Label><Input name="description" /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Avaliação</Label><StarRating value={ratingVal} onChange={setRatingVal} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Input name="observations" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>{createMut.isPending ? "Registrando..." : "Registrar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Productivity Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhum registro encontrado</p></CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium">Funcionário</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Projeto</th>
                <th className="text-right p-3 font-medium">Horas</th>
                <th className="text-left p-3 font-medium">Descrição</th>
                <th className="text-left p-3 font-medium">Avaliação</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr></thead>
              <tbody>
                {filtered.map(rec => (
                  <tr key={rec.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{empName(rec.employeeId)}</td>
                    <td className="p-3 text-muted-foreground">{rec.date}</td>
                    <td className="p-3 text-muted-foreground max-w-[180px] truncate">{projName(rec.projectId)}</td>
                    <td className="p-3 text-right font-mono">{rec.hoursWorked ? `${rec.hoursWorked}h` : "—"}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">{rec.description || "—"}</td>
                    <td className="p-3">{rec.rating ? <StarRating value={rec.rating} /> : "—"}</td>
                    <td className="p-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir registro?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate(rec.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
