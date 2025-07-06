
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import type { Product } from '../../types';
import Spinner from '../../components/Spinner';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const ProductsPage: React.FC = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection(`users/${user.uid}/products`)
            .onSnapshot(snapshot => {
                const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(fetchedProducts);
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user]);

    const openModal = (product: Partial<Product> | null = null) => {
        setCurrentProduct(product ? { ...product } : { name: '', description: '', price: 0 });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    const handleSave = async () => {
        if (!user || !currentProduct) return;
        
        try {
            if ('id' in currentProduct && currentProduct.id) {
                await db.collection(`users/${user.uid}/products`).doc(currentProduct.id).update(currentProduct);
            } else {
                await db.collection(`users/${user.uid}/products`).add(currentProduct);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving product:", error);
        }
    };

    const handleDelete = async (productId: string) => {
        if (!user) return;
        if(window.confirm("Are you sure you want to delete this product?")) {
            try {
                await db.collection(`users/${user.uid}/products`).doc(productId).delete();
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Failed to delete product. It may be linked to existing invoices.");
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Products & Services</h1>
                <button onClick={() => openModal()} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Add Product
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Price</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.name}</td>
                                    <td className="px-6 py-4">{product.description}</td>
                                    <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => openModal(product)} className="text-yellow-500 hover:text-yellow-700">Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && currentProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{'id' in currentProduct ? 'Edit Product' : 'Add Product'}</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Name" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <textarea placeholder="Description" value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                             <input type="number" step="0.01" placeholder="Price" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
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

export default ProductsPage;
