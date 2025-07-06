
import firebase from 'firebase/compat/app';

export interface UserProfile {
    uid: string;
    email: string;
    companyName: string;
    createdAt: firebase.firestore.Timestamp;
    invoiceCounter: number;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
}

export interface InvoiceItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
    id: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string; // denormalized
    items: InvoiceItem[];
    total: number;
    status: InvoiceStatus;
    issueDate: firebase.firestore.Timestamp;
    dueDate: firebase.firestore.Timestamp;
}
