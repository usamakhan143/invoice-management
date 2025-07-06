
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import type { Invoice, UserProfile } from '../types';

Font.register({
  family: 'Helvetica-Bold',
  src: 'https://cdn.jsdelivr.net/npm/helvetical/helvetical-bold.ttf'
});

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 11,
        paddingTop: 30,
        paddingLeft: 60,
        paddingRight: 60,
        paddingBottom: 30,
        color: '#333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    companyDetails: {
        flexDirection: 'column',
        textAlign: 'right'
    },
    invoiceTitle: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: '#1d4ed8'
    },
    invoiceInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30
    },
    billTo: {
    },
    invoiceData: {
        textAlign: 'right'
    },
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 2,
        borderBottomColor: '#1d4ed8',
        backgroundColor: '#dbeafe',
        padding: 5,
        fontFamily: 'Helvetica-Bold'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        padding: 5,
    },
    colDescription: {
        width: '50%',
    },
    colQty: {
        width: '15%',
        textAlign: 'right'
    },
    colPrice: {
        width: '15%',
        textAlign: 'right'
    },
    colTotal: {
        width: '20%',
        textAlign: 'right'
    },
    summary: {
        marginTop: 30,
        textAlign: 'right',
    },
    total: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#1d4ed8'
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 60,
      right: 60,
      textAlign: 'center',
      fontSize: 10,
      color: '#6b7280'
    }
});

const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
};

interface InvoicePDFProps {
    invoice: Invoice;
    userProfile: UserProfile;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, userProfile }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.invoiceTitle}>INVOICE</Text>
                <View style={styles.companyDetails}>
                    <Text style={{fontFamily: 'Helvetica-Bold'}}>{userProfile.companyName}</Text>
                    <Text>{userProfile.email}</Text>
                </View>
            </View>

            <View style={styles.invoiceInfo}>
                <View style={styles.billTo}>
                    <Text style={{ color: '#6b7280', marginBottom: 5 }}>BILL TO</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{invoice.customerName}</Text>
                </View>
                <View style={styles.invoiceData}>
                    <Text>Invoice #: {invoice.invoiceNumber}</Text>
                    <Text>Issue Date: {invoice.issueDate.toDate().toLocaleDateString()}</Text>
                    <Text>Due Date: {invoice.dueDate.toDate().toLocaleDateString()}</Text>
                </View>
            </View>

            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.colDescription}>Item Description</Text>
                    <Text style={styles.colQty}>Qty</Text>
                    <Text style={styles.colPrice}>Price</Text>
                    <Text style={styles.colTotal}>Total</Text>
                </View>
                {invoice.items.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={styles.colDescription}>{item.name}</Text>
                        <Text style={styles.colQty}>{item.quantity}</Text>
                        <Text style={styles.colPrice}>{formatCurrency(item.price)}</Text>
                        <Text style={styles.colTotal}>{formatCurrency(item.quantity * item.price)}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.summary}>
                <Text style={{ marginBottom: 5 }}>Total Amount</Text>
                <Text style={styles.total}>{formatCurrency(invoice.total)}</Text>
            </View>
             <Text style={styles.footer}>Thank you for your business!</Text>
        </Page>
    </Document>
);

export default InvoicePDF;
