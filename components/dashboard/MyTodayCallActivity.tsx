import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardSection from "../DashboardSection";
import Spinner from "../Spinner";
import type { LeadCallOutcome } from "../../types";
import { OutreachService } from "../../services/outreachService";
import { CompanyAppSettingsService } from "../../services/companyAppSettingsService";
import { formatLocalDayKey } from "../../utils/localDayKey";
import {
  DEFAULT_MY_CALL_ACTIVITY_WORKDAY_SETTINGS,
  MY_CALL_ACTIVITY_COMMON_TIMEZONES,
  canManageCompanyWorkdaySettings,
  getMyCallActivityBusinessDayKeyForInstant,
  localCalendarDayBoundsForDayKey,
  mergeMyCallActivityWorkdaySettings,
  resolveMyCallActivityWorkdayWindow,
  type MyCallActivityWorkdaySettings,
} from "../../utils/myCallActivityBusinessDay";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuth } from "../../hooks/useAuth";

const KNOWN_OUTCOMES: readonly LeadCallOutcome[] = [
  "Connected",
  "Voicemail",
  "No Answer",
  "Busy",
  "Wrong Number",
  "Hangup",
] as const;

const DISPLAY_ORDER = [...KNOWN_OUTCOMES, "Other", "Unspecified"] as const;

function bucketOutcome(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Unspecified";
  if ((KNOWN_OUTCOMES as readonly string[]).includes(t)) return t;
  return "Other";
}

const DATE_FIELD =
  "mt-1 w-full max-w-[11rem] rounded-lg border text-sm text-gray-900 bg-white border-gray-300 shadow-sm " +
  "dark:text-gray-50 dark:bg-gray-950 dark:border-gray-500 dark:[color-scheme:dark] px-3 py-2";

const fieldSm =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm " +
  "dark:border-gray-500 dark:bg-gray-950 dark:text-gray-50 dark:[color-scheme:dark]";

function outcomePillClass(label: string): string {
  const base =
    "flex min-w-0 flex-1 basis-[calc(50%-0.375rem)] flex-col rounded-xl border px-3 py-3 sm:basis-[calc(25%-0.375rem)] sm:px-4 ";
  switch (label) {
    case "Connected":
      return base + "border-emerald-200/90 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/30";
    case "Voicemail":
      return base + "border-sky-200/90 bg-sky-50/80 dark:border-sky-800/50 dark:bg-sky-950/30";
    case "No Answer":
    case "Busy":
      return base + "border-amber-200/90 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/30";
    case "Wrong Number":
    case "Hangup":
      return base + "border-rose-200/90 bg-rose-50/80 dark:border-rose-800/50 dark:bg-rose-950/30";
    default:
      return base + "border-gray-200/90 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-900/40";
  }
}

interface MyTodayCallActivityProps {
  companyId: string;
  userId: string;
}

const MyTodayCallActivity: React.FC<MyTodayCallActivityProps> = ({ companyId, userId }) => {
  const { userProfile } = useAuth();
  const { canAccessMyAssignedLeadsPage } = usePermissions();
  /** Drives Firestore queries; only updated after load from server or successful save. */
  const [savedWorkday, setSavedWorkday] = useState<MyCallActivityWorkdaySettings>(() =>
    mergeMyCallActivityWorkdaySettings(null),
  );
  /** Form draft while the workday panel is open (does not refetch until Save). */
  const [draftWorkday, setDraftWorkday] = useState<MyCallActivityWorkdaySettings>(() =>
    mergeMyCallActivityWorkdaySettings(null),
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showWorkdaySettings, setShowWorkdaySettings] = useState(false);
  const [savingWorkday, setSavingWorkday] = useState(false);
  const [workdaySaveMsg, setWorkdaySaveMsg] = useState<string | null>(null);

  const [dayKey, setDayKey] = useState(() => formatLocalDayKey(new Date()));
  /** When company workday mode flips or first loads, snap date picker to the right “today”. */
  const prevWorkdayModeRef = useRef<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [byOutcome, setByOutcome] = useState<Record<string, number>>({});

  const mayEditWorkday = canManageCompanyWorkdaySettings(userProfile ?? null);

  useEffect(() => {
    let alive = true;
    setSettingsLoaded(false);
    void (async () => {
      try {
        const s = await CompanyAppSettingsService.getMyCallActivityWorkday(companyId);
        if (alive) {
          setSavedWorkday(s);
          setDraftWorkday(s);
        }
      } catch (e) {
        console.error("[MyTodayCallActivity] load workday settings", e);
        if (alive) {
          const d = mergeMyCallActivityWorkdaySettings(null);
          setSavedWorkday(d);
          setDraftWorkday(d);
        }
      } finally {
        if (alive) setSettingsLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const merged = mergeMyCallActivityWorkdaySettings(savedWorkday);
    const mode = merged.useBusinessWorkday;
    if (prevWorkdayModeRef.current === mode) return;
    prevWorkdayModeRef.current = mode;
    if (mode) {
      setDayKey(getMyCallActivityBusinessDayKeyForInstant(new Date(), merged));
    } else {
      setDayKey(formatLocalDayKey(new Date()));
    }
  }, [settingsLoaded, savedWorkday]);

  const load = useCallback(async () => {
    if (!companyId.trim() || !userId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const wd = mergeMyCallActivityWorkdaySettings(savedWorkday);
      let start: Date;
      let endExclusive: Date;
      if (wd.useBusinessWorkday) {
        const w = resolveMyCallActivityWorkdayWindow(dayKey, wd);
        if (!w) {
          setError("Invalid business workday or timezone. Fix settings below.");
          setTotal(0);
          setByOutcome({});
          return;
        }
        start = w.start;
        endExclusive = w.endExclusive;
      } else {
        const b = localCalendarDayBoundsForDayKey(dayKey);
        if (!b) {
          setError("Invalid date.");
          setTotal(0);
          setByOutcome({});
          return;
        }
        start = b.start;
        endExclusive = b.endExclusive;
      }

      const events = await OutreachService.fetchMyCallEventsForInstantRange(
        companyId,
        userId,
        start,
        endExclusive,
      );
      const counts: Record<string, number> = {};
      for (const label of DISPLAY_ORDER) counts[label] = 0;
      for (const e of events) {
        const key = bucketOutcome(e.outcome);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      setTotal(events.length);
      setByOutcome(counts);
    } catch (e) {
      console.error("[MyTodayCallActivity]", e);
      setError("Could not load call activity.");
      setTotal(0);
      setByOutcome({});
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, dayKey, savedWorkday]);

  useEffect(() => {
    if (!settingsLoaded) return;
    void load();
  }, [load, settingsLoaded]);

  const wdMerged = mergeMyCallActivityWorkdaySettings(savedWorkday);
  const todayKey = getMyCallActivityBusinessDayKeyForInstant(new Date(), wdMerged);
  const isToday = dayKey === todayKey;

  const onSaveWorkday = async () => {
    if (!mayEditWorkday) return;
    setWorkdaySaveMsg(null);
    setSavingWorkday(true);
    try {
      const merged = mergeMyCallActivityWorkdaySettings(draftWorkday);
      await CompanyAppSettingsService.saveMyCallActivityWorkday(companyId, merged);
      setSavedWorkday(merged);
      setDraftWorkday(merged);
      setWorkdaySaveMsg("Saved.");
      void load();
    } catch (e) {
      console.error("[MyTodayCallActivity] save workday", e);
      setWorkdaySaveMsg("Could not save settings.");
    } finally {
      setSavingWorkday(false);
    }
  };

  const shortDescription = wdMerged.useBusinessWorkday
    ? `Calls from your workspace for this shift (anchor ${dayKey}, ${wdMerged.timezone}). Late-night calls count in the same shift until it ends.`
    : "Calls you logged from the workspace for the day you pick below.";

  const longDescription = wdMerged.useBusinessWorkday
    ? `Calls you logged (workspace timeline, channel: call) in one shift window for anchor date ${dayKey} (${wdMerged.timezone}). Same settings for everyone in your company. After-midnight calls stay on the same business day until shift end. Older call-only subcollection logs are not included.`
    : "Calls you logged from the lead workspace timeline (channel: call), grouped by outcome for the selected calendar day in your browser’s local timezone. Older call-only subcollection logs are not included.";

  return (
    <DashboardSection
      title={isToday ? "Your calls today" : "Your call activity"}
      description={mayEditWorkday ? longDescription : shortDescription}
      headerAction={
        canAccessMyAssignedLeadsPage() ? (
          <Link
            to="/leads/my-assigned"
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 shadow-sm transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/40"
          >
            Log calls
            <span aria-hidden>→</span>
          </Link>
        ) : undefined
      }
      bodyClassName="!py-0 sm:!py-0"
    >
      <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700/80 sm:px-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-600/60 dark:bg-gray-900/35 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {wdMerged.useBusinessWorkday ? "Shift day" : "Calendar day"}
              </span>
              <input
                type="date"
                value={dayKey}
                onChange={(e) => setDayKey(e.target.value)}
                className={DATE_FIELD}
              />
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              Refresh
            </button>
          </div>
          {wdMerged.useBusinessWorkday ? (
            <p className="text-xs text-gray-600 dark:text-gray-400 sm:max-w-md sm:text-right">
              <span className="rounded-md bg-white/80 px-2 py-0.5 font-medium text-gray-800 dark:bg-gray-800/80 dark:text-gray-200">
                {String(wdMerged.workdayStartHour).padStart(2, "0")}:
                {String(wdMerged.workdayStartMinute).padStart(2, "0")} to{" "}
                {String(wdMerged.workdayEndHour).padStart(2, "0")}:
                {String(wdMerged.workdayEndMinute).padStart(2, "0")}
              </span>{" "}
              <span className="text-gray-500 dark:text-gray-500">{wdMerged.timezone}</span>
              {!mayEditWorkday ? (
                <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-500">
                  Set by your company. Owner can change it in Profile.
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        {mayEditWorkday ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-900/30">
            <button
              type="button"
              onClick={() =>
                setShowWorkdaySettings((v) => {
                  const next = !v;
                  if (next) setDraftWorkday(mergeMyCallActivityWorkdaySettings(savedWorkday));
                  return next;
                })
              }
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800 dark:text-gray-100"
            >
              <span>Company-wide workday (all agents)</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{showWorkdaySettings ? "▲" : "▼"}</span>
            </button>
            {showWorkdaySettings ? (
              <div className="space-y-3 border-t border-gray-200 px-3 py-3 text-sm dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Applies to <strong>everyone</strong> on the dashboard “My call activity” block (same company).
                  You can also edit under <strong>Profile → Company call activity</strong>.
                  Overnight: if end ≤ start on the anchor day, the window runs until end time the <strong>next</strong>{" "}
                  calendar day.
                </p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draftWorkday.useBusinessWorkday}
                    onChange={(e) =>
                      setDraftWorkday((w) => ({
                        ...mergeMyCallActivityWorkdaySettings(w),
                        useBusinessWorkday: e.target.checked,
                      }))
                    }
                  />
                  <span>Use business workday (timezone below)</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">IANA timezone</span>
                    <input
                      type="text"
                      list="my-call-activity-tz"
                      value={draftWorkday.timezone}
                      onChange={(e) =>
                        setDraftWorkday((w) => ({
                          ...mergeMyCallActivityWorkdaySettings(w),
                          timezone: e.target.value,
                        }))
                      }
                      className={fieldSm}
                      placeholder="Asia/Karachi"
                    />
                    <datalist id="my-call-activity-tz">
                      {MY_CALL_ACTIVITY_COMMON_TIMEZONES.map((z) => (
                        <option key={z} value={z} />
                      ))}
                    </datalist>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Start hour</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={draftWorkday.workdayStartHour}
                        onChange={(e) =>
                          setDraftWorkday((w) => ({
                            ...mergeMyCallActivityWorkdaySettings(w),
                            workdayStartHour: Number(e.target.value),
                          }))
                        }
                        className={fieldSm}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Start minute</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={draftWorkday.workdayStartMinute}
                        onChange={(e) =>
                          setDraftWorkday((w) => ({
                            ...mergeMyCallActivityWorkdaySettings(w),
                            workdayStartMinute: Number(e.target.value),
                          }))
                        }
                        className={fieldSm}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">End hour</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={draftWorkday.workdayEndHour}
                        onChange={(e) =>
                          setDraftWorkday((w) => ({
                            ...mergeMyCallActivityWorkdaySettings(w),
                            workdayEndHour: Number(e.target.value),
                          }))
                        }
                        className={fieldSm}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">End minute</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={draftWorkday.workdayEndMinute}
                        onChange={(e) =>
                          setDraftWorkday((w) => ({
                            ...mergeMyCallActivityWorkdaySettings(w),
                            workdayEndMinute: Number(e.target.value),
                          }))
                        }
                        className={fieldSm}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingWorkday}
                    onClick={() => void onSaveWorkday()}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                  >
                    {savingWorkday ? "Saving…" : "Save workday settings"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftWorkday(mergeMyCallActivityWorkdaySettings(DEFAULT_MY_CALL_ACTIVITY_WORKDAY_SETTINGS))
                    }
                    className="text-xs font-medium text-primary-700 underline dark:text-primary-300"
                  >
                    Reset to default (6 PM → 3 AM, Asia/Karachi)
                  </button>
                  {workdaySaveMsg ? (
                    <span className="text-xs text-gray-600 dark:text-gray-400">{workdaySaveMsg}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : total === 0 ? (
        <div className="mx-5 mb-6 mt-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-5 py-10 text-center dark:border-gray-600 dark:bg-gray-900/25 sm:mx-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No calls in this window yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Open a lead from My workspace, log a call, and pick an outcome; your totals will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-5 px-5 py-6 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/70 p-5 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-gray-900/80 dark:to-violet-950/25">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
              {isToday ? "Today’s total" : "Total for selected day"}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
              {total}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              call{total === 1 ? "" : "s"} logged
              {isToday ? "" : wdMerged.useBusinessWorkday ? ` · shift ${dayKey}` : ` · ${dayKey}`}
            </p>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              By outcome
            </p>
            <div className="flex flex-wrap gap-3">
              {DISPLAY_ORDER.map((label) => {
                const count = byOutcome[label] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={label} className={outcomePillClass(label)}>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
                    <span className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardSection>
  );
};

export default MyTodayCallActivity;
