import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Quote, QuoteItem, Client } from '@shared/schema';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  companyInfo: {
    fontSize: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  headerRight: {
    textAlign: 'right',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 5,
    borderBottom: '1 solid #000',
  },
  localTipo: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  itemContainer: {
    marginBottom: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  imageSection: {
    width: 120,
    padding: 5,
    border: '1 solid #000',
  },
  itemImage: {
    width: 110,
    height: 110,
    objectFit: 'contain',
  },
  itemDetails: {
    flex: 1,
  },
  description: {
    fontSize: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    minWidth: 100,
  },
  table: {
    border: '1 solid #000',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    color: 'white',
    padding: 5,
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderTop: '1 solid #000',
    padding: 5,
    fontSize: 8,
  },
  colItem: { width: '5%', textAlign: 'center' },
  colQtde: { width: '8%', textAlign: 'center' },
  colLargura: { width: '12%', textAlign: 'center' },
  colAltura: { width: '12%', textAlign: 'center' },
  colCor: { width: '28%' },
  colVlrUnit: { width: '15%', textAlign: 'right' },
  colVlrTotal: { width: '20%', textAlign: 'right' },
  itemObservations: {
    marginTop: 5,
    padding: 5,
    backgroundColor: '#f9f9f9',
    fontSize: 8,
  },
  obsTitle: {
    fontWeight: 'bold',
    fontSize: 9,
    marginBottom: 3,
  },
  obsImportant: {
    color: '#dc2626',
    fontSize: 8,
    marginTop: 3,
  },
  totalSection: {
    marginTop: 15,
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  generalObservations: {
    marginTop: 20,
    padding: 10,
    border: '1 solid #000',
  },
  obsHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    padding: 3,
  },
  obsContent: {
    fontSize: 8,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    paddingTop: 10,
    borderTop: '1 solid #e5e7eb',
  },
  clientSection: {
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#f9f9f9',
    border: '1 solid #e5e7eb',
  },
  clientTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clientRow: {
    flexDirection: 'row',
    fontSize: 8,
    marginBottom: 2,
  },
  clientLabel: {
    fontWeight: 'bold',
    width: 80,
  },
});

interface QuotePDFProps {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
}

export function QuotePDF({ quote, client, items }: QuotePDFProps) {
  const subtotal = items.reduce((sum, item) => sum + parseFloat(String(item.total)), 0);
  const discountPercent = parseFloat(String(quote.discount || "0"));
  const discountValue = (subtotal * discountPercent) / 100;
  const total = subtotal - discountValue;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>HelpGlass</Text>
            <Text style={styles.companyInfo}>Soluções em Vidros e Espelhos</Text>
            <Text style={styles.companyInfo}>Telefone: (22) 99821-3739</Text>
            <Text style={styles.companyInfo}>Email: alpheu25@gmail.com</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 3 }}>ORÇAMENTO</Text>
            <Text style={styles.companyInfo}>Nº {quote.number}</Text>
            <Text style={styles.companyInfo}>Data: {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.companyInfo}>Validade: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        {/* Local/Ambiente e Tipo */}
        <View style={styles.topSection}>
          <View style={styles.localTipo}>
            <Text>
              <Text style={styles.boldText}>*LOCAL/AMBIENTE: </Text>
              <Text>{quote.local || ''}</Text>
            </Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text>
              <Text style={styles.boldText}>TIPO: </Text>
              <Text>{quote.tipo || ''}</Text>
            </Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.clientSection}>
          <Text style={styles.clientTitle}>DADOS DO CLIENTE</Text>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Nome:</Text>
            <Text>{client.name}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Contato:</Text>
            <Text>{client.contact}</Text>
          </View>
          {client.email && (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Email:</Text>
              <Text>{client.email}</Text>
            </View>
          )}
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Telefone:</Text>
            <Text>{client.phone}</Text>
          </View>
          {client.address && (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Endereço:</Text>
              <Text>{client.address}</Text>
            </View>
          )}
          {client.cnpjCpf && (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>CNPJ/CPF:</Text>
              <Text>{client.cnpjCpf}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        {items.map((item, index) => (
          <View key={item.id} style={styles.itemContainer} wrap={false}>
            {/* Item Header with Image and Details */}
            <View style={styles.itemHeader}>
              {/* Image Section */}
              {item.imageUrl && (
                <View style={styles.imageSection}>
                  <Image 
                    src={item.imageUrl} 
                    style={styles.itemImage}
                  />
                </View>
              )}
              
              {/* Item Details */}
              <View style={styles.itemDetails}>
                <Text style={styles.description}>{item.description}</Text>
                
                {item.profileColor && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>*COR PERFIL:</Text>
                    <Text>{item.profileColor}</Text>
                  </View>
                )}
                
                {item.accessoryColor && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>*COR ACESSÓRIO:</Text>
                    <Text>{item.accessoryColor}</Text>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                  {item.line && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>LINHA:</Text>
                      <Text>{item.line}</Text>
                    </View>
                  )}
                  {item.deliveryDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>DATA ENTREGA:</Text>
                      <Text>{new Date(item.deliveryDate).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colItem}>ITEM</Text>
                <Text style={styles.colQtde}>QTDE.</Text>
                <Text style={styles.colLargura}>LARGURA:</Text>
                <Text style={styles.colAltura}>ALTURA:</Text>
                <Text style={styles.colCor}>COR E ESPESSURA</Text>
                <Text style={styles.colVlrUnit}>VLR. UNIT.</Text>
                <Text style={styles.colVlrTotal}>VLR. TOTAL</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colItem}>{index + 1}</Text>
                <Text style={styles.colQtde}>{parseFloat(String(item.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.colLargura}>{item.width ? parseFloat(String(item.width)).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</Text>
                <Text style={styles.colAltura}>{item.height ? parseFloat(String(item.height)).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</Text>
                <Text style={styles.colCor}>{item.colorThickness || '-'}</Text>
                <Text style={styles.colVlrUnit}>R$ {parseFloat(String(item.unitPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.colVlrTotal}>R$ {parseFloat(String(item.total)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
            </View>

            {/* Item Observations */}
            {item.itemObservations && (
              <View style={styles.itemObservations}>
                <Text style={styles.obsTitle}>📋 OBSERVAÇÕES DESTE ITEM</Text>
                <Text style={styles.obsImportant}>{item.itemObservations}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Total Section */}
        <View style={styles.totalSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text style={{ fontSize: 10 }}>SUBTOTAL:</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          {discountPercent > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 10 }}>DESCONTO ({discountPercent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%):</Text>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#DC2626' }}>-R$ {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          )}
          <View style={{ borderTop: '1px solid #ddd', paddingTop: 5, marginTop: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.totalText}>VALOR TOTAL:</Text>
              <Text style={styles.totalText}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* General Observations */}
        {quote.observations && (
          <View style={styles.generalObservations}>
            <Text style={styles.obsHeader}>OBSERVAÇÕES</Text>
            <Text style={styles.obsContent}>{quote.observations}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ marginTop: 3 }}>A VALIDADE DO ORÇAMENTO: 05 DIAS ÚTEIS OU REPASSE DE NOVOS PREÇOS DE NOSSOS FORNECEDORES.</Text>
          <Text style={{ marginTop: 5, fontWeight: 'bold' }}>HelpGlass - Soluções em Vidros e Espelhos - (22) 99821-3739</Text>
        </View>
      </Page>
    </Document>
  );
}
