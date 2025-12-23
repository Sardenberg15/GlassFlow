import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer';
import type { Quote, QuoteItem, Client } from '@shared/schema';

const PhoneIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.03 12.03 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="#4B5563" />
  </Svg>
);

const MailIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="#4B5563" strokeWidth="2" />
    <Path d="M22 6l-10 7L2 6" fill="none" stroke="#4B5563" strokeWidth="2" />
  </Svg>
);

const BuildingIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm2-13v2h2V8H6zm0 4v2h2v-2H6zm0 4v2h2v-2H6zm4-8v2h4V8h-4zm0 4v2h4v-2h-4zm0 4v2h4v-2h-4zm6-8v2h2V8h-2zm0 4v2h2v-2h-2zm0 4v2h2v-2h-2z" fill="#4B5563" />
  </Svg>
);

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingBottom: 0,
  },
  contactBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 15,
    borderRadius: 4,
    gap: 20,
  },
  contactGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 8,
    color: '#374151',
    fontWeight: 'medium',
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
    marginTop: 10,
  },
  itemContainer: {
    marginBottom: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  imageSection: {
    width: 100,
    padding: 5,
    border: '1 solid #000',
  },
  itemImage: {
    width: 90,
    height: 90,
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
    marginTop: 8,
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
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    right: 30,
    fontSize: 9,
    color: '#666',
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
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
  },
  signatureBlock: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTop: '1 solid #000',
    width: '100%',
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic', // Simulate handwriting style slightly, though standard fonts are limited
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
        {/* Top Header Section */}
        <View style={styles.header}>
          <View>
            <Image
              src="/logo-orcamento.png"
              style={{ width: 170, height: 75, objectFit: 'contain' }}
            />
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 3 }}>PEDIDO</Text>
            <Text style={styles.companyInfo}>Nº {quote.number}</Text>
            <Text style={styles.companyInfo}>Data: {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</Text>
            <Text style={styles.companyInfo}>Validade: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>



        {/* Modern Contact Bar with Icons */}
        <View style={styles.contactBar}>
          <View style={styles.contactGroup}>
            <PhoneIcon />
            <Text style={styles.contactText}>(22) 99821-3739</Text>
          </View>

          <View style={styles.contactGroup}>
            <Text style={{ ...styles.contactText, fontSize: 10, color: '#CBD5E1' }}>|</Text>
          </View>

          <View style={styles.contactGroup}>
            <BuildingIcon />
            <Text style={styles.contactText}>62.481.085/0001-24</Text>
          </View>

          <View style={styles.contactGroup}>
            <Text style={{ ...styles.contactText, fontSize: 10, color: '#CBD5E1' }}>|</Text>
          </View>

          <View style={styles.contactGroup}>
            <MailIcon />
            <Text style={styles.contactText}>alpheu25@gmail.com</Text>
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
          {client.email ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Email:</Text>
              <Text>{client.email}</Text>
            </View>
          ) : null}
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Telefone:</Text>
            <Text>{client.phone}</Text>
          </View>
          {client.address ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Endereço:</Text>
              <Text>{client.address}</Text>
            </View>
          ) : null}
          {client.cnpjCpf ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>CNPJ/CPF:</Text>
              <Text>{client.cnpjCpf}</Text>
            </View>
          ) : null}
        </View>

        {/* Items */}
        {items.map((item, index) => (
          <View key={item.id} style={styles.itemContainer} wrap={false}>
            {/* Item Header with Image and Details */}
            <View style={styles.itemHeader}>
              {/* Image Section */}
              {item.imageUrl ? (
                <View style={styles.imageSection}>
                  <Image
                    src={item.imageUrl}
                    style={styles.itemImage}
                  />
                </View>
              ) : null}

              {/* Item Details */}
              <View style={styles.itemDetails}>
                <Text style={styles.description}>{item.description}</Text>

                {item.profileColor ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>*COR PERFIL:</Text>
                    <Text>{item.profileColor}</Text>
                  </View>
                ) : null}

                {item.accessoryColor ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>*COR ACESSÓRIO:</Text>
                    <Text>{item.accessoryColor}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                  {item.line ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>LINHA:</Text>
                      <Text>{item.line}</Text>
                    </View>
                  ) : null}
                  {item.deliveryDate ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>DATA ENTREGA:</Text>
                      <Text>{new Date(item.deliveryDate).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  ) : null}
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
            {item.itemObservations ? (
              <View style={styles.itemObservations}>
                <Text style={styles.obsTitle}>📋 OBSERVAÇÕES DESTE ITEM</Text>
                <Text style={styles.obsImportant}>{item.itemObservations}</Text>
              </View>
            ) : null}
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
        {quote.observations ? (
          <View style={styles.generalObservations}>
            <Text style={styles.obsHeader}>OBSERVAÇÕES</Text>
            <Text style={styles.obsContent}>{quote.observations}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ marginBottom: 5 }}>A VALIDADE DO ORÇAMENTO: 05 DIAS ÚTEIS OU REPASSE DE NOVOS PREÇOS DE NOSSOS FORNECEDORES.</Text>
          <Text style={{ marginTop: 5, fontWeight: 'bold' }}>HelpGlass - Soluções em Vidros e Espelhos - (22) 99821-3739</Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Autorização do Cliente</Text>
            <Text style={{ ...styles.signatureText, fontSize: 8, marginTop: 2 }}>{client.name}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Alpheu Sardenberg</Text>
            <Text style={{ ...styles.signatureText, fontSize: 8, marginTop: 2 }}>Representante Comercial</Text>
          </View>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
