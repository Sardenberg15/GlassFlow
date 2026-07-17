
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Move, Palette, Ruler, Type } from "lucide-react";
import { GlassTemplates, TEMPLATE_OPTIONS, type GlassTemplate } from "./visualizer/glass-templates";

interface ProjectCanvasProps {
    projectId: string;
}

export function ProjectCanvas({ projectId }: ProjectCanvasProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<GlassTemplate>('box_frontal');
    const [dimensions, setDimensions] = useState({ width: 1200, height: 2100 });
    const [glassColor, setGlassColor] = useState('rgba(200, 220, 240, 0.4)'); // Default Incolor
    const [profileColor, setProfileColor] = useState('#1e293b'); // Default Slate 800

    const TemplateComponent = GlassTemplates[selectedTemplate];

    return (
        <div className="flex h-[800px] w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative font-sans">
            {/* Left Sidebar - Toolbar */}
            <div className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-4 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                {TEMPLATE_OPTIONS.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id as GlassTemplate)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-105 ${selectedTemplate === template.id
                            ? 'bg-black text-white shadow-lg ring-4 ring-black/5'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        title={template.label}
                    >
                        {template.icon}
                    </button>
                ))}
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative flex items-center justify-center bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] p-12 overflow-hidden">
                <div className="absolute top-6 left-6 text-slate-400 font-mono text-xs tracking-wider uppercase">
                    Canvas v1.0 • {dimensions.width}x{dimensions.height}mm
                </div>

                {/* The Visualization Object */}
                <div
                    className="relative transition-all duration-500 ease-out"
                    style={{
                        width: dimensions.width / 5, // Scale down for display
                        height: dimensions.height / 5
                    }}
                >
                    <TemplateComponent
                        width={dimensions.width}
                        height={dimensions.height}
                        glassColor={glassColor}
                        profileColor={profileColor}
                    />

                    {/* Dimension Indicators (Visual only) */}
                    <div className="absolute -bottom-8 left-0 w-full flex justify-center text-xs font-medium text-slate-500 font-mono bg-white/80 px-2 py-0.5 rounded-full backdrop-blur border border-slate-200 shadow-sm">
                        {dimensions.width}mm
                    </div>
                    <div className="absolute top-1/2 -right-12 -translate-y-1/2 rotate-90 text-xs font-medium text-slate-500 font-mono bg-white/80 px-2 py-0.5 rounded-full backdrop-blur border border-slate-200 shadow-sm">
                        {dimensions.height}mm
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Properties Panel */}
            <div className="w-80 bg-white/90 backdrop-blur-xl border-l border-slate-200 p-6 flex flex-col gap-8 z-10">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-1">Propriedades</h3>
                    <p className="text-xs text-slate-400 font-medium">Configure seu projeto</p>
                </div>

                {/* Dimensions Group */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700">
                        <Ruler className="w-4 h-4" />
                        <span className="text-sm font-medium">Dimensões (mm)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Largura</Label>
                            <Input
                                type="number"
                                value={dimensions.width}
                                onChange={(e) => setDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                                className="h-9 font-mono text-sm bg-slate-50 border-slate-200 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Altura</Label>
                            <Input
                                type="number"
                                value={dimensions.height}
                                onChange={(e) => setDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
                                className="h-9 font-mono text-sm bg-slate-50 border-slate-200 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Appearance Group */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700">
                        <Palette className="w-4 h-4" />
                        <span className="text-sm font-medium">Acabamento</span>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs text-slate-500">Cor do Vidro</Label>
                        <div className="flex gap-2">
                            {['rgba(200, 220, 240, 0.4)', 'rgba(50, 60, 50, 0.6)', 'rgba(120, 180, 140, 0.4)', 'rgba(200, 150, 100, 0.3)'].map((color, i) => (
                                <button
                                    key={i}
                                    onClick={() => setGlassColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${glassColor === color ? 'border-black scale-110 shadow-sm' : 'border-transparent hover:scale-110'
                                        }`}
                                    style={{ background: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs text-slate-500">Perfis</Label>
                        <div className="flex gap-2">
                            {['#1e293b', '#64748b', '#ffffff', '#78350f'].map((color, i) => (
                                <button
                                    key={i}
                                    onClick={() => setProfileColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${profileColor === color ? 'border-black scale-110 shadow-sm' : 'border-slate-100 hover:scale-110'
                                        }`}
                                    style={{ background: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
                    <Button className="w-full bg-black hover:bg-slate-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                        Salvar Projeto
                    </Button>
                    <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg">
                        Exportar PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
