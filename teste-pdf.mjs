import { RelatorioObraPDF } from './relatorio-obra-pdf';
import { renderToFile } from '@react-pdf/renderer';

// Dados de teste
const testProject = {
  id: "teste-123",
  name: "Projeto Teste - Fachada Empresarial",
  value: 50000,
  status: "Em Andamento",
  client: "Empresa Exemplo Ltda",
  address: "Av. Principal, 123 - Centro",
  responsible: "João Silva - Engenheiro Civil"
};

const testTransactions = [
  {
    id: "1",
    type: "receita",
    description: "Entrada inicial - 30%",
    value: "15000",
    date: "2025-01-15",
    projectId: "teste-123",
    receiptPath: null,
    createdAt: new Date("2025-01-15")
  },
  {
    id: "2", 
    type: "despesa",
    description: "Compra de vidros temperados 10mm",
    value: "8000",
    date: "2025-01-20",
    projectId: "teste-123",
    receiptPath: null,
    createdAt: new Date("2025-01-20")
  },
  {
    id: "3",
    type: "despesa", 
    description: "Mão de obra - instalação de estrutura",
    value: "5000",
    date: "2025-01-25",
    projectId: "teste-123",
    receiptPath: null,
    createdAt: new Date("2025-01-25")
  }
];

const testProjectFiles = [
  {
    id: "file-1",
    projectId: "teste-123",
    fileName: "nota-fiscal-vidros.pdf",
    fileType: "application/pdf",
    fileSize: 1024000,
    category: "nota_fiscal_recebida",
    objectPath: "/files/nota-fiscal-vidros.pdf",
    createdAt: new Date("2025-01-20")
  },
  {
    id: "file-2",
    projectId: "teste-123", 
    fileName: "comprovante-pagamento.jpg",
    fileType: "image/jpeg",
    fileSize: 512000,
    category: "comprovante",
    objectPath: "/files/comprovante-pagamento.jpg",
    createdAt: new Date("2025-01-25")
  }
];

// Testar geração do PDF
async function testPDF() {
  try {
    console.log('🚀 Iniciando teste de geração de PDF...');
    
    const document = (
      <RelatorioObraPDF
        project={testProject}
        transactions={testTransactions}
        projectFiles={testProjectFiles}
        reportType="detailed"
        reportPeriod={{
          start: "2025-01-01",
          end: "2025-01-31"
        }}
      />
    );

    // Gerar PDF e salvar
    await renderToFile(document, './teste-relatorio.pdf');
    
    console.log('✅ PDF gerado com sucesso! Arquivo: teste-relatorio.pdf');
    console.log('📄 O relatório inclui:');
    console.log('   • Capa profissional com identificação física');
    console.log('   • Resumo executivo');
    console.log('   • Despesas detalhadas por categoria');
    console.log('   • Documentos anexados');
    console.log('   • Assinatura e carimbo');
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
  }
}

// Executar teste
testPDF();