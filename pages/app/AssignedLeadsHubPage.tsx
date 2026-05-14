import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type firebase from "firebase/compat/app";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { useCompanyUserOptions } from "../../hooks/useCompanyUserOptions";
import { LeadService } from "../../services/leadService";
import { OutreachService } from "../../services/outreachService";
import { Timestamp } from "../../services/firebase";
import type { Lead, LeadStatus, OutreachEvent } from "../../types";
import Spinner from "../../components/Spinner";
import { localCalendarDayBoundsForDayKey } from "../../utils/myCallActivityBusinessDay";

const PAGE_SIZE = 40;
const LEAD_STATUS_OPTIONS: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

type QDoc = firebase.firestore.QueryDocumentSnapshot;

function formatTs(ts: firebase.firestore.Timestamp | undefined | null): string {
  if (!ts?.toDate) return "—";
  try {
    return ts.toDate().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Won":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "Lost":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    case "New":
      return "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
}

function outcomeBadgeClass(outcome: string): string {
  switch (outcome) {
    case "Connected":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "No Answer":
    case "Busy":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "Wrong Number":
    case "Hangup":
      return "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100";
    case "Voicemail":
      return "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

const AssignedLeadsHubPage: React.FC = () => {
  usePageTitle("Assigned leads");

  const { user, userProfile } = useAuth();
  const {
    canAccessAssignedLeadsHubPage,
    canImportLeads,
  } = usePermissions();
  const companyUsers = useCompanyUserOptions(user, userProfile);

  const companyId = userProfile?.isOwner ? user?.uid ?? "" : userProfile?.companyId ?? "";

  const labelByUid = useMemo(() => {
    const m = new Map<string, string>();
    companyUsers.forEach((u) => m.set(u.uid, u.label));
    return m;
  }, [companyUsers]);

  const mayView = canAccessAssignedLeadsHubPage();

  const [assigneeFilter, setAssigneeFilter] = useState(""); // "" = all assignees
  const [dateFromKey, setDateFromKey] = useState("");
  const [dateToKey, setDateToKey] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [latestOutcomeFilter, setLatestOutcomeFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");

  /** Trail of startAfter cursors: trail[i] is cursor starting page i+1 (trail[0] always null). */
  const [pageStarts, setPageStarts] = useState<(QDoc | null)[]>([null]);

  const [rows, setRows] = useState<Lead[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [endDoc, setEndDoc] = useState<QDoc | null>(null);

  const [callCounts, setCallCounts] = useState<Map<string, number>>(() => new Map());
  const [latestCallByLead, setLatestCallByLead] = useState<Map<string, OutreachEvent | null>>(
    () => new Map(),
  );
  const [assignedAtByLead, setAssignedAtByLead] = useState<Map<string, firebase.firestore.Timestamp | null>>(
    () => new Map(),
  );
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [callRowsByLead, setCallRowsByLead] = useState<Map<string, OutreachEvent[]>>(() => new Map());
  const [detailModalLoadingLeadId, setDetailModalLoadingLeadId] = useState<string | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof LeadService.summarizeAssignedLeadsCompany>
  > | null>(null);

  const pageIdx = pageStarts.length - 1;
  const startAfterDoc = pageStarts[pageIdx] ?? null;

  const useUpdatedAtFilter = !!(assigneeFilter.trim() && dateFromKey && dateToKey);

  const updatedFromTs = useMemo(() => {
    if (!dateFromKey) return null;
    const b = localCalendarDayBoundsForDayKey(dateFromKey);
    if (!b) return null;
    return Timestamp.fromDate(b.start);
  }, [dateFromKey]);

  const updatedToExclusiveTs = useMemo(() => {
    if (!dateToKey) return null;
    const b = localCalendarDayBoundsForDayKey(dateToKey);
    if (!b) return null;
    return Timestamp.fromDate(b.endExclusive);
  }, [dateToKey]);

  const resetPagination = useCallback(() => {
    setPageStarts([null]);
    setRows([]);
    setEndDoc(null);
    setHasMore(false);
    setCallCounts(new Map());
    setLatestCallByLead(new Map());
    setAssignedAtByLead(new Map());
    setDetailLeadId(null);
    setCallRowsByLead(new Map());
  }, []);

  useEffect(() => {
    resetPagination();
  }, [assigneeFilter, dateFromKey, dateToKey, companyId, resetPagination]);

  useEffect(() => {
    if (!mayView || !companyId) return;
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void (async () => {
      try {
        const fromExclusive =
          dateFromKey && dateToKey && dateFromKey > dateToKey
            ? { err: "From date must be on or before To date." as const }
            : null;
        if (fromExclusive?.err) {
          setListError(fromExclusive.err);
          setListLoading(false);
          return;
        }
        if (useUpdatedAtFilter && (!updatedFromTs || !updatedToExclusiveTs)) {
          setListError("Pick both From and To dates when filtering by updated date, or clear dates.");
          setListLoading(false);
          return;
        }
        const res = await LeadService.fetchAssignedLeadsPage(companyId, {
          pageSize: PAGE_SIZE,
          startAfterDoc,
          assigneeUserId: assigneeFilter,
          updatedFrom: useUpdatedAtFilter ? updatedFromTs : null,
          updatedToExclusive: useUpdatedAtFilter ? updatedToExclusiveTs : null,
        });
        if (cancelled) return;
        setRows(res.leads);
        setEndDoc(res.endDoc);
        setHasMore(res.hasMore);
        setListError(null);

        const ids = res.leads.map((l) => l.id);
        if (ids.length > 0) {
          const [counts, latestCalls, assignmentPairs] = await Promise.all([
            OutreachService.fetchCallChannelCountsForLeads(companyId, ids),
            OutreachService.fetchLatestCallEventsForLeads(companyId, ids, { concurrency: 8 }),
            mapWithConcurrency(res.leads, 10, async (l) => {
              const uid = (l.assignedUserId || "").trim();
              const ts = uid
                ? await LeadService.getLastAssignmentToUserAsAssignee(l.id, uid)
                : null;
              return [l.id, ts] as const;
            }),
          ]);
          if (!cancelled) {
            setCallCounts(counts);
            setLatestCallByLead(latestCalls);
            setAssignedAtByLead(new Map(assignmentPairs));
          }
        } else {
          setCallCounts(new Map());
          setLatestCallByLead(new Map());
          setAssignedAtByLead(new Map());
        }
      } catch (e) {
        console.error("[AssignedLeadsHub]", e);
        if (!cancelled) setListError("Could not load leads.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    mayView,
    companyId,
    startAfterDoc,
    assigneeFilter,
    useUpdatedAtFilter,
    updatedFromTs,
    updatedToExclusiveTs,
    dateFromKey,
    dateToKey,
  ]);

  const loadSummary = useCallback(async () => {
    if (!companyId || !mayView) return;
    setSummaryLoading(true);
    try {
      const s = await LeadService.summarizeAssignedLeadsCompany(companyId, { maxDocs: 3000 });
      setSummary(s);
    } catch (e) {
      console.error("[AssignedLeadsHub] summary", e);
    } finally {
      setSummaryLoading(false);
    }
  }, [companyId, mayView]);

  const openDetailModal = useCallback(
    async (leadId: string) => {
      setDetailLeadId(leadId);
      if (!companyId) return;
      if (callRowsByLead.has(leadId)) return;
      setDetailModalLoadingLeadId(leadId);
      try {
        const m = await OutreachService.fetchCallEventsForLeads(companyId, [leadId], {
          maxPerLead: 40,
          concurrency: 1,
        });
        setCallRowsByLead((prev) => {
          const next = new Map(prev);
          next.set(leadId, m.get(leadId) ?? []);
          return next;
        });
      } finally {
        setDetailModalLoadingLeadId(null);
      }
    },
    [companyId, callRowsByLead],
  );

  const closeDetailModal = useCallback(() => {
    setDetailLeadId(null);
    setDetailModalLoadingLeadId(null);
  }, []);

  useEffect(() => {
    if (!detailLeadId) return;
    if (!rows.some((r) => r.id === detailLeadId)) {
      setDetailLeadId(null);
    }
  }, [rows, detailLeadId]);

  if (!userProfile || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!mayView) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned leads</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          You need the <strong>Assigned leads hub</strong> permission (under Leads in role settings), plus{" "}
          <strong>access to leads</strong> and <strong>view all company leads</strong>.
        </p>
      </div>
    );
  }

  const topCountries = summary
    ? Object.entries(summary.byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];
  const topCategories = summary
    ? Object.entries(summary.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];

  const uniqueCountries = [...new Set(rows.map((l) => (l.country || "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const uniqueCategories = [...new Set(rows.map((l) => (l.category || "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const uniqueLatestOutcomes = [
    ...new Set(
      rows
        .map((l) => (latestCallByLead.get(l.id)?.outcome || "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const visibleRows = rows.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (countryFilter && (l.country || "").trim() !== countryFilter) return false;
    if (categoryFilter && (l.category || "").trim() !== categoryFilter) return false;
    const calls = callCounts.get(l.id) ?? 0;
    const latest = latestCallByLead.get(l.id);
    const latestOutcome = (latest?.outcome || "").trim();
    if (latestOutcomeFilter && latestOutcome !== latestOutcomeFilter) return false;
    if (activityFilter === "called" && calls === 0) return false;
    if (activityFilter === "not_called" && calls > 0) return false;
    if (activityFilter === "repeated" && calls <= 1) return false;
    if (activityFilter === "follow_up" && !l.nextFollowUpDate?.toMillis?.()) return false;
    if (activityFilter === "closed" && l.status !== "Won" && l.status !== "Lost") return false;
    return true;
  });

  const visibleStats = visibleRows.reduce(
    (acc, l) => {
      const calls = callCounts.get(l.id) ?? 0;
      acc.calls += calls;
      if (calls > 0) acc.calledLeads += 1;
      if (calls > 1) acc.repeatedLeads += 1;
      if (l.nextFollowUpDate?.toMillis?.()) acc.followUps += 1;
      if (l.status === "Won" || l.status === "Lost") acc.closed += 1;
      return acc;
    },
    { calls: 0, calledLeads: 0, repeatedLeads: 0, followUps: 0, closed: 0 },
  );

  const detailLead = detailLeadId ? rows.find((r) => r.id === detailLeadId) : undefined;

  const clearDetailFilters = () => {
    setStatusFilter("");
    setCountryFilter("");
    setCategoryFilter("");
    setLatestOutcomeFilter("");
    setActivityFilter("");
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assigned leads</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Owner tracking view for sales agents: assignment timing, category / country mix, call effort,
            last call outcome, caller, and follow-up / closed status. The list stays paginated so large
            datasets do not load all at once.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/leads"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            All leads
          </Link>
          {canImportLeads() ? (
            <Link
              to="/leads/import"
              className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200"
            >
              Import
            </Link>
          ) : null}
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-600 dark:bg-gray-900/40">
        <div className="flex flex-wrap items-end gap-4">
        <label className="block min-w-[12rem]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Assignee
          </span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
          >
            <option value="">All assignees</option>
            {companyUsers.map((o) => (
              <option key={o.uid} value={o.uid}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Updated between (optional — requires assignee)
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateFromKey}
              onChange={(e) => setDateFromKey(e.target.value)}
              disabled={!assigneeFilter.trim()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateToKey}
              onChange={(e) => setDateToKey(e.target.value)}
              disabled={!assigneeFilter.trim()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Uses lead <code className="text-[10px]">updatedAt</code> (older leads without it won’t match).
          </p>
        </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            >
              <option value="">All statuses</option>
              {LEAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Country
            </span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            >
              <option value="">All countries</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            >
              <option value="">All categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Last outcome
            </span>
            <select
              value={latestOutcomeFilter}
              onChange={(e) => setLatestOutcomeFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            >
              <option value="">All outcomes</option>
              {uniqueLatestOutcomes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Activity
            </span>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-white"
            >
              <option value="">All activity</option>
              <option value="called">Called</option>
              <option value="not_called">Not called</option>
              <option value="repeated">Repeated calls</option>
              <option value="follow_up">Follow-up set</option>
              <option value="closed">Closed (Won/Lost)</option>
            </select>
          </label>
        </div>
        {(statusFilter || countryFilter || categoryFilter || latestOutcomeFilter || activityFilter) ? (
          <button
            type="button"
            onClick={clearDetailFilters}
            className="text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
          >
            Clear detail filters
          </button>
        ) : null}
      </div>

      {/* Summary block */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Company totals (assigned only)</h2>
          <button
            type="button"
            disabled={summaryLoading}
            onClick={() => void loadSummary()}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            {summaryLoading ? "Scanning…" : summary ? "Refresh company stats" : "Load company stats"}
          </button>
        </div>
        {summary ? (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Scanned <strong className="tabular-nums">{summary.totalScanned}</strong> assigned lead
              {summary.totalScanned === 1 ? "" : "s"}
              {summary.capped ? " (cap reached — totals are partial)" : " (complete scan)"}.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2 dark:border-sky-800/50 dark:bg-sky-950/30">
                <div className="text-[11px] font-semibold uppercase text-sky-800 dark:text-sky-300">Follow-up set</div>
                <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {summary.withFollowUp}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                <div className="text-[11px] font-semibold uppercase text-emerald-800 dark:text-emerald-300">Closed won</div>
                <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {summary.closedWon}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2 dark:border-rose-800/50 dark:bg-rose-950/30">
                <div className="text-[11px] font-semibold uppercase text-rose-800 dark:text-rose-300">Closed lost</div>
                <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {summary.closedLost}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">By country</h3>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {topCountries.map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2 tabular-nums">
                      <span className="truncate text-gray-700 dark:text-gray-300">{k}</span>
                      <span className="text-gray-500">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">By category</h3>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {topCategories.map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2 tabular-nums">
                      <span className="truncate text-gray-700 dark:text-gray-300">{k}</span>
                      <span className="text-gray-500">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Load stats to see follow-ups, closed counts, and top countries/categories across assigned leads.
          </p>
        )}
      </section>

      {listError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {listError}
        </p>
      ) : null}

      {listLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Visible leads
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {visibleRows.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">of {rows.length} on this page</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 shadow-sm dark:border-indigo-800/50 dark:bg-indigo-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                Calls
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {visibleStats.calls}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{visibleStats.calledLeads} leads called</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-800/50 dark:bg-amber-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Repeated
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {visibleStats.repeatedLeads}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">called more than once</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                Follow-ups
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {visibleStats.followUps}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">visible leads</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Closed
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {visibleStats.closed}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Won / Lost</p>
            </div>
          </section>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Lead</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Assignee</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Assigned</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">Calls</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">
                      No assigned leads for this filter.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((l) => {
                    const uid = (l.assignedUserId || "").trim();
                    const callN = callCounts.get(l.id) ?? 0;
                    const assignedAt = assignedAtByLead.get(l.id) ?? null;
                    return (
                      <tr key={l.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 align-top">
                          <Link
                            to={`/leads/${l.id}`}
                            className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                          >
                            {(l.name || l.company || "Lead").trim() || l.id.slice(0, 8)}
                          </Link>
                          {l.company && l.name ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{l.company}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top text-gray-800 dark:text-gray-200">
                          {uid ? labelByUid.get(uid) ?? uid.slice(0, 8) : "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-gray-600 dark:text-gray-400">
                          {formatTs(assignedAt)}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(l.status)}`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums text-gray-900 dark:text-white">
                          {callN}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(l.id)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {detailLead ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assigned-hub-detail-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeDetailModal();
              }}
            >
              <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-600 dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const l = detailLead;
                  const uid = (l.assignedUserId || "").trim();
                  const callN = callCounts.get(l.id) ?? 0;
                  const latest = latestCallByLead.get(l.id) ?? null;
                  const latestOutcome = (latest?.outcome || "").trim();
                  const lastCallerUid = (latest?.createdByUserId || "").trim();
                  const lastCaller =
                    labelByUid.get(lastCallerUid) ||
                    latest?.createdByDisplayName ||
                    (lastCallerUid ? lastCallerUid.slice(0, 8) : "—");
                  const assignedAt = assignedAtByLead.get(l.id) ?? null;
                  const detailLoading = detailModalLoadingLeadId === l.id;
                  return (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                        <div>
                          <h2
                            id="assigned-hub-detail-title"
                            className="text-lg font-semibold text-gray-900 dark:text-white"
                          >
                            {(l.name || l.company || "Lead").trim() || l.id.slice(0, 8)}
                          </h2>
                          {l.company && l.name ? (
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{l.company}</p>
                          ) : null}
                          <Link
                            to={`/leads/${l.id}`}
                            className="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
                            onClick={closeDetailModal}
                          >
                            Open lead page →
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={closeDetailModal}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Close
                        </button>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Assignee
                          </dt>
                          <dd className="mt-0.5 text-gray-900 dark:text-white">
                            {uid ? labelByUid.get(uid) ?? uid.slice(0, 8) : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Assigned at
                          </dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{formatTs(assignedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Status
                          </dt>
                          <dd className="mt-0.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(l.status)}`}
                            >
                              {l.status}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Calls (outreach)
                          </dt>
                          <dd className="mt-0.5 tabular-nums text-gray-900 dark:text-white">{callN}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Country
                          </dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                            {(l.country || "").trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Category
                          </dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                            {(l.category || "").trim() || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Last outcome
                          </dt>
                          <dd className="mt-0.5">
                            {latestOutcome ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${outcomeBadgeClass(latestOutcome)}`}
                              >
                                {latestOutcome}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">No outcome</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Last caller
                          </dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{latest ? lastCaller : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Last call
                          </dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                            {formatTs(latest?.createdAt ?? null)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Follow-up
                          </dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                            {formatTs(l.nextFollowUpDate ?? null)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Call log (workspace) — newest first
                        </p>
                        {detailLoading ? (
                          <div className="flex justify-center py-8">
                            <Spinner />
                          </div>
                        ) : (callRowsByLead.get(l.id) ?? []).length === 0 ? (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            No outreach calls on file for this lead.
                          </p>
                        ) : (
                          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
                            {(callRowsByLead.get(l.id) ?? []).map((ev) => (
                              <li
                                key={ev.id}
                                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-950/50"
                              >
                                <span className="font-mono text-gray-500">{formatTs(ev.createdAt)}</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {(() => {
                                    const euid = (ev.createdByUserId || "").trim();
                                    return (
                                      labelByUid.get(euid) ||
                                      ev.createdByDisplayName ||
                                      euid.slice(0, 8) ||
                                      "—"
                                    );
                                  })()}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {(ev.outcome || "—").trim()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                          Call counts on the list use outreach call events only (not legacy subcollection call logs).
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page <span className="font-semibold tabular-nums">{pageIdx + 1}</span>
              {hasMore || pageIdx > 0 ? (
                <>
                  {" "}
                  · <span className="tabular-nums">{rows.length}</span> rows
                </>
              ) : null}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pageStarts.length <= 1 || listLoading}
                onClick={() => setPageStarts((p) => (p.length <= 1 ? p : p.slice(0, -1)))}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasMore || !endDoc || listLoading}
                onClick={() => {
                  if (!endDoc) return;
                  setPageStarts((p) => [...p, endDoc]);
                }}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignedLeadsHubPage;
