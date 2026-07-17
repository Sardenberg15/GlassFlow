import 'dotenv/config';
import { db } from '../server/db';
import {
    aluminumLines,
    aluminumProfiles,
    typologies,
    typologyMaterials
} from '../shared/schema';

// Helper to clean out old schema tables
async function clearEsquadriasData() {
    console.log('Clearing old esquadrias data...');
    try {
        await db.delete(typologyMaterials);
        await db.delete(typologies);
        await db.delete(aluminumProfiles);
        await db.delete(aluminumLines);
    } catch (error) {
        console.error('Cannot delete old data (maybe foreign keys exist), ignoring clear step.');
    }
}

async function seedCatalogoExtenso() {
    console.log('--- Instalando Linhas Completas (Suprema / Gold) ---');

    // ---------------- LINHA SUPREMA ----------------
    const [suprema] = await db.insert(aluminumLines).values({
        name: 'Suprema',
        description: 'Sistema de esquadrias de 25mm com excelente custo-benefício.',
    }).returning();

    const supremaProfiles = [
        { code: 'SU-001', name: 'MARCO LATERAL', weightPerMeter: '0.600' },
        { code: 'SU-002', name: 'MARCO SUP/INF', weightPerMeter: '0.550' },
        { code: 'SU-003', name: 'FOLHA LATERAL', weightPerMeter: '0.650' },
        { code: 'SU-004', name: 'MÃO DE AMIGO CENTRAL', weightPerMeter: '0.750' },
        { code: 'SU-053', name: 'TRILHO INFERIOR 2P', weightPerMeter: '0.850' },
        { code: 'SU-054', name: 'TRILHO SUPERIOR 2P', weightPerMeter: '0.780' },
        { code: 'SU-039', name: 'TRILHO INFERIOR 3P', weightPerMeter: '1.250' },
        { code: 'SU-040', name: 'TRILHO SUPERIOR 3P', weightPerMeter: '1.180' },
        { code: 'SU-102', name: 'REMATES', weightPerMeter: '0.350' },
        { code: 'SU-225', name: 'TRAVESSA', weightPerMeter: '0.580' },
        { code: 'SU-200', name: 'BAGUETE', weightPerMeter: '0.150' },
        { code: 'SU-010', name: 'MARCO MAXIM-AR', weightPerMeter: '0.500' },
        { code: 'SU-083', name: 'FOLHA MAXIM-AR', weightPerMeter: '0.620' },
        { code: 'SU-080', name: 'PINGADEIRA', weightPerMeter: '0.310' },
        { code: 'SU-066', name: 'MARCO PORTA GIRO', weightPerMeter: '0.800' },
        { code: 'SU-071', name: 'FOLHA PORTA GIRO', weightPerMeter: '1.050' },
    ];

    const suMap: Record<string, string> = {};
    for (const p of supremaProfiles) {
        const [inserted] = await db.insert(aluminumProfiles).values({ ...p, lineId: suprema.id }).returning();
        suMap[p.code] = inserted.id;
    }

    // ---------------- LINHA GOLD ----------------
    const [gold] = await db.insert(aluminumLines).values({
        name: 'Gold',
        description: 'Sistema Premium de Esquadrias, com perfis robustos para grandes vãos.',
    }).returning();

    const goldProfiles = [
        { code: 'LG-001', name: 'MARCO LATERAL', weightPerMeter: '0.850' },
        { code: 'LG-002', name: 'MARCO SUP/INF', weightPerMeter: '0.900' },
        { code: 'LG-044', name: 'FOLHA LATERAL', weightPerMeter: '1.247' },
        { code: 'LG-062', name: 'MÃO DE AMIGO CENTRAL', weightPerMeter: '1.728' },
        { code: 'LG-050', name: 'MONTANTE LATERAL', weightPerMeter: '0.820' },
        { code: 'LG-024', name: 'TRILHO INFERIOR 2P', weightPerMeter: '1.123' },
        { code: 'TGL-005', name: 'TRILHO SUPERIOR 2P', weightPerMeter: '1.056' },
        { code: 'LG-026', name: 'TRILHO INFERIOR 3P', weightPerMeter: '1.620' },
        { code: 'LG-033', name: 'TRILHO SUPERIOR 3P', weightPerMeter: '1.550' },
        { code: 'LG-055', name: 'MARCO PORTA GIRO', weightPerMeter: '1.200' },
        { code: 'LG-060', name: 'FOLHA PORTA GIRO', weightPerMeter: '1.450' },
        { code: 'SI-301', name: 'BAGUETE', weightPerMeter: '0.230' },
    ];

    const goMap: Record<string, string> = {};
    for (const p of goldProfiles) {
        const [inserted] = await db.insert(aluminumProfiles).values({ ...p, lineId: gold.id }).returning();
        goMap[p.code] = inserted.id;
    }

    // --- Typologies Catalog Data ---
    const catalog = [
        // ======================== SUPREMA JANELAS ========================
        {
            lineId: suprema.id, code: 'JC2', type: 'janela',
            name: 'Janela Suprema Correr 2 Folhas',
            desc: 'Janela de Correr 2 folhas padrão',
            acc: 'Kit Alumínio Padrão (2 Roldanas simples, Escovas 5x5, Fecho Concha Cego, Gaxeta EPDM)',
            img: '/typologias/jc200.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-053', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-054', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: 'H - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-004', formula: 'H - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 2) - 15', qt: '4', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'JC3', type: 'janela',
            name: 'Janela Suprema Correr 3 Folhas',
            desc: 'Janela de Correr 3 folhas sequenciais',
            acc: 'Kit 03 Janela (2 Roldanas duplas, Fechos Concha lateral, Guias, Escova Vedação)',
            img: '/typologias/jc300.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-039', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-040', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: 'H - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-004', formula: 'H - 32', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 3) + 15', qt: '6', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'JC4', type: 'janela',
            name: 'Janela Suprema Correr 4 Folhas',
            desc: 'Janela de Correr 4 folhas com encontro central',
            acc: 'Kit 04 Janela Suprema (4 Roldanas duplas, 2 Fechos centrais com chave, Guias e batedores)',
            img: '/typologias/jc400.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-053', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-054', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: 'H - 32', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-004', formula: 'H - 32', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 4) + 10', qt: '8', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'JCB2', type: 'janela',
            name: 'Janela Suprema Correr 2 Folhas + Bandeira Fixo',
            desc: 'Janela de Correr 2 folhas com peitoril/bandeira fixa',
            acc: 'Kit Fixação Vidro Fixo, Kit Janela 2 Folhas (Roldanas, Fecho, Cunhas)',
            img: '/typologias/jcb200.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: 'L', qt: '1', type: 'travessa', ori: 'largura', map: suMap },
                { profileCode: 'SU-053', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: '(H * 0.7) - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 2) - 15', qt: '4', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'MAX', type: 'janela',
            name: 'Janela Suprema Maxim-Ar (1 Módulo)',
            desc: 'Maxim-Ar tradicional',
            acc: 'Kit Maxim-Ar (Braços articulados 15", Fecho Alavanca, Guarnições)',
            img: '/typologias/max.svg',
            mats: [
                { profileCode: 'SU-010', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-010', formula: 'L', qt: '2', type: 'marco', ori: 'largura', map: suMap },
                { profileCode: 'SU-083', formula: 'H - 46', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-083', formula: 'L - 46', qt: '2', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'MAX2', type: 'janela',
            name: 'Janela Suprema Maxim-Ar (2 Módulos)',
            desc: 'Maxim-Ar conjugado duplo',
            acc: '2x Kit Maxim-Ar (Braços, Fechos Alavanca, Guarnições)',
            img: '/typologias/max2.svg',
            mats: [
                { profileCode: 'SU-010', formula: 'H', qt: '3', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-010', formula: 'L', qt: '2', type: 'marco', ori: 'largura', map: suMap },
                { profileCode: 'SU-083', formula: 'H - 46', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-083', formula: '(L / 2) - 46', qt: '4', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'FIX', type: 'janela',
            name: 'Suprema Módulo Fixo / Vidro Fixo',
            desc: 'Painel Fixo de Vidro (Pele de vidro / Fixo padrão)',
            acc: 'Apenas cunhas perimetrais e Gaxetas',
            img: '/typologias/fixo.svg',
            mats: [
                { profileCode: 'SU-010', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-010', formula: 'L', qt: '2', type: 'marco', ori: 'largura', map: suMap },
                { profileCode: 'SU-200', formula: 'H - 86', qt: '2', type: 'baguete', ori: 'altura', map: suMap },
                { profileCode: 'SU-200', formula: 'L - 86', qt: '2', type: 'baguete', ori: 'largura', map: suMap }
            ]
        },

        // ======================== SUPREMA PORTAS ========================
        {
            lineId: suprema.id, code: 'PC2', type: 'porta',
            name: 'Porta Suprema Correr 2 Folhas',
            desc: 'Porta pesada 2 folhas de correr',
            acc: 'Kit Porta Correr (Roldana côncava 60kg, Fechadura bico de papagaio stam, Batedores)',
            img: '/typologias/pc200.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-053', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-054', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: 'H - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-004', formula: 'H - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 2) - 15', qt: '4', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'PC3', type: 'porta',
            name: 'Porta Suprema Correr 3 Folhas',
            desc: 'Porta 3 folhas de correr',
            acc: 'Kit Porta 03 (Fecho automático oculto, fechadura bico papagaio, escovas de 7x5)',
            img: '/typologias/pc300.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-039', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-040', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: 'H - 32', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-004', formula: 'H - 32', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 3) + 15', qt: '6', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'PC4', type: 'porta',
            name: 'Porta Suprema Correr 4 Folhas',
            desc: 'Porta 4 folhas fechamento central',
            acc: 'Duplo Bico Papagaio, 8 roldanas 60kg, guias suprema',
            img: '/typologias/pc400.svg',
            mats: [
                { profileCode: 'SU-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-053', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-054', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: suMap },
                { profileCode: 'SU-003', formula: 'H - 32', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-004', formula: 'H - 32', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-225', formula: '(L / 4) + 10', qt: '8', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'PG1', type: 'porta',
            name: 'Porta Suprema Giro 1 Folha',
            desc: 'Porta tradicional de abrir para fora/dentro',
            acc: '3 Dobradiças robustas (preta/branca/incolor), Fechadura Broca 20mm Cilindro, Puxador Tubular 80cm',
            img: '/typologias/pg100.svg',
            mats: [
                { profileCode: 'SU-066', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-066', formula: 'L', qt: '1', type: 'marco', ori: 'largura', map: suMap },
                { profileCode: 'SU-071', formula: 'H - 40', qt: '2', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-071', formula: 'L - 60', qt: '2', type: 'folha', ori: 'largura', map: suMap }
            ]
        },
        {
            lineId: suprema.id, code: 'PG2', type: 'porta',
            name: 'Porta Suprema Giro 2 Folhas (Dupla)',
            desc: 'Porta dupla de abrir (bandeira opcional)',
            acc: '6 Dobradiças, Fecho Pena Embutido, Fechadura Externa, Puxador Duplo 1m',
            img: '/typologias/pg200.svg',
            mats: [
                { profileCode: 'SU-066', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: suMap },
                { profileCode: 'SU-066', formula: 'L', qt: '1', type: 'marco', ori: 'largura', map: suMap },
                { profileCode: 'SU-071', formula: 'H - 40', qt: '4', type: 'folha', ori: 'altura', map: suMap },
                { profileCode: 'SU-071', formula: '(L / 2) - 60', qt: '4', type: 'folha', ori: 'largura', map: suMap }
            ]
        },

        // ======================== GOLD JANELAS / FIXOS ========================
        {
            lineId: gold.id, code: 'JC2G', type: 'janela',
            name: 'Janela Gold Correr 2 Folhas',
            desc: 'Janela acústica linha Gold 2 folhas',
            acc: 'Kit Fecho Oculto Gold, Roldanas Blindadas, Guarnições EPDM Maciço',
            img: '/typologias/jc200.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-024', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'TGL-005', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-044', formula: 'H - 42', qt: '2', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-062', formula: 'H - 42', qt: '2', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'JC4G', type: 'janela',
            name: 'Janela Gold Correr 4 Folhas',
            desc: 'Janela grandes vãos 4 folhas Gold',
            acc: 'Duplo Fecho Concha Acústico Gold, 8 Roldanas Côncavas, Gaxeta Dupla',
            img: '/typologias/jc400.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-024', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'TGL-005', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-044', formula: 'H - 42', qt: '4', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-062', formula: 'H - 42', qt: '4', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'FIXG', type: 'janela',
            name: 'Módulo Fixo Estrutural Gold',
            desc: 'Para grandes panos de vidro',
            acc: 'Calços especiais, Fita dupla face estrutural 3M VHB, Gaxeta Cunha',
            img: '/typologias/fixo.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-001', formula: 'L', qt: '2', type: 'marco', ori: 'largura', map: goMap },
                { profileCode: 'SI-301', formula: 'H - 80', qt: '2', type: 'baguete', ori: 'altura', map: goMap },
                { profileCode: 'SI-301', formula: 'L - 80', qt: '2', type: 'baguete', ori: 'largura', map: goMap }
            ]
        },


        // ======================== GOLD PORTAS ========================
        {
            lineId: gold.id, code: 'PC2G', type: 'porta',
            name: 'Porta Gold Correr 2 Folhas (Varanda)',
            desc: 'Porta Premium pesada 2 folhas de correr',
            acc: 'Concha Puxadora Interna Dupla com Chave, Roldanas 150Kg blindadas rolamento naval, Batedores Emborrachados',
            img: '/typologias/pc200.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-024', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'TGL-005', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-044', formula: 'H - 42', qt: '2', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-062', formula: 'H - 42', qt: '2', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'PC3G', type: 'porta',
            name: 'Porta Gold Correr 3 Folhas (Trilho Triplo)',
            desc: 'Porta 3 folhas de correr grandes vãos',
            acc: 'Fechadura Tetra Superior Gold, Kit Roldana 200Kg, Guia Superior com Rolamento',
            img: '/typologias/pc300.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-026', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-033', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-044', formula: 'H - 42', qt: '2', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-062', formula: 'H - 42', qt: '4', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'PC4G', type: 'porta',
            name: 'Porta Gold Correr 4 Folhas',
            desc: 'Porta monumental 4 folhas (2 fixas laterais, 2 correr centrais)',
            acc: 'Duplo Puxador Externo/Interno de 1.5m em Inox, Fechadura Rolete Multiponto para linha Gold',
            img: '/typologias/pc400.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-024', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'TGL-005', formula: 'L', qt: '1', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-044', formula: 'H - 42', qt: '4', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-062', formula: 'H - 42', qt: '4', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'PC6G', type: 'porta',
            name: 'Porta Gold Correr 6 Folhas',
            desc: 'Portões e vãos majestosos - 6 Fls Móveis/Fixas',
            acc: 'Sistemas anti-ruído Gold Extrudados, Roldanas 200Kg, Trilhos de piso nivelado, Fechos cremona',
            img: '/typologias/pc600.svg',
            mats: [
                { profileCode: 'LG-001', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-026', formula: 'L', qt: '2', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-033', formula: 'L', qt: '2', type: 'trilho', ori: 'largura', map: goMap },
                { profileCode: 'LG-044', formula: 'H - 42', qt: '6', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-062', formula: 'H - 42', qt: '6', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'PG1G', type: 'porta',
            name: 'Porta Gold Giro 1 Folha',
            desc: 'Porta Piovantante ou Giro Reforçada Gold',
            acc: 'Dobradiça pivotante 150Kg, Puxador Inox 2.0m, Fechadura Multiponto',
            img: '/typologias/pg100.svg',
            mats: [
                { profileCode: 'LG-055', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-055', formula: 'L', qt: '1', type: 'marco', ori: 'largura', map: goMap },
                { profileCode: 'LG-060', formula: 'H - 45', qt: '2', type: 'folha', ori: 'altura', map: goMap }
            ]
        },
        {
            lineId: gold.id, code: 'PG2G', type: 'porta',
            name: 'Porta Gold Pivotante/Giro Dupla',
            desc: 'Porta entrada principal 2 folhas',
            acc: 'Dobradiça pivotante HD, Puxador 2m, Trincos pino piso e teto, Fechadura Tripla trava',
            img: '/typologias/pg200.svg',
            mats: [
                { profileCode: 'LG-055', formula: 'H', qt: '2', type: 'marco', ori: 'altura', map: goMap },
                { profileCode: 'LG-055', formula: 'L', qt: '1', type: 'marco', ori: 'largura', map: goMap },
                { profileCode: 'LG-060', formula: 'H - 45', qt: '4', type: 'folha', ori: 'altura', map: goMap },
                { profileCode: 'LG-060', formula: 'L / 2', qt: '4', type: 'folha', ori: 'largura', map: goMap }
            ]
        }
    ];

    console.log(`Inserindo ${catalog.length} Tipologias Completas...`);
    for (const data of catalog) {
        const [tipo] = await db.insert(typologies).values({
            name: data.name,
            type: data.type,
            lineId: data.lineId,
            description: data.desc,
            imageUrl: data.img,
            accessories: data.acc
        }).returning();

        const matValues = data.mats.map(m => ({
            typologyId: tipo.id,
            profileId: m.map[m.profileCode],
            formula: m.formula,
            quantityFormula: m.qt,
            type: m.type,
            orientation: m.ori
        }));
        await db.insert(typologyMaterials).values(matValues);
    }
}

async function main() {
    await clearEsquadriasData();
    await seedCatalogoExtenso();
    console.log('Processo de Seed de Catálogos ESTENDIDO (20+ Modelos) Finalizado!');
    process.exit(0);
}

main().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
