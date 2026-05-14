import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import DashboardSection from "../DashboardSection";
import Spinner from "../Spinner";
import type { Lead, LeadCallOutcome, OutreachEvent } from "../../types";
import { OutreachService } from "../../services/outreachService";
import { AssigneeAssignmentLogService } from "../../services/assigneeAssignmentLogService";
import { CompanyAppSettingsService } from "../../services/companyAppSettingsService";
import { formatLocalDayKey } from "../../utils/localDayKey";
import {
  getMyCallActivityBusinessDayKeyForInstant,
  localCalendarDayBoundsForDayKey,
  mergeMyCallActivityWorkdaySettings,
  resolveMyCallActivityWorkdayWindow,
  type MyCallActivityWorkdaySettings,
} from "../../utils/myCallActivityBusinessDay";

/* ─── constants ──────────────────────────────────────────────────────────── */

const KNOWN_OUTCOMES: readonly LeadCallOutcome[] = [
  "Connected", "Voicemail", "No Answer", "Busy", "Hangup", "Wrong Number",
] as const;

const OUTCOME_DISPLAY_ORDER = [
  "Connected", "No Answer", "Busy", "Voicemail", "Hangup", "Wrong Number", "Other", "Unspecified",
] as const;

const STATUS_ORDER = [
  "New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost",
] as const;

/* ─── helpers ────────────────────────────────────────────────────────────── */

function bucketOutcome(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Unspecified";
  if ((KNOWN_OUTCOMES as readonly string[]).includes(t)) return t;
  return "Other";
}

function outcomeCardCls(label: string): string {
  const base = "flex flex-col rounded-xl border px-3 py-2.5 flex-1 min-w-[6.5rem] ";
  switch (label) {
    case "Connected":
      return base + "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30";
    case "Voicemail":
      return base + "border-sky-200 bg-sky-50 dark:border-sky-800/50 dark:bg-sky-950/30";
    case "No Answer":
    case "Busy":
      return base + "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30";
    case "Hangup":
    case "Wrong Number":
      return base + "border-rose-200 bg-rose-50 dark:border-rose-800/50 dark:bg-rose-950/30";
    default:
      return base + "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40";
  }
}

function statusCardCls(status: string): string {
  const base = "flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center flex-1 min-w-[5.5rem] gap-0.5 ";
  switch (status) {
    case "New":       return base + "border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/30";
    case "Contacted": return base + "border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/30";
    case "Qualified": return base + "border-violet-200 bg-violet-50 dark:border-violet-800/50 dark:bg-violet-950/30";
    case "Proposal Sent": return base + "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30";
    case "Won":  return base + "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30";
    case "Lost": return base + "border-rose-200 bg-rose-50 dark:border-rose-800/50 dark:bg-rose-950/30";
    default:     return base + "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40";
  }
}

/**
 * Call timeline bounds for outreach queries — matches dashboard “My call activity” when
 * company business workday is enabled (overnight shift on anchor date).
 */
function resolveCallInstantRange(
  fromDayKey: string,
  toDayKey: string,
  workday: MyCallActivityWorkdaySettings,
): { start: Date; endExclusive: Date } | null {
  const merged = mergeMyCallActivityWorkdaySettings(workday);
  if (merged.useBusinessWorkday) {
    const fromWin = resolveMyCallActivityWorkdayWindow(fromDayKey, merged);
    const toWin = resolveMyCallActivityWorkdayWindow(toDayKey, merged);
    if (!fromWin || !toWin) return null;
    return { start: fromWin.start, endExclusive: toWin.endExclusive };
  }
  const a = localCalendarDayBoundsForDayKey(fromDayKey);
  const b = localCalendarDayBoundsForDayKey(toDayKey);
  if (!a || !b) return null;
  return { start: a.start, endExclusive: b.endExclusive };
}

function statusNumCls(status: string): string {
  switch (status) {
    case "New":       return "text-blue-700 dark:text-blue-300";
    case "Contacted": return "text-indigo-700 dark:text-indigo-300";
    case "Qualified": return "text-violet-700 dark:text-violet-300";
    case "Proposal Sent": return "text-amber-700 dark:text-amber-300";
    case "Won":  return "text-emerald-700 dark:text-emerald-300";
    case "Lost": return "text-rose-700 dark:text-rose-300";
    default:     return "text-gray-700 dark:text-gray-300";
  }
}

const INPUT_CLS =
  "mt-1 rounded-lg border text-sm text-gray-900 bg-white border-gray-300 shadow-sm " +
  "dark:text-gray-50 dark:bg-gray-950 dark:border-gray-500 dark:[color-scheme:dark] px-3 py-2";

const SELECT_CLS =
  "mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm " +
  "dark:border-gray-500 dark:bg-gray-950 dark:text-gray-50 w-full max-w-[14rem]";

/* ─── types ──────────────────────────────────────────────────────────────── */

interface AgentPerformanceReportProps {
  companyId: string;
  allLeads: Lead[];
  assigneeLabels: { uid: string; label: string }[];
}

interface QueryResult {
  callEvents: OutreachEvent[];
  assignedInRangeCount: number;
  calledLeadIdsAll: Set<string>;
}

type DateMode = "single" | "range";

/* ─── component ──────────────────────────────────────────────────────────── */

const AgentPerformanceReport: React.FC<AgentPerformanceReportProps> = ({
  companyId,
  allLeads,
  assigneeLabels,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(() => assigneeLabels[0]?.uid ?? "");

  useEffect(() => {
    if (assigneeLabels.length === 0) return;
    if (!assigneeLabels.some((a) => a.uid === selectedUserId)) {
      setSelectedUserId(assigneeLabels[0].uid);
    }
  }, [assigneeLabels, selectedUserId]);

  const [savedWorkday, setSavedWorkday] = useState<MyCallActivityWorkdaySettings>(() =>
    mergeMyCallActivityWorkdaySettings(null),
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const didInitAnchorDatesRef = useRef(false);

  useEffect(() => {
    let alive = true;
    didInitAnchorDatesRef.current = false;
    setSettingsLoaded(false);
    void (async () => {
      try {
        const s = await CompanyAppSettingsService.getMyCallActivityWorkday(companyId);
        if (alive) setSavedWorkday(mergeMyCallActivityWorkdaySettings(s));
      } catch (e) {
        console.error("[AgentPerformanceReport] load workday settings", e);
        if (alive) setSavedWorkday(mergeMyCallActivityWorkdaySettings(null));
      } finally {
        if (alive) setSettingsLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!settingsLoaded || didInitAnchorDatesRef.current) return;
    didInitAnchorDatesRef.current = true;
    const merged = mergeMyCallActivityWorkdaySettings(savedWorkday);
    if (merged.useBusinessWorkday) {
      const anchor = getMyCallActivityBusinessDayKeyForInstant(new Date(), merged);
      setSingleDay(anchor);
      setToDay(anchor);
      const z = merged.timezone.trim() || "UTC";
      const fromDt = DateTime.fromISO(anchor, { zone: z }).minus({ days: 29 });
      setFromDay(fromDt.isValid ? (fromDt.toISODate() ?? anchor) : anchor);
    }
  }, [settingsLoaded, savedWorkday]);

  /* date controls */
  const todayKey = formatLocalDayKey(new Date());
  const [dateMode, setDateMode] = useState<DateMode>("range");
  const [singleDay, setSingleDay] = useState(todayKey);
  const [fromDay, setFromDay] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() - 29);
    return formatLocalDayKey(t);
  });
  const [toDay, setToDay] = useState(todayKey);

  /* resolved from/to for queries */
  const resolvedFrom = dateMode === "single" ? singleDay : fromDay;
  const resolvedTo   = dateMode === "single" ? singleDay : toDay;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [hasQueried, setHasQueried] = useState(false);

  /* currently-assigned leads */
  const assignedLeads = useMemo(() => {
    if (!selectedUserId) return [];
    return allLeads.filter((l) => (l.assignedUserId || "").trim() === selectedUserId);
  }, [allLeads, selectedUserId]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of assignedLeads) m[l.status] = (m[l.status] ?? 0) + 1;
    return m;
  }, [assignedLeads]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of assignedLeads) {
      const c = (l.category || "").trim() || "(none)";
      m[c] = (m[c] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [assignedLeads]);

  const countryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of assignedLeads) {
      const c = (l.country || "").trim() || "(none)";
      m[c] = (m[c] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [assignedLeads]);

  const followUpCount = useMemo(
    () => assignedLeads.filter((l) => l.nextFollowUpDate?.toMillis?.() != null).length,
    [assignedLeads],
  );

  /* call metrics */
  const callMetrics = useMemo(() => {
    if (!result) return null;
    const byOutcome: Record<string, number> = {};
    const leadCallMap = new Map<string, number>();
    for (const ev of result.callEvents) {
      const key = bucketOutcome(ev.outcome);
      byOutcome[key] = (byOutcome[key] ?? 0) + 1;
      if (ev.leadId) leadCallMap.set(ev.leadId, (leadCallMap.get(ev.leadId) ?? 0) + 1);
    }
    const uniqueLeadsCalledInRange = leadCallMap.size;
    const repeatedCallLeads = [...leadCallMap.values()].filter((c) => c > 1).length;
    return { byOutcome, uniqueLeadsCalledInRange, repeatedCallLeads, total: result.callEvents.length };
  }, [result]);

  const handleRun = useCallback(async () => {
    if (!selectedUserId || !companyId) return;
    if (!settingsLoaded) return;
    const f = resolvedFrom;
    const t = resolvedTo;
    if (!f || !t) { setError("Please select a valid date."); return; }
    if (f > t)    { setError("'From' date must be on or before 'To' date."); return; }
    setLoading(true);
    setError(null);
    try {
      const callRange = resolveCallInstantRange(f, t, savedWorkday);
      if (!callRange) {
        setError(
          mergeMyCallActivityWorkdaySettings(savedWorkday).useBusinessWorkday
            ? "Invalid business workday or timezone. Check company call activity settings (Profile)."
            : "Invalid date.",
        );
        return;
      }

      const currentlyAssignedIds = allLeads
        .filter((l) => (l.assignedUserId || "").trim() === selectedUserId)
        .map((l) => l.id);

      const [callEvents, assignmentLogs, calledLeadIdsAll] = await Promise.all([
        OutreachService.fetchMyCallEventsForInstantRange(
          companyId,
          selectedUserId,
          callRange.start,
          callRange.endExclusive,
        ),
        AssigneeAssignmentLogService.fetchForAssignee(companyId, selectedUserId, f, t),
        OutreachService.getLeadIdsWithCallOutreach(companyId, currentlyAssignedIds),
      ]);

      const uniqueInRange = new Set(assignmentLogs.map((l) => l.leadId).filter(Boolean));
      setResult({ callEvents, assignedInRangeCount: uniqueInRange.size, calledLeadIdsAll });
      setHasQueried(true);
    } catch (e) {
      console.error("[AgentPerformanceReport]", e);
      setError("Could not load performance data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedUserId, resolvedFrom, resolvedTo, allLeads, savedWorkday, settingsLoaded]);

  const selectedUserLabel =
    assigneeLabels.find((a) => a.uid === selectedUserId)?.label ?? selectedUserId;

  const calledCount   = result?.calledLeadIdsAll.size ?? 0;
  const uncalledCount = Math.max(0, assignedLeads.length - calledCount);

  const wdMerged = mergeMyCallActivityWorkdaySettings(savedWorkday);
  const dateRangeLabel =
    dateMode === "single"
      ? singleDay
      : resolvedFrom === resolvedTo
        ? resolvedFrom
        : `${resolvedFrom} → ${resolvedTo}`;

  /* toggle button style */
  const modeBtnCls = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg transition border ` +
    (active
      ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
      : "bg-transparent text-gray-600 border-gray-300 hover:bg-gray-100 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800");

  return (
    <DashboardSection
      title="Agent Performance Report"
      description="Team view: pick an agent and date. Call totals use the same company workday window as “Your calls today” when business shift is enabled; assignment counts use calendar days on the log."
    >
      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-600 dark:bg-gray-900/35">

        <label className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Agent
          </span>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setHasQueried(false);
              setResult(null);
            }}
            className={SELECT_CLS}
            disabled={assigneeLabels.length === 0}
          >
            {assigneeLabels.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        {/* Date mode toggle + pickers */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Date
          </span>
          <div className="flex gap-1 mb-1.5">
            <button type="button" className={modeBtnCls(dateMode === "single")} onClick={() => setDateMode("single")}>
              Single day
            </button>
            <button type="button" className={modeBtnCls(dateMode === "range")} onClick={() => setDateMode("range")}>
              Date range
            </button>
          </div>
          {dateMode === "single" ? (
            <input
              type="date"
              value={singleDay}
              max={todayKey}
              onChange={(e) => setSingleDay(e.target.value)}
              className={INPUT_CLS}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={fromDay}
                max={toDay}
                onChange={(e) => setFromDay(e.target.value)}
                className={INPUT_CLS}
              />
              <span className="text-sm text-gray-400">→</span>
              <input
                type="date"
                value={toDay}
                min={fromDay}
                max={todayKey}
                onChange={(e) => setToDay(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={loading || !selectedUserId || !settingsLoaded}
          onClick={() => void handleRun()}
          className="mt-auto rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          {loading ? "Loading…" : hasQueried ? "Refresh" : "Run Report"}
        </button>
      </div>

      {settingsLoaded && wdMerged.useBusinessWorkday ? (
        <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Call counts use the <strong>company business shift</strong> ({wdMerged.timezone},{" "}
          {String(wdMerged.workdayStartHour).padStart(2, "0")}:{String(wdMerged.workdayStartMinute).padStart(2, "0")} →{" "}
          {String(wdMerged.workdayEndHour).padStart(2, "0")}:{String(wdMerged.workdayEndMinute).padStart(2, "0")}
          ), same as dashboard “Your calls today”. After midnight, late calls still count on the previous shift day
          until the window ends.
        </p>
      ) : settingsLoaded ? (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Call counts use each selected <strong>calendar day</strong> in your browser timezone (company business shift
          is off).
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {!settingsLoaded ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : !hasQueried ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-14 text-center dark:border-gray-600 dark:bg-gray-900/25">
          <span className="text-3xl" aria-hidden>📊</span>
          <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Select an agent and date, then click <strong>Run Report</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Section 1: Call Activity ────────────────────────────── */}
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Call activity · {dateRangeLabel}
            </p>

            {/* Hero row: total + repeated */}
            <div className="mb-4 flex flex-wrap gap-3">
              {/* Total calls — main hero */}
              <div className="flex flex-1 min-w-[9rem] flex-col gap-0.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-5 py-4 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  Total calls
                </span>
                <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {callMetrics?.total ?? 0}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {callMetrics?.uniqueLeadsCalledInRange ?? 0} unique lead{callMetrics?.uniqueLeadsCalledInRange !== 1 ? "s" : ""} called
                  {(callMetrics?.repeatedCallLeads ?? 0) > 0
                    ? ` · ${callMetrics!.repeatedCallLeads} called more than once`
                    : ""}
                </span>
              </div>

              {/* Leads assigned in range */}
              <div className="flex flex-1 min-w-[8rem] flex-col gap-0.5 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-600 dark:bg-gray-900/40">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Leads assigned
                </span>
                <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {result?.assignedInRangeCount ?? 0}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">in this period</span>
              </div>
            </div>

            {/* Calls by outcome */}
            {(callMetrics?.total ?? 0) > 0 ? (
              <>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Calls by outcome
                </p>
                <div className="flex flex-wrap gap-2">
                  {OUTCOME_DISPLAY_ORDER.map((label) => {
                    const count = callMetrics?.byOutcome[label] ?? 0;
                    if (count === 0) return null;
                    const pct = callMetrics?.total ? Math.round((count / callMetrics.total) * 100) : 0;
                    return (
                      <div key={label} className={outcomeCardCls(label)}>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
                        <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{count}</span>
                        <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No calls logged in this period.</p>
            )}
          </div>

          {/* ── Section 2: Lead Pipeline ────────────────────────────── */}
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Current lead pipeline · {selectedUserLabel}
            </p>

            {assignedLeads.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No leads currently assigned.</p>
            ) : (
              <>
                {/* Status grid */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {STATUS_ORDER.map((status) => {
                    const count = statusCounts[status] ?? 0;
                    return (
                      <div key={status} className={statusCardCls(status)}>
                        <span className={`text-xl font-bold tabular-nums ${statusNumCls(status)}`}>
                          {count}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 leading-tight">
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Summary row — inline text, no extra boxes */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900/30">
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong className="tabular-nums">{assignedLeads.length}</strong> total assigned
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    <strong className="tabular-nums">{calledCount}</strong> called (all time)
                  </span>
                  {uncalledCount > 0 ? (
                    <span className="text-amber-700 dark:text-amber-400">
                      <strong className="tabular-nums">{uncalledCount}</strong> not yet called
                    </span>
                  ) : null}
                  {followUpCount > 0 ? (
                    <span className="text-sky-700 dark:text-sky-400">
                      <strong className="tabular-nums">{followUpCount}</strong> follow-up scheduled
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* ── Section 3: Distribution ─────────────────────────────── */}
          {assignedLeads.length > 0 && (countryCounts.length > 0 || categoryCounts.length > 0) ? (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Lead distribution · {selectedUserLabel}
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Countries */}
                {countryCounts.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">By country</p>
                    <div className="space-y-1.5">
                      {countryCounts.map(([name, count]) => {
                        const pct = Math.round((count / assignedLeads.length) * 100);
                        return (
                          <div key={name} className="flex items-center gap-2">
                            <span className="w-28 shrink-0 truncate text-sm text-gray-800 dark:text-gray-200">{name}</span>
                            <div className="flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${Math.max(3, pct)}%` }} />
                            </div>
                            <span className="w-8 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400">{count}</span>
                            <span className="w-8 text-right text-[11px] tabular-nums text-gray-400 dark:text-gray-500">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Categories */}
                {categoryCounts.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">By category</p>
                    <div className="space-y-1.5">
                      {categoryCounts.map(([name, count]) => {
                        const pct = Math.round((count / assignedLeads.length) * 100);
                        return (
                          <div key={name} className="flex items-center gap-2">
                            <span className="w-28 shrink-0 truncate text-sm text-gray-800 dark:text-gray-200">{name}</span>
                            <div className="flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="h-1.5 rounded-full bg-violet-500 dark:bg-violet-400" style={{ width: `${Math.max(3, pct)}%` }} />
                            </div>
                            <span className="w-8 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400">{count}</span>
                            <span className="w-8 text-right text-[11px] tabular-nums text-gray-400 dark:text-gray-500">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

        </div>
      )}
    </DashboardSection>
  );
};

export default AgentPerformanceReport;
