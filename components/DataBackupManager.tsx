import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { DatabaseMigrationService } from '../services/databaseMigrationService';
import { db } from '../services/firebase';
import type firebase from 'firebase/compat/app';

interface BackupRecord {
  id: string;
  type: 'export' | 'import';
  timestamp: firebase.firestore.Timestamp;
  size: number;
  status: 'success' | 'failed' | 'in_progress';
  filename: string;
  description?: string;
  error?: string;
}

const DataBackupManager: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { canExportBackup, canImportBackup, canViewBackupHistory, isOwner, isAdmin } = usePermissions();
  
  const [loading, setLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const companyId = userProfile?.isOwner ? user?.uid : userProfile?.companyId;

  useEffect(() => {
    if (canViewBackupHistory && companyId) {
      loadBackupHistory();
    }
  }, [canViewBackupHistory, companyId]);

  const loadBackupHistory = async () => {
    try {
      if (!companyId) return;
      
      const snapshot = await db.collection(`companies/${companyId}/backups`)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
      
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BackupRecord[];
      
      setBackupHistory(history);
    } catch (err: any) {
      console.error('Error loading backup history:', err);
    }
  };

  const handleExportBackup = async () => {
    if (!canExportBackup || !companyId) {
      setError('You do not have permission to export backup data');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Export company data
      const companyData = await DatabaseMigrationService.exportCompanyData(companyId);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${userProfile?.companyName?.replace(/[^a-zA-Z0-9]/g, '') || 'company'}-backup-${timestamp}.json`;
      
      // Create and download file
      const blob = new Blob([JSON.stringify(companyData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log backup record
      await db.collection(`companies/${companyId}/backups`).add({
        type: 'export',
        timestamp: firebase.firestore.Timestamp.now(),
        size: blob.size,
        status: 'success',
        filename,
        description: `Data export by ${userProfile?.displayName || userProfile?.email}`
      });

      setSuccess(`Backup exported successfully as ${filename}`);
      loadBackupHistory();

    } catch (err: any) {
      console.error('Export error:', err);
      setError(`Export failed: ${err.message}`);
      
      // Log failed backup record
      if (companyId) {
        await db.collection(`companies/${companyId}/backups`).add({
          type: 'export',
          timestamp: firebase.firestore.Timestamp.now(),
          size: 0,
          status: 'failed',
          filename: 'export-failed',
          error: err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async () => {
    if (!canImportBackup || !companyId || !importFile) {
      setError('You do not have permission to import backup data or no file selected');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Read file content
      const fileContent = await importFile.text();
      const backupData = JSON.parse(fileContent);

      // Validate backup data structure
      if (!backupData.data || !backupData.companyId) {
        throw new Error('Invalid backup file format');
      }

      // Import company data
      await DatabaseMigrationService.importCompanyData(companyId, backupData);

      // Log import record
      await db.collection(`companies/${companyId}/backups`).add({
        type: 'import',
        timestamp: firebase.firestore.Timestamp.now(),
        size: importFile.size,
        status: 'success',
        filename: importFile.name,
        description: `Data import by ${userProfile?.displayName || userProfile?.email}`
      });

      setSuccess(`Backup imported successfully from ${importFile.name}`);
      setShowImportModal(false);
      setImportFile(null);
      loadBackupHistory();

    } catch (err: any) {
      console.error('Import error:', err);
      setError(`Import failed: ${err.message}`);
      
      // Log failed import record
      if (companyId && importFile) {
        await db.collection(`companies/${companyId}/backups`).add({
          type: 'import',
          timestamp: firebase.firestore.Timestamp.now(),
          size: importFile.size,
          status: 'failed',
          filename: importFile.name,
          error: err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    return type === 'export' ? '📤' : '📥';
  };

  // Show access denied if user doesn't have any backup permissions
  if (!canExportBackup && !canImportBackup && !canViewBackupHistory) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You do not have permission to access data backup features.</p>
        <p className="text-sm text-gray-500 mt-2">Contact your administrator to request backup permissions.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Data Backup & Export</h3>
            <p className="text-sm text-gray-600">Manage your company data backups and exports</p>
          </div>
          <div className="flex space-x-3">
            {canExportBackup && (
              <button
                onClick={handleExportBackup}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
              >
                <span>📤</span>
                <span>{loading ? 'Exporting...' : 'Export Backup'}</span>
              </button>
            )}
            {canImportBackup && (
              <button
                onClick={() => setShowImportModal(true)}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
              >
                <span>📥</span>
                <span>Import Backup</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Backup Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">ℹ️ Backup Information</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Exports include: Invoices, Customers, Products, Bank Accounts, Expenses, Activity Logs</p>
            <p>• Backup files are in JSON format and can be imported back into the system</p>
            <p>• Only company admins and owners can perform backup operations</p>
            <p>• Import operations will merge data with existing records</p>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Company</div>
            <div className="font-medium text-gray-900">{userProfile?.companyName || 'Unknown'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Owner</div>
            <div className="font-medium text-gray-900">{userProfile?.displayName || userProfile?.email}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Your Role</div>
            <div className="font-medium text-gray-900">
              {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'User'}
            </div>
          </div>
        </div>

        {/* Backup History */}
        {canViewBackupHistory && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Backup History</h4>
            {backupHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backupHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="flex items-center space-x-2">
                            <span>{getTypeIcon(record.type)}</span>
                            <span className="capitalize">{record.type}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(record.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.timestamp.toDate().toLocaleDateString()} {record.timestamp.toDate().toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.description}
                          {record.error && (
                            <div className="text-red-600 text-xs mt-1">Error: {record.error}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📋</div>
                <p className="text-gray-600">No backup history found</p>
                <p className="text-sm text-gray-500">Export your first backup to see history here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Import Backup</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                    <p className="text-sm text-yellow-700">
                      Importing will merge the backup data with your existing data. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Backup File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {importFile && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {importFile.name} ({formatFileSize(importFile.size)})
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportBackup}
                  disabled={!importFile || loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataBackupManager;
