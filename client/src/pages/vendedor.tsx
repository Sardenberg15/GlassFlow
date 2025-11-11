import React, { useMemo, useState } from "react";
import { Plus, LogIn, CheckCircle2 } from "lucide-react";

type Page =
  | "login"
  | "dashboard"
  | "wizard-client"
  | "wizard-service"
  | "wizard-config"
  | "wizard-summary"
  | "project-details";

interface ClientForm {
  name: string;
  phone: string;
  address: string;
}

type ServiceType = "box" | "janela" | "porta" | "guarda-corpo" | "espelho";

interface ConfigForm {
  widthMm: string;
  heightMm: string;
  glassType: "Incolor 8mm" | "Fumê 8mm" | "Verde 8mm";
  kitColor: "Branco" | "Preto" | "Fosco";
  handle: "Padrão (Bola)" | "Puxador \"H\" 30cm";
}

interface PriceResult {
  areaM2: number;
  glassCost: number;
  kitCost: number;
  handleCost: number;
  cost: number;
  marginPct: number;
  finalPrice: number;
}

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function calcPrice(cfg: ConfigForm, marginPct = 50): PriceResult {
  const width = parseFloat(cfg.widthMm || "0") / 1000;
  const height = parseFloat(cfg.heightMm || "0") / 1000;
  const areaM2 = Math.max(0, width * height);

  const glassPrice: Record<ConfigForm["glassType"], number> = {
    "Incolor 8mm": 220,
    "Fumê 8mm": 240,
    "Verde 8mm": 230,
  };
  const kitPrice: Record<ConfigForm["kitColor"], number> = {
    Branco: 280,
    Preto: 300,
    Fosco: 320,
  };
  const handlePrice: Record<ConfigForm["handle"], number> = {
    "Padrão (Bola)": 40,
    "Puxador \"H\" 30cm": 90,
  };

  const glassCost = areaM2 * glassPrice[cfg.glassType];
  const kitCost = kitPrice[cfg.kitColor];
  const handleCost = handlePrice[cfg.handle];
  const cost = glassCost + kitCost + handleCost;
  const finalPrice = cost * (1 + marginPct / 100);
  return { areaM2, glassCost, kitCost, handleCost, cost, marginPct, finalPrice };
}

interface VendorQuoteCard {
  id: string;
  clientName: string;
  serviceLabel: string;
  status: "Aguardando" | "Em Produção" | "Instalação" | "Concluído";
  finalPrice: number;
}

export default function VendedorApp() {
  const [page, setPage] = useState<Page>("login");
  const [loggedEmail, setLoggedEmail] = useState("");
  const [loggedPass, setLoggedPass] = useState("");
  const [client, setClient] = useState<ClientForm>({ name: "", phone: "", address: "" });
  const [service, setService] = useState<ServiceType | null>(null);
  const [cfg, setCfg] = useState<ConfigForm>({
    widthMm: "1200",
    heightMm: "1900",
    glassType: "Fumê 8mm",
    kitColor: "Preto",
    handle: "Puxador \"H\" 30cm",
  });
  const [quotes, setQuotes] = useState<VendorQuoteCard[]>([]);

  const price = useMemo(() => calcPrice(cfg, 50), [cfg]);

  async function saveQuoteToBackend(): Promise<string | null> {
    try {
      // 1) Criar cliente
      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: client.name,
          contact: client.name,
          email: "",
          phone: client.phone,
          address: client.address,
          cnpjCpf: "",
        }),
      });
      if (!clientRes.ok) throw new Error("Falha ao criar cliente");
      const createdClient = await clientRes.json();

      // 2) Criar orçamento (quote)
      const today = new Date();
      const validUntil = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const number = `ORC-${today.getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;

      const quoteRes = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: createdClient.id,
          number,
          status: "pendente",
          validUntil,
          local: client.address,
          tipo: "Box de Banheiro",
          discount: "0",
          observations: "Gerado pelo app do vendedor",
        }),
      });
      if (!quoteRes.ok) throw new Error("Falha ao criar orçamento");
      const createdQuote = await quoteRes.json();

      // 3) Adicionar item do orçamento
      const itemRes = await fetch("/api/quote-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: createdQuote.id,
          description: "Box Frontal F2",
          quantity: "1",
          width: (parseFloat(cfg.widthMm) / 1).toFixed(2),
          height: (parseFloat(cfg.heightMm) / 1).toFixed(2),
          colorThickness: cfg.glassType,
          profileColor: cfg.kitColor,
          accessoryColor: cfg.kitColor,
          line: "Box",
          deliveryDate: validUntil,
          itemObservations: `Puxador: ${cfg.handle}`,
          unitPrice: price.finalPrice.toFixed(2),
          total: price.finalPrice.toFixed(2),
          imageUrl: "",
        }),
      });
      if (!itemRes.ok) throw new Error("Falha ao adicionar item");

      return createdQuote.id as string;
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar orçamento. Verifique sua conexão.");
      return null;
    }
  }

  function resetWizard() {
    setService(null);
    setCfg({ widthMm: "1200", heightMm: "1900", glassType: "Fumê 8mm", kitColor: "Preto", handle: "Puxador \"H\" 30cm" });
  }

  // UI Helpers
  const Header = ({ title }: { title: string }) => (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b p-4 flex items-center gap-2">
      <button onClick={() => setPage(page === "dashboard" ? "dashboard" : "dashboard")} className="rounded-full p-2 hover:bg-gray-100">
        ←
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );

  if (page === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white shadow rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <LogIn className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Login do Profissional de Campo</h1>
          </div>
          <div className="space-y-3">
            <input className="w-full border rounded-md p-3" placeholder="Email" value={loggedEmail} onChange={(e) => setLoggedEmail(e.target.value)} />
            <input className="w-full border rounded-md p-3" placeholder="Senha" type="password" value={loggedPass} onChange={(e) => setLoggedPass(e.target.value)} />
            <button
              className="w-full bg-indigo-600 text-white rounded-md py-3 font-medium hover:bg-indigo-700"
              onClick={() => setPage("dashboard")}
            >
              Entrar
            </button>
            <p className="text-xs text-gray-500">Este login é independente do painel do administrador.</p>
          </div>
        </div>
      </div>
    );
  }

  if (page === "dashboard") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Painel de Controle</h1>
            <p className="text-gray-500">Bem-vindo! Crie orçamentos rápidos e profissionais.</p>
          </div>
          <button
            className="flex items-center gap-2 bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700"
            onClick={() => setPage("wizard-client")}
          >
            <Plus className="h-4 w-4" /> Novo Orçamento
          </button>
        </div>

        <div className="grid gap-3">
          {quotes.length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center text-gray-600">
              Nenhum orçamento criado ainda.
            </div>
          ) : (
            quotes.map((q) => (
              <button
                key={q.id}
                className="bg-white rounded-xl border p-4 flex items-center justify-between hover:bg-gray-50"
                onClick={() => setPage("project-details")}
              >
                <div>
                  <p className="font-semibold">{q.clientName} ({q.serviceLabel})</p>
                  <p className="text-sm text-gray-500">Status: {q.status}</p>
                </div>
                <span className="text-green-600 font-bold">{formatCurrencyBRL(q.finalPrice)}</span>
              </button>
            ))
          )}
        </div>

        {/* Botão flutuante */}
        <button
          className="fixed bottom-6 right-6 rounded-full bg-indigo-600 text-white p-4 shadow-lg hover:bg-indigo-700"
          onClick={() => setPage("wizard-client")}
          aria-label="Criar Novo Orçamento"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    );
  }

  if (page === "wizard-client") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Novo Orçamento (1/4)" />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <label className="text-sm font-medium">Nome do Cliente</label>
            <input className="w-full border rounded-md p-3" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />

            <label className="text-sm font-medium">Telefone</label>
            <input className="w-full border rounded-md p-3" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />

            <label className="text-sm font-medium">Endereço da Obra (Opcional)</label>
            <input className="w-full border rounded-md p-3" value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} />
          </div>
          <button className="w-full bg-indigo-600 text-white rounded-md py-3 font-medium" onClick={() => setPage("wizard-service")}>Próximo</button>
        </div>
      </div>
    );
  }

  if (page === "wizard-service") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Novo Orçamento (2/4)" />
        <div className="p-4 space-y-4">
          <p className="font-semibold">Selecione o Serviço</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "box" as ServiceType, label: "Box de Banheiro" },
              { key: "janela" as ServiceType, label: "Janela" },
              { key: "porta" as ServiceType, label: "Porta de Vidro" },
              { key: "guarda-corpo" as ServiceType, label: "Guarda-Corpo" },
            ].map((item) => (
              <button
                key={item.key}
                className={`bg-white rounded-xl border p-6 text-center hover:bg-gray-50 ${service === item.key ? "ring-2 ring-indigo-600" : ""}`}
                onClick={() => setService(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button className="w-full bg-indigo-600 text-white rounded-md py-3 font-medium" onClick={() => setPage("wizard-config")}>Próximo</button>
        </div>
      </div>
    );
  }

  if (page === "wizard-config") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Configurar Box de Banheiro (3/4)" />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Vão (Largura em mm)</label>
              <input className="w-full border rounded-md p-3" value={cfg.widthMm} onChange={(e) => setCfg({ ...cfg, widthMm: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Altura (mm)</label>
              <input className="w-full border rounded-md p-3" value={cfg.heightMm} onChange={(e) => setCfg({ ...cfg, heightMm: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tipo de Vidro</label>
              <select className="w-full border rounded-md p-3" value={cfg.glassType} onChange={(e) => setCfg({ ...cfg, glassType: e.target.value as ConfigForm["glassType"] })}>
                <option>Incolor 8mm</option>
                <option>Fumê 8mm</option>
                <option>Verde 8mm</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Cor do Alumínio/Kit</label>
              <select className="w-full border rounded-md p-3" value={cfg.kitColor} onChange={(e) => setCfg({ ...cfg, kitColor: e.target.value as ConfigForm["kitColor"] })}>
                <option>Branco</option>
                <option>Preto</option>
                <option>Fosco</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Puxador</label>
              <select className="w-full border rounded-md p-3" value={cfg.handle} onChange={(e) => setCfg({ ...cfg, handle: e.target.value as ConfigForm["handle"] })}>
                <option>Padrão (Bola)</option>
                <option>Puxador "H" 30cm</option>
              </select>
            </div>
          </div>
          <button className="w-full bg-indigo-600 text-white rounded-md py-3 font-medium" onClick={() => setPage("wizard-summary")}>Calcular e Ver Resumo</button>
        </div>
      </div>
    );
  }

  if (page === "wizard-summary") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Resumo do Orçamento (4/4)" />
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border p-4 space-y-2">
            <p className="font-semibold">Cliente: {client.name}</p>
            <p className="text-sm">Serviço: Box de Banheiro</p>
            <div className="mt-2 text-sm text-gray-700">
              <p>Dimensões: {cfg.widthMm}mm x {cfg.heightMm}mm</p>
              <p>Vidro: {cfg.glassType}</p>
              <p>Kit: {cfg.kitColor}</p>
              <p>Puxador: {cfg.handle}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-center text-gray-600">Preço Final Sugerido</p>
            <p className="text-center text-3xl font-bold text-green-600">{formatCurrencyBRL(price.finalPrice)}</p>
            <p className="text-center text-sm text-gray-500">(Custo: {formatCurrencyBRL(price.cost)} + Margem: {price.marginPct}%)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="bg-indigo-600 text-white rounded-md py-3 font-medium"
              onClick={async () => {
                const quoteId = await saveQuoteToBackend();
                if (quoteId) {
                  setQuotes((prev) => [
                    {
                      id: quoteId,
                      clientName: client.name,
                      serviceLabel: "Box de Banheiro",
                      status: "Aguardando",
                      finalPrice: price.finalPrice,
                    },
                    ...prev,
                  ]);
                  resetWizard();
                  setPage("dashboard");
                }
              }}
            >
              Salvar e Enviar p/ Cliente
            </button>
            <button className="bg-gray-200 text-gray-800 rounded-md py-3 font-medium" onClick={() => window.print()}>Gerar PDF</button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "project-details") {
    const current = quotes[0];
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Detalhes do Projeto" />
        <div className="p-4 space-y-4">
          {current ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <p className="font-semibold">{current.clientName}</p>
                <p className="text-sm text-gray-600">{current.serviceLabel}</p>
                <p className="text-green-600 font-bold">{formatCurrencyBRL(current.finalPrice)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <p className="font-semibold">Status (Kanban)</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> Orçamento Aprovado</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded-full border"></span> Aguardando Vidro da Têmpera</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded-full border"></span> Em Produção / Corte</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded-full border"></span> Agendar Instalação</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-5 h-5 rounded-full border"></span> Concluído</div>
                </div>
              </div>
              <button className="w-full bg-gray-200 text-gray-800 rounded-md py-3 font-medium" onClick={() => setPage("dashboard")}>Voltar ao Dashboard</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-6 text-center text-gray-600">Nenhum projeto selecionado.</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}