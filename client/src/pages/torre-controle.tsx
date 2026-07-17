import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Project, Client, Transaction } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  RadioTower, Crosshair, LocateFixed, MapPin, Loader2, Eye, EyeOff,
  Tv, Route as RouteIcon, ClipboardList, Home, ExternalLink, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Trilhas de status (replicam as colunas do quadro físico de obras).
// "Recebimento" é automático: calculado das receitas lançadas no financeiro.
// ---------------------------------------------------------------------------
const TRACKS = [
  { key: "contrato", label: "Contrato", short: "CT", color: "#22d3ee", auto: false },
  { key: "execucao", label: "Execução", short: "EX", color: "#fbbf24", auto: false },
  { key: "recebimento", label: "Recebimento", short: "RC", color: "#34d399", auto: true },
  { key: "notaFiscal", label: "Nota Fiscal", short: "NF", color: "#a78bfa", auto: false },
] as const;

type TrackKey = (typeof TRACKS)[number]["key"];
type TowerStatus = Partial<Record<TrackKey, number>>; // 0 pendente | 1 parcial | 2 concluído

const DEFAULT_CENTER: [number, number] = [-21.7545, -41.3244]; // Campos dos Goytacazes
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILES_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const BASE_STORAGE_KEY = "torre-controle-base";
const TV_ROTATION_MS = 9000;
const PLACING_BASE = "__base__";

function formatBRL(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : v || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function cityOf(address?: string | null): string {
  if (!address) return "—";
  const parts = address.split(/[,\-–]/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : address;
}

function distKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function loadBase(): [number, number] {
  try {
    const raw = localStorage.getItem(BASE_STORAGE_KEY);
    if (raw) {
      const { lat, lng } = JSON.parse(raw);
      if (typeof lat === "number" && typeof lng === "number") return [lat, lng];
    }
  } catch { /* usa padrão */ }
  return DEFAULT_CENTER;
}

export default function TorreControle() {
  const { toast } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const rowRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const didFitRef = useRef(false);

  const [clock, setClock] = useState(() => new Date());
  const [includeAprovadas, setIncludeAprovadas] = useState(false);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const placingIdRef = useRef<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoProgress, setGeoProgress] = useState<{ done: number; total: number } | null>(null);

  // v2
  const [tab, setTab] = useState<"quadro" | "rota">("quadro");
  const [tvMode, setTvMode] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [base, setBase] = useState<[number, number]>(() => loadBase());
  const [routeExcluded, setRouteExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh: a torre se atualiza sozinha (modo TV em monitor da loja)
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"], refetchInterval: 60_000,
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"], refetchInterval: 60_000,
  });
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"], refetchInterval: 60_000,
  });

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  // Recebimento real: soma das receitas lançadas no financeiro por projeto
  const recebidoByProject = useMemo(() => {
    const m = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === "receita" && t.projectId) {
        m.set(t.projectId, (m.get(t.projectId) || 0) + (parseFloat(t.value) || 0));
      }
    });
    return m;
  }, [transactions]);

  const obras = useMemo(() => {
    const statuses = includeAprovadas ? ["execucao", "aprovado"] : ["execucao"];
    return projects
      .filter((p) => statuses.includes(p.status))
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [projects, includeAprovadas]);

  const recebidoPct = (p: Project): number => {
    const v = parseFloat(p.value) || 0;
    if (v <= 0) return 0;
    return Math.min(1, (recebidoByProject.get(p.id) || 0) / v);
  };

  // Status combinado: trilhas manuais + recebimento derivado do financeiro
  const statusOf = (p: Project): Record<TrackKey, number> => {
    const manual = (p.towerStatus as TowerStatus) || {};
    const pct = recebidoPct(p);
    return {
      contrato: manual.contrato || 0,
      execucao: manual.execucao || 0,
      recebimento: pct >= 0.99 ? 2 : pct > 0.01 ? 1 : 0,
      notaFiscal: manual.notaFiscal || 0,
    };
  };

  const progressOf = (p: Project): number => {
    const s = statusOf(p);
    return TRACKS.reduce((acc, t) => acc + s[t.key], 0) / (TRACKS.length * 2);
  };

  const pinColor = (p: Project): string => {
    const prog = progressOf(p);
    if (prog >= 1) return "#34d399";
    if (prog >= 0.5) return "#fbbf24";
    return "#38bdf8";
  };

  const located = obras.filter((p) => p.latitude != null && p.longitude != null);
  const totalValue = obras.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
  const totalRecebido = obras.reduce((acc, p) => acc + (recebidoByProject.get(p.id) || 0), 0);
  const concluidas = obras.filter((p) => progressOf(p) >= 1).length;

  const addressFor = (p: Project) =>
    p.obraAddress || clientById.get(p.clientId)?.address || null;

  // -------------------------------------------------------------------------
  // Rota do dia: vizinho mais próximo a partir da base
  // -------------------------------------------------------------------------
  const routeStops = useMemo(() => {
    const pts = located.filter((p) => !routeExcluded.has(p.id));
    const remaining = [...pts];
    const order: { p: Project; legKm: number }[] = [];
    let cur = base;
    while (remaining.length) {
      let bi = 0;
      let bd = Infinity;
      remaining.forEach((p, i) => {
        const d = distKm(cur, [p.latitude!, p.longitude!]);
        if (d < bd) { bd = d; bi = i; }
      });
      const [p] = remaining.splice(bi, 1);
      order.push({ p, legKm: bd });
      cur = [p.latitude!, p.longitude!];
    }
    return order;
  }, [located, routeExcluded, base]);

  const routeTotalKm = routeStops.reduce((acc, s) => acc + s.legKm, 0);

  const googleMapsUrl = useMemo(() => {
    if (!routeStops.length) return null;
    const pts = [
      `${base[0]},${base[1]}`,
      ...routeStops.map((s) => `${s.p.latitude},${s.p.longitude}`),
    ];
    return `https://www.google.com/maps/dir/${pts.join("/")}`;
  }, [routeStops, base]);

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  const patchProject = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects"] });
      const prev = queryClient.getQueryData<Project[]>(["/api/projects"]);
      queryClient.setQueryData<Project[]>(["/api/projects"], (old) =>
        (old || []).map((p) => (p.id === id ? { ...p, ...data } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/projects"], ctx.prev);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const cycleTrack = (p: Project, key: TrackKey) => {
    const track = TRACKS.find((t) => t.key === key);
    if (track?.auto) return; // recebimento vem do financeiro
    const manual = (p.towerStatus as TowerStatus) || {};
    const next = ((manual[key] || 0) + 1) % 3;
    patchProject.mutate({ id: p.id, data: { towerStatus: { ...manual, [key]: next } } as any });
  };

  // -------------------------------------------------------------------------
  // Geocodificação em lote (Nominatim — 1 req/seg)
  // -------------------------------------------------------------------------
  const geocodeAll = async () => {
    const pending = obras.filter((p) => (p.latitude == null || p.longitude == null) && addressFor(p));
    if (!pending.length) {
      toast({ title: "Nada a localizar", description: "Todas as obras com endereço já estão no mapa." });
      return;
    }
    setGeocoding(true);
    setGeoProgress({ done: 0, total: pending.length });
    let found = 0;
    for (let i = 0; i < pending.length; i++) {
      const p = pending[i];
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(addressFor(p)!)}`);
        const data = await res.json();
        if (data.found) {
          found++;
          patchProject.mutate({ id: p.id, data: { latitude: data.latitude, longitude: data.longitude } as any });
        }
      } catch {
        // segue para a próxima
      }
      setGeoProgress({ done: i + 1, total: pending.length });
      if (i < pending.length - 1) await new Promise((r) => setTimeout(r, 1100));
    }
    setGeocoding(false);
    setGeoProgress(null);
    toast({
      title: "Radar atualizado",
      description: `${found} de ${pending.length} obras localizadas. Use o alvo para posicionar as demais manualmente.`,
    });
  };

  // -------------------------------------------------------------------------
  // Mapa
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(DARK_TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e: L.LeafletMouseEvent) => {
      const id = placingIdRef.current;
      if (!id) return;
      if (id === PLACING_BASE) {
        const b: [number, number] = [e.latlng.lat, e.latlng.lng];
        localStorage.setItem(BASE_STORAGE_KEY, JSON.stringify({ lat: b[0], lng: b[1] }));
        setBase(b);
        toast({ title: "Base definida", description: "A rota do dia parte deste ponto." });
      } else {
        patchProject.mutate({ id, data: { latitude: e.latlng.lat, longitude: e.latlng.lng } as any });
        toast({ title: "Obra posicionada", description: "Localização salva no mapa." });
      }
      placingIdRef.current = null;
      setPlacingId(null);
    });

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapContainerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      routeLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    placingIdRef.current = placingId;
    const el = mapContainerRef.current;
    if (el) el.style.cursor = placingId ? "crosshair" : "";
  }, [placingId]);

  // Pins das obras
  useEffect(() => {
    const layer = markersRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    markersByIdRef.current.clear();

    located.forEach((p) => {
      const color = pinColor(p);
      const num = obras.indexOf(p) + 1;
      const icon = L.divIcon({
        className: "",
        html: `
          <div class="tc-pin" style="--pin:${color}">
            <div class="tc-pin-pulse"></div>
            <div class="tc-pin-dot">${num}</div>
          </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const s = statusOf(p);
      const pct = Math.round(recebidoPct(p) * 100);
      const tracksHtml = TRACKS.map((t) => {
        const v = s[t.key];
        const fill = v === 2 ? t.color : v === 1 ? `${t.color}66` : "transparent";
        const extra = t.key === "recebimento"
          ? ` — ${pct}% (${formatBRL(recebidoByProject.get(p.id) || 0)})`
          : v === 1 ? " (parcial)" : v === 2 ? " ✓" : "";
        return `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <span style="width:12px;height:12px;border:1.5px solid ${t.color};background:${fill};display:inline-block;border-radius:3px"></span>
          <span style="color:#cbd5e1;font-size:11px">${t.label}${extra}</span>
        </div>`;
      }).join("");
      const client = clientById.get(p.clientId);
      const marker = L.marker([p.latitude!, p.longitude!], { icon });
      marker.bindPopup(
        `<div style="font-family:ui-sans-serif,system-ui;min-width:190px">
          <div style="font-weight:700;font-size:13px;color:#f1f5f9">${client?.name || p.name}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${p.name}</div>
          <div style="font-size:12px;color:#38bdf8;margin-top:4px;font-weight:600">${formatBRL(p.value)}</div>
          ${tracksHtml}
        </div>`,
        { className: "tc-popup" },
      );
      layer.addLayer(marker);
      markersByIdRef.current.set(p.id, marker);
    });

    if (!didFitRef.current && located.length > 0) {
      didFitRef.current = true;
      const bounds = L.latLngBounds(located.map((p) => [p.latitude!, p.longitude!] as [number, number]));
      map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, includeAprovadas, clients, transactions]);

  // Camada da rota do dia (traçado + base)
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (tab !== "rota") return;

    const baseIcon = L.divIcon({
      className: "",
      html: `<div class="tc-base"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#04101c" stroke-width="2.5"><path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    layer.addLayer(L.marker(base, { icon: baseIcon }).bindTooltip("Base (partida da rota)"));

    if (routeStops.length) {
      const pts: [number, number][] = [base, ...routeStops.map((s) => [s.p.latitude!, s.p.longitude!] as [number, number])];
      layer.addLayer(L.polyline(pts, { color: "#22d3ee", weight: 2.5, opacity: 0.9, dashArray: "6 8" }));
      layer.addLayer(L.polyline(pts, { color: "#22d3ee", weight: 8, opacity: 0.12 }));
      routeStops.forEach((s, i) => {
        const badge = L.divIcon({
          className: "",
          html: `<div class="tc-route-badge">${i + 1}</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 30],
        });
        layer.addLayer(L.marker([s.p.latitude!, s.p.longitude!], { icon: badge, interactive: false }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, routeStops, base]);

  // -------------------------------------------------------------------------
  // Modo TV: tela cheia + rotação automática entre as obras
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setTvMode(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleTv = async () => {
    if (!tvMode) {
      try {
        await rootRef.current?.requestFullscreen();
      } catch {
        // sem suporte a fullscreen: roda o modo TV mesmo assim
      }
      setTvMode(true);
    } else {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setTvMode(false);
    }
  };

  useEffect(() => {
    if (!tvMode || located.length === 0) {
      setSpotlightId(null);
      return;
    }
    let idx = 0;
    const focus = () => {
      const p = located[idx % located.length];
      if (!p) return;
      setSpotlightId(p.id);
      const map = mapRef.current;
      const marker = markersByIdRef.current.get(p.id);
      if (map && p.latitude != null && p.longitude != null) {
        map.flyTo([p.latitude, p.longitude], 15, { duration: 1.6 });
        setTimeout(() => marker?.openPopup(), 1700);
      }
      rowRefsRef.current.get(p.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      idx++;
    };
    focus();
    const t = setInterval(focus, TV_ROTATION_MS);
    return () => {
      clearInterval(t);
      mapRef.current?.closePopup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvMode, located.length]);

  const flyTo = (p: Project) => {
    if (p.latitude != null && p.longitude != null && mapRef.current) {
      mapRef.current.flyTo([p.latitude, p.longitude], 16, { duration: 1.2 });
    }
  };

  const mesRef = `${String(clock.getMonth() + 1).padStart(2, "0")}/${String(clock.getFullYear()).slice(2)}`;

  // -------------------------------------------------------------------------
  return (
    <div
      ref={rootRef}
      className={`tc-root -m-6 flex flex-col overflow-hidden bg-[#060b14] text-slate-200 ${tvMode ? "tc-tv" : ""}`}
      style={{ height: tvMode && document.fullscreenElement ? "100dvh" : "calc(100dvh - 61px)" }}
    >
      <style>{`
        .tc-root { font-variant-numeric: tabular-nums; }
        .tc-grid-bg {
          background-image:
            linear-gradient(rgba(56,189,248,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.05) 1px, transparent 1px);
          background-size: 34px 34px;
        }
        .tc-pin { position: relative; width: 34px; height: 34px; }
        .tc-pin-pulse {
          position: absolute; inset: 0; border-radius: 9999px;
          border: 2px solid var(--pin); opacity: .7;
          animation: tc-pulse 2s cubic-bezier(0,0,.2,1) infinite;
        }
        .tc-pin-dot {
          position: absolute; inset: 6px; border-radius: 9999px;
          background: var(--pin); color: #04101c; font-weight: 800; font-size: 11px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 12px var(--pin), 0 0 28px color-mix(in srgb, var(--pin) 50%, transparent);
        }
        @keyframes tc-pulse {
          0% { transform: scale(.6); opacity: .9; }
          80% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .tc-base {
          width: 30px; height: 30px; border-radius: 9999px;
          background: #22d3ee; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 14px #22d3ee, 0 0 32px rgba(34,211,238,.4);
          border: 2px solid #04101c;
        }
        .tc-route-badge {
          width: 18px; height: 18px; border-radius: 9999px;
          background: #04101c; border: 1.5px solid #22d3ee; color: #22d3ee;
          font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 8px rgba(34,211,238,.5);
        }
        .tc-popup .leaflet-popup-content-wrapper {
          background: rgba(8,15,26,.95); border: 1px solid rgba(56,189,248,.35);
          border-radius: 10px; box-shadow: 0 0 24px rgba(56,189,248,.15);
        }
        .tc-popup .leaflet-popup-tip { background: rgba(8,15,26,.95); }
        .tc-scan {
          background: linear-gradient(180deg, transparent 0%, rgba(56,189,248,.03) 50%, transparent 100%);
          background-size: 100% 8px;
        }
        .tc-check { transition: all .15s ease; cursor: pointer; }
        .tc-check:hover { transform: scale(1.2); }
        .tc-check-auto { cursor: default; }
        .tc-check-auto:hover { transform: none; }
        .tc-row:hover { background: rgba(56,189,248,.06); }
        .tc-row-spot {
          background: rgba(34,211,238,.12) !important;
          box-shadow: inset 3px 0 0 #22d3ee;
        }
        .tc-tv .tc-row { padding-top: 10px; padding-bottom: 10px; }
        .leaflet-container { background: #060b14; }
        .tc-recbar { height: 3px; border-radius: 2px; background: rgba(52,211,153,.15); overflow: hidden; }
        .tc-recbar > div { height: 100%; background: #34d399; box-shadow: 0 0 6px #34d399; transition: width .4s ease; }
      `}</style>

      {/* ===== Header HUD ===== */}
      <div className="flex items-center gap-4 border-b border-cyan-500/20 bg-[#081020]/90 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <RadioTower className="h-7 w-7 text-cyan-400" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-cyan-300">
              Torre de Controle
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Obras em andamento · Mês {mesRef}
            </p>
          </div>
        </div>

        <div className="mx-4 hidden h-8 w-px bg-cyan-500/20 md:block" />

        <div className="hidden flex-1 items-center gap-6 md:flex">
          <Hud label="Obras ativas" value={String(obras.length)} />
          <Hud label="Em carteira" value={formatBRL(totalValue)} accent />
          <Hud
            label="Recebido"
            value={`${formatBRL(totalRecebido)} · ${totalValue > 0 ? Math.round((totalRecebido / totalValue) * 100) : 0}%`}
            color="#34d399"
          />
          <Hud label="No radar" value={`${located.length}/${obras.length}`} />
          <Hud label="100% concluídas" value={String(concluidas)} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-sm text-cyan-300/80 lg:block">
            {clock.toLocaleTimeString("pt-BR")}
          </span>
          <Button
            size="sm"
            variant="outline"
            className={`border-cyan-500/40 bg-transparent hover:bg-cyan-500/10 ${tvMode ? "bg-cyan-500/20 text-cyan-200" : "text-cyan-300 hover:text-cyan-200"}`}
            onClick={toggleTv}
            data-testid="button-tv"
          >
            <Tv className="mr-1.5 h-3.5 w-3.5" />
            {tvMode ? "Sair da TV" : "Modo TV"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/40 bg-transparent text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
            onClick={() => setIncludeAprovadas((v) => !v)}
            data-testid="button-toggle-aprovadas"
          >
            {includeAprovadas ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
            Aprovadas
          </Button>
          <Button
            size="sm"
            className="bg-cyan-500 text-[#04101c] hover:bg-cyan-400"
            onClick={geocodeAll}
            disabled={geocoding}
            data-testid="button-geocode"
          >
            {geocoding ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {geoProgress ? `${geoProgress.done}/${geoProgress.total}` : "..."}
              </>
            ) : (
              <>
                <LocateFixed className="mr-1.5 h-3.5 w-3.5" />
                Localizar obras
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ===== Corpo: mapa + painel ===== */}
      <div className="flex min-h-0 flex-1">
        {/* Mapa */}
        <div className="relative min-w-0 flex-1">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" data-testid="map-torre" />
          <div className="tc-grid-bg tc-scan pointer-events-none absolute inset-0 z-[500]" />
          {placingId && (
            <div className="absolute left-1/2 top-4 z-[600] -translate-x-1/2 rounded-lg border border-amber-400/60 bg-[#081020]/95 px-4 py-2 text-sm text-amber-300 shadow-lg shadow-amber-500/10">
              <Crosshair className="mr-2 inline h-4 w-4 animate-pulse" />
              {placingId === PLACING_BASE
                ? "Clique no mapa para definir a base da rota"
                : "Clique no mapa para posicionar a obra"}
              <button className="ml-3 text-slate-400 underline" onClick={() => setPlacingId(null)}>
                cancelar
              </button>
            </div>
          )}
          {tvMode && (
            <div className="absolute right-4 top-4 z-[600] flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#081020]/90 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-cyan-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Ao vivo
            </div>
          )}
          {/* Legenda */}
          <div className="absolute bottom-4 left-4 z-[600] rounded-lg border border-cyan-500/20 bg-[#081020]/90 p-3 backdrop-blur">
            <p className="mb-2 text-[9px] uppercase tracking-[0.25em] text-slate-500">Legenda</p>
            {TRACKS.map((t) => (
              <div key={t.key} className="mb-1 flex items-center gap-2 last:mb-0">
                <span className="h-3 w-3 rounded-[3px] border" style={{ borderColor: t.color, background: `${t.color}55` }} />
                <span className="text-[11px] text-slate-300">
                  {t.label}
                  {t.auto && <span className="text-slate-500"> · auto (financeiro)</span>}
                </span>
              </div>
            ))}
            <div className="mt-2 border-t border-slate-700/60 pt-2 text-[10px] leading-4 text-slate-500">
              vazio = pendente · meio = parcial · cheio = concluído
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div className="flex w-[440px] max-w-[45vw] flex-col border-l border-cyan-500/20 bg-[#081020]/80">
          {/* Abas */}
          <div className="flex border-b border-cyan-500/15">
            <PanelTab
              active={tab === "quadro"}
              onClick={() => setTab("quadro")}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label="Quadro de Obras"
              testId="tab-quadro"
            />
            <PanelTab
              active={tab === "rota"}
              onClick={() => setTab("rota")}
              icon={<RouteIcon className="h-3.5 w-3.5" />}
              label="Rota do Dia"
              testId="tab-rota"
            />
          </div>

          {tab === "quadro" && (
            <>
              <div className="flex items-center justify-end gap-2 border-b border-cyan-500/10 px-4 py-1.5">
                {TRACKS.map((t) => (
                  <span key={t.key} title={t.label}
                    className="w-6 text-center text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: t.color }}>
                    {t.short}
                  </span>
                ))}
                <span className="w-12" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {obras.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Nenhuma obra em andamento.
                    <br />
                    Mude o status de um projeto para <span className="text-cyan-400">Execução</span> e ele aparece aqui.
                  </div>
                )}
                {obras.map((p, i) => {
                  const client = clientById.get(p.clientId);
                  const s = statusOf(p);
                  const hasCoords = p.latitude != null && p.longitude != null;
                  const pct = recebidoPct(p);
                  return (
                    <div key={p.id}
                      ref={(el) => { if (el) rowRefsRef.current.set(p.id, el); else rowRefsRef.current.delete(p.id); }}
                      className={`tc-row flex items-center gap-2 border-b border-slate-800/60 px-4 py-2 ${spotlightId === p.id ? "tc-row-spot" : ""}`}
                      data-testid={`row-obra-${i + 1}`}>
                      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-slate-500">
                        {i + 1}.
                      </span>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => flyTo(p)}
                        title={addressFor(p) || "Sem endereço cadastrado"}
                      >
                        <div className="truncate text-[13px] font-semibold text-slate-200">
                          {client?.name || p.name}
                        </div>
                        <div className="truncate text-[10px] uppercase tracking-wider text-slate-500">
                          {cityOf(addressFor(p))} · {formatBRL(p.value)}
                        </div>
                        <div className="tc-recbar mt-1" title={`Recebido: ${formatBRL(recebidoByProject.get(p.id) || 0)} (${Math.round(pct * 100)}%)`}>
                          <div style={{ width: `${Math.round(pct * 100)}%` }} />
                        </div>
                      </button>

                      {TRACKS.map((t) => {
                        const v = s[t.key];
                        const title = t.auto
                          ? `${t.label} (auto): ${Math.round(pct * 100)}% — ${formatBRL(recebidoByProject.get(p.id) || 0)} de ${formatBRL(p.value)}`
                          : `${t.label}: ${v === 0 ? "pendente" : v === 1 ? "parcial" : "concluído"}`;
                        return (
                          <button
                            key={t.key}
                            className={`tc-check flex w-6 shrink-0 justify-center ${t.auto ? "tc-check-auto" : ""}`}
                            onClick={() => cycleTrack(p, t.key)}
                            title={title}
                            data-testid={`check-${t.key}-${i + 1}`}
                          >
                            <span
                              className="h-4 w-4 rounded-[4px] border-2"
                              style={{
                                borderColor: t.color,
                                background:
                                  v === 2 ? t.color
                                    : v === 1 ? `linear-gradient(135deg, ${t.color} 50%, transparent 50%)`
                                    : "transparent",
                                boxShadow: v === 2 ? `0 0 8px ${t.color}88` : "none",
                              }}
                            />
                          </button>
                        );
                      })}

                      <div className="flex w-12 shrink-0 items-center justify-end gap-1">
                        <button
                          className={`rounded p-1 transition-colors ${placingId === p.id ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-amber-400"}`}
                          title="Posicionar no mapa (clique aqui e depois no mapa)"
                          onClick={() => setPlacingId(placingId === p.id ? null : p.id)}
                          data-testid={`button-place-${i + 1}`}
                        >
                          <Crosshair className="h-3.5 w-3.5" />
                        </button>
                        <MapPin className={`h-3.5 w-3.5 ${hasCoords ? "text-cyan-400" : "text-slate-700"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "rota" && (
            <>
              <div className="flex items-center gap-2 border-b border-cyan-500/10 px-4 py-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 border-cyan-500/40 bg-transparent text-[11px] ${placingId === PLACING_BASE ? "bg-amber-500/20 text-amber-300" : "text-cyan-300"}`}
                  onClick={() => setPlacingId(placingId === PLACING_BASE ? null : PLACING_BASE)}
                  data-testid="button-set-base"
                >
                  <Home className="mr-1 h-3 w-3" />
                  Definir base
                </Button>
                <span className="ml-auto text-[11px] text-slate-400">
                  {routeStops.length} paradas · <span className="font-mono text-cyan-300">{routeTotalKm.toFixed(1)} km</span>
                  <span className="text-slate-600"> (linha reta)</span>
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {located.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Nenhuma obra localizada no mapa ainda.
                    <br />
                    Use <span className="text-cyan-400">Localizar obras</span> primeiro.
                  </div>
                )}
                {routeStops.map((s, i) => {
                  const client = clientById.get(s.p.clientId);
                  return (
                    <div key={s.p.id} className="tc-row flex items-center gap-3 border-b border-slate-800/60 px-4 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/60 font-mono text-[11px] font-bold text-cyan-300">
                        {i + 1}
                      </span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => flyTo(s.p)}>
                        <div className="truncate text-[13px] font-semibold text-slate-200">
                          {client?.name || s.p.name}
                        </div>
                        <div className="truncate text-[10px] uppercase tracking-wider text-slate-500">
                          {cityOf(addressFor(s.p))} · +{s.legKm.toFixed(1)} km
                        </div>
                      </button>
                      <button
                        className="rounded p-1 text-slate-500 transition-colors hover:text-red-400"
                        title="Tirar da rota de hoje"
                        onClick={() => setRouteExcluded((prev) => new Set(prev).add(s.p.id))}
                        data-testid={`button-route-remove-${i + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {routeExcluded.size > 0 && (
                  <div className="px-4 py-2">
                    <p className="mb-1 text-[9px] uppercase tracking-[0.25em] text-slate-600">Fora da rota</p>
                    {located.filter((p) => routeExcluded.has(p.id)).map((p) => {
                      const client = clientById.get(p.clientId);
                      return (
                        <button
                          key={p.id}
                          className="block w-full truncate py-1 text-left text-[12px] text-slate-500 hover:text-cyan-300"
                          onClick={() =>
                            setRouteExcluded((prev) => {
                              const n = new Set(prev);
                              n.delete(p.id);
                              return n;
                            })
                          }
                        >
                          + {client?.name || p.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-cyan-500/15 p-3">
                <Button
                  className="w-full bg-cyan-500 text-[#04101c] hover:bg-cyan-400"
                  disabled={!googleMapsUrl}
                  onClick={() => googleMapsUrl && window.open(googleMapsUrl, "_blank", "noopener")}
                  data-testid="button-open-gmaps"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir rota no Google Maps
                </Button>
                <p className="mt-2 text-center text-[10px] text-slate-600">
                  Ordem otimizada por proximidade a partir da base · envie o link para a equipe
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Hud({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={`font-mono text-sm font-bold ${accent ? "text-cyan-300" : "text-slate-200"}`}
        style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function PanelTab({ active, onClick, icon, label, testId }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; testId: string;
}) {
  return (
    <button
      className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
        active
          ? "border-b-2 border-cyan-400 bg-cyan-500/10 text-cyan-300"
          : "text-slate-500 hover:text-slate-300"
      }`}
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
      {label}
    </button>
  );
}
