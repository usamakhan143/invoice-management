import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import {
  BACKUP_EXPORT_TOTAL_STAGES,
  DatabaseMigrationService,
  type BackupExportProgress,
} from "../services/databaseMigrationService";
import { db, Timestamp } from "../services/firebase";
import type firebase from "firebase/compat/app";

interface BackupRecord {
  id: string;
  type: "export" | "import";
  timestamp: firebase.firestore.Timestamp;
  size: number;
  status: "success" | "failed" | "in_progress";
  filename: string;
  description?: string;
  error?: string;
}

const DataBackupManager: React.FC = () => {
  const { user, userProfile } = useAuth();
  const {
    canExportBackup,
    canImportBackup,
    canViewBackupHistory,
    isOwner,
    isAdmin,
  } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [exportRunning, setExportRunning] = useState(false);
  const [exportProgress, setExportProgress] = useState<BackupExportProgress | null>(null);
  const exportProgressRafRef = useRef<number | null>(null);
  const pendingExportProgressRef = useRef<BackupExportProgress | null>(null);

  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const companyId = userProfile?.isOwner ? user?.uid : userProfile?.companyId;

  useEffect(() => {
    if (canViewBackupHistory && companyId) {
      loadBackupHistory();
    }
  }, [canViewBackupHistory, companyId]);

  useEffect(() => {
    return () => {
      if (exportProgressRafRef.current != null) {
        cancelAnimationFrame(exportProgressRafRef.current);
        exportProgressRafRef.current = null;
      }
    };
  }, []);

  const flushExportProgress = useCallback(() => {
    exportProgressRafRef.current = null;
    const p = pendingExportProgressRef.current;
    if (p) setExportProgress({ ...p });
  }, []);

  const queueExportProgress = useCallback(
    (p: BackupExportProgress) => {
      pendingExportProgressRef.current = p;
      if (exportProgressRafRef.current == null) {
        exportProgressRafRef.current = requestAnimationFrame(flushExportProgress);
      }
    },
    [flushExportProgress],
  );

  const loadBackupHistory = async () => {
    try {
      if (!companyId) return;

      const snapshot = await db
        .collection(`companies/${companyId}/backups`)
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();

      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BackupRecord[];

      setBackupHistory(history);
    } catch (err) {
      console.error("Error loading backup history:", err);
    }
  };

  const handleExportBackup = async () => {
    if (!canExportBackup || !companyId) {
      setError("You do not have permission to export backup data");
      return;
    }

    setError("");
    setSuccess("");
    setExportRunning(true);
    setExportProgress({
      completedStages: 0,
      totalStages: BACKUP_EXPORT_TOTAL_STAGES,
      stageLabel: "Starting",
      detail: "Connecting to your data…",
    });

    try {
      const companyData = await DatabaseMigrationService.exportCompanyData(companyId, queueExportProgress);

      queueExportProgress({
        completedStages: BACKUP_EXPORT_TOTAL_STAGES,
        totalStages: BACKUP_EXPORT_TOTAL_STAGES,
        stageLabel: "Creating download",
        detail: "Serializing JSON — your browser will save the file next.",
      });
      flushExportProgress();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${userProfile?.companyName?.replace(/[^a-zA-Z0-9]/g, "") || "company"}-backup-${timestamp}.json`;

      const blob = new Blob([JSON.stringify(companyData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await db.collection(`companies/${companyId}/backups`).add({
        type: "export",
        timestamp: Timestamp.now(),
        size: blob.size,
        status: "success",
        filename,
        description: `Data export by ${userProfile?.displayName || userProfile?.email}`,
      });

      setSuccess(`Backup downloaded as ${filename}`);
      loadBackupHistory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Export error:", err);
      setError(`Export failed: ${message}`);

      if (companyId) {
        await db.collection(`companies/${companyId}/backups`).add({
          type: "export",
          timestamp: Timestamp.now(),
          size: 0,
          status: "failed",
          filename: "export-failed",
          error: message,
        });
      }
    } finally {
      if (exportProgressRafRef.current != null) {
        cancelAnimationFrame(exportProgressRafRef.current);
        exportProgressRafRef.current = null;
      }
      pendingExportProgressRef.current = null;
      setExportRunning(false);
      setExportProgress(null);
    }
  };

  const handleImportBackup = async () => {
    if (!canImportBackup || !companyId || !importFile) {
      setError("Select a valid backup file or check import permission.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const fileContent = await importFile.text();
      const backupData = JSON.parse(fileContent);

      if (!backupData.data || backupData.companyId === undefined || backupData.companyId === null) {
        throw new Error("Invalid backup file: missing data or companyId");
      }
      if (String(backupData.companyId) !== String(companyId)) {
        throw new Error(
          "This backup was created for a different company. You can only import into the same organization.",
        );
      }

      await DatabaseMigrationService.importCompanyData(companyId, backupData);

      await db.collection(`companies/${companyId}/backups`).add({
        type: "import",
        timestamp: Timestamp.now(),
        size: importFile.size,
        status: "success",
        filename: importFile.name,
        description: `Data import by ${userProfile?.displayName || userProfile?.email}`,
      });

      setSuccess(`Imported successfully from ${importFile.name}`);
      setShowImportModal(false);
      setImportFile(null);
      loadBackupHistory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Import error:", err);
      setError(`Import failed: ${message}`);

      if (companyId && importFile) {
        await db.collection(`companies/${companyId}/backups`).add({
          type: "import",
          timestamp: Timestamp.now(),
          size: importFile.size,
          status: "failed",
          filename: importFile.name,
          error: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const statusStyles: Record<string, string> = {
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    in_progress:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  };

  if (!canExportBackup && !canImportBackup && !canViewBackupHistory) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <svg className="h-7 w-7 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-9V5a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No backup access</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Ask an administrator to grant export, import, or backup history permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backups</h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Download a JSON snapshot or restore from a previous export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExportBackup && (
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={exportRunning}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportRunning ? "Exporting…" : "Export backup"}
            </button>
          )}
          {canImportBackup && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              disabled={loading || exportRunning}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import backup
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            role="status"
          >
            {success}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-900/40">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">What&apos;s included</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>
              Full company snapshot (flat Firestore): invoices, customers, products, bank accounts, expenses,
              expense returns, activities, users, team, roles, subscriptions, and company settings where present.
            </li>
            <li>Format v5 JSON — keep files private; import merges documents by ID into this company only.</li>
            <li>Large datasets use paginated export; imports are written in safe batches.</li>
          </ul>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { k: "Company", v: userProfile?.companyName || "—" },
            { k: "Signed in as", v: userProfile?.displayName || userProfile?.email || "—" },
            { k: "Role", v: isOwner ? "Owner" : isAdmin ? "Admin" : "User" },
          ].map((row) => (
            <div
              key={row.k}
              className="rounded-lg border border-gray-100 bg-gray-50/90 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/50"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{row.k}</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{row.v}</p>
            </div>
          ))}
        </div>

        {canViewBackupHistory && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Recent activity</h3>
            {backupHistory.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-900/80">
                      <tr>
                        {["Type", "File", "Size", "Status", "When", "Notes"].map((h) => (
                          <th
                            key={h}
                            scope="col"
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-gray-800">
                      {backupHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium capitalize text-gray-900 dark:text-white">
                            {record.type}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-300" title={record.filename}>
                            {record.filename}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-gray-400">
                            {formatFileSize(record.size)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[record.status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}
                            >
                              {record.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {record.timestamp?.toDate
                              ? `${record.timestamp.toDate().toLocaleDateString()} ${record.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="line-clamp-2">{record.description}</span>
                            {record.error && (
                              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{record.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center dark:border-gray-600 dark:bg-gray-900/30">
                <svg
                  className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">No backup history yet</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Run an export to create the first entry.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {exportRunning && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-backup-title"
          aria-busy="true"
        >
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm dark:bg-black/75" />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-600 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-500" />
              <div className="min-w-0 flex-1">
                <h3 id="export-backup-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Export in progress
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Please keep this tab in focus until the download starts. Switching away can slow the export on some
                  devices.
                </p>
                {exportProgress && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                      <span>
                        {exportProgress.completedStages} / {exportProgress.totalStages} stages finished
                      </span>
                      <span>
                        {Math.min(
                          100,
                          Math.round((exportProgress.completedStages / exportProgress.totalStages) * 100),
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-primary-600 transition-[width] duration-300 ease-out dark:bg-primary-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((exportProgress.completedStages / exportProgress.totalStages) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{exportProgress.stageLabel}</p>
                    {exportProgress.detail && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{exportProgress.detail}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm dark:bg-black/70"
            aria-label="Close dialog"
            onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
            }}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-backup-title"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="import-backup-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Import backup
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Important</p>
                <p className="mt-1 text-sm text-amber-800/95 dark:text-amber-200/85">
                  Import merges data with what you already have. Use only files you exported from this app. This cannot be automatically undone.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">JSON backup file</label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-2 block w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:file:bg-primary-900/40 dark:file:text-primary-200"
                />
                {importFile && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {importFile.name} · {formatFileSize(importFile.size)}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportBackup}
                  disabled={!importFile || loading}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
                >
                  {loading ? "Importing…" : "Import"}
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
