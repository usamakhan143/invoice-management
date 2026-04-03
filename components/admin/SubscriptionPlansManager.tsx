import React, { useState, useEffect } from 'react';
import { SUPER_ADMIN_FIRESTORE_WRITES_ENABLED } from '../../config/superAdmin';
import { db } from '../../services/firebase';
import type firebase from 'firebase/compat/app';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  maxUsers: number;
  maxInvoices: number;
  maxStorage: number;
  features: string[];
  isActive: boolean;
  isPopular?: boolean;
  createdAt: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
}

const SubscriptionPlansManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    maxUsers: 5,
    maxInvoices: 200,
    maxStorage: 5120, // 5GB in MB
    features: [] as string[],
    isActive: true,
    isPopular: false
  });

  const availableFeatures = [
    'basic_invoicing',
    'pdf_export',
    'customer_management',
    'product_management',
    'expense_tracking',
    'bank_accounts',
    'multi_currency',
    'custom_branding',
    'api_access',
    'advanced_reporting',
    'team_collaboration',
    'priority_support',
    'white_label',
    'custom_domains'
  ];

  const featureDescriptions: Record<string, string> = {
    basic_invoicing: 'Create and manage invoices',
    pdf_export: 'Export invoices as PDF',
    customer_management: 'Manage customer database',
    product_management: 'Product/service catalog',
    expense_tracking: 'Track business expenses',
    bank_accounts: 'Multiple bank account support',
    multi_currency: 'Multi-currency support',
    custom_branding: 'Custom company branding',
    api_access: 'REST API access',
    advanced_reporting: 'Advanced analytics and reports',
    team_collaboration: 'Team user management',
    priority_support: 'Priority customer support',
    white_label: 'White-label solution',
    custom_domains: 'Custom domain support'
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const snapshot = await db.collection('subscriptionPlans')
        .orderBy('price', 'asc')
        .get();
      
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubscriptionPlan[];
      
      setPlans(plansData);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      setError('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPER_ADMIN_FIRESTORE_WRITES_ENABLED) {
      setError('Catalog edits are disabled. Set VITE_SUPER_ADMIN_FIRESTORE_WRITES=true in .env to enable writes.');
      return;
    }

    try {
      setError('');
      
      const planData = {
        ...formData,
        updatedAt: firebase.firestore.Timestamp.now(),
        ...(editingPlan ? {} : { createdAt: firebase.firestore.Timestamp.now() })
      };

      if (editingPlan) {
        await db.collection('subscriptionPlans').doc(editingPlan.id).update(planData);
      } else {
        await db.collection('subscriptionPlans').add(planData);
      }

      await loadPlans();
      resetForm();
      setShowCreateModal(false);
      setEditingPlan(null);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setError('Failed to save subscription plan');
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    if (!SUPER_ADMIN_FIRESTORE_WRITES_ENABLED) return;
    setFormData({
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      maxUsers: plan.maxUsers,
      maxInvoices: plan.maxInvoices,
      maxStorage: plan.maxStorage,
      features: [...plan.features],
      isActive: plan.isActive,
      isPopular: plan.isPopular || false
    });
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const handleDelete = async (planId: string) => {
    if (!SUPER_ADMIN_FIRESTORE_WRITES_ENABLED) {
      setError('Catalog edits are disabled. Set VITE_SUPER_ADMIN_FIRESTORE_WRITES=true in .env to enable writes.');
      return;
    }
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await db.collection('subscriptionPlans').doc(planId).delete();
      await loadPlans();
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete subscription plan');
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    if (!SUPER_ADMIN_FIRESTORE_WRITES_ENABLED) {
      setError('Catalog edits are disabled. Set VITE_SUPER_ADMIN_FIRESTORE_WRITES=true in .env to enable writes.');
      return;
    }
    try {
      await db.collection('subscriptionPlans').doc(plan.id).update({
        isActive: !plan.isActive,
        updatedAt: firebase.firestore.Timestamp.now()
      });
      await loadPlans();
    } catch (err: any) {
      console.error('Error updating plan status:', err);
      setError('Failed to update plan status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      currency: 'USD',
      billingCycle: 'monthly',
      maxUsers: 5,
      maxInvoices: 200,
      maxStorage: 5120,
      features: [],
      isActive: true,
      isPopular: false
    });
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading subscription plans…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Catalog</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Subscription plans</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {SUPER_ADMIN_FIRESTORE_WRITES_ENABLED
              ? 'Create and manage plans for the platform'
              : 'View-only: plan catalog is shown from Firestore; edits require enabling writes in environment'}
          </p>
        </div>
        {SUPER_ADMIN_FIRESTORE_WRITES_ENABLED && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setEditingPlan(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            Create plan
          </button>
        )}
      </div>

      {!SUPER_ADMIN_FIRESTORE_WRITES_ENABLED && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/45 dark:bg-amber-950/30 dark:text-amber-100/90"
          role="status"
        >
          <p className="font-semibold">Super Admin catalog is read-only</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/85">
            Subscription plan create, edit, delete, and activate/deactivate are disabled so production data stays safe
            when you add or ship new Super Admin code. Set{' '}
            <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">VITE_SUPER_ADMIN_FIRESTORE_WRITES=true</code>{' '}
            in <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">.env</code> only when you
            intentionally need to change <code className="font-mono text-xs">subscriptionPlans</code>, then rebuild.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
              plan.isPopular ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800" : ""
            }`}
          >
            {plan.isPopular && (
              <div className="bg-primary-600 py-2 text-center text-sm font-medium text-white dark:bg-primary-600">
                Most popular
              </div>
            )}

            <div className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                      ${plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/{plan.billingCycle}</span>
                  </div>
                </div>
                {SUPER_ADMIN_FIRESTORE_WRITES_ENABLED && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(plan)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-6 space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 dark:border-gray-600 dark:bg-gray-900/40">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Users</span>
                  <span className="font-medium text-gray-900 dark:text-white">{plan.maxUsers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Invoices / month</span>
                  <span className="font-medium text-gray-900 dark:text-white">{plan.maxInvoices}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Storage</span>
                  <span className="font-medium text-gray-900 dark:text-white">{(plan.maxStorage / 1024).toFixed(1)} GB</span>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Features</h4>
                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {featureDescriptions[feature] || feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    plan.isActive
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200"
                      : "bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200"
                  }`}
                >
                  {plan.isActive ? "Active" : "Inactive"}
                </span>
                {SUPER_ADMIN_FIRESTORE_WRITES_ENABLED && (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(plan)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      plan.isActive
                        ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
                    }`}
                  >
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/80">
            <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No plans yet</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {SUPER_ADMIN_FIRESTORE_WRITES_ENABLED
              ? "Create your first subscription plan to get started."
              : "No plans in Firestore, or catalog is read-only. Enable VITE_SUPER_ADMIN_FIRESTORE_WRITES=true to add plans."}
          </p>
          {SUPER_ADMIN_FIRESTORE_WRITES_ENABLED && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingPlan(null);
                setShowCreateModal(true);
              }}
              className="mt-6 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
            >
              Create first plan
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && SUPER_ADMIN_FIRESTORE_WRITES_ENABLED && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="relative mt-8 w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPlan ? "Edit subscription plan" : "New subscription plan"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Plan Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                    placeholder="e.g., Professional"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Billing Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData(prev => ({ ...prev, billingCycle: e.target.value as 'monthly' | 'yearly' }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Users</label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Invoices/Month</label>
                  <input
                    type="number"
                    value={formData.maxInvoices}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxInvoices: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Storage (MB)</label>
                  <input
                    type="number"
                    value={formData.maxStorage}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStorage: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Features</label>
                <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                  {availableFeatures.map((feature) => (
                    <label key={feature} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{featureDescriptions[feature]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPopular: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Mark as popular</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                >
                  {editingPlan ? "Update plan" : "Create plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansManager;
