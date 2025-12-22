import fs from 'fs';
import path from 'path';

// Caminho da imagem
const imagePath = 'C:/Users/Notebook/Desktop/GlassFlowPro (1) - Copia/GlassFlowPro/attached_assets/image_1761404972727.png';

// Ler a imagem e converter para base64
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

// Criar data URL
const dataUrl = `data:image/png;base64,${base64Image}`;

// Salvar em um arquivo TypeScript
const tsContent = `// Logo em base64 para uso no PDF
export const logoBase64 = "${dataUrl}";
`;

fs.writeFileSync('client/src/components/logo-base64.ts', tsContent);

console.log('Logo convertida para base64 com sucesso!');
console.log('Arquivo criado: client/src/components/logo-base64.ts');