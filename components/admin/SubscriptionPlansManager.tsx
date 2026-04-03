import React, { useState, useEffect } from 'react';
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
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Subscription Plans Management</h2>
          <p className="text-gray-600">Create and manage subscription plans for your platform</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPlan(null);
            setShowCreateModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create New Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-white rounded-lg shadow-lg overflow-hidden ${plan.isPopular ? 'ring-2 ring-blue-500' : ''}`}>
            {plan.isPopular && (
              <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                Most Popular
              </div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">${plan.price.toLocaleString()}</span>
                    <span className="text-gray-500 ml-1">/{plan.billingCycle}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Users:</span>
                  <span className="font-medium">{plan.maxUsers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Invoices/month:</span>
                  <span className="font-medium">{plan.maxInvoices}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Storage:</span>
                  <span className="font-medium">{(plan.maxStorage / 1024).toFixed(1)}GB</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <h4 className="text-sm font-medium text-gray-900">Features:</h4>
                <div className="space-y-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">
                        {featureDescriptions[feature] || feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  plan.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleToggleActive(plan)}
                  className={`text-sm px-3 py-1 rounded ${
                    plan.isActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">💳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscription plans found</h3>
          <p className="text-gray-500 mb-4">Create your first subscription plan to get started.</p>
          <button
            onClick={() => {
              resetForm();
              setEditingPlan(null);
              setShowCreateModal(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create First Plan
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Professional"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData(prev => ({ ...prev, billingCycle: e.target.value as 'monthly' | 'yearly' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Invoices/Month</label>
                  <input
                    type="number"
                    value={formData.maxInvoices}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxInvoices: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage (MB)</label>
                  <input
                    type="number"
                    value={formData.maxStorage}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStorage: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {availableFeatures.map((feature) => (
                    <label key={feature} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{featureDescriptions[feature]}</span>
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPopular: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as Popular</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
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
