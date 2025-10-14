import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Quote, QuoteItem, Client } from '@shared/schema';
import logoPath from '@assets/Gemini_Generated_Image_ml7li0ml7li0ml7l-removebg-preview_1760464715280.png';

// Styles para o PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '2 solid #2563EB',
    paddingBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  leftHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  companyInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    color: '#2563EB',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2563EB',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    padding: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 8,
  },
  col1: {
    width: '50%',
  },
  col2: {
    width: '15%',
    textAlign: 'right',
  },
  col3: {
    width: '15%',
    textAlign: 'right',
  },
  col4: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    padding: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2563EB',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#666',
    fontSize: 9,
    paddingTop: 10,
    borderTop: '1 solid #e5e7eb',
  },
  observations: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderLeft: '3 solid #2563EB',
  },
});

interface QuotePDFProps {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
}

export function QuotePDF({ quote, client, items }: QuotePDFProps) {
  const total = items.reduce((sum, item) => sum + parseFloat(String(item.total)), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <Image src={logoPath} style={styles.logo} />
            <Text style={styles.subtitle}>Telefone: (22) 99821-3739</Text>
            <Text style={styles.subtitle}>Email: alpheu25@gmail.com</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>ORÇAMENTO</Text>
            <Text>Nº {quote.number}</Text>
            <Text>Data: {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</Text>
            <Text>Validade: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Cliente</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{client.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Contato:</Text>
            <Text style={styles.value}>{client.contact}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{client.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Telefone:</Text>
            <Text style={styles.value}>{client.phone}</Text>
          </View>
        </View>

        {/* Itens do Orçamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens do Orçamento</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Descrição</Text>
              <Text style={styles.col2}>Qtd.</Text>
              <Text style={styles.col3}>Valor Unit.</Text>
              <Text style={styles.col4}>Total</Text>
            </View>
            {items.map((item, index) => (
              <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{item.description}</Text>
                <Text style={styles.col2}>{parseFloat(String(item.quantity)).toFixed(2)}</Text>
                <Text style={styles.col3}>
                  R$ {parseFloat(String(item.unitPrice)).toFixed(2)}
                </Text>
                <Text style={styles.col4}>
                  R$ {parseFloat(String(item.total)).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>
                R$ {total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Observações */}
        {quote.observations && (
          <View style={styles.observations}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Observações:</Text>
            <Text>{quote.observations}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Este orçamento é válido até {new Date(quote.validUntil).toLocaleDateString('pt-BR')}</Text>
          <Text>HelpGlass - Soluções em Vidros e Espelhos</Text>
        </View>
      </Page>
    </Document>
  );
}
