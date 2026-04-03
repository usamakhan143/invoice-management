import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import DataBackupManager from '../../components/DataBackupManager';

const DataManagementPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { canExportBackup, canImportBackup, canViewBackupHistory, isOwner, isAdmin } = usePermissions();

  // Only show page to admins and owners
  if (!isOwner && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only company admins and owners can access data management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your company data, backups, and exports
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <span>Company:</span>
                <span className="font-medium text-gray-900">{userProfile?.companyName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📄</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                  <dd className="text-lg font-medium text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 text-xl">👥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📦</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                  <dd className="text-lg font-medium text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <span className="text-orange-600 text-xl">💾</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Storage Used</dt>
                  <dd className="text-lg font-medium text-gray-900">- MB</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Management Section */}
      {(canExportBackup || canImportBackup || canViewBackupHistory) && (
        <DataBackupManager />
      )}

      {/* Database Structure Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Database Structure Information</h3>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">🗃️ New Hierarchical Structure</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Organized by Company:</strong> All your data is now organized under your company ID for easier management</p>
              <p><strong>Easy Export:</strong> Export all company data in one operation without mixing with other companies</p>
              <p><strong>Better Backup:</strong> More reliable backup and restore operations</p>
              <p><strong>Scalable:</strong> Better performance as your business grows</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">📂 Your Company Collections:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span>📄</span>
                  <span>companies/{userProfile?.companyId || 'your-company'}/invoices/</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>👥</span>
                  <span>companies/{userProfile?.companyId || 'your-company'}/customers/</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📦</span>
                  <span>companies/{userProfile?.companyId || 'your-company'}/products/</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🏦</span>
                  <span>companies/{userProfile?.companyId || 'your-company'}/bankAccounts/</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>💸</span>
                  <span>companies/{userProfile?.companyId || 'your-company'}/expenses/</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>companies/{userProfile?.companyId || 'your-company'}/activity/</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🔧 Available Operations:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {canExportBackup && (
                  <div className="flex items-center space-x-2">
                    <span>📤</span>
                    <span>Export all company data as JSON backup</span>
                  </div>
                )}
                {canImportBackup && (
                  <div className="flex items-center space-x-2">
                    <span>📥</span>
                    <span>Import backup data from JSON file</span>
                  </div>
                )}
                {canViewBackupHistory && (
                  <div className="flex items-center space-x-2">
                    <span>📋</span>
                    <span>View backup and import history</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Real-time data monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>Granular permission controls</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-600 text-xl">⚡</span>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Database Migration Available</h4>
            <p className="text-sm text-yellow-700 mt-1">
              The system supports migration to the new hierarchical database structure for better organization and performance. 
              Contact your system administrator if you need to migrate from the old flat structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementPage;
