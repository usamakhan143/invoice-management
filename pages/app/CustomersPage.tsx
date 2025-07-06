
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import type { Customer } from '../../types';
import Spinner from '../../components/Spinner';

const CustomersPage: React.FC = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer> | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection(`users/${user.uid}/customers`)
            .onSnapshot(snapshot => {
                const fetchedCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
                setCustomers(fetchedCustomers);
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user]);

    const openModal = (customer: Partial<Customer> | null = null) => {
        setCurrentCustomer(customer ? { ...customer } : { name: '', email: '', phone: '', address: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCustomer(null);
    };

    const handleSave = async () => {
        if (!user || !currentCustomer) return;
        
        try {
            if ('id' in currentCustomer && currentCustomer.id) {
                await db.collection(`users/${user.uid}/customers`).doc(currentCustomer.id).update(currentCustomer);
            } else {
                await db.collection(`users/${user.uid}/customers`).add(currentCustomer);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving customer:", error);
        }
    };

    const handleDelete = async (customerId: string) => {
        if (!user) return;
        if(window.confirm("Are you sure you want to delete this customer?")) {
            try {
                await db.collection(`users/${user.uid}/customers`).doc(customerId).delete();
            } catch (error) {
                console.error("Error deleting customer:", error);
                alert("Failed to delete customer. They may be linked to existing invoices.");
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Customers</h1>
                <button onClick={() => openModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Add Customer
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Phone</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                    <td className="px-6 py-4">{customer.email}</td>
                                    <td className="px-6 py-4">{customer.phone}</td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => openModal(customer)} className="text-yellow-500 hover:text-yellow-700">Edit</button>
                                        <button onClick={() => handleDelete(customer.id)} className="text-red-500 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && currentCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{'id' in currentCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Name" value={currentCustomer.name} onChange={e => setCurrentCustomer({...currentCustomer, name: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <input type="email" placeholder="Email" value={currentCustomer.email} onChange={e => setCurrentCustomer({...currentCustomer, email: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <input type="tel" placeholder="Phone" value={currentCustomer.phone} onChange={e => setCurrentCustomer({...currentCustomer, phone: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <textarea placeholder="Address" value={currentCustomer.address} onChange={e => setCurrentCustomer({...currentCustomer, address: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;
