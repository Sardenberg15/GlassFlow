/**
 * Seed das linhas Alcoa (Suprema, Gold, Inova) a partir dos catálogos técnicos oficiais.
 * Fonte: /tmp/alcoa/alcoa_final.json (extraído dos PDFs Alcoa — pesos e nomes explícitos).
 * Regra: nenhum dado inventado — perfis sem nome no catálogo recebem
 * "Perfil — função a confirmar no catálogo"; BOMs usam convenções L/A definidas pelo usuário
 * com os descontos de corte do catálogo documentados na descrição da tipologia.
 */
import { db } from "../server/db.js";
import { aluminumLines, aluminumProfiles, typologies, typologyMaterials, typologyAccessories, accessories } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("/tmp/alcoa/alcoa_final.json", "utf-8"));

const LINES = [
  { name: "Suprema", description: "Alcoa Linha Suprema — Catálogo Técnico GMPE 009 (ago/04). 131 perfis extraídos do catálogo oficial. price_per_kg pendente (custos Italvense)." },
  { name: "Gold", description: "Alcoa Linha Gold — Catálogo Técnico Alcoa. 158 perfis com pesos oficiais; nomes/funções pendentes de confirmação manual." },
  { name: "Inova", description: "Alcoa Linha Inova — Catálogo Técnico Alcoa. 168 perfis com pesos oficiais; nomes/funções pendentes de confirmação manual." },
];

type Mat = [code: string, formula: string, qty: string, type: string, orientation: string];

const TYPOS: { name: string; key: string | null; desc: string; mats: Mat[]; accs: [code: string, qty: number, notes: string][] }[] = [
  {
    name: "Janela de Correr 2 Folhas", key: "JCR200",
    desc: "Montagem SUP JCR 200 (catálogo Alcoa Suprema p.117). Descontos de corte do catálogo: folhas L-131.2 e L-143.2 (÷2), alturas H-134 e H-50. Perfis complementares da montagem: SU-041 (montante mão de amigo alt.), SU-102 (baguete — corte pelo perímetro do vidro), MP-347 (remate). Componentes do catálogo: FEC-636, NYL-329/332/335/414. Quantidades por convenção — revisar na primeira produção.",
    mats: [
      ["SU-001", "L", "1", "marco", "largura"],
      ["SU-002", "L", "1", "marco", "largura"],
      ["SU-003", "A", "2", "marco", "altura"],
      ["SU-053", "L/2", "4", "folha", "largura"],
      ["SU-039", "A", "2", "folha", "altura"],
      ["SU-040", "A", "2", "folha", "altura"],
    ],
    accs: [["FEC46", 2, "Fecho concha p/ janela — equivale ao FEC-636 do catálogo Alcoa; alternativa FEC47 (automático). 1 por folha."]],
  },
  {
    name: "Janela de Correr 4 Folhas", key: "JCR400",
    desc: "Montagem SUP JCR 400 (catálogo Alcoa Suprema p.120). Descontos do catálogo: folhas L-233.5 / L-257.5 / L-271.7 / L-295.7 (÷4), alturas H-134/H-167/H-50/H-83. Complementares: SU-001/SU-002/SU-028/SU-291, SU-102 (baguete), MP-347. Componentes do catálogo: FEC-636, FEC-055, CON-280/370, NYLs. Quantidades por convenção — revisar.",
    mats: [
      ["SU-026", "L", "1", "marco", "largura"],
      ["SU-251", "L", "1", "marco", "largura"],
      ["SU-003", "A", "2", "marco", "altura"],
      ["SU-053", "L/4", "8", "folha", "largura"],
      ["SU-039", "A", "2", "folha", "altura"],
      ["SU-040", "A", "2", "folha", "altura"],
      ["SU-041", "A", "2", "folha", "altura"],
    ],
    accs: [["FEC46", 4, "Fecho concha p/ janela — equivale ao FEC-636 Alcoa; 1 por folha."]],
  },
  {
    name: "Porta de Correr 2 Folhas", key: "PCR200",
    desc: "Montagem SUP PCR 200 (catálogo Alcoa Suprema p.130-131). Descontos do catálogo: H-212 / H-228.4 / H-40 / H-56.4; L-131.2 / L-143.2 / L-169.4 / L-181.4. Complementares: SU-026/SU-028/SU-039/SU-047, SU-102 (baguete), CM-098/CM-126 (contramarco), ME-013 (remate piso). Componentes do catálogo: ROL-439 (roldana), FEC-645, CON-370, FIT-246, NYLs. Quantidades por convenção — revisar.",
    mats: [
      ["SU-001", "L", "1", "marco", "largura"],
      ["SU-228", "L", "1", "marco", "largura"],
      ["SU-003", "A", "2", "marco", "altura"],
      ["SU-044", "A", "2", "folha", "altura"],
      ["SU-049", "A", "2", "folha", "altura"],
      ["SU-053", "L/2", "2", "folha", "largura"],
      ["SU-225", "L/2", "2", "folha", "largura"],
      ["SU-227", "L/2", "2", "folha", "largura"],
    ],
    accs: [["ROLSIMPEDRCSUP1PC", 4, "Roldana Suprema — catálogo Alcoa indica ROL-439. 2 por folha; confirmar modelo (simples/dupla) pela carga da folha."]],
  },
  {
    name: "Porta de Correr 3 Folhas", key: "PCR300",
    desc: "Montagem SUP PCR 300 (catálogo Alcoa Suprema p.134). Descontos do catálogo: L-156 / L-174 (÷3); H-212 / H-40. Complementares: SU-039/SU-291, SU-102 (baguete), MP-347, CM-060/CM-098 (contramarco), ME-013 (remate piso). Componentes do catálogo: ROL-439, FEC-055, PAR-437, NYLs. Distribuição dos montantes verticais entre folhas por convenção — revisar.",
    mats: [
      ["SU-010", "L", "1", "marco", "largura"],
      ["SU-230", "L", "1", "marco", "largura"],
      ["SU-012", "A", "2", "marco", "altura"],
      ["SU-044", "A", "2", "folha", "altura"],
      ["SU-047", "A", "2", "folha", "altura"],
      ["SU-049", "A", "2", "folha", "altura"],
      ["SU-053", "L/3", "3", "folha", "largura"],
      ["SU-225", "L/3", "3", "folha", "largura"],
      ["SU-227", "L/3", "3", "folha", "largura"],
    ],
    accs: [["ROLSIMPEDRCSUP1PC", 6, "Roldana Suprema — catálogo Alcoa: ROL-439. 2 por folha móvel; confirmar modelo pela carga."]],
  },
  {
    name: "Porta de Correr 4 Folhas", key: "PCR400",
    desc: "Montagem SUP PCR 400 (catálogo Alcoa Suprema p.132-133). Descontos do catálogo: L-233.5 / L-257.5 / L-271.7 / L-295.7 (÷4); H-212 / H-228.5 / H-40 / H-56.4. Complementares: SU-001/SU-003/SU-028/SU-039/SU-291, SU-102, CM-060/CM-098, ME-013. Componentes do catálogo: ROL-426 e ROL-439 (roldanas), FEC-645/FEC-055, CON-280/370, NYLs. Quantidades por convenção — revisar.",
    mats: [
      ["SU-026", "L", "1", "marco", "largura"],
      ["SU-228", "L", "1", "marco", "largura"],
      ["SU-003", "A", "2", "marco", "altura"],
      ["SU-044", "A", "2", "folha", "altura"],
      ["SU-047", "A", "2", "folha", "altura"],
      ["SU-049", "A", "2", "folha", "altura"],
      ["SU-053", "L/4", "4", "folha", "largura"],
      ["SU-225", "L/4", "4", "folha", "largura"],
      ["SU-227", "L/4", "4", "folha", "largura"],
    ],
    accs: [["ROLDUPPEDRCSUP1PC", 8, "Roldana Suprema dupla — catálogo Alcoa: ROL-426/ROL-439. 2 por folha móvel; confirmar pela carga."]],
  },
  {
    name: "Maxim-ar 1 Módulo", key: "MAX800",
    desc: "Montagem SUP MAX 800 (catálogo Alcoa Suprema p.137). Descontos do catálogo: folha L-92.4 / L-98.4, H-98.4; vidro L-25. Cortes a 45°. Complementares: SU-200 (folha p/ vidro sem baguete — variante), SU-102 (baguete), SU-276 (pingadeira), MN-014 (remate). Braço maxim-ar conforme tabela do catálogo (por altura da folha). Componente do catálogo: FEC-009 (fecho).",
    mats: [
      ["SU-079", "L", "2", "marco", "largura"],
      ["SU-079", "A", "2", "marco", "altura"],
      ["SU-080", "L", "2", "folha", "largura"],
      ["SU-080", "A", "2", "folha", "altura"],
    ],
    accs: [
      ["BRASUP250", 1, "BRA-705 — folha de 270 a 500mm (tabela catálogo Alcoa p.137). Escolher UM modelo de braço conforme altura da folha."],
      ["BRASUP500", 1, "BRA-702 — folha de 510 a 760mm (tabela catálogo Alcoa p.137)."],
      ["BRASUP750", 1, "BRA-703 — folha de 770 a 900mm (tabela catálogo Alcoa p.137)."],
      ["BRASUP810LIM", 1, "BRA-725 reforçado — folha de 900 a 1200mm (tabela catálogo Alcoa p.137)."],
    ],
  },
  {
    name: "Porta de Abrir 1 Folha", key: "PGR100",
    desc: "Montagem SUP PGR 100 — Porta de giro 1 folha (catálogo Alcoa Suprema p.135). Descontos do catálogo: H-243.5 / H-255.5 / H-40.5; L-166.5 / L-172.5. SU-110 como travessa/marco superior — CONFIRMAR função no catálogo. Complementar: MN-014 (remate). Componentes do catálogo: DOB-840 (dobradiça), FRA-822 (fechadura), MAC-927 (maçaneta).",
    mats: [
      ["SU-279", "A", "2", "marco", "altura"],
      ["SU-110", "L", "1", "marco", "largura"],
      ["SU-111", "A", "2", "folha", "altura"],
      ["SU-225", "L", "1", "folha", "largura"],
      ["SU-050", "L", "1", "folha", "largura"],
    ],
    accs: [["DOB840771353A60E3", 3, "Dobradiça Dob-840 — mesmo código do catálogo Alcoa (DOB-840). Qtde típica 3 por folha — confirmar."]],
  },
  {
    name: "Painel Fixo", key: null,
    desc: "PENDENTE: o catálogo Alcoa Suprema não traz montagem específica de painel fixo no índice de montagens (SUP JCR/PCR/PGR/MAX). BOM a definir manualmente — provável marco perimetral + baguete (SU-102).",
    mats: [],
    accs: [],
  },
];

async function main() {
  // 1. linhas
  const lineIds: Record<string, string> = {};
  for (const l of LINES) {
    const [row] = await db.insert(aluminumLines).values(l).returning({ id: aluminumLines.id });
    lineIds[l.name] = row.id;
    console.log(`linha ${l.name}: ${row.id}`);
  }

  // 2. perfis
  const profileIds: Record<string, string> = {}; // "Suprema:SU-001" -> id
  for (const [line, profs] of Object.entries(data.profiles) as [string, any][]) {
    const rows = Object.entries(profs as Record<string, any>).map(([code, v]) => ({
      code,
      name: v.name && !/^CHU-/.test(v.name) ? v.name : "Perfil — função a confirmar no catálogo",
      lineId: lineIds[line],
      weightPerMeter: String(v.w),
      barLengthMm: 6000,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      const inserted = await db.insert(aluminumProfiles).values(rows.slice(i, i + 100)).returning({ id: aluminumProfiles.id, code: aluminumProfiles.code });
      for (const r of inserted) profileIds[`${line}:${r.code}`] = r.id;
    }
    console.log(`${line}: ${rows.length} perfis`);
  }

  // 3. tipologias + materiais + acessorios (linha Suprema)
  const pend: string[] = [];
  for (const t of TYPOS) {
    const [ty] = await db.insert(typologies).values({
      name: t.name, lineId: lineIds["Suprema"], type: "esquadria", description: t.desc,
    }).returning({ id: typologies.id });
    for (const [code, formula, qty, type, orientation] of t.mats) {
      const pid = profileIds[`Suprema:${code}`];
      if (!pid) { pend.push(`${t.name}: perfil ${code} não encontrado na extração`); continue; }
      await db.insert(typologyMaterials).values({
        typologyId: ty.id, profileId: pid, formula, quantityFormula: qty, type, orientation,
      });
    }
    for (const [accCode, qty, notes] of t.accs) {
      const [acc] = await db.select({ id: accessories.id }).from(accessories).where(eq(accessories.code, accCode));
      if (!acc) { pend.push(`${t.name}: acessório ${accCode} não existe no cadastro`); continue; }
      await db.insert(typologyAccessories).values({ typologyId: ty.id, accessoryId: acc.id, quantity: qty, notes });
    }
    console.log(`tipologia ${t.name}: ${t.mats.length} materiais, ${t.accs.length} acessórios`);
  }
  if (pend.length) console.log("PENDÊNCIAS:", pend);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
