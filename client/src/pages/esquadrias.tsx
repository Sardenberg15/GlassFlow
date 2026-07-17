import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Box, Ruler, Package } from "lucide-react";
import { LinhasPerfisTab } from "@/components/esquadrias/linhas-perfis-tab";
import { TipologiasTab } from "@/components/esquadrias/tipologias-tab";
import { PlanoCorteTab } from "@/components/esquadrias/plano-corte-tab";
import { EstoqueTab } from "@/components/esquadrias/estoque-tab";

export default function EsquadriasPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Serralheria & Tipologias</h1>
                <p className="text-muted-foreground text-sm">
                    Gerencie linhas de alumínio, perfis, tipologias de esquadrias e otimize planos de corte.
                </p>
            </div>

            <Tabs defaultValue="tipologias" className="w-full">
                <TabsList className="grid grid-cols-4 w-full max-w-[650px] mb-4">
                    <TabsTrigger value="linhas" className="flex items-center gap-2 text-xs sm:text-sm">
                        <Layers className="h-4 w-4" />
                        <span className="hidden sm:inline">Linhas &</span> Perfis
                    </TabsTrigger>
                    <TabsTrigger value="tipologias" className="flex items-center gap-2 text-xs sm:text-sm">
                        <Box className="h-4 w-4" />
                        Tipologias
                    </TabsTrigger>
                    <TabsTrigger value="corte" className="flex items-center gap-2 text-xs sm:text-sm">
                        <Ruler className="h-4 w-4" />
                        <span className="hidden sm:inline">Plano de</span> Corte
                    </TabsTrigger>
                    <TabsTrigger value="estoque" className="flex items-center gap-2 text-xs sm:text-sm">
                        <Package className="h-4 w-4" />
                        Estoque
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="linhas">
                    <LinhasPerfisTab />
                </TabsContent>

                <TabsContent value="tipologias">
                    <TipologiasTab />
                </TabsContent>

                <TabsContent value="corte">
                    <PlanoCorteTab />
                </TabsContent>

                <TabsContent value="estoque">
                    <EstoqueTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
