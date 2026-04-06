import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useCompanyUserOptions } from "../../hooks/useCompanyUserOptions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { PAGES } from "../../config/permissions";
import { ActivityLogger } from "../../services/activityLogger";
import { ProductService } from "../../services/productService";
import type { Product } from "../../types";
import Spinner from "../../components/Spinner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );

const ProductsPage: React.FC = () => {
  usePageTitle("Products");
  const { user, userProfile } = useAuth();
  const {
    canCreate,
    canEdit,
    canDelete,
    hasPageAccess,
    isOwner,
    isAdmin,
    canUseCompanyProductCatalog,
    canBulkDeleteProducts,
  } = usePermissions();
  const useCompanyCatalog = canUseCompanyProductCatalog();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(
    null,
  );
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const companyUserOptions = useCompanyUserOptions(user, userProfile);
  const allowBulkRowSelect = canBulkDeleteProducts();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkDeletingProducts, setBulkDeletingProducts] = useState(false);
  const selectAllProductsRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (filterCreatedBy && (isOwner || isAdmin)) {
      list = list.filter((p) => (p.createdById || "") === filterCreatedBy);
    }
    return list;
  }, [products, filterCreatedBy, isOwner, isAdmin]);

  const selectedProductSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds],
  );

  const allFilteredProductsSelected =
    allowBulkRowSelect &&
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductSet.has(p.id));

  useEffect(() => {
    const el = selectAllProductsRef.current;
    if (!el || !allowBulkRowSelect || filteredProducts.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    const n = filteredProducts.filter((p) => selectedProductSet.has(p.id)).length;
    el.indeterminate = n > 0 && n < filteredProducts.length;
  }, [allowBulkRowSelect, filteredProducts, selectedProductSet]);

  const toggleProductSelected = useCallback((id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAllFilteredProducts = useCallback(() => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      const every = filteredProducts.length > 0 && filteredProducts.every((p) => next.has(p.id));
      if (every) {
        filteredProducts.forEach((p) => next.delete(p.id));
      } else {
        filteredProducts.forEach((p) => next.add(p.id));
      }
      return Array.from(next);
    });
  }, [filteredProducts]);

  const clearProductSelection = useCallback(() => {
    setSelectedProductIds([]);
  }, []);

  const handleBulkDeleteProducts = async () => {
    if (!user || !userProfile || !allowBulkRowSelect || selectedProductIds.length === 0) {
      return;
    }
    const n = selectedProductIds.length;
    if (
      !window.confirm(
        `Delete ${n} product${n === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeletingProducts(true);
    try {
      for (const productId of selectedProductIds) {
        const productToDelete = products.find((p) => p.id === productId);
        await ProductService.deleteProduct(productId);
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "product_deleted",
          `Bulk deleted product: ${productToDelete?.name || "Unknown"}`,
          {
            entityId: productId,
            entityType: "product",
            oldValue: productToDelete,
          },
        );
      }
      clearProductSelection();
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert("Some products could not be deleted. They may be linked to invoices.");
    } finally {
      setBulkDeletingProducts(false);
    }
  };

  // Set up real-time listener for products
  useEffect(() => {
    if (!user || !userProfile) return;

    // Set up real-time listener using ProductService
    const unsubscribe = ProductService.getProductsRealTime(
      user,
      userProfile,
      isOwner,
      isAdmin,
      useCompanyCatalog,
      (productsData) => {
        setProducts(productsData);
        setLoading(false);
      },
    );

    // Initial load
    loadProducts();

    return () => unsubscribe();
  }, [user, userProfile, isOwner, isAdmin, useCompanyCatalog]);

  const openModal = (product: Partial<Product> | null = null) => {
    setCurrentProduct(
      product
        ? { ...product }
        : { name: "", description: "", price: undefined },
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
  };

  const loadProducts = async () => {
    if (!user || !userProfile) return;
    setLoading(true);
    try {
      const productsData = await ProductService.getProducts(
        user,
        userProfile,
        isOwner,
        isAdmin,
        useCompanyCatalog,
      );
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !currentProduct || !userProfile) return;

    // Validate required fields
    if (!currentProduct.name) {
      alert("Please fill in the product name");
      return;
    }

    try {
      const isUpdate = "id" in currentProduct && currentProduct.id;

      // Prepare product data for saving, handle undefined price
      const productData = {
        name: currentProduct.name,
        description: currentProduct.description || "",
        price: currentProduct.price || 0, // Convert undefined/null to 0
      };

      if (isUpdate) {
        await ProductService.saveProduct(
          productData,
          user,
          userProfile,
          currentProduct.id,
        );

        // Log update activity
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "product_updated",
          `Updated product: ${productData.name}`,
          {
            entityId: currentProduct.id,
            entityType: "product",
            newValue: productData,
          },
        );
      } else {
        const productId = await ProductService.saveProduct(
          productData,
          user,
          userProfile,
        );

        // Log create activity
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "product_created",
          `Created new product: ${productData.name}`,
          {
            entityId: productId,
            entityType: "product",
            newValue: productData,
          },
        );
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
    if (!user || !userProfile) return;

    const productToDelete = products.find((p) => p.id === productId);

    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await ProductService.deleteProduct(productId);

        // Log delete activity
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "product_deleted",
          `Deleted product: ${productToDelete?.name || "Unknown"}`,
          {
            entityId: productId,
            entityType: "product",
            oldValue: productToDelete,
          },
        );

        // Auto refresh data after successful deletion
        await loadProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert(
          "Failed to delete product. It may be linked to existing invoices.",
        );
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
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          Products & Services
        </h1>
        <div className="button-group">
          <button
            onClick={() => loadProducts()}
            disabled={loading}
            className="mobile-btn-icon p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={loading ? "Loading..." : "Refresh"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          {canCreate(PAGES.PRODUCTS) && (
            <button
              onClick={() => openModal()}
              className="mobile-btn px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              Add Product
            </button>
          )}
        </div>
      </div>
      {useCompanyCatalog && !canCreate(PAGES.PRODUCTS) && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-3xl">
          You can browse the company catalog and use these products when creating invoices. Adding or editing products is limited to users with those permissions.
        </p>
      )}
      {(isOwner || isAdmin) && (
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <label htmlFor="products-filter-created-by" className="sr-only">
            Filter by creator
          </label>
          <select
            id="products-filter-created-by"
            value={filterCreatedBy}
            onChange={(e) => setFilterCreatedBy(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[11rem]"
            aria-label="Filter by creator"
          >
            <option value="">All creators</option>
            {companyUserOptions.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.label}
              </option>
            ))}
          </select>
          {filterCreatedBy && (
            <button
              type="button"
              onClick={() => setFilterCreatedBy("")}
              className="text-sm text-primary-600 hover:underline dark:text-primary-400"
            >
              Clear creator filter
            </button>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filterCreatedBy
              ? `Showing ${filteredProducts.length} of ${products.length} product${
                  products.length !== 1 ? "s" : ""
                }`
              : `${products.length} product${products.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      )}

      {allowBulkRowSelect && selectedProductIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/90 p-3 dark:border-primary-800 dark:bg-primary-950/40 sm:flex-row sm:flex-wrap sm:items-end"
          role="region"
          aria-label="Bulk actions for products"
        >
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selectedProductIds.length} product
            {selectedProductIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkDeletingProducts}
              onClick={() => void handleBulkDeleteProducts()}
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeletingProducts ? "Deleting…" : "Delete selected"}
            </button>
            <button
              type="button"
              disabled={bulkDeletingProducts}
              onClick={clearProductSelection}
              className="text-sm px-2 py-1.5 text-gray-600 hover:underline dark:text-gray-300"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {allowBulkRowSelect ? (
                  <th scope="col" className="w-10 px-2 py-3">
                    <span className="sr-only">Select row</span>
                    <input
                      ref={selectAllProductsRef}
                      type="checkbox"
                      checked={allFilteredProductsSelected}
                      onChange={toggleSelectAllFilteredProducts}
                      disabled={filteredProducts.length === 0}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                      aria-label="Select all products in the list"
                    />
                  </th>
                ) : null}
                <th scope="col" className="px-6 py-3">
                  Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Description
                </th>
                <th scope="col" className="px-6 py-3">
                  Price
                </th>
                {(isOwner || isAdmin || useCompanyCatalog) && (
                  <th scope="col" className="px-6 py-3">
                    Created By
                  </th>
                )}
                <th scope="col" className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {allowBulkRowSelect ? (
                    <td className="w-10 px-2 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedProductSet.has(product.id)}
                        onChange={() => toggleProductSelected(product.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        aria-label={`Select product ${product.name}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </td>
                  <td className="px-6 py-4">{product.description}</td>
                  <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                  {(isOwner || isAdmin || useCompanyCatalog) && (
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {(product as any).createdBy ||
                            (product as any).updatedBy ||
                            "Unknown"}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {(product as any).createdAt
                            ? new Date(
                                (product as any).createdAt.toDate(),
                              ).toLocaleDateString()
                            : (product as any).updatedAt
                              ? new Date(
                                  (product as any).updatedAt.toDate(),
                                ).toLocaleDateString()
                              : ""}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 flex space-x-2">
                    {canEdit(PAGES.PRODUCTS) && (
                      <button
                        onClick={() => openModal(product)}
                        className="text-yellow-500 hover:text-yellow-700"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete(PAGES.PRODUCTS) && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {"id" in currentProduct ? "Edit Product" : "Add Product"}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={currentProduct.name}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, name: e.target.value })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <textarea
                placeholder="Description"
                value={currentProduct.description}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    description: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price (optional)"
                value={currentProduct.price || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    price: e.target.value ? parseFloat(e.target.value) : 0,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
