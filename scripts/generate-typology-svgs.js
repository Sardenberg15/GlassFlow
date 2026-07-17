import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '../client/public/typologias');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Colors for "Alô Serralheiro" Technical Blueprint Look
const frameColor = "#f8fafc";
const frameStroke = "#94a3b8";
const glassColor = "#f0f9ff";
const glassStroke = "#7dd3fc";
const arrowColor = "#64748b";
const handleColor = "#94a3b8";

const svgs = {
    // ----------------- JANELAS CORRER -----------------
    'jc200.svg': `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="130" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="20" y="20" width="80" height="110" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="100" y="20" width="80" height="110" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="95" y="20" width="10" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <path d="M 60 75 L 45 75 M 45 75 L 50 70 M 45 75 L 50 80" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 140 75 L 155 75 M 155 75 L 150 70 M 155 75 L 150 80" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'jc300.svg': `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="130" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="20" y="20" width="53.3" height="110" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="73.3" y="20" width="53.3" height="110" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="126.6" y="20" width="53.3" height="110" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="70" y="20" width="8" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="122" y="20" width="8" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <path d="M 46 75 L 36 75 M 36 75 L 39 72 M 36 75 L 39 78" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 154 75 L 164 75 M 164 75 L 161 72 M 164 75 L 161 78" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'jc400.svg': `<svg viewBox="0 0 250 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="230" height="130" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="18" y="18" width="53.5" height="114" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="71.5" y="18" width="53.5" height="114" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="125" y="18" width="53.5" height="114" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="178.5" y="18" width="53.5" height="114" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="68" y="18" width="8" height="114" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="121" y="18" width="8" height="114" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="174" y="18" width="8" height="114" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <path d="M 110 75 L 90 75 M 90 75 L 93 72 M 90 75 L 93 78" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 140 75 L 160 75 M 160 75 L 157 72 M 160 75 L 157 78" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    // ----------------- JANELAS CORRER COM BANDEIRA -----------------
    'jcb200.svg': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="180" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <!-- Bandeira Fixo (Top) -->
        <rect x="20" y="20" width="160" height="50" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <!-- Travessa Central -->
        <rect x="10" y="70" width="180" height="10" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <!-- Correr Abaixo -->
        <rect x="20" y="80" width="80" height="100" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="100" y="80" width="80" height="100" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="95" y="80" width="10" height="100" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <path d="M 60 130 L 45 130 M 45 130 L 50 125 M 45 130 L 50 135" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 140 130 L 155 130 M 155 130 L 150 125 M 155 130 L 150 135" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    // ----------------- MAXIM-AR -----------------
    'max.svg': `<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="110" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="30" y="30" width="90" height="90" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <path d="M 30 120 L 75 30 L 120 120" stroke="${glassStroke}" stroke-width="1" stroke-dasharray="3" fill="none"/>
        <rect x="65" y="125" width="20" height="5" fill="${handleColor}" rx="2"/>
    </svg>`,
    'max2.svg': `<svg viewBox="0 0 250 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="210" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="30" y="30" width="90" height="90" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="130" y="30" width="90" height="90" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="120" y="20" width="10" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <path d="M 30 120 L 75 30 L 120 120" stroke="${glassStroke}" stroke-width="1" stroke-dasharray="3" fill="none"/>
        <path d="M 130 120 L 175 30 L 220 120" stroke="${glassStroke}" stroke-width="1" stroke-dasharray="3" fill="none"/>
        <rect x="65" y="125" width="20" height="5" fill="${handleColor}" rx="2"/>
        <rect x="165" y="125" width="20" height="5" fill="${handleColor}" rx="2"/>
    </svg>`,

    // ----------------- FIXO -----------------
    'fixo.svg': `<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="110" height="110" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="30" y="30" width="90" height="90" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
    </svg>`,

    // ----------------- PORTAS DE CORRER -----------------
    'pc200.svg': `<svg viewBox="0 0 150 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="130" height="230" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="18" y="18" width="57" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="75" y="18" width="57" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="70" y="18" width="10" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="25" y="110" width="5" height="30" fill="${handleColor}" rx="2"/>
        <rect x="120" y="110" width="5" height="30" fill="${handleColor}" rx="2"/>
        <path d="M 48 125 L 35 125 M 35 125 L 38 122 M 35 125 L 38 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 102 125 L 115 125 M 115 125 L 112 122 M 115 125 L 112 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'pc300.svg': `<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="230" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="18" y="18" width="54.6" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="72.6" y="18" width="54.6" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="127.2" y="18" width="54.6" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="70" y="18" width="8" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="124" y="18" width="8" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="170" y="110" width="5" height="30" fill="${handleColor}" rx="2"/>
        <path d="M 150 125 L 165 125 M 165 125 L 162 122 M 165 125 L 162 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'pc400.svg': `<svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="230" height="230" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="18" y="18" width="53.5" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="71.5" y="18" width="53.5" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="125" y="18" width="53.5" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="178.5" y="18" width="53.5" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="68" y="18" width="8" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="121" y="18" width="8" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="174" y="18" width="8" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="80" y="110" width="5" height="30" fill="${handleColor}" rx="2"/>
        <rect x="165" y="110" width="5" height="30" fill="${handleColor}" rx="2"/>
        <path d="M 110 125 L 90 125 M 90 125 L 93 122 M 90 125 L 93 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 140 125 L 160 125 M 160 125 L 157 122 M 160 125 L 157 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'pc600.svg': `<svg viewBox="0 0 350 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="330" height="230" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="18" y="18" width="52.3" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="70.3" y="18" width="52.3" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="122.6" y="18" width="52.3" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="174.9" y="18" width="52.3" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="227.2" y="18" width="52.3" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="279.5" y="18" width="52.3" height="222" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="67" y="18" width="6" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="119" y="18" width="6" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="171" y="18" width="6" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="223" y="18" width="6" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="275" y="18" width="6" height="222" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <path d="M 120 125 L 100 125 M 100 125 L 103 122 M 100 125 L 103 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 230 125 L 250 125 M 250 125 L 247 122 M 250 125 L 247 128" stroke="${arrowColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    // ----------------- PORTAS DE GIRO -----------------
    'pg100.svg': `<svg viewBox="0 0 150 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="10" width="100" height="230" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="35" y="20" width="80" height="200" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="35" y="220" width="80" height="15" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="110" y="110" width="6" height="20" fill="${handleColor}" rx="3"/>
        <path d="M 35 20 L 115 125 L 35 220" stroke="${glassStroke}" stroke-width="1" stroke-dasharray="3" fill="none"/>
    </svg>`,

    'pg200.svg': `<svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="230" height="230" fill="${frameColor}" stroke="${frameStroke}" stroke-width="3" rx="2"/>
        <rect x="20" y="20" width="100" height="200" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="130" y="20" width="100" height="200" fill="${glassColor}" stroke="${glassStroke}" stroke-width="1.5" rx="1"/>
        <rect x="20" y="220" width="210" height="15" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="120" y="20" width="10" height="200" fill="${frameColor}" stroke="${frameStroke}" stroke-width="1.5"/>
        <rect x="135" y="110" width="6" height="20" fill="${handleColor}" rx="3"/>
        <rect x="109" y="110" width="6" height="20" fill="${handleColor}" rx="3"/>
        <path d="M 20 20 L 120 125 L 20 220" stroke="${glassStroke}" stroke-width="1" stroke-dasharray="3" fill="none"/>
        <path d="M 230 20 L 130 125 L 230 220" stroke="${glassStroke}" stroke-width="1" stroke-dasharray="3" fill="none"/>
    </svg>`
};

for (const [name, content] of Object.entries(svgs)) {
    fs.writeFileSync(path.join(outDir, name), content.trim());
}
console.log("Expanded SVG typologies generated successfully in /client/public/typologias");
