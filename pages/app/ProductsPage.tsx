
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePermissions } from '../../hooks/usePermissions';
import { PAGES } from '../../config/permissions';
import { db } from '../../services/firebase';
import type { Product } from '../../types';
import Spinner from '../../components/Spinner';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const ProductsPage: React.FC = () => {
    usePageTitle("Products");
    const { user } = useAuth();
    const { canCreate, canEdit, canDelete, hasPageAccess } = usePermissions();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

    useEffect(() => {
        loadProducts();
    }, [user]);

    const openModal = (product: Partial<Product> | null = null) => {
        setCurrentProduct(product ? { ...product } : { name: '', description: '', price: 0 });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    const loadProducts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const snapshot = await db.collection(`users/${user.uid}/products`).get();
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user || !currentProduct) return;
        
        // Validate required fields
        if (!currentProduct.name || !currentProduct.price) {
            alert("Please fill in all required fields (Name and Price)");
            return;
        }
        
        try {
            if ('id' in currentProduct && currentProduct.id) {
                await db.collection(`users/${user.uid}/products`).doc(currentProduct.id).update(currentProduct);
            } else {
                await db.collection(`users/${user.uid}/products`).add(currentProduct);
            }
            closeModal();
            // Auto refresh data after successful operation
            await loadProducts();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Failed to save product");
        }
    };

    const handleDelete = async (productId: string) => {
        if (!user) return;
        if(window.confirm("Are you sure you want to delete this product?")) {
            try {
                await db.collection(`users/${user.uid}/products`).doc(productId).delete();
                // Auto refresh data after successful deletion
                await loadProducts();
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Failed to delete product. It may be linked to existing invoices.");
            }
        }
    };

    if (!hasPageAccess(PAGES.PRODUCTS)) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Access Denied
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        You don't have permission to access Products.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Products & Services</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => loadProducts()}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                    {canCreate(PAGES.PRODUCTS) && (
                        <button onClick={() => openModal()} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                            Add Product
                        </button>
                    )}
                </div>
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
                                        {canEdit(PAGES.PRODUCTS) && (
                                            <button onClick={() => openModal(product)} className="text-yellow-500 hover:text-yellow-700">Edit</button>
                                        )}
                                        {canDelete(PAGES.PRODUCTS) && (
                                            <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700">Delete</button>
                                        )}
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
