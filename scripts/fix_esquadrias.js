import fs from 'fs';
const file = 'client/src/pages/esquadrias.tsx';
const content = fs.readFileSync(file, 'utf8');

// The improperly placed function signature
const fnStart = "function TipologiasTab() {";
const startIndex = content.indexOf(fnStart);
const endIndex = content.indexOf('<TabsContent value="tipologias">', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    // Look backwards from endIndex to find the closing } of TipologiasTab
    const blockEndIndex = content.lastIndexOf('}', endIndex) + 1;
    const block = content.substring(startIndex, blockEndIndex);

    // Remove block from its current place
    let newContent = content.substring(0, startIndex) + content.substring(blockEndIndex);

    // Insert block before EsquadriasPage
    const target = "export default function EsquadriasPage() {";
    newContent = newContent.replace(target, block + '\n\n' + target);

    fs.writeFileSync(file, newContent, 'utf8');
    console.log("Successfully moved TipologiasTab.");
} else {
    console.error("Could not find TipologiasTab bounds.");
}
