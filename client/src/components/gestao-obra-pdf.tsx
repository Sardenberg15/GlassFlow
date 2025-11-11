import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Transaction } from '@shared/schema';

type ProjectBasics = {
  id: string;
  name: string;
  value: string | number;
  status: string;
  transactions: Transaction[];
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 16,
    borderBottom: '2 solid #000',
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 11 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCol: { flex: 1, padding: 8, border: '1 solid #e5e7eb' },
  label: { fontSize: 9, color: '#666' },
  value: { fontSize: 12, fontWeight: 'bold' },
  table: { border: '1 solid #000' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    color: 'white',
    padding: 6,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: { flexDirection: 'row', borderTop: '1 solid #000', padding: 6, fontSize: 9 },
  colDesc: { width: '55%' },
  colValue: { width: '20%', textAlign: 'right' },
  colDate: { width: '25%', textAlign: 'right' },
  footerNote: { marginTop: 14, fontSize: 8, color: '#666' },
});

function formatCurrency(value: number | string) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue || 0);
}

interface GestaoObraPDFProps {
  project: ProjectBasics;
}

export function GestaoObraPDF({ project }: GestaoObraPDFProps) {
  const receitas = project.transactions.filter((t) => t.type === 'receita');
  const despesas = project.transactions.filter((t) => t.type === 'despesa');
  const totalReceitas = receitas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
  const totalDespesas = despesas.reduce((sum, t) => sum + parseFloat(String(t.value)), 0);
  const valorTotalContratado = typeof project.value === 'string' ? parseFloat(project.value) : project.value;
  const aReceber = Math.max(0, (valorTotalContratado || 0) - totalReceitas);
  const percentualRecebido = valorTotalContratado > 0 ? Math.min(100, (totalReceitas / valorTotalContratado) * 100) : 0;
  const lucro = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

  const despesasAgrupadas: Record<string, number> = { 'Materiais (Vidro, Alumínio, Ferragens)': 0, 'Mão de Obra (Horas)': 0, 'Despesas Extras': 0 };
  despesas.forEach((d) => {
    const desc = (d.description || '').toLowerCase();
    if (/(vidro|alum[ií]nio|ferrag|materiais)/.test(desc)) despesasAgrupadas['Materiais (Vidro, Alumínio, Ferragens)'] += parseFloat(String(d.value));
    else if (/(hora|m[aã]o de obra|servi[cç]o)/.test(desc)) despesasAgrupadas['Mão de Obra (Horas)'] += parseFloat(String(d.value));
    else despesasAgrupadas['Despesas Extras'] += parseFloat(String(d.value));
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Relatório de Obra</Text>
            <Text style={styles.subtitle}>Status: {project.status}</Text>
          </View>
          <Text>Projeto: {project.name}</Text>
        </View>

        {/* Resumo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Valor Contratado</Text>
              <Text style={styles.value}>{formatCurrency(valorTotalContratado)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Recebido</Text>
              <Text style={styles.value}>{formatCurrency(totalReceitas)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>A Receber</Text>
              <Text style={styles.value}>{formatCurrency(aReceber)}</Text>
            </View>
          </View>
          <View style={[styles.gridRow, { marginTop: 8 }] }>
            <View style={styles.gridCol}>
              <Text style={styles.label}>% Recebido</Text>
              <Text style={styles.value}>{percentualRecebido.toFixed(1)}%</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Lucro</Text>
              <Text style={styles.value}>{formatCurrency(lucro)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Margem</Text>
              <Text style={styles.value}>{margem.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Recebimentos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parcelas e Recebimentos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Descrição</Text>
              <Text style={styles.colValue}>Valor</Text>
              <Text style={styles.colDate}>Data</Text>
            </View>
            {receitas.length > 0 ? (
              receitas.map((r) => (
                <View key={r.id} style={styles.tableRow}>
                  <Text style={styles.colDesc}>{r.description}</Text>
                  <Text style={styles.colValue}>{formatCurrency(r.value)}</Text>
                  <Text style={styles.colDate}>{r.date}</Text>
                </View>
              ))
            ) : (
              <View style={styles.tableRow}>
                <Text style={styles.colDesc}>Nenhum recebimento registrado</Text>
                <Text style={styles.colValue}>-</Text>
                <Text style={styles.colDate}>-</Text>
              </View>
            )}
          </View>
        </View>

        {/* Custos Detalhados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custos Detalhados</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Categoria</Text>
              <Text style={styles.colValue}>Real</Text>
              <Text style={styles.colDate}></Text>
            </View>
            {Object.entries(despesasAgrupadas).map(([categoria, valor]) => (
              <View key={categoria} style={styles.tableRow}>
                <Text style={styles.colDesc}>{categoria}</Text>
                <Text style={styles.colValue}>{formatCurrency(valor)}</Text>
                <Text style={styles.colDate}></Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footerNote}>Relatório gerado automaticamente pelo sistema.</Text>
      </Page>
    </Document>
  );
}