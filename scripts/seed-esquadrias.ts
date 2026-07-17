import 'dotenv/config';
import { db } from '../server/db';
import {
    aluminumLines,
    aluminumProfiles,
    typologies,
    typologyMaterials
} from '../shared/schema';

// Helper to clean out old schema tables if we want a fresh start
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

async function seedLinhaSuprema() {
    console.log('--- Instalando Linha Suprema ---');
    const [suprema] = await db.insert(aluminumLines).values({
        name: 'Suprema',
        description: 'Sistema de esquadrias de 25mm com excelente custo-benefício.',
    }).returning();

    const lineId = suprema.id;

    const profilesData = [
        { lineId, code: 'SU-001', name: 'MARCO LATERAL', weightPerMeter: '0.600' },
        { lineId, code: 'SU-002', name: 'MARCO SUP/INF', weightPerMeter: '0.550' },
        { lineId, code: 'SU-003', name: 'FOLHA LATERAL', weightPerMeter: '0.650' },
        { lineId, code: 'SU-004', name: 'MÃO DE AMIGO CENTRAL', weightPerMeter: '0.750' },
        { lineId, code: 'SU-053', name: 'TRILHO INFERIOR 2P', weightPerMeter: '0.850' },
        { lineId, code: 'SU-054', name: 'TRILHO SUPERIOR 2P', weightPerMeter: '0.780' },
        { lineId, code: 'SU-039', name: 'TRILHO INFERIOR 3P', weightPerMeter: '1.250' },
        { lineId, code: 'SU-040', name: 'TRILHO SUPERIOR 3P', weightPerMeter: '1.180' },
        { lineId, code: 'SU-102', name: 'REMATES', weightPerMeter: '0.350' },
        { lineId, code: 'SU-225', name: 'TRAVESSA', weightPerMeter: '0.580' },
        { lineId, code: 'SU-200', name: 'BAGUETE', weightPerMeter: '0.150' },
        { lineId, code: 'SU-010', name: 'MARCO MAXIM-AR', weightPerMeter: '0.500' },
        { lineId, code: 'SU-083', name: 'FOLHA MAXIM-AR', weightPerMeter: '0.620' },
        { lineId, code: 'SU-080', name: 'PINGADEIRA', weightPerMeter: '0.310' },
        { lineId, code: 'SU-066', name: 'MARCO PORTA GIRO', weightPerMeter: '0.800' },
        { lineId, code: 'SU-071', name: 'FOLHA PORTA GIRO', weightPerMeter: '1.050' },
    ];

    const profilesMap: Record<string, string> = {};
    for (const p of profilesData) {
        const [inserted] = await db.insert(aluminumProfiles).values(p).returning();
        profilesMap[p.code] = inserted.id;
    }

    // 1. JC200-SB - Janela de Correr 2 Folhas (Sem Baguete)
    const [jc200sb] = await db.insert(typologies).values({
        name: 'JC200-SB - Janela Suprema Correr 2 Folhas (Sem Baguete)',
        type: 'janela',
        lineId,
        description: 'Janela de Correr 2 folhas padrão com montante.',
        accessories: 'Kit Alumínio Padrão (Roldanas, Escovas, Fecho Concha, Gaxetas CA-01 e CA-12)',
        imageUrl: '/typologias/jc200.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: jc200sb.id, profileId: profilesMap['SU-001'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: jc200sb.id, profileId: profilesMap['SU-053'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: jc200sb.id, profileId: profilesMap['SU-054'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: jc200sb.id, profileId: profilesMap['SU-003'], formula: 'H - 32', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: jc200sb.id, profileId: profilesMap['SU-004'], formula: 'H - 32', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: jc200sb.id, profileId: profilesMap['SU-225'], formula: '(L / 2) - 15', quantityFormula: '4', type: 'folha', orientation: 'largura' },
    ]);

    // 2. JC200-CB - Janela de Correr 2 Folhas (Com Baguete)
    const [jc200cb] = await db.insert(typologies).values({
        name: 'JC200-CB - Janela Suprema Correr 2 Folhas (Com Baguete)',
        type: 'janela',
        lineId,
        description: 'Janela de Correr 2 folhas usando baguetes para fixação do vidro.',
        accessories: 'Kit Alumínio Padrão (Roldanas, Fecho Concha Cego com Chave, Escovas, Gaxeta EPDM)',
        imageUrl: '/typologias/jc200.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: jc200cb.id, profileId: profilesMap['SU-001'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-053'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-054'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-003'], formula: 'H - 32', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-004'], formula: 'H - 32', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-225'], formula: '(L / 2) - 15', quantityFormula: '4', type: 'folha', orientation: 'largura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-200'], formula: 'H - 32', quantityFormula: '4', type: 'baguete', orientation: 'altura' },
        { typologyId: jc200cb.id, profileId: profilesMap['SU-200'], formula: '(L / 2) - 15', quantityFormula: '4', type: 'baguete', orientation: 'largura' },
    ]);

    // 3. JC300 - Janela de Correr 3 Folhas
    const [jc300] = await db.insert(typologies).values({
        name: 'JC300 - Janela Suprema Correr 3 Folhas Mão de Amigo',
        type: 'janela',
        lineId,
        description: 'Janela de Correr 3 folhas (trilho triplo)',
        accessories: 'Kit 03 Janela (Roldanas duplas, Fechos Concha lateral, Guias, Escova Vedação)',
        imageUrl: '/typologias/jc300.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: jc300.id, profileId: profilesMap['SU-001'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: jc300.id, profileId: profilesMap['SU-039'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: jc300.id, profileId: profilesMap['SU-040'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: jc300.id, profileId: profilesMap['SU-003'], formula: 'H - 32', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: jc300.id, profileId: profilesMap['SU-004'], formula: 'H - 32', quantityFormula: '4', type: 'folha', orientation: 'altura' },
        { typologyId: jc300.id, profileId: profilesMap['SU-225'], formula: '(L / 3) + 15', quantityFormula: '6', type: 'folha', orientation: 'largura' },
    ]);

    // 4. MAX-1F - Janela Maxim-Ar
    const [maximAr] = await db.insert(typologies).values({
        name: 'MAX-1F - Janela Suprema Maxim-Ar (1 Módulo)',
        type: 'janela',
        lineId,
        description: 'Janela tipo Maxim-Ar com pingadeira',
        accessories: 'Kit Maxim-Ar (Braços de articulação, Fecho Alavanca, Borracha U)',
        imageUrl: '/typologias/max.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: maximAr.id, profileId: profilesMap['SU-010'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: maximAr.id, profileId: profilesMap['SU-010'], formula: 'L', quantityFormula: '2', type: 'marco', orientation: 'largura' },
        { typologyId: maximAr.id, profileId: profilesMap['SU-083'], formula: 'H - 46', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: maximAr.id, profileId: profilesMap['SU-083'], formula: 'L - 46', quantityFormula: '2', type: 'folha', orientation: 'largura' },
        { typologyId: maximAr.id, profileId: profilesMap['SU-080'], formula: 'L - 46', quantityFormula: '1', type: 'arremate', orientation: 'largura' },
        { typologyId: maximAr.id, profileId: profilesMap['SU-200'], formula: 'H - 86', quantityFormula: '2', type: 'baguete', orientation: 'altura' },
        { typologyId: maximAr.id, profileId: profilesMap['SU-200'], formula: 'L - 86', quantityFormula: '2', type: 'baguete', orientation: 'largura' },
    ]);

    // 5. PG100 - Porta de Giro Suprema
    const [portaGiro] = await db.insert(typologies).values({
        name: 'PG100 - Porta Suprema de Giro Bico de Papagaio',
        type: 'porta',
        lineId,
        description: 'Porta de Giro tradicional',
        accessories: 'Fechadura Bico de Papagaio, Cilindro, 3 Dobradiças Flash, Batedor de porta',
        imageUrl: '/typologias/pg100.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: portaGiro.id, profileId: profilesMap['SU-066'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: portaGiro.id, profileId: profilesMap['SU-066'], formula: 'L', quantityFormula: '1', type: 'marco', orientation: 'largura' },
        { typologyId: portaGiro.id, profileId: profilesMap['SU-071'], formula: 'H - 40', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: portaGiro.id, profileId: profilesMap['SU-071'], formula: 'L - 60', quantityFormula: '2', type: 'folha', orientation: 'largura' },
    ]);


    console.log('Linha Suprema ampliada para 5 tipologias!');
}

async function seedLinhaGold() {
    console.log('--- Instalando Linha Gold ---');
    const [gold] = await db.insert(aluminumLines).values({
        name: 'Gold',
        description: 'Sistema Premium de Esquadrias, com perfis robustos para grandes vãos.',
    }).returning();

    const lineId = gold.id;

    const profilesData = [
        { lineId, code: 'LG-001', name: 'MARCO LATERAL', weightPerMeter: '0.850' },
        { lineId, code: 'LG-002', name: 'MARCO SUP/INF', weightPerMeter: '0.900' },
        { lineId, code: 'LG-044', name: 'FOLHA LATERAL', weightPerMeter: '1.247' },
        { lineId, code: 'LG-062', name: 'MÃO DE AMIGO CENTRAL', weightPerMeter: '1.728' },
        { lineId, code: 'LG-050', name: 'MONTANTE LATERAL', weightPerMeter: '0.820' },
        { lineId, code: 'LG-024', name: 'TRILHO INFERIOR 2P', weightPerMeter: '1.123' },
        { lineId, code: 'TGL-005', name: 'TRILHO SUPERIOR 2P', weightPerMeter: '1.056' },
        { lineId, code: 'LG-026', name: 'TRILHO INFERIOR 3P', weightPerMeter: '1.620' },
        { lineId, code: 'LG-033', name: 'TRILHO SUPERIOR 3P', weightPerMeter: '1.550' },
        { lineId, code: 'LG-055', name: 'MARCO PORTA GIRO', weightPerMeter: '1.200' },
        { lineId, code: 'LG-060', name: 'FOLHA PORTA GIRO', weightPerMeter: '1.450' },
        { lineId, code: 'SI-301', name: 'BAGUETE', weightPerMeter: '0.230' },
    ];

    const profilesMap: Record<string, string> = {};
    for (const p of profilesData) {
        const [inserted] = await db.insert(aluminumProfiles).values(p).returning();
        profilesMap[p.code] = inserted.id;
    }

    // 1. PC200 - Porta de Correr 2 Folhas
    const [pc200] = await db.insert(typologies).values({
        name: 'PC200 - Porta Gold Correr 2 Folhas',
        type: 'porta',
        lineId,
        description: 'Porta de Correr Premium 2 Folhas (Sistema Gold)',
        accessories: 'Fechadura Bico de Papagaio com Cilindro (Gold), Roldanas Côncavas (suporta 120kg), Escova de vedação 7x5',
        imageUrl: '/typologias/pc200.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: pc200.id, profileId: profilesMap['LG-001'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: pc200.id, profileId: profilesMap['LG-024'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: pc200.id, profileId: profilesMap['TGL-005'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: pc200.id, profileId: profilesMap['LG-044'], formula: 'H - 42', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: pc200.id, profileId: profilesMap['LG-062'], formula: 'H - 42', quantityFormula: '2', type: 'folha', orientation: 'altura' },
    ]);

    // 2. PC300 - Porta de Correr 3 Folhas
    const [pc300] = await db.insert(typologies).values({
        name: 'PC300 - Porta Gold Correr 3 Folhas (Mão de Amigo)',
        type: 'porta',
        lineId,
        description: 'Porta de Correr Premium 3 Folhas (Trilho triplo)',
        accessories: 'Kit Gold 3 Folhas (Concha Cega, Roldanas pesadas, Borracha cunha)',
        imageUrl: '/typologias/pc300.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: pc300.id, profileId: profilesMap['LG-001'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: pc300.id, profileId: profilesMap['LG-026'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: pc300.id, profileId: profilesMap['LG-033'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: pc300.id, profileId: profilesMap['LG-044'], formula: 'H - 42', quantityFormula: '2', type: 'folha', orientation: 'altura' },
        { typologyId: pc300.id, profileId: profilesMap['LG-062'], formula: 'H - 42', quantityFormula: '4', type: 'folha', orientation: 'altura' },
    ]);

    // 3. PC400 - Porta de Correr 4 Folhas
    const [pc400] = await db.insert(typologies).values({
        name: 'PC400 - Porta Gold Correr 4 Folhas',
        type: 'porta',
        lineId,
        description: 'Porta de Correr Premium 4 Folhas',
        accessories: 'Kit Gold 4 Folhas (2x Fechaduras Bico de Papagaio centrais, 8 Roldanas Côncavas, Gaxetas completas)',
        imageUrl: '/typologias/pc400.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: pc400.id, profileId: profilesMap['LG-001'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: pc400.id, profileId: profilesMap['LG-024'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: pc400.id, profileId: profilesMap['TGL-005'], formula: 'L', quantityFormula: '1', type: 'trilho', orientation: 'largura' },
        { typologyId: pc400.id, profileId: profilesMap['LG-044'], formula: 'H - 42', quantityFormula: '4', type: 'folha', orientation: 'altura' },
        { typologyId: pc400.id, profileId: profilesMap['LG-062'], formula: 'H - 42', quantityFormula: '4', type: 'folha', orientation: 'altura' },
    ]);

    // 4. PG100 - Porta de Giro Gold
    const [pg100] = await db.insert(typologies).values({
        name: 'PG100 - Porta Gold de Giro 1 Folha',
        type: 'porta',
        lineId,
        description: 'Porta de Giro Gold 1 Folha',
        accessories: 'Puxador Tubular Inox 1m, Fechadura Rolete Gold, 3 Dobradiças robustas',
        imageUrl: '/typologias/pg100.svg',
    }).returning();
    await db.insert(typologyMaterials).values([
        { typologyId: pg100.id, profileId: profilesMap['LG-055'], formula: 'H', quantityFormula: '2', type: 'marco', orientation: 'altura' },
        { typologyId: pg100.id, profileId: profilesMap['LG-055'], formula: 'L', quantityFormula: '1', type: 'marco', orientation: 'largura' },
        { typologyId: pg100.id, profileId: profilesMap['LG-060'], formula: 'H - 45', quantityFormula: '2', type: 'folha', orientation: 'altura' },
    ]);

    console.log('Linha Gold ampliada para 4 tipologias!');
}

async function main() {
    await clearEsquadriasData();
    await seedLinhaSuprema();
    await seedLinhaGold();
    console.log('Processo de Seed de Catálogos (Completo) Finalizado!');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
