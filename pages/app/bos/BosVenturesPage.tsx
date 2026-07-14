import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../../../hooks/usePageTitle";
import { usePermissions } from "../../../hooks/usePermissions";
import { useBosScope } from "../../../hooks/useBosScope";
import { useAuth } from "../../../hooks/useAuth";
import { useCompanyUserOptions } from "../../../hooks/useCompanyUserOptions";
import { bosVentureApplicationService } from "../../../bos/application/BosVentureApplicationService";
import type { BosVenture } from "../../../bos/domain/entities/venture";
import { VENTURE_STATUS_LABELS } from "../../../bos/constants/ventureStatus";
import Spinner from "../../../components/Spinner";
import { BOS_FIELD_CLASS } from "../../../utils/bosFormat";
import BosAccessDenied from "./BosAccessDenied";
import BosFormFieldLabel from "./BosFormFieldLabel";

const BosVenturesPage: React.FC = () => {
  usePageTitle("BOS Ventures");
  const { user, userProfile } = useAuth();
  const userOptions = useCompanyUserOptions(user, userProfile);
  const { canViewBosVentures, canManageBosVentures } = usePermissions();
  const { readScope, actorScope, isReady } = useBosScope();
  const canViewVentures = canViewBosVentures();
  const canManageVentures = canManageBosVentures();
  const [ventures, setVentures] = useState<BosVenture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const ownerLabelByUid = useMemo(
    () => new Map(userOptions.map((option) => [option.uid, option.label])),
    [userOptions],
  );

  const resolveOwnerLabel = (ownerUserId: string): string => {
    const label = ownerLabelByUid.get(ownerUserId);
    if (label) return label;
    if (actorScope?.actorUserId === ownerUserId) {
      return userProfile?.displayName || userProfile?.email || "You";
    }
    return "Team member";
  };

  const loadVentures = useCallback(async () => {
    if (!readScope) return;
    setLoading(true);
    setError(null);
    try {
      const result = await bosVentureApplicationService.listVentures(readScope, { limit: 100 });
      setVentures(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ventures");
    } finally {
      setLoading(false);
    }
  }, [readScope]);

  useEffect(() => {
    if (isReady && canViewVentures && readScope) {
      void loadVentures();
    }
  }, [isReady, canViewVentures, readScope, loadVentures]);

  if (!canViewVentures) {
    return <BosAccessDenied />;
  }

  if (!isReady || !readScope) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actorScope || !canManageVentures) return;
    if (!name.trim()) {
      setError("Venture name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await bosVentureApplicationService.createVenture(actorScope, {
        name: name.trim(),
        description: description.trim() || undefined,
        ownerUserId: actorScope.actorUserId,
      });
      setName("");
      setDescription("");
      setShowForm(false);
      await loadVentures();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create venture");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ventures</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Strategic business units in your portfolio.
          </p>
        </div>
        {canManageVentures ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showForm ? "Cancel" : "New venture"}
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {showForm && canManageVentures ? (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create venture</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            You will be recorded as the venture owner automatically.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="block sm:col-span-2">
              <BosFormFieldLabel
                htmlFor="bos-venture-name"
                label="Venture name"
                tip="A distinct business line in your portfolio — not a single client or project. Example: Mobile App Development Agency"
              />
              <input
                id="bos-venture-name"
                className={BOS_FIELD_CLASS}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile App Development Agency"
                required
              />
            </div>
            <div className="block sm:col-span-2">
              <BosFormFieldLabel
                htmlFor="bos-venture-description"
                label="Description"
                tip="What this venture sells and who it serves. Example: Custom iOS/Android apps for US mid-market retailers."
              />
              <textarea
                id="bos-venture-description"
                className={BOS_FIELD_CLASS}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Custom mobile apps for retail brands in North America"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create venture"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : ventures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600 dark:border-gray-600 dark:text-gray-300">
          No ventures yet. Create one to start tracking strategic initiatives.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Owner
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {ventures.map((venture) => (
                <tr key={venture.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {venture.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {VENTURE_STATUS_LABELS[venture.status] ?? venture.status}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {resolveOwnerLabel(venture.ownerUserId)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/bos/initiatives" className="text-primary-600 hover:underline">
          Go to initiatives →
        </Link>
      </p>
    </div>
  );
};

export default BosVenturesPage;
