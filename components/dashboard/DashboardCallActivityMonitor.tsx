import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardSection from "../DashboardSection";
import Spinner from "../Spinner";
import { OutreachService } from "../../services/outreachService";
import { CompanyAppSettingsService } from "../../services/companyAppSettingsService";
import { PAGES } from "../../config/permissions";
import {
  getMyCallActivityBusinessDayKeyForInstant,
  getPreviousMyCallActivityAnchorDayKey,
  localCalendarDayBoundsForDayKey,
  mergeMyCallActivityWorkdaySettings,
  resolveMyCallActivityWorkdayWindow,
  type MyCallActivityWorkdaySettings,
} from "../../utils/myCallActivityBusinessDay";
import { usePermissions } from "../../hooks/usePermissions";

interface DashboardCallActivityMonitorProps {
  companyId: string;
  userId: string;
}

function countConnected(events: { outcome?: string | null }[]): number {
  let n = 0;
  for (const e of events) {
    if ((e.outcome ?? "").trim() === "Connected") n += 1;
  }
  return n;
}

const DashboardCallActivityMonitor: React.FC<DashboardCallActivityMonitorProps> = ({
  companyId,
  userId,
}) => {
  const { hasPageAccess } = usePermissions();
  const [savedWorkday, setSavedWorkday] = useState<MyCallActivityWorkdaySettings>(() =>
    mergeMyCallActivityWorkdaySettings(null),
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [yesterdayTotal, setYesterdayTotal] = useState(0);
  const [todayConnected, setTodayConnected] = useState(0);
  const [yesterdayConnected, setYesterdayConnected] = useState(0);
  const [todayKey, setTodayKey] = useState("");
  const [yesterdayKey, setYesterdayKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSettingsLoaded(false);
    void (async () => {
      try {
        const s = await CompanyAppSettingsService.getMyCallActivityWorkday(companyId);
        if (alive) setSavedWorkday(s);
      } catch (e) {
        console.error("[DashboardCallActivityMonitor] load workday settings", e);
        if (alive) setSavedWorkday(mergeMyCallActivityWorkdaySettings(null));
      } finally {
        if (alive) setSettingsLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [companyId]);

  const loadPair = useCallback(async () => {
    if (!companyId.trim() || !userId.trim() || !settingsLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const wd = mergeMyCallActivityWorkdaySettings(savedWorkday);
      const tKey = getMyCallActivityBusinessDayKeyForInstant(new Date(), wd);
      const yKey = getPreviousMyCallActivityAnchorDayKey(tKey, wd);
      setTodayKey(tKey);
      setYesterdayKey(yKey);

      const boundsFor = (dayKey: string) => {
        if (wd.useBusinessWorkday) {
          const w = resolveMyCallActivityWorkdayWindow(dayKey, wd);
          if (!w) return null;
          return { start: w.start, endExclusive: w.endExclusive };
        }
        const b = localCalendarDayBoundsForDayKey(dayKey);
        return b;
      };

      if (!yKey) {
        setError("Could not resolve yesterday for comparison.");
        setTodayTotal(0);
        setYesterdayTotal(0);
        setTodayConnected(0);
        setYesterdayConnected(0);
        return;
      }

      const bToday = boundsFor(tKey);
      const bYesterday = boundsFor(yKey);
      if (!bToday || !bYesterday) {
        setError("Invalid workday or date range.");
        setTodayTotal(0);
        setYesterdayTotal(0);
        setTodayConnected(0);
        setYesterdayConnected(0);
        return;
      }

      const [evToday, evYesterday] = await Promise.all([
        OutreachService.fetchMyCallEventsForInstantRange(
          companyId,
          userId,
          bToday.start,
          bToday.endExclusive,
        ),
        OutreachService.fetchMyCallEventsForInstantRange(
          companyId,
          userId,
          bYesterday.start,
          bYesterday.endExclusive,
        ),
      ]);

      setTodayTotal(evToday.length);
      setYesterdayTotal(evYesterday.length);
      setTodayConnected(countConnected(evToday));
      setYesterdayConnected(countConnected(evYesterday));
    } catch (e) {
      console.error("[DashboardCallActivityMonitor]", e);
      setError("Could not load call activity.");
      setTodayTotal(0);
      setYesterdayTotal(0);
      setTodayConnected(0);
      setYesterdayConnected(0);
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, settingsLoaded, savedWorkday]);

  useEffect(() => {
    void loadPair();
  }, [loadPair]);

  const wd = mergeMyCallActivityWorkdaySettings(savedWorkday);
  const delta = todayTotal - yesterdayTotal;
  const deltaConnected = todayConnected - yesterdayConnected;

  let verdict: string;
  if (todayTotal > yesterdayTotal) {
    verdict = "Today is ahead on total calls.";
  } else if (yesterdayTotal > todayTotal) {
    verdict = "Yesterday had more total calls.";
  } else if (todayConnected > yesterdayConnected) {
    verdict = "Same total calls: today has more connected calls.";
  } else if (yesterdayConnected > todayConnected) {
    verdict = "Same total calls: yesterday had more connected calls.";
  } else {
    verdict = "Same pace on totals and connected calls.";
  }

  const shiftHint = wd.useBusinessWorkday
    ? `Using your company business shift (${wd.timezone}).`
    : "Using local calendar days in your browser time zone.";

  return (
    <DashboardSection
      title="Your call activity"
      description={`Quick monitor: today vs the prior day (${shiftHint}) No date filter here. Open Performance for the full report.`}
      headerAction={
        hasPageAccess(PAGES.PERFORMANCE) ? (
          <Link
            to="/performance"
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 shadow-sm transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/40"
          >
            Performance
            <span aria-hidden>→</span>
          </Link>
        ) : undefined
      }
    >
      {!settingsLoaded || loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Today
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                {todayTotal}
                <span className="ml-2 text-sm font-medium text-emerald-800/90 dark:text-emerald-200/90">
                  calls
                </span>
              </p>
              <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200/80">
                Connected: {todayConnected}
                {todayKey ? ` · anchor ${todayKey}` : null}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Yesterday
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {yesterdayTotal}
                <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  calls
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Connected: {yesterdayConnected}
                {yesterdayKey ? ` · anchor ${yesterdayKey}` : null}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200/90 bg-white/90 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{verdict}</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Difference vs yesterday:{" "}
              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {delta >= 0 ? "+" : ""}
                {delta}
              </span>{" "}
              total calls,{" "}
              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {deltaConnected >= 0 ? "+" : ""}
                {deltaConnected}
              </span>{" "}
              connected.
            </p>
          </div>
        </div>
      )}
    </DashboardSection>
  );
};

export default DashboardCallActivityMonitor;
