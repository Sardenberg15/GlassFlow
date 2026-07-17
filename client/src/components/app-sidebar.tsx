import {
  LayoutDashboard, Users, FileText, DollarSign, Settings,
  FileCheck, Layers, Factory, Package, HardHat,
  TrendingUp, Landmark, Target, BarChart3, ChevronDown, Archive, RadioTower
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import logoPath from "@assets/image_1761404972727.png";

const menuGroups = [
  {
    label: "Comercial",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Torre de Controle", url: "/torre-de-controle", icon: RadioTower },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Projetos", url: "/projetos", icon: FileText },
      { title: "Orçamentos", url: "/orcamentos", icon: FileCheck },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Visão Geral", url: "/financeiro", icon: DollarSign },
      { title: "DRE", url: "/dre", icon: BarChart3 },
    ],
  },
  {
    label: "Produção",
    items: [
      { title: "Esquadrias", url: "/esquadrias", icon: Layers },
      { title: "Produção", url: "/producao", icon: Factory },
      { title: "Estoque", url: "/estoque", icon: Package },
    ],
  },
  {
    label: "RH",
    items: [
      { title: "Funcionários", url: "/funcionarios", icon: HardHat },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { title: "Arquivo Virtual", url: "/arquivo-virtual", icon: Archive },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center justify-center transition-all hover:scale-105">
          <img
            src={logoPath}
            alt="HelpGlass"
            className="block h-auto w-full max-h-10 md:max-h-12 object-contain drop-shadow-md brightness-0 invert opacity-90"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] font-bold px-3 mb-1 opacity-40">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="h-9 rounded-lg transition-all duration-200"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-[13px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-white/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/configuracoes"}
              data-testid="link-configuracoes"
              className="h-9 rounded-lg"
            >
              <Link href="/configuracoes">
                <Settings className="h-4 w-4" />
                <span className="text-[13px] font-medium">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
