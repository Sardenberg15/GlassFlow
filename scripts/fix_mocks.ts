import fs from 'fs';

const files = [
    'client/src/components/examples/cartao-obras.tsx',
    'client/src/components/relatorio-obra-pdf.tsx',
    'client/src/pages/financeiro-v2.tsx',
    'client/src/pages/orcamentos.tsx',
    'client/src/pages/projetos.tsx'
];

files.forEach(f => {
    try {
        let content = fs.readFileSync(f, 'utf-8');
        // For every createdAt: new Date(...), add updatedAt: null right after it.
        // Also handle possible trailing commas.
        content = content.replace(/(createdAt:\s*new Date\([^)]*\)),?/g, '$1,\n      updatedAt: null,');
        content = content.replace(/(createdAt:\s*new Date\(\)),?/g, '$1,\n      updatedAt: null,');

        // Also fix cases where the mock data defines other fields
        // and omits updatedAt. Let's just replace the whole file content.
        fs.writeFileSync(f, content);
        console.log(`Patched ${f}`);
    } catch (err) {
        console.error(`Error patching ${f}:`, err);
    }
});
