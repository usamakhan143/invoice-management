
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardCard from '../../components/DashboardCard';
import { CustomerIcon, InvoiceIcon, RevenueIcon } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import type { Invoice, Customer } from '../../types';
import Spinner from '../../components/Spinner';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const invoicesUnsubscribe = db.collection(`users/${user.uid}/invoices`)
            .orderBy('issueDate', 'desc')
            .limit(5)
            .onSnapshot(snapshot => {
                const fetchedInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
                setInvoices(fetchedInvoices);
                setLoading(false);
            }, (error) => {
                 console.error("Error fetching invoices:", error);
                 setLoading(false);
            });

        const customersUnsubscribe = db.collection(`users/${user.uid}/customers`)
            .onSnapshot(snapshot => {
                const fetchedCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
                setCustomers(fetchedCustomers);
            }, (error) => {
                console.error("Error fetching customers:", error);
            });

        return () => {
            invoicesUnsubscribe();
            customersUnsubscribe();
        };
    }, [user]);

    const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

    const outstandingRevenue = invoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.total, 0);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title="Total Revenue (Paid)" value={formatCurrency(totalRevenue)} icon={<RevenueIcon />} color="bg-green-500" />
                <DashboardCard title="Outstanding Revenue" value={formatCurrency(outstandingRevenue)} icon={<InvoiceIcon />} color="bg-yellow-500" />
                <DashboardCard title="Total Customers" value={customers.length.toString()} icon={<CustomerIcon />} color="bg-blue-500" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-white">Recent Invoices</h2>
                    <Link to="/invoices" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Invoice #</th>
                                <th scope="col" className="px-6 py-3">Customer</th>
                                <th scope="col" className="px-6 py-3">Amount</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length > 0 ? invoices.map(invoice => (
                                <tr key={invoice.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4">{invoice.customerName}</td>
                                    <td className="px-6 py-4">{formatCurrency(invoice.total)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500 dark:text-gray-400">No recent invoices found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
