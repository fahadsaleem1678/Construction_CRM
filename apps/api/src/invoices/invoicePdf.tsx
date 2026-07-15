import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Invoice } from '@construction-crm/shared-types';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f7f3ea',
    color: '#18202a',
    fontSize: 11,
    fontFamily: 'Helvetica',
    padding: 32,
  },
  shell: {
    borderWidth: 1,
    borderColor: '#d9cdb7',
    borderRadius: 14,
    backgroundColor: '#fffdf8',
    padding: 24,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  brandWrap: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    maxWidth: '58%',
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: 'cover',
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 3,
  },
  subtitle: {
    color: '#736454',
    fontSize: 10,
    lineHeight: 1.4,
  },
  metaCard: {
    width: 190,
    backgroundColor: '#f3ede1',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2d4ba',
  },
  metaLabel: {
    fontSize: 8,
    color: '#84715d',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    marginBottom: 8,
  },
  statusBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#d88f2d',
    color: '#fff9ef',
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 10,
    textTransform: 'uppercase',
    color: '#6e5b46',
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddcfb6',
    paddingBottom: 8,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#efe4d0',
  },
  descCol: { flex: 1.8, paddingRight: 8 },
  qtyCol: { flex: 0.6, textAlign: 'right' },
  rateCol: { flex: 0.9, textAlign: 'right' },
  totalCol: { flex: 0.9, textAlign: 'right' },
  muted: { color: '#87725b' },
  totalsWrap: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 220,
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#d2c29e',
    fontSize: 13,
    fontWeight: 700,
  },
  footer: {
    marginTop: 24,
    fontSize: 9,
    lineHeight: 1.5,
    color: '#7c6c5e',
  },
});

type InvoicePdfProps = {
  invoice: Invoice;
  logoDataUrl?: string | null;
};

export async function renderInvoicePdf(invoice: Invoice, logoDataUrl?: string | null) {
  return renderToBuffer(<InvoicePdf invoice={invoice} logoDataUrl={logoDataUrl} />);
}

export function InvoicePdf({ invoice, logoDataUrl }: InvoicePdfProps) {
  return (
    <Document title={invoice.invoiceNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.hero}>
            <View style={styles.brandWrap}>
              {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
              <View>
                <Text style={styles.title}>SiteCore Billing</Text>
                <Text style={styles.subtitle}>Construction CRM invoice for client billing, project closure, and payment follow-up.</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Invoice</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
              <Text style={styles.metaLabel}>Client</Text>
              <Text style={styles.metaValue}>{invoice.clientName}</Text>
              <Text style={styles.metaLabel}>Project</Text>
              <Text style={styles.metaValue}>{invoice.projectName ?? 'Unlinked project'}</Text>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
              <Text style={styles.statusBadge}>{invoice.status.replace('_', ' ')}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Invoice Items</Text>
          <View style={styles.tableHead}>
            <Text style={styles.descCol}>Description</Text>
            <Text style={styles.qtyCol}>Qty</Text>
            <Text style={styles.rateCol}>Unit</Text>
            <Text style={styles.totalCol}>Total</Text>
          </View>

          {invoice.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.descCol}>
                <Text>{item.description}</Text>
              </View>
              <Text style={styles.qtyCol}>{item.quantity.toFixed(2)}</Text>
              <Text style={styles.rateCol}>{money(item.unitPrice)}</Text>
              <Text style={styles.totalCol}>{money(item.total)}</Text>
            </View>
          ))}

          <View style={styles.totalsWrap}>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text>{money(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Tax</Text>
              <Text>{money(invoice.tax)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Amount paid</Text>
              <Text>{money(invoice.amountPaid)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text>Balance due</Text>
              <Text>{money(invoice.balanceDue)}</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Please reference {invoice.invoiceNumber} when confirming payment. This document was generated by SiteCore CRM and can be resent automatically if it becomes overdue.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function money(value: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
