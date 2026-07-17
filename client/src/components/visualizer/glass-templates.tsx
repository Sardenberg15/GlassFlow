
import React from 'react';

export type GlassTemplate = 'box_frontal' | 'janela_correr' | 'porta_giro';

export interface TemplateProps {
    width: number;
    height: number;
    glassColor: string;
    profileColor: string;
}

export const GlassTemplates: Record<GlassTemplate, React.FC<TemplateProps>> = {
    box_frontal: ({ width, height, glassColor, profileColor }) => {
        const fixedWidth = width / 2;
        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-xl">
                {/* Fixed Pane */}
                <rect x="0" y="0" width={fixedWidth} height={height} fill={glassColor} opacity="0.6" stroke={profileColor} strokeWidth="2" />
                {/* Sliding Pane (slightly offset to simulate overlap) */}
                <rect x={fixedWidth - 10} y="0" width={fixedWidth + 10} height={height} fill={glassColor} opacity="0.7" stroke={profileColor} strokeWidth="2" />
                {/* Profiles */}
                <rect x="0" y="0" width={width} height="40" fill={profileColor} /> {/* Top Rail */}
                <rect x="0" y={height - 40} width={width} height="40" fill={profileColor} /> {/* Bottom Rail */}
                <rect x="0" y="0" width="10" height={height} fill={profileColor} /> {/* Left Jamboree */}
                <rect x={width - 10} y="0" width="10" height={height} fill={profileColor} /> {/* Right Jamboree */}
                {/* Handle */}
                <circle cx={fixedWidth + (fixedWidth / 2)} cy={height / 2} r="15" fill="#e2e8f0" stroke={profileColor} strokeWidth="2" />
            </svg>
        );
    },
    janela_correr: ({ width, height, glassColor, profileColor }) => {
        const paneWidth = width / 2;
        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-xl">
                {/* Frame */}
                <rect x="0" y="0" width={width} height={height} fill="none" stroke={profileColor} strokeWidth="10" />
                {/* Pane 1 (Fixed) */}
                <rect x="5" y="5" width={paneWidth} height={height - 10} fill={glassColor} opacity="0.6" stroke="none" />
                {/* Pane 2 (Sliding) */}
                <rect x={paneWidth} y="5" width={paneWidth - 5} height={height - 10} fill={glassColor} opacity="0.7" stroke="none" />
                {/* Central Mullion */}
                <rect x={paneWidth - 5} y="0" width="10" height={height} fill={profileColor} />
            </svg>
        );
    },
    porta_giro: ({ width, height, glassColor, profileColor }) => {
        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full drop-shadow-xl">
                {/* Door Frame */}
                <rect x="0" y="0" width={width} height={height} fill="none" stroke={profileColor} strokeWidth="8" />
                {/* Glass Leaf */}
                <rect x="8" y="8" width={width - 16} height={height - 16} fill={glassColor} opacity="0.6" />
                {/* Hinge Indicators */}
                <rect x="0" y={height * 0.15} width="4" height="20" fill={profileColor} />
                <rect x="0" y={height * 0.85} width="4" height="20" fill={profileColor} />
                {/* Handle */}
                <rect x={width - 40} y={height / 2} width="10" height="40" rx="2" fill="#e2e8f0" stroke={profileColor} />
            </svg>
        );
    }
};

export const TEMPLATE_OPTIONS = [
    { id: 'box_frontal', label: 'Box Frontal', icon: '🚿' },
    { id: 'janela_correr', label: 'Janela 2 Folhas', icon: '🪟' },
    { id: 'porta_giro', label: 'Porta de Giro', icon: '🚪' },
] as const;
