import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type firebase from "firebase/compat/app";
import { Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { LeadService } from "../../services/leadService";
import { OutreachService } from "../../services/outreachService";
import type { Lead, LeadCallOutcome, LeadExtras, LeadStatus, OutreachEvent, UserProfile } from "../../types";
import { formatPhoneForDisplay, getIsoFromLeadCountryName } from "../../utils/internationalPhone";
import OutreachEventAdminControls from "./OutreachEventAdminControls";

const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
];

const CALL_OUTCOMES: LeadCallOutcome[] = [
  "No Answer",
  "Busy",
  "Connected",
  "Wrong Number",
  "Hangup",
  "Voicemail",
];

const WS_LS_LAST_OUTCOME = "workspace_pref_call_outcome";

function calendarDayAtLocal(daysFromToday: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function toDatetimeLocalValueFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(ts: firebase.firestore.Timestamp | null | undefined): string {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): firebase.firestore.Timestamp | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function minDatetimeLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T00:00`;
}

/** Returns https URL for opening in a new tab, or null if not linkable. */
function safeExternalUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let candidate = t;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function socialWebRows(ex: LeadExtras | undefined): { label: string; raw: string }[] {
  if (!ex) return [];
  const rows: { label: string; raw: string }[] = [
    ["Website", ex.website],
    ["Facebook", ex.facebookUrl],
    ["Instagram", ex.instagramUrl],
    ["LinkedIn", ex.linkedinUrl],
    ["X (Twitter)", ex.twitterUrl],
    ["TikTok", ex.tiktokUrl],
  ]
    .map(([label, raw]) => ({ label, raw: (raw || "").trim() }))
    .filter((r) => r.raw.length > 0);
  return rows;
}

/** Native form controls need explicit fg/bg; otherwise text blends into modal surfaces in dark mode */
const FIELD_BASE =
  "w-full rounded-lg border text-sm text-gray-900 bg-white border-gray-300 shadow-sm " +
  "placeholder:text-gray-500 " +
  "dark:text-gray-50 dark:bg-gray-950 dark:border-gray-500 dark:placeholder:text-gray-400 " +
  "dark:[color-scheme:dark]";

const FIELD_SELECT = `mt-1.5 ${FIELD_BASE} px-3 py-2.5`;
const FIELD_TEXTAREA = `mt-1.5 ${FIELD_BASE} px-3 py-2 min-h-[5rem]`;
const FIELD_DATETIME = `mt-1.5 ${FIELD_BASE} px-3 py-2.5`;

const OPT = "bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50";

function CopyDoneHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="workspace-copy-hint inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-900/55 dark:text-emerald-100 text-[11px] font-semibold px-2 py-0.5 shadow-sm ring-1 ring-emerald-200/80 dark:ring-emerald-700/60"
      role="status"
      aria-live="polite"
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Copied
    </span>
  );
}

export type AgentWorkspaceModalMode = "details" | "status" | "call" | "followup" | null;

interface AgentWorkspaceModalsProps {
  lead: Lead | null;
  mode: AgentWorkspaceModalMode;
  onClose: () => void;
  user: firebase.User;
  userProfile: UserProfile;
  canUpdateStatus: boolean;
  canLogCall: boolean;
  canDeleteCallLog: boolean;
  canApproveCallLog: boolean;
  canSetFollowup: boolean;
  /** Show “conversion & billing” CTA after marking Won */
  canAccessLeadConversionHub: boolean;
  /** My workspace: refresh open-lead “call logged” split after timeline changes */
  onOutreachTimelineChanged?: () => void;
  /** Current workspace table order; enables Save & next without hunting the list */
  workspaceCallQueueIds?: string[];
  /**
   * After a successful call log. Parent may open the next lead, show a pipeline hint, or close the modal
   * when Save & next reaches the end of the queue.
   */
  onWorkspaceCallSaveFinish?: (info: {
    andNext: boolean;
    nextLeadId: string | null;
    savedLeadId: string;
    offerMarkContacted: boolean;
  }) => void;
}

function statusBadgeClasses(status: LeadStatus): string {
  switch (status) {
    case "Won":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "Lost":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    case "New":
      return "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100";
    default:
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100";
  }
}

const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const detailRow = "flex flex-col sm:flex-row sm:gap-3 py-2 border-b border-gray-100 dark:border-gray-700/80 last:border-0";
const detailLabel = "text-xs text-gray-500 dark:text-gray-400 sm:w-36 shrink-0";
const detailValue = "text-sm text-gray-900 dark:text-white break-words min-w-0";

const AgentWorkspaceModals: React.FC<AgentWorkspaceModalsProps> = ({
  lead,
  mode,
  onClose,
  user,
  userProfile,
  canUpdateStatus,
  canLogCall,
  canDeleteCallLog,
  canApproveCallLog,
  canSetFollowup,
  canAccessLeadConversionHub,
  onOutreachTimelineChanged,
  workspaceCallQueueIds,
  onWorkspaceCallSaveFinish,
}) => {
  const navigate = useNavigate();
  const [statusChoice, setStatusChoice] = useState<LeadStatus>("New");
  const [statusSaving, setStatusSaving] = useState(false);
  const [pipelineOutcome, setPipelineOutcome] = useState<null | "won" | "lost">(null);

  const [callOutcome, setCallOutcome] = useState<LeadCallOutcome>("Connected");
  const [callNotes, setCallNotes] = useState("");
  const [callFollowUp, setCallFollowUp] = useState("");
  const [callFuAdvancedOpen, setCallFuAdvancedOpen] = useState(false);
  const [callSaving, setCallSaving] = useState(false);
  const [outreachEvents, setOutreachEvents] = useState<OutreachEvent[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);

  const [followField, setFollowField] = useState("");
  const [followSaving, setFollowSaving] = useState(false);

  const [copyFlash, setCopyFlash] = useState<null | "email" | "phone">(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadHasPhone = Boolean((lead?.phone || "").trim());

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const saveCallActionRef = useRef<(andNext: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (
        mode === "call" &&
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        if (t.tagName === "TEXTAREA") return;
        if (t.tagName === "SELECT") return;
        if (t.tagName === "INPUT" && (t as HTMLInputElement).type === "datetime-local") return;
        if (t.tagName === "BUTTON") return;
        if (!leadHasPhone) return;
        e.preventDefault();
        void saveCallActionRef.current(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, onClose, leadHasPhone]);

  useEffect(() => {
    if (!lead) return;
    setStatusChoice(lead.status);
    setFollowField(toDatetimeLocalValue(lead.nextFollowUpDate as firebase.firestore.Timestamp | null | undefined));
  }, [lead?.id, lead?.status, lead?.nextFollowUpDate, mode]);

  useEffect(() => {
    setPipelineOutcome(null);
  }, [lead?.id, mode]);

  useEffect(() => {
    if (mode !== "call" || !lead?.id) return;
    setCallNotes("");
    setCallFollowUp("");
    setCallFuAdvancedOpen(false);
    try {
      const raw = localStorage.getItem(WS_LS_LAST_OUTCOME);
      if (raw && (CALL_OUTCOMES as readonly string[]).includes(raw)) {
        setCallOutcome(raw as LeadCallOutcome);
      } else {
        setCallOutcome("Connected");
      }
    } catch {
      setCallOutcome("Connected");
    }
  }, [mode, lead?.id]);

  useEffect(() => {
    setCopyFlash(null);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, [lead?.id, mode]);

  const refreshOutreachTimeline = useCallback(async () => {
    if (!lead?.id || !lead?.companyId) {
      setOutreachEvents([]);
      setOutreachLoading(false);
      return;
    }
    setOutreachLoading(true);
    try {
      const rows = await OutreachService.fetchEventsByLead(lead.companyId, lead.id, { maxDocs: 60 });
      setOutreachEvents(rows);
    } catch (e) {
      console.error("[AgentWorkspaceModals] fetch outreach timeline:", e);
      setOutreachEvents([]);
    } finally {
      setOutreachLoading(false);
    }
  }, [lead?.id, lead?.companyId]);

  useEffect(() => {
    if (mode !== "call" || !lead?.id || !lead?.companyId) {
      setOutreachEvents([]);
      setOutreachLoading(false);
      return;
    }
    void refreshOutreachTimeline();
  }, [mode, lead?.id, lead?.companyId, refreshOutreachTimeline]);

  const phoneIso = lead ? getIsoFromLeadCountryName((lead.country || "").trim()) : "US";

  const handleSaveStatus = async () => {
    if (!lead || !canUpdateStatus) return;
    setStatusSaving(true);
    try {
      await LeadService.updateLeadFields(lead.id, { status: statusChoice });
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", `Status → ${statusChoice}`, {
        entityId: lead.id,
        entityType: "lead",
      });
      if (statusChoice === "Won") {
        setPipelineOutcome("won");
      } else if (statusChoice === "Lost") {
        setPipelineOutcome("lost");
      } else {
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Could not update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const saveCall = useCallback(
    async (andNext: boolean) => {
      if (!lead || !canLogCall) return;
      if (!(lead.phone || "").trim()) {
        alert("Cannot log a call because this lead has no phone number.");
        return;
      }
      let followTs: firebase.firestore.Timestamp | null = null;
      if (callFollowUp.trim()) {
        const parsed = fromDatetimeLocalValue(callFollowUp);
        if (!parsed) {
          alert("Enter a valid follow-up date and time, or clear presets / custom time.");
          return;
        }
        if (parsed.toDate() < startOfTodayLocal()) {
          alert("Follow-up cannot be before today.");
          return;
        }
        followTs = parsed;
      }
      setCallSaving(true);
      try {
        const displayName =
          userProfile?.displayName || userProfile?.companyName || user.email || "User";
        await OutreachService.addEvent({
          companyId: lead.companyId,
          leadId: lead.id,
          channel: "call",
          notes: callNotes,
          outcome: callOutcome,
          nextFollowUpDate: followTs,
          createdByUserId: user.uid,
          createdByDisplayName: displayName,
          campaignId: lead.campaignId ?? null,
          campaignTagIds: lead.campaignTagIds ?? [],
        });
        await ActivityLogger.logActivity(user, userProfile, "lead_outreach_logged", "Call logged (workspace)", {
          entityId: lead.id,
          entityType: "lead",
        });
        onOutreachTimelineChanged?.();
        try {
          localStorage.setItem(WS_LS_LAST_OUTCOME, callOutcome);
        } catch {
          /* ignore */
        }

        const ids = workspaceCallQueueIds;
        let nextLeadId: string | null = null;
        if (andNext && ids && ids.length > 0) {
          const ix = ids.indexOf(lead.id);
          if (ix >= 0 && ix < ids.length - 1) nextLeadId = ids[ix + 1];
        }

        onWorkspaceCallSaveFinish?.({
          andNext,
          nextLeadId,
          savedLeadId: lead.id,
          offerMarkContacted: Boolean(
            canUpdateStatus && callOutcome === "Connected" && lead.status === "New",
          ),
        });

        setCallNotes("");
        setCallFollowUp("");
        void refreshOutreachTimeline();

        if (andNext && nextLeadId === null) {
          onClose();
        }
      } catch (e) {
        console.error(e);
        alert("Could not save call log");
      } finally {
        setCallSaving(false);
      }
    },
    [
      lead,
      canLogCall,
      callFollowUp,
      callNotes,
      callOutcome,
      user,
      userProfile,
      canUpdateStatus,
      workspaceCallQueueIds,
      onWorkspaceCallSaveFinish,
      onOutreachTimelineChanged,
      refreshOutreachTimeline,
      onClose,
    ],
  );

  useEffect(() => {
    saveCallActionRef.current = (andNext: boolean) => saveCall(andNext);
  }, [saveCall]);

  const handleDeleteEvent = async (eventId: string) => {
    if (!lead || !canDeleteCallLog) return;
    if (!window.confirm("Delete this outreach event?")) return;
    try {
      await OutreachService.deleteEvent(eventId);
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", "Deleted outreach event", {
        entityId: lead.id,
        entityType: "lead",
      });
      onOutreachTimelineChanged?.();
      void refreshOutreachTimeline();
    } catch (e) {
      console.error(e);
      alert("Could not delete outreach event");
    }
  };

  const handleSaveFollowup = async (clear: boolean) => {
    if (!lead || !canSetFollowup) return;
    setFollowSaving(true);
    try {
      const next = clear ? null : fromDatetimeLocalValue(followField);
      if (!clear && followField.trim() && !next) {
        alert("Enter a valid date and time.");
        setFollowSaving(false);
        return;
      }
      if (!clear && next && next.toDate() < startOfTodayLocal()) {
        alert("Follow-up cannot be before today.");
        setFollowSaving(false);
        return;
      }
      await LeadService.updateLeadFields(lead.id, { nextFollowUpDate: next });
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "lead_updated",
        clear ? "Cleared follow-up" : "Updated follow-up",
        { entityId: lead.id, entityType: "lead" },
      );
      onClose();
    } catch (e) {
      console.error(e);
      alert("Could not update follow-up");
    } finally {
      setFollowSaving(false);
    }
  };

  const copyWithFeedback = useCallback(async (text: string, field: "email" | "phone") => {
    const t = text.trim();
    if (!t) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(t);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopyFlash(field);
    copyTimerRef.current = setTimeout(() => {
      setCopyFlash(null);
      copyTimerRef.current = null;
    }, 2200);
  }, []);

  if (!mode || !lead) return null;

  const title =
    mode === "details"
      ? "Lead details"
      : mode === "status"
        ? "Update status"
        : mode === "call"
          ? "Log call"
          : "Next follow-up";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 ${
          mode === "details" ? "sm:max-w-2xl" : mode === "call" ? "sm:max-w-xl" : "sm:max-w-lg"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="min-w-0">
            <h2 id="agent-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h2>
            {mode === "call" ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug max-w-xl">
                <strong>Call result</strong> records this dial only. <strong>Deal stage</strong> (pipeline) is updated
                separately under Status.
                {workspaceCallQueueIds && workspaceCallQueueIds.length > 0 ? (
                  <>
                    {" "}
                    <span className="whitespace-nowrap">
                      Tip: <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[10px] font-sans bg-gray-100 dark:bg-gray-800">Enter</kbd>{" "}
                      = Save &amp; next lead.
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {(lead.name || "").trim() || (lead.company || "").trim() || "Lead"}
              {(lead.company || "").trim() && (lead.name || "").trim() ? ` · ${(lead.company || "").trim()}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {mode === "details" && (
            <div className="space-y-5">
              <div>
                <p className={sectionTitle}>Pipeline</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses(lead.status)}`}
                  >
                    {lead.status}
                  </span>
                  {lead.nextFollowUpDate?.toDate ? (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Follow-up: {lead.nextFollowUpDate.toDate().toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No follow-up scheduled</span>
                  )}
                </div>
              </div>

              <div>
                <p className={sectionTitle}>Contact</p>
                <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/40 divide-y divide-gray-100 dark:divide-gray-700/80">
                  {(lead.email || "").trim() ? (
                    <div className={detailRow + " px-3"}>
                      <span className={detailLabel}>Email</span>
                      <div className={`${detailValue} flex items-center gap-2 flex-wrap`}>
                        <a href={`mailto:${lead.email}`} className="text-primary-600 hover:underline dark:text-primary-400">
                          {(lead.email || "").trim()}
                        </a>
                        <button
                          type="button"
                          onClick={() => void copyWithFeedback(lead.email || "", "email")}
                          className="text-xs font-medium text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          Copy
                        </button>
                        <CopyDoneHint show={copyFlash === "email"} />
                      </div>
                    </div>
                  ) : null}
                  {(lead.phone || "").trim() ? (
                    <div className={detailRow + " px-3"}>
                      <span className={detailLabel}>Phone</span>
                      <div className={`${detailValue} flex items-center gap-2 flex-wrap`}>
                        <a
                          href={`tel:${(lead.phone || "").replace(/\s/g, "")}`}
                          className="text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {formatPhoneForDisplay(lead.phone || "", phoneIso)}
                        </a>
                        <button
                          type="button"
                          onClick={() => void copyWithFeedback(lead.phone || "", "phone")}
                          className="text-xs font-medium text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          Copy
                        </button>
                        <CopyDoneHint show={copyFlash === "phone"} />
                      </div>
                    </div>
                  ) : null}
                  {!(lead.email || "").trim() && !(lead.phone || "").trim() ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-3">No email or phone on file.</p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className={sectionTitle}>Company &amp; lead info</p>
                <dl className="mt-2 rounded-xl border border-gray-100 dark:border-gray-700/80 divide-y divide-gray-100 dark:divide-gray-700/80">
                  {[
                    ["Country / location", (lead.country || "").trim() || "-"],
                    ["Category", (lead.category || "").trim() || "-"],
                    ["Source", (lead.source || "").trim() || "-"],
                    [
                      "Target sales preference",
                      (lead.targetSalesGender || "").trim() || "-",
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className={detailRow + " px-3"}>
                      <dt className={detailLabel}>{k}</dt>
                      <dd className={detailValue}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {socialWebRows(lead.extras).length > 0 ? (
                <div>
                  <p className={sectionTitle}>Social &amp; web</p>
                  <dl className="mt-2 rounded-xl border border-gray-100 dark:border-gray-700/80 divide-y divide-gray-100 dark:divide-gray-700/80">
                    {socialWebRows(lead.extras).map(({ label, raw }) => {
                      const href = safeExternalUrl(raw) ?? (raw.startsWith("http") ? raw : null);
                      return (
                        <div key={label} className={detailRow + " px-3"}>
                          <dt className={detailLabel}>{label}</dt>
                          <dd className={`${detailValue} break-all`}>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline dark:text-primary-400"
                              >
                                {raw}
                              </a>
                            ) : (
                              <span>{raw}</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ) : null}

              {(lead.extras?.socialMedia || "").trim() ? (
                <div>
                  <p className={sectionTitle}>Other social / profile</p>
                  {(() => {
                    const raw = (lead.extras!.socialMedia || "").trim();
                    const href = safeExternalUrl(raw);
                    return href ? (
                      <p className="mt-2 text-sm">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline break-all dark:text-primary-400"
                        >
                          {raw}
                        </a>
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 p-3">
                        {raw}
                      </p>
                    );
                  })()}
                </div>
              ) : null}

              {lead.extras?.hasWhatsapp ? (
                <div>
                  <p className={sectionTitle}>WhatsApp</p>
                  <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/40 px-3 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {lead.extras?.whatsappSameAsPhone ? (
                      <>
                        <p>Same number as main phone.</p>
                        {(lead.phone || "").trim() ? (
                          <a
                            href={`https://wa.me/${digitsOnly(lead.phone || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block font-medium text-primary-600 hover:underline dark:text-primary-400"
                          >
                            Open in WhatsApp (new tab)
                          </a>
                        ) : null}
                      </>
                    ) : (lead.extras?.whatsappPhone || "").trim() ? (
                      <>
                        <p className="break-all">{(lead.extras!.whatsappPhone || "").trim()}</p>
                        <a
                          href={`https://wa.me/${digitsOnly(lead.extras!.whatsappPhone || "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                          Open in WhatsApp (new tab)
                        </a>
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">WhatsApp enabled; no separate number saved.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {(lead.extras?.address || "").trim() ? (
                <div>
                  <p className={sectionTitle}>Address</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 p-3">
                    {(lead.extras!.address || "").trim()}
                  </p>
                </div>
              ) : null}

              {(lead.notes || "").trim() ? (
                <div>
                  <p className={sectionTitle}>Notes</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30 p-3">
                    {(lead.notes || "").trim()}
                  </p>
                </div>
              ) : null}

              {(lead.extras?.extraNotes || "").trim() ? (
                <div>
                  <p className={sectionTitle}>Extra notes</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3">
                    {(lead.extras!.extraNotes || "").trim()}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {mode === "status" && canUpdateStatus && pipelineOutcome === "won" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/90 dark:bg-emerald-950/35 px-4 py-4">
                <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100">Deal marked as Won</p>
                <p className="text-sm text-emerald-900/85 dark:text-emerald-200/90 mt-2 leading-relaxed">
                  Great work. When you&apos;re ready, add this contact to your customer list and start an invoice. Everything
                  is guided on the lead&apos;s <strong>Conversion &amp; billing</strong> tab.
                </p>
                {canAccessLeadConversionHub ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/leads/${lead.id}?tab=conversion`);
                      setPipelineOutcome(null);
                      onClose();
                    }}
                    className="mt-4 w-full sm:w-auto rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    Open conversion &amp; billing
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    Open the full lead page from the list when you need customer or invoice steps.
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === "status" && canUpdateStatus && pipelineOutcome === "lost" && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 px-4 py-4">
              <p className="text-base font-semibold text-gray-900 dark:text-white">Lead closed as Lost</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                The record stays in your history for reporting. No customer or invoice workflow applies to this outcome.
              </p>
            </div>
          )}

          {mode === "status" && canUpdateStatus && !pipelineOutcome && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Deal stage (pipeline)</span>
                <select
                  value={statusChoice}
                  onChange={(e) => setStatusChoice(e.target.value as LeadStatus)}
                  className={FIELD_SELECT}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s} className={OPT}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                This is the lead&apos;s position in your funnel (New → Won/Lost). It is separate from each call&apos;s
                dial result in <strong>Log call</strong>. Choose <strong>Won</strong> when the sale is confirmed;
                choose <strong>Lost</strong> when the opportunity is closed without a sale.
              </p>
            </div>
          )}

          {mode === "status" && !canUpdateStatus && (
            <p className="text-sm text-gray-600 dark:text-gray-400">You don&apos;t have permission to change status.</p>
          )}

          {mode === "call" && canLogCall && !leadHasPhone && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
              This lead has no phone number, so a call log cannot be recorded. Add a phone number first, or use
              Details to copy any available contact information.
            </div>
          )}

          {mode === "call" && canLogCall && leadHasPhone && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Call result (this dial)</span>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value as LeadCallOutcome)}
                    className={FIELD_SELECT}
                  >
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o} value={o} className={OPT}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">
                    What happened on the line for this attempt only (no answer, connected, etc.).
                  </p>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</span>
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    rows={2}
                    placeholder="Short pitch, objection, or next step (skip if you are rushing)"
                    className={FIELD_TEXTAREA}
                  />
                </label>
                {canSetFollowup ? (
                  <div className="sm:col-span-2 space-y-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Follow-up reminder</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCallFollowUp("");
                          setCallFuAdvancedOpen(false);
                        }}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCallFollowUp(toDatetimeLocalValueFromDate(calendarDayAtLocal(1, 10, 0)));
                          setCallFuAdvancedOpen(false);
                        }}
                        className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/40 px-3 py-2 text-xs font-semibold text-primary-800 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                      >
                        Tomorrow 10:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCallFollowUp(toDatetimeLocalValueFromDate(calendarDayAtLocal(3, 10, 0)));
                          setCallFuAdvancedOpen(false);
                        }}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        In 3 days 10:00
                      </button>
                      <button
                        type="button"
                        onClick={() => setCallFuAdvancedOpen((v) => !v)}
                        className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {callFuAdvancedOpen ? "Hide custom time" : "Custom date & time"}
                      </button>
                    </div>
                    {callFuAdvancedOpen ? (
                      <label className="block mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Pick exact time</span>
                        <input
                          type="datetime-local"
                          value={callFollowUp}
                          onChange={(e) => setCallFollowUp(e.target.value)}
                          min={minDatetimeLocalToday()}
                          className={FIELD_DATETIME}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
                    You don&apos;t have permission to set follow-up from here; managers can enable it for your role.
                  </p>
                )}
              </div>

              <div>
                <p className={sectionTitle + " mb-2"}>Recent outreach</p>
                {outreachLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading timeline…</p>
                ) : outreachEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No outreach logged yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {outreachEvents.slice(0, 12).map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-lg border border-gray-100 dark:border-gray-700/80 p-3 text-sm bg-gray-50/50 dark:bg-gray-800/30"
                      >
                        <div className="flex justify-between gap-2 items-start">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="font-medium text-gray-900 dark:text-white capitalize">{ev.channel}</span>
                            {ev.outcome ? (
                              <span className="text-xs text-gray-600 dark:text-gray-400">· {ev.outcome}</span>
                            ) : null}
                          </div>
                          {canDeleteCallLog ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteEvent(ev.id)}
                              className="text-xs text-red-600 hover:underline dark:text-red-400 shrink-0"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                        {ev.createdAt?.toDate ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {ev.createdAt.toDate().toLocaleString()} · {ev.createdByDisplayName}
                          </p>
                        ) : null}
                        {(ev.notes || "").trim() ? (
                          <p className="text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{(ev.notes || "").trim()}</p>
                        ) : null}
                        {(ev.recordingRef || "").trim() ? (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            <span className="text-gray-500 dark:text-gray-400">Ref: </span>
                            {(ev.recordingRef || "").trim()}
                          </p>
                        ) : null}
                        {ev.callVerifiedAt?.toDate ? (
                          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mt-1">
                            Call verified
                          </p>
                        ) : null}
                        <OutreachEventAdminControls
                          event={ev}
                          canApprove={canApproveCallLog}
                          user={user}
                          userProfile={userProfile}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {mode === "call" && !canLogCall && (
            <p className="text-sm text-gray-600 dark:text-gray-400">You don&apos;t have permission to log calls.</p>
          )}

          {mode === "followup" && canSetFollowup && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Next follow-up</span>
                <input
                  type="datetime-local"
                  value={followField}
                  onChange={(e) => setFollowField(e.target.value)}
                  min={minDatetimeLocalToday()}
                  className={FIELD_DATETIME}
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose today with a later time, or a future date. Clear removes the reminder from this lead.
              </p>
            </div>
          )}

          {mode === "followup" && !canSetFollowup && (
            <p className="text-sm text-gray-600 dark:text-gray-400">You don&apos;t have permission to set follow-up.</p>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-5 py-4 flex flex-wrap justify-end gap-2 bg-gray-50/80 dark:bg-gray-800/50 rounded-b-2xl">
          {mode === "details" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
            >
              Done
            </button>
          )}
          {mode === "status" && canUpdateStatus && pipelineOutcome && (
            <button
              type="button"
              onClick={() => {
                setPipelineOutcome(null);
                onClose();
              }}
              className="rounded-lg px-4 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
            >
              Done
            </button>
          )}
          {mode === "status" && canUpdateStatus && !pipelineOutcome && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void handleSaveStatus()}
                className="rounded-lg px-4 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {statusSaving ? "Saving…" : "Save status"}
              </button>
            </>
          )}
          {mode === "call" && canLogCall && leadHasPhone && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                disabled={callSaving}
                onClick={() => void saveCall(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {callSaving ? "Saving…" : "Save"}
              </button>
              {workspaceCallQueueIds && workspaceCallQueueIds.length > 0 ? (
                <button
                  type="button"
                  disabled={callSaving}
                  onClick={() => void saveCall(true)}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 shadow-sm ring-1 ring-primary-500/30"
                >
                  {callSaving ? "Saving…" : "Save & next"}
                </button>
              ) : null}
            </>
          )}
          {mode === "call" && canLogCall && !leadHasPhone && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
            >
              Done
            </button>
          )}
          {mode === "followup" && canSetFollowup && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={followSaving}
                onClick={() => void handleSaveFollowup(true)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Clear follow-up
              </button>
              <button
                type="button"
                disabled={followSaving}
                onClick={() => void handleSaveFollowup(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {followSaving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentWorkspaceModals;
