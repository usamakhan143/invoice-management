import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { ActivityLogger } from "../../services/activityLogger";
import { CampaignService } from "../../services/campaignService";
import type { Campaign, CampaignStatus, CampaignTag } from "../../types";
import Spinner from "../../components/Spinner";
import CampaignTagPill, { CAMPAIGN_TAG_COLOR_OPTIONS } from "../../components/CampaignTagPill";

const FIELD =
  "w-full rounded-lg border text-sm text-gray-900 bg-white border-gray-300 shadow-sm " +
  "placeholder:text-gray-500 dark:text-gray-50 dark:bg-gray-950 dark:border-gray-500 " +
  "dark:placeholder:text-gray-400 dark:[color-scheme:dark] px-3 py-2.5";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  archived: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

// ─── Blank forms ──────────────────────────────────────────────────────────

const BLANK_CAMPAIGN = { name: "", description: "", channelsHint: "", status: "active" as CampaignStatus };
const BLANK_TAG = { label: "", color: "gray", description: "" };

// ─── Component ────────────────────────────────────────────────────────────

const CampaignsPage: React.FC = () => {
  usePageTitle("Campaigns");
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { canViewCampaigns, canManageCampaigns, isOwner } = usePermissions();

  const companyId = userProfile?.isOwner ? user?.uid : userProfile?.companyId;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Campaign modal
  const [campaignModal, setCampaignModal] = useState<"create" | "edit" | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState(BLANK_CAMPAIGN);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignError, setCampaignError] = useState("");

  // Tags panel
  const [tagsCampaignId, setTagsCampaignId] = useState<string | null>(null);
  const [tags, setTags] = useState<CampaignTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagForm, setTagForm] = useState(BLANK_TAG);
  const [tagSaving, setTagSaving] = useState(false);
  const [editingTag, setEditingTag] = useState<CampaignTag | null>(null);

  const tagsUnsubRef = useRef<(() => void) | null>(null);

  // Guard
  useEffect(() => {
    if (!user || !userProfile) return;
    if (!canViewCampaigns()) navigate("/");
  }, [user, userProfile]);

  // Subscribe to campaigns
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const unsub = CampaignService.subscribe(companyId, (rows) => {
      setCampaigns(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  // Subscribe to tags when a campaign is expanded
  const openTags = useCallback((campaignId: string) => {
    if (tagsUnsubRef.current) tagsUnsubRef.current();
    setTagsCampaignId(campaignId);
    setTags([]);
    setTagsLoading(true);
    setTagForm(BLANK_TAG);
    setEditingTag(null);
    tagsUnsubRef.current = CampaignService.subscribeTags(campaignId, (rows) => {
      setTags(rows);
      setTagsLoading(false);
    });
  }, []);

  const closeTags = () => {
    if (tagsUnsubRef.current) tagsUnsubRef.current();
    tagsUnsubRef.current = null;
    setTagsCampaignId(null);
    setTags([]);
    setTagForm(BLANK_TAG);
    setEditingTag(null);
  };

  useEffect(() => () => { if (tagsUnsubRef.current) tagsUnsubRef.current(); }, []);

  // ── Campaign CRUD ─────────────────────────────────────────────────────────

  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm(BLANK_CAMPAIGN);
    setCampaignError("");
    setCampaignModal("create");
  };

  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c);
    setCampaignForm({
      name: c.name,
      description: c.description ?? "",
      channelsHint: c.channelsHint ?? "",
      status: c.status,
    });
    setCampaignError("");
    setCampaignModal("edit");
  };

  const closeCampaignModal = () => {
    setCampaignModal(null);
    setEditingCampaign(null);
    setCampaignError("");
  };

  const handleSaveCampaign = async () => {
    if (!user || !userProfile || !companyId) return;
    if (!campaignForm.name.trim()) { setCampaignError("Campaign name is required."); return; }
    setCampaignSaving(true);
    setCampaignError("");
    try {
      if (campaignModal === "create") {
        await CampaignService.create(companyId, {
          name: campaignForm.name,
          description: campaignForm.description,
          channelsHint: campaignForm.channelsHint,
        }, user.uid);
        await ActivityLogger.logActivity(user, userProfile, "campaign_created", `Created campaign: ${campaignForm.name}`, {});
      } else if (editingCampaign) {
        await CampaignService.update(editingCampaign.id, {
          name: campaignForm.name,
          description: campaignForm.description,
          channelsHint: campaignForm.channelsHint,
          status: campaignForm.status,
        });
        await ActivityLogger.logActivity(user, userProfile, "campaign_updated", `Updated campaign: ${campaignForm.name}`, { entityId: editingCampaign.id });
      }
      closeCampaignModal();
    } catch (e) {
      console.error(e);
      setCampaignError("Save failed. Please try again.");
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDeleteCampaign = async (c: Campaign) => {
    if (!user || !userProfile) return;
    if (!window.confirm(`Delete campaign "${c.name}" and all its tags? Leads assigned to it won't be deleted — their campaign link will simply become stale.`)) return;
    try {
      if (tagsCampaignId === c.id) closeTags();
      await CampaignService.delete(c.id);
      await ActivityLogger.logActivity(user, userProfile, "campaign_deleted", `Deleted campaign: ${c.name}`, { entityId: c.id });
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // ── Tag CRUD ──────────────────────────────────────────────────────────────

  const handleSaveTag = async () => {
    if (!user || !userProfile || !companyId || !tagsCampaignId) return;
    if (!tagForm.label.trim()) return;
    setTagSaving(true);
    try {
      if (editingTag) {
        await CampaignService.updateTag(editingTag.id, {
          label: tagForm.label,
          color: tagForm.color,
          description: tagForm.description,
        });
      } else {
        await CampaignService.createTag({
          companyId,
          campaignId: tagsCampaignId,
          label: tagForm.label,
          color: tagForm.color,
          description: tagForm.description,
          sortOrder: Date.now(),
        });
      }
      setTagForm(BLANK_TAG);
      setEditingTag(null);
    } catch (e) {
      console.error(e);
      alert("Save failed.");
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteTag = async (tag: CampaignTag) => {
    if (!window.confirm(`Delete tag "${tag.label}"?`)) return;
    try {
      await CampaignService.deleteTag(tag.id);
      if (editingTag?.id === tag.id) { setEditingTag(null); setTagForm(BLANK_TAG); }
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  const startEditTag = (tag: CampaignTag) => {
    setEditingTag(tag);
    setTagForm({ label: tag.label, color: tag.color ?? "gray", description: tag.description ?? "" });
  };

  const cancelEditTag = () => { setEditingTag(null); setTagForm(BLANK_TAG); };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!user || !userProfile) return null;

  const canManage = canManageCampaigns();
  const tagsCampaign = campaigns.find((c) => c.id === tagsCampaignId) ?? null;

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Named initiatives your team runs. Assign leads to campaigns for segmentation and reporting.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateCampaign}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New campaign
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No campaigns yet</p>
          {canManage && (
            <button type="button" onClick={openCreateCampaign} className="mt-3 text-sm text-primary-600 hover:underline dark:text-primary-400">
              Create your first campaign →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border bg-white dark:bg-gray-800 shadow-sm overflow-visible transition-all ${
                c.status === "archived" ? "opacity-60" : ""
              }`}
            >
              {/* Campaign row */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{c.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  {(c.description || c.channelsHint) ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {c.description}{c.description && c.channelsHint ? " · " : ""}{c.channelsHint}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => tagsCampaignId === c.id ? closeTags() : openTags(c.id)}
                    className="text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {tagsCampaignId === c.id ? "Close tags" : `Tags${tags.length > 0 && tagsCampaignId === c.id ? ` (${tags.length})` : ""}`}
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditCampaign(c)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(c)}
                        className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 px-2 py-1"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tags panel — inline below campaign row */}
              {tagsCampaignId === c.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                    Tags — {c.name}
                  </p>

                  {tagsLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                  ) : (
                    <>
                      {/* Tag list */}
                      {tags.length > 0 ? (
                        <ul className="flex flex-wrap gap-2 mb-4">
                          {tags.map((tag) => (
                            <li key={tag.id} className="flex items-center gap-1.5">
                              <CampaignTagPill label={tag.label} description={tag.description} color={tag.color} />
                              {canManage && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditTag(tag)}
                                    className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTag(tag)}
                                    className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400"
                                  >
                                    Del
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">No tags yet. Add the first one below.</p>
                      )}

                      {/* Tag create/edit form */}
                      {canManage && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 space-y-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {editingTag ? `Editing: ${editingTag.label}` : "Add a tag"}
                          </p>
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Label *</label>
                              <input
                                type="text"
                                value={tagForm.label}
                                onChange={(e) => setTagForm((f) => ({ ...f, label: e.target.value }))}
                                placeholder="e.g. Hot lead"
                                className={FIELD}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Color</label>
                              <select
                                value={tagForm.color}
                                onChange={(e) => setTagForm((f) => ({ ...f, color: e.target.value }))}
                                className={FIELD + " w-auto"}
                              >
                                {CAMPAIGN_TAG_COLOR_OPTIONS.map((c) => (
                                  <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={tagSaving || !tagForm.label.trim()}
                                onClick={() => void handleSaveTag()}
                                className="rounded-lg bg-primary-600 text-white px-3 py-2 text-xs font-medium hover:bg-primary-700 disabled:opacity-50"
                              >
                                {tagSaving ? "Saving…" : editingTag ? "Update" : "Add tag"}
                              </button>
                              {editingTag && (
                                <button
                                  type="button"
                                  onClick={cancelEditTag}
                                  className="rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                              Team explanation
                              <span className="font-normal text-gray-400 dark:text-gray-500"> — shown on hover everywhere this tag appears</span>
                            </label>
                            <textarea
                              value={tagForm.description}
                              onChange={(e) => setTagForm((f) => ({ ...f, description: e.target.value }))}
                              placeholder='e.g. "Interested but budget next quarter" — so everyone knows when to use this tag'
                              rows={2}
                              className={FIELD + " min-h-[4rem] py-2"}
                            />
                          </div>
                          {tagForm.label.trim() && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 flex flex-wrap items-center gap-2">
                              <span>Preview (hover for tooltip):</span>
                              <CampaignTagPill label={tagForm.label.trim()} description={tagForm.description} color={tagForm.color} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Campaign create / edit modal */}
      {campaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {campaignModal === "create" ? "New campaign" : "Edit campaign"}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {campaignError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                  {campaignError}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Q3 Outbound"
                  className={FIELD}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description for your team"
                  className={FIELD}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Channels hint
                  <span className="ml-1 text-xs font-normal text-gray-400">(informational)</span>
                </label>
                <input
                  type="text"
                  value={campaignForm.channelsHint}
                  onChange={(e) => setCampaignForm((f) => ({ ...f, channelsHint: e.target.value }))}
                  placeholder="e.g. Cold call + WhatsApp follow-up"
                  className={FIELD}
                />
              </div>
              {campaignModal === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={campaignForm.status}
                    onChange={(e) => setCampaignForm((f) => ({ ...f, status: e.target.value as CampaignStatus }))}
                    className={FIELD}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCampaignModal}
                className="rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={campaignSaving}
                onClick={() => void handleSaveCampaign()}
                className="rounded-lg bg-primary-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {campaignSaving ? "Saving…" : campaignModal === "create" ? "Create campaign" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
