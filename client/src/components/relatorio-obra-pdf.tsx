import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction, ProjectFile } from '@shared/schema';
import { logoBase64 } from './logo-base64';

interface RelatorioObraPDFProps {
  project: {
    id: string;
    name: string;
    value: string | number;
    status: string;
    client?: string;
    address?: string;
    startDate?: string;
    endDate?: string;
    responsible?: string;
  };
  transactions: Transaction[];
  projectFiles: ProjectFile[];
  reportType: 'detailed' | 'summary';
  reportPeriod: {
    start: string;
    end: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  
  // Header limpo com logo
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },
  logoContainer: {
    width: 240,
    height: 80,
    marginRight: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  companySubtitle: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#444444',
    marginBottom: 6,
  },
  reportDate: {
    fontSize: 9,
    color: '#555555',
  },
  
  // Informações do Projeto
  projectSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
    textAlign: 'center',
  },
  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  projectItem: {
    width: '48%',
    marginBottom: 12,
  },
  projectLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 3,
  },
  projectValue: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  
  // Resumo Financeiro
  financeSection: {
    marginBottom: 20,
  },
  financeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    width: '32%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryCardTitle: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryCardPositive: {
    color: '#000000',
  },
  summaryCardNegative: {
    color: '#dc2626',
  },
  
  // Despesas Detalhadas
  expensesSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  expensesHeader: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  expensesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  expensesSubTitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  
  // Tabela de despesas
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowText: {
    fontSize: 9,
    color: '#1f2937',
  },
  tableRowAlternate: {
    backgroundColor: '#f9fafb',
  },
  
  // Totais Finais
  totalsSection: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  finalBalance: {
    borderTopWidth: 2,
    borderTopColor: '#1e40af',
    paddingTop: 10,
    marginTop: 10,
  },
  finalBalanceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  finalBalanceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  
  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
});

function formatCurrency(value: number | string) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue || 0);
}

function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateString;
  }
}

export function RelatorioObraPDF({ project, transactions, projectFiles, reportType, reportPeriod }: RelatorioObraPDFProps) {
  const receitas = transactions.filter(t => t.type === 'receita');
  const despesas = transactions.filter(t => t.type === 'despesa');
  
  const totalReceitas = receitas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
  const totalDespesas = despesas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
  const saldo = totalReceitas - totalDespesas;

  // Agrupar despesas por categoria
  const despesasPorCategoria = despesas.reduce((acc, despesa) => {
    const categoria = despesa.category || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(despesa);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Top 10 despesas maiores
  const topDespesas = despesas
    .sort((a, b) => parseFloat(String(b.value)) - parseFloat(String(a.value)))
    .slice(0, 10);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header com Logo Real */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              src={logoBase64}
              style={styles.logo}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.reportTitle}>RELATÓRIO DE OBRA</Text>
            <Text style={styles.reportSubtitle}>Resumo Financeiro Detalhado</Text>
            <Text style={styles.reportDate}>Emitido em: {formatDate(new Date().toISOString())}</Text>
            <Text style={styles.reportDate}>Período: {formatDate(reportPeriod.start)} até {formatDate(reportPeriod.end)}</Text>
          </View>
        </View>

        {/* Informações do Projeto */}
        <View style={styles.projectSection}>
          <Text style={styles.projectTitle}>{project.name}</Text>
          <View style={styles.projectGrid}>
            <View style={styles.projectItem}>
              <Text style={styles.projectLabel}>Cliente</Text>
              <Text style={styles.projectValue}>{project.client || 'Cliente não informado'}</Text>
            </View>
            <View style={styles.projectItem}>
              <Text style={styles.projectLabel}>Status</Text>
              <Text style={styles.projectValue}>{project.status}</Text>
            </View>
            <View style={styles.projectItem}>
              <Text style={styles.projectLabel}>Valor do Contrato</Text>
              <Text style={styles.projectValue}>{formatCurrency(project.value)}</Text>
            </View>
          </View>
        </View>

        {/* Resumo Financeiro */}
        <View style={styles.financeSection}>
          <Text style={styles.financeTitle}>RESUMO FINANCEIRO</Text>
          
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>TOTAL DE RECEITAS</Text>
              <Text style={[styles.summaryCardValue, styles.summaryCardPositive]}>
                {formatCurrency(totalReceitas)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>TOTAL DE DESPESAS</Text>
              <Text style={[styles.summaryCardValue, { color: '#000000' }]}>
                {formatCurrency(totalDespesas)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>SALDO FINAL</Text>
              <Text style={[styles.summaryCardValue, { color: saldo >= 0 ? '#059669' : '#dc2626' }]}>
                {formatCurrency(saldo)}
              </Text>
            </View>
          </View>
        </View>

        {/* Despesas Detalhadas */}
        <View style={styles.expensesSection}>
          <View style={styles.expensesHeader}>
            <Text style={styles.expensesTitle}>MAIORES DESPESAS DO PERÍODO</Text>
            <Text style={styles.expensesSubTitle}>Top 10 despesas ordenadas por valor</Text>
          </View>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: '15%' }]}>DATA</Text>
            <Text style={[styles.tableHeaderText, { width: '45%' }]}>DESCRIÇÃO</Text>
            <Text style={[styles.tableHeaderText, { width: '20%' }]}>CATEGORIA</Text>
            <Text style={[styles.tableHeaderText, { width: '20%', textAlign: 'right' }]}>VALOR</Text>
          </View>
          
          {topDespesas.map((despesa, index) => (
            <View 
              key={despesa.id} 
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}
            >
              <Text style={[styles.tableRowText, { width: '15%' }]}>
                {formatDate(despesa.date)}
              </Text>
              <Text style={[styles.tableRowText, { width: '45%' }]}>
                {despesa.description}
              </Text>
              <Text style={[styles.tableRowText, { width: '20%' }]}>
                {despesa.category || 'Outros'}
              </Text>
              <Text style={[styles.tableRowText, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>
                {formatCurrency(despesa.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>GlassFlow Pro - Sistema de Gestão de Obras</Text>
          <Text>Relatório emitido em {formatDate(new Date().toISOString())} às {format(new Date(), 'HH:mm', { locale: ptBR })}</Text>
        </View>
      </Page>
    </Document>
  );
}

// Componente de download para fallback
export function RelatorioObraPDFDownload({ project, transactions, projectFiles, reportType, reportPeriod }: RelatorioObraPDFProps) {
  return (
    <RelatorioObraPDF 
      project={project}
      transactions={transactions}
      projectFiles={projectFiles}
      reportType={reportType}
      reportPeriod={reportPeriod}
    />
  );
}