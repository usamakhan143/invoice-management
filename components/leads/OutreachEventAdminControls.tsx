import React, { useEffect, useState } from "react";
import { Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { OutreachService } from "../../services/outreachService";
import type { OutreachEvent, UserProfile } from "../../types";
import type firebase from "firebase/compat/app";

interface OutreachEventAdminControlsProps {
  event: OutreachEvent;
  canApprove: boolean;
  user: firebase.User;
  userProfile: UserProfile;
}

/**
 * Admin-only QA block on outreach events: recording/reference ID + call verification.
 * Only rendered for `channel: "call"` and when `canApprove` is true.
 */
const OutreachEventAdminControls: React.FC<OutreachEventAdminControlsProps> = ({
  event,
  canApprove,
  user,
  userProfile,
}) => {
  const [refDraft, setRefDraft] = useState((event.recordingRef || "").trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRefDraft((event.recordingRef || "").trim());
  }, [event.id, event.recordingRef]);

  if (!canApprove || event.channel !== "call") return null;

  const verified = !!(event.callVerifiedAt && event.callVerifiedAt.toMillis?.() > 0);

  const saveRecordingRef = async () => {
    setSaving(true);
    try {
      await OutreachService.updateAdminFields(event.id, {
        recordingRef: refDraft.trim() || null,
      });
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", "Updated outreach recording reference", {
        entityId: event.leadId,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Could not save recording reference");
    } finally {
      setSaving(false);
    }
  };

  const markVerified = async () => {
    setSaving(true);
    try {
      await OutreachService.updateAdminFields(event.id, {
        callVerifiedAt: Timestamp.now(),
        callVerifiedByUserId: user.uid,
      });
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", "Verified outreach call", {
        entityId: event.leadId,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Could not verify call");
    } finally {
      setSaving(false);
    }
  };

  const clearVerification = async () => {
    if (!window.confirm("Remove verification for this call?")) return;
    setSaving(true);
    try {
      await OutreachService.updateAdminFields(event.id, {
        callVerifiedAt: null,
        callVerifiedByUserId: null,
      });
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", "Removed outreach call verification", {
        entityId: event.leadId,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Could not update verification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/25 px-3 py-2.5 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200/90">
        Admin · recording &amp; verification
      </p>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-end">
        <label className="block flex-1 min-w-[12rem]">
          <span className="text-[11px] text-amber-900/80 dark:text-amber-200/80">Recording / reference ID</span>
          <input
            type="text"
            value={refDraft}
            onChange={(e) => setRefDraft(e.target.value)}
            placeholder="e.g. dialer ID, CRM link, ticket #"
            disabled={saving}
            className="mt-1 w-full rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 text-xs px-2 py-1.5"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveRecordingRef()}
          className="shrink-0 rounded-md bg-amber-700 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50"
        >
          Save reference
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!verified ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void markVerified()}
            className="rounded-md border border-emerald-600 bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Mark call verified
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold">
              Verified
              {event.callVerifiedAt?.toDate
                ? ` · ${event.callVerifiedAt.toDate().toLocaleString()}`
                : ""}
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void clearVerification()}
              className="text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline disabled:opacity-50"
            >
              Undo verification
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OutreachEventAdminControls;
