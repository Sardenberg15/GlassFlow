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
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111827', // Rich Black
  },
  // Header Section
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '1 solid #E5E7EB',
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280', // Cool Gray
    marginBottom: 2,
  },

  // Contact Bar (Simplified)
  contactBar: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Spread out
    marginBottom: 30,
    fontSize: 8,
    color: '#4B5563',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Client Section (Clean)
  clientSection: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientBlock: {
    width: '45%',
  },
  sectionLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  clientText: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  // Table (Modern)
  tableContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #111827', // Strong anchor line
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#111827',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    border: '1 solid #E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    padding: 8,
  },

  // Image Column
  colImage: {
    width: 120, // Dedicated space for the large image
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // Optional: light bg for image area height
    borderRight: '1 solid #F3F4F6', // Divider line
  },

  // Columns for Data
  colData: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },

  colQtde: { width: 40, textAlign: 'center', fontSize: 9 },
  colDim: { width: 50, textAlign: 'center', fontSize: 9 },
  colPrice: { width: 70, textAlign: 'right', fontSize: 9 },
  colTotal: { width: 80, textAlign: 'right', fontWeight: 'bold', fontSize: 9 },

  // Item Details
  itemTitle: {
    fontSize: 11, // Larger title
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  itemMeta: {
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 2,
  },
  itemImage: {
    width: 110,
    height: 110,
    objectFit: 'contain',
  },

  // Breakdown Table (Calculated Materials)
  breakdownTable: {
    marginTop: 8,
    border: '1 solid #E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: '1 solid #E5E7EB',
    padding: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottom: '1 solid #F3F4F6',
  },
  breakdownCell: {
    fontSize: 7,
    color: '#4B5563',
  },

  // Total Section
  totalSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 9,
    textAlign: 'right',
    fontWeight: 'medium',
  },
  finalTotal: {
    paddingTop: 10,
    marginTop: 5,
  },
  finalTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },

  // Footer & Signatures
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1 solid #E5E7EB',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  signatureSection: {
    marginTop: 60,
    flexDirection: 'row',
    gap: 40,
  },
  signatureLine: {
    width: 200,
    borderTop: '1 solid #E5E7EB',
    paddingTop: 8,
  },
});

interface QuotePDFProps {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
}

const getImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url}`;
  }
  return url;
};

export function QuotePDF({ quote, client, items }: QuotePDFProps) {
  const subtotal = items.reduce((sum, item) => sum + parseFloat(String(item.total)), 0);
  const discountPercent = parseFloat(String(quote.discount || "0"));
  const discountValue = (subtotal * discountPercent) / 100;
  const total = subtotal - discountValue;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header - Reverted to Standard Style */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View>
            <Image
              src="/logo-orcamento.png"
              style={{ width: 170, height: 75, objectFit: 'contain' }}
            />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>ORÇAMENTO</Text>
            <Text style={{ fontSize: 9, color: '#111827' }}>Nº {quote.number}</Text>
            <Text style={{ fontSize: 9, color: '#111827' }}>Data: {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</Text>
            <Text style={{ fontSize: 9, color: '#111827' }}>Validade: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        {/* Contact Bar - Clean & Minimal */}
        <View style={styles.contactBar}>
          <View style={styles.contactItem}>
            <PhoneIcon />
            <Text>(22) 99821-3739</Text>
          </View>
          <View style={styles.contactItem}>
            <BuildingIcon />
            <Text>62.481.085/0001-24</Text>
          </View>
          <View style={styles.contactItem}>
            <MailIcon />
            <Text>alpheu25@gmail.com</Text>
          </View>
        </View>

        {/* Client & Project Info */}
        {/* Client & Project Info - Styled Card */}
        <View style={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          backgroundColor: '#F9FAFB',
          border: '1 solid #E5E7EB',
          borderRadius: 6,
          padding: 15
        }}>
          {/* Left Column: Client Name */}
          <View style={styles.clientBlock}>
            <Text style={styles.sectionLabel}>CLIENTE</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.phone && <Text style={styles.clientText}>{client.phone}</Text>}
            {client.email && <Text style={styles.clientText}>{client.email}</Text>}
          </View>

          {/* Right Column: Address & Docs */}
          <View style={styles.clientBlock}>
            <Text style={styles.sectionLabel}>DETALHES</Text>
            {client.address && <Text style={styles.clientText}>{client.address}</Text>}
            {client.cnpjCpf && <Text style={styles.clientText}>CPF/CNPJ: {client.cnpjCpf}</Text>}
          </View>
        </View>

        {/* Table Header (Simplified to just Labels, since logic is inside card now) */}
        {/* We can remove the big table header or keep it as a legend. 
            Since the user wants a "Card" look, inner labels are often better. 
            I'll remove the outer header to keep it clean, as proposed in the code block above where I added labels inside the card. */}
        <View style={styles.tableContainer}>
          {/* Table Items */}
          {items.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>

              {/* Left Column: Image (if exists) or item number */}
              <View style={styles.colImage}>
                {item.imageUrl ? (
                  <Image src={getImageUrl(item.imageUrl)!} style={styles.itemImage} />
                ) : (
                  <Text style={{ fontSize: 16, color: '#E5E7EB', fontWeight: 'bold' }}>#{index + 1}</Text>
                )}
              </View>

              {/* Right Column: Content + Data Grid */}
              <View style={{ flex: 1, paddingLeft: 10 }}>

                {/* content Row: Title & Specs */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.itemTitle}>{item.description}</Text>

                  <View style={{ gap: 2 }}>
                    {item.environment && (
                      <Text style={styles.itemMeta}>• Local: {item.environment}</Text>
                    )}
                    {item.profileColor && (
                      <Text style={styles.itemMeta}>• Perfil: {item.profileColor}</Text>
                    )}
                    {item.accessoryColor && (
                      <Text style={styles.itemMeta}>• Acess.: {item.accessoryColor}</Text>
                    )}
                    {item.colorThickness && (
                      <Text style={styles.itemMeta}>• Vidro: {item.colorThickness}</Text>
                    )}
                  </View>

                  {item.itemObservations && (
                    <Text style={{ ...styles.itemMeta, color: '#DC2626', marginTop: 4, fontStyle: 'italic' }}>
                      Obs: {item.itemObservations}
                    </Text>
                  )}
                </View>

                {/* Data Row: Numeric Data Grid */}
                <View style={{ borderTop: '1 solid #F3F4F6', paddingTop: 8, flexDirection: 'row', justifyContent: 'flex-end', gap: 15 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 7, color: '#9CA3AF', marginBottom: 2 }}>QTD</Text>
                    <Text style={styles.colQtde}>{parseFloat(String(item.quantity)).toLocaleString('pt-BR')}</Text>
                  </View>

                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 7, color: '#9CA3AF', marginBottom: 2 }}>LARG.</Text>
                    <Text style={styles.colDim}>{item.width ? parseFloat(String(item.width)).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</Text>
                  </View>

                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 7, color: '#9CA3AF', marginBottom: 2 }}>ALT.</Text>
                    <Text style={styles.colDim}>{item.height ? parseFloat(String(item.height)).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 7, color: '#9CA3AF', marginBottom: 2 }}>UNIT.</Text>
                    <Text style={styles.colPrice}>R$ {parseFloat(String(item.unitPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', width: '20%' }}>
                    <Text style={{ fontSize: 7, color: '#9CA3AF', marginBottom: 2 }}>TOTAL</Text>
                    <Text style={styles.colTotal}>R$ {parseFloat(String(item.total)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                  </View>
                </View>

                {/* Sub-table: Calculated Materials Breakdown */}
                {(item.calculatedMaterials && Array.isArray((item.calculatedMaterials as any).materials) && (item.calculatedMaterials as any).materials.length > 0) ? (
                  <View style={styles.breakdownTable}>
                    <View style={styles.breakdownHeader}>
                      <Text style={[styles.breakdownCell, { width: '40%', fontWeight: 'bold' }]}>COMPONENTE</Text>
                      <Text style={[styles.breakdownCell, { width: '25%', fontWeight: 'bold', textAlign: 'center' }]}>CORTE (mm)</Text>
                      <Text style={[styles.breakdownCell, { width: '15%', fontWeight: 'bold', textAlign: 'center' }]}>QTD</Text>
                      <Text style={[styles.breakdownCell, { width: '20%', fontWeight: 'bold', textAlign: 'right' }]}>PESO (kg)</Text>
                    </View>
                    {((item.calculatedMaterials as any).materials as any[]).map((mat: any, idx: number) => (
                      <View key={`mat-${idx}`} style={styles.breakdownRow}>
                        <Text style={[styles.breakdownCell, { width: '40%' }]}>{mat.profile?.code || "Perfil"}</Text>
                        <Text style={[styles.breakdownCell, { width: '25%', textAlign: 'center' }]}>{mat.calculatedSize?.toFixed(1) || "-"}</Text>
                        <Text style={[styles.breakdownCell, { width: '15%', textAlign: 'center' }]}>{mat.calculatedQuantity || "-"}</Text>
                        <Text style={[styles.breakdownCell, { width: '20%', textAlign: 'right' }]}>{mat.totalWeight?.toFixed(2) || "-"}</Text>
                      </View>
                    ))}
                    <View style={[styles.breakdownRow, { backgroundColor: '#F9FAFB' }]}>
                      <Text style={[styles.breakdownCell, { width: '80%', textAlign: 'right', fontWeight: 'bold' }]}>Peso Total de Alumínio:</Text>
                      <Text style={[styles.breakdownCell, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>
                        {(((item.calculatedMaterials as any).materials as any[]).reduce((acc: number, cur: any) => acc + (cur.totalWeight || 0), 0)).toFixed(2)} kg
                      </Text>
                    </View>
                  </View>
                ) : null}

              </View>

            </View>
          ))}
        </View>

        {/* Total Section with Signature Restored */}
        <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>

          {/* Left Side: Single Signature Line */}
          <View style={{ width: '40%', paddingBottom: 4 }}>
            <View style={{ borderBottom: '1 solid #111827', marginBottom: 2 }} />
            <Text style={{ fontSize: 8, textAlign: 'center', color: '#6B7280' }}>ACEITE DO CLIENTE</Text>
          </View>

          {/* Right Side: Totals */}
          <View style={{ alignItems: 'flex-end', width: '40%' }}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>

            {discountPercent > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ ...styles.totalLabel, color: '#EF4444' }}>Desconto ({discountPercent}%)</Text>
                <Text style={{ ...styles.totalValue, color: '#EF4444' }}>
                  - {discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalTotalText}>Total</Text>
              <Text style={styles.finalTotalText}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* General Observations */}
        {quote.observations && (
          <View style={{ marginTop: 30, borderTop: '1 solid #E5E7EB', paddingTop: 10 }}>
            <Text style={styles.sectionLabel}>OBSERVAÇÕES FINAIS</Text>
            <Text style={{ fontSize: 9 }}>{quote.observations}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Este orçamento é válido por 5 dias úteis. Sujeito a alteração de valores.
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </View>

      </Page>
    </Document>
  );
}