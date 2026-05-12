import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import AgentWorkspaceModals, {
  type AgentWorkspaceModalMode,
} from "../../components/leads/AgentWorkspaceModals";
import { LeadService } from "../../services/leadService";
import { ActivityLogger } from "../../services/activityLogger";
import { OutreachService } from "../../services/outreachService";
import type { Lead, LeadStatus } from "../../types";
import LeadPitchReadyIcon, { leadHasPitchNotes } from "../../components/LeadPitchReadyIcon";

const MailIcon: React.FC<{ className?: string }> = ({ className = "text-current" }) => (
  <svg className={`w-4 h-4 shrink-0 ${className}`.trim()} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z"
    />
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className = "text-current" }) => (
  <svg className={`w-4 h-4 shrink-0 ${className}`.trim()} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 0 1 -2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function leadTitle(l: Lead): string {
  const n = (l.name || "").trim();
  const c = (l.company || "").trim();
  if (n && c) return `${n} · ${c}`;
  return n || c || "Untitled lead";
}

function statusPillClass(status: LeadStatus): string {
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

const ACTIVE_STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal Sent"];
const CLOSED_STATUSES: LeadStatus[] = ["Won", "Lost"];

function isClosedLead(l: Lead): boolean {
  return l.status === "Won" || l.status === "Lost";
}

/** Open leads with a scheduled next follow-up (excluded from Fresh queue). */
function leadHasFollowUpScheduled(l: Lead): boolean {
  const fu = l.nextFollowUpDate?.toMillis?.();
  return fu != null && !Number.isNaN(fu);
}

/** Customer created from lead, or lead linked to existing customer; ready for invoicing */
function leadHasCustomerOrLink(l: Lead): boolean {
  return !!(l.convertedCustomerId || "").trim() || !!(l.linkedCustomerId || "").trim();
}

type WorkspaceTab = "fresh" | "called" | "followups" | "closed";

const FILTER_FIELD =
  "mt-1 w-full rounded-lg border text-sm text-gray-900 bg-white border-gray-300 shadow-sm " +
  "placeholder:text-gray-500 " +
  "dark:text-gray-50 dark:bg-gray-950 dark:border-gray-500 dark:placeholder:text-gray-400 " +
  "dark:[color-scheme:dark] px-3 py-2";

const FILTER_OPT = "bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50";

type FollowFilter = "all" | "overdue" | "week" | "none";
type SortKey = "assigned" | "followup" | "name";

const WORKSPACE_PAGE_SIZE = 20;

/** Run async work with bounded parallelism (same total reads, less head-of-line blocking than tiny sequential chunks). */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const cap = Math.min(Math.max(1, limit), items.length);
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: cap }, () => worker()));
  return out;
}

function ShimmerLine({ className }: { className: string }) {
  return <div className={`my-workspace-shimmer ${className}`.trim()} aria-hidden />;
}

/** Full-page skeleton while assigned leads stream is connecting. */
function MyWorkspacePageSkeleton() {
  return (
    <div
      className="space-y-6 w-full min-w-0"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading your workspace</span>
      <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-600/80">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-white/60 dark:bg-gray-900/50 p-4 space-y-3 ring-1 ring-gray-200/60 dark:ring-gray-600/50"
          >
            <ShimmerLine className="h-4 w-28 rounded-lg" />
            <ShimmerLine className="h-3 w-full max-w-[11rem] rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 shadow-sm space-y-2"
          >
            <ShimmerLine className="h-3 w-24 rounded-md" />
            <ShimmerLine className="h-8 w-12 rounded-md" />
            <ShimmerLine className="h-3 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm p-4 sm:p-5 space-y-3 w-full min-w-0">
        <ShimmerLine className="h-3 w-32 rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 min-w-0">
              <ShimmerLine className="h-3 w-20 rounded-md" />
              <ShimmerLine className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <ShimmerLine className="h-3 w-56 max-w-full rounded-md" />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden w-full min-w-0">
        <div className="grid grid-cols-5 gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-600">
          {[0, 1, 2, 3, 4].map((i) => (
            <ShimmerLine key={i} className="h-3 w-12 sm:w-16 rounded-md" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <div
            key={r}
            className="grid grid-cols-5 gap-2 px-3 py-3.5 border-b border-gray-100 dark:border-gray-700/80 last:border-b-0 items-center"
          >
            <ShimmerLine className="h-4 col-span-2 rounded-md max-w-[14rem]" />
            <ShimmerLine className="h-4 w-20 rounded-md" />
            <ShimmerLine className="h-4 w-24 rounded-md" />
            <ShimmerLine className="h-9 w-full max-w-[5.5rem] rounded-lg justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** List area only: Fresh vs Call logged split still resolving. */
function MyWorkspaceQueueBodySkeleton() {
  return (
    <div
      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden min-w-0"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Preparing queue by call activity</span>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-900/40">
        <ShimmerLine className="h-4 w-64 max-w-full rounded-md" />
      </div>
      <div className="grid grid-cols-5 gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-600">
        {[0, 1, 2, 3, 4].map((i) => (
          <ShimmerLine key={i} className="h-3 w-12 sm:w-16 rounded-md" />
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5, 6].map((r) => (
        <div
          key={r}
          className="grid grid-cols-5 gap-2 px-3 py-3.5 border-b border-gray-100 dark:border-gray-700/80 last:border-b-0 items-center"
        >
          <ShimmerLine className="h-4 col-span-2 rounded-md max-w-[14rem]" />
          <ShimmerLine className="h-4 w-20 rounded-md" />
          <ShimmerLine className="h-4 w-24 rounded-md" />
          <ShimmerLine className="h-9 w-full max-w-[5.5rem] rounded-lg justify-self-end" />
        </div>
      ))}
    </div>
  );
}

const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  /** Shimmer bar instead of the main value (loading split or assignment dates). */
  valuePending?: boolean;
}> = ({ label, value, sub, valuePending }) => (
  <div
    className={`rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 shadow-sm ${valuePending ? "min-h-[5.5rem]" : ""}`.trim()}
  >
    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </p>
    {valuePending ? (
      <div className="mt-1.5 h-8 w-[3.25rem] sm:w-16 max-w-[40%]" aria-busy="true" aria-label="Loading">
        <ShimmerLine className="h-8 w-full rounded-md" />
      </div>
    ) : (
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
    )}
    {sub ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p> : null}
  </div>
);

const MyAssignedLeadsPage: React.FC = () => {
  usePageTitle("My workspace");
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const {
    canAccessMyAssignedLeadsPage,
    canAccessLeadsPage,
    canAgentQuickUpdateStatus,
    canAgentQuickLogCall,
    canAgentQuickSetFollowup,
    canDeleteLeadCallLogs,
    canApproveCallLogs,
    canAccessLeadConversionHub,
    canLinkLeadCustomer,
    canConvertWonLeadToCustomer,
    canCreateInvoiceFromLead,
    canCreateInvoice,
    isAdmin,
  } = usePermissions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [assignedAtMs, setAssignedAtMs] = useState<Map<string, number>>(new Map());
  const [loadingDates, setLoadingDates] = useState(false);

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("fresh");
  const [leadIdsWithCallActivity, setLeadIdsWithCallActivity] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadingCallFlags, setLoadingCallFlags] = useState(false);
  const [callActivityNonce, setCallActivityNonce] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LeadStatus>("");
  const [followFilter, setFollowFilter] = useState<FollowFilter>("all");
  const [filterPitchReady, setFilterPitchReady] = useState<"" | "ready" | "not_ready">("");
  const [sortKey, setSortKey] = useState<SortKey>("assigned");
  const [workspaceListPage, setWorkspaceListPage] = useState(1);

  const [modal, setModal] = useState<{ mode: AgentWorkspaceModalMode; leadId: string } | null>(null);
  /** Optional one-tap pipeline nudge after a connected call on a New lead */
  const [markContactedBannerLeadId, setMarkContactedBannerLeadId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const copyToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(async (text: string, kind: "email" | "phone") => {
    const t = text.trim();
    if (!t) return;
    const show = (msg: string) => {
      if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
      setCopyToast(msg);
      copyToastTimer.current = setTimeout(() => setCopyToast(null), 2000);
    };
    try {
      await navigator.clipboard.writeText(t);
      show(kind === "email" ? "Email copied" : "Phone number copied");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        show(kind === "email" ? "Email copied" : "Phone number copied");
      } catch {
        show("Could not copy");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
    };
  }, []);

  const openModal = (leadId: string, mode: AgentWorkspaceModalMode) => setModal({ leadId, mode });
  const closeModal = () => setModal(null);

  const modalLead = modal ? leads.find((l) => l.id === modal.leadId) ?? null : null;

  useEffect(() => {
    if (modal && !modalLead) closeModal();
  }, [modal, modalLead]);

  const mayAccessMyAssigned = canAccessMyAssignedLeadsPage();

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!mayAccessMyAssigned) {
      navigate("/");
    }
  }, [user, userProfile, mayAccessMyAssigned, navigate]);

  useEffect(() => {
    if (!user || !userProfile || !mayAccessMyAssigned) return;
    const unsub = LeadService.getLeadsAssignedToMeRealTime(user, userProfile, (rows) => {
      setLeads(rows);
      setLoadingList(false);
    });
    return () => unsub();
  }, [user, userProfile, mayAccessMyAssigned]);

  const workspaceCompanyId =
    user && userProfile ? LeadService.resolveCompanyId(user, userProfile) : "";

  const openLeadIdsKey = useMemo(
    () =>
      leads
        .filter((l) => !isClosedLead(l))
        .map((l) => l.id)
        .sort()
        .join("\u0001"),
    [leads],
  );

  useEffect(() => {
    if (!mayAccessMyAssigned || !workspaceCompanyId) {
      setLeadIdsWithCallActivity(new Set());
      setLoadingCallFlags(false);
      return;
    }
    const openIds = openLeadIdsKey ? openLeadIdsKey.split("\u0001") : [];
    if (openIds.length === 0) {
      setLeadIdsWithCallActivity(new Set());
      setLoadingCallFlags(false);
      return;
    }
    let cancelled = false;
    setLoadingCallFlags(true);
    void (async () => {
      try {
        const fromOutreach = await OutreachService.getLeadIdsWithCallOutreach(
          workspaceCompanyId,
          openIds,
        );
        const merged = new Set(fromOutreach);
        const missingLegacy = openIds.filter((id) => !merged.has(id));
        if (missingLegacy.length > 0 && !cancelled) {
          const flags = await mapWithConcurrency(missingLegacy, 24, (id) =>
            LeadService.hasAnyLegacyCallLog(id),
          );
          missingLegacy.forEach((id, j) => {
            if (flags[j]) merged.add(id);
          });
        }
        if (!cancelled) setLeadIdsWithCallActivity(merged);
      } catch (e) {
        console.error("[MyAssignedLeads] call activity flags:", e);
        if (!cancelled) setLeadIdsWithCallActivity(new Set());
      } finally {
        if (!cancelled) setLoadingCallFlags(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mayAccessMyAssigned, workspaceCompanyId, openLeadIdsKey, callActivityNonce]);

  const assignedLeadIdsKey = leads.map((l) => l.id).sort().join("\u0001");

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || leads.length === 0) {
      setAssignedAtMs(new Map());
      setLoadingDates(false);
      return;
    }
    let cancelled = false;
    setLoadingDates(true);
    const snapshotLeads = leads;
    (async () => {
      const tsMap = await LeadService.getLastAssignmentToUserAsAssigneeForLeads(
        snapshotLeads.map((l) => l.id),
        uid,
        { concurrency: 16 },
      );
      if (cancelled) return;
      const next = new Map<string, number>();
      for (const l of snapshotLeads) {
        const ev = tsMap.get(l.id);
        const ms =
          ev?.toMillis?.() ??
          l.updatedAt?.toMillis?.() ??
          l.createdAt?.toMillis?.() ??
          0;
        next.set(l.id, ms);
      }
      setAssignedAtMs(next);
      setLoadingDates(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leads ref changes every Firestore tick; assignedLeadIdsKey is the stable trigger
  }, [assignedLeadIdsKey, user?.uid]);

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;

  const queueLeads = useMemo(
    () => leads.filter((l) => !isClosedLead(l)),
    [leads],
  );
  const closedLeads = useMemo(() => leads.filter(isClosedLead), [leads]);

  const followUpQueueLeads = useMemo(
    () => queueLeads.filter(leadHasFollowUpScheduled),
    [queueLeads],
  );

  const freshQueueLeads = useMemo(
    () =>
      queueLeads.filter(
        (l) => !leadIdsWithCallActivity.has(l.id) && !leadHasFollowUpScheduled(l),
      ),
    [queueLeads, leadIdsWithCallActivity],
  );
  const calledQueueLeads = useMemo(
    () => queueLeads.filter((l) => leadIdsWithCallActivity.has(l.id)),
    [queueLeads, leadIdsWithCallActivity],
  );

  const filteredLeads = useMemo(() => {
    const sod = new Date();
    sod.setHours(0, 0, 0, 0);
    const startOfTodayMs = sod.getTime();

    const base =
      workspaceTab === "fresh"
        ? freshQueueLeads
        : workspaceTab === "called"
          ? calledQueueLeads
          : workspaceTab === "followups"
            ? followUpQueueLeads
            : closedLeads;
    let rows = base;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((l) => {
        return (
          (l.name || "").toLowerCase().includes(q) ||
          (l.company || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.phone || "").toLowerCase().includes(q) ||
          (l.source || "").toLowerCase().includes(q) ||
          (l.country || "").toLowerCase().includes(q) ||
          (l.category || "").toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter) {
      rows = rows.filter((l) => l.status === statusFilter);
    }
    if (followFilter !== "all") {
      rows = rows.filter((l) => {
        const fu = l.nextFollowUpDate?.toMillis?.();
        if (followFilter === "none") return fu == null || Number.isNaN(fu);
        if (fu == null || Number.isNaN(fu)) return false;
        const t = fu;
        if (followFilter === "overdue") return t < startOfTodayMs;
        if (followFilter === "week") return t <= sevenDaysAhead;
        return true;
      });
    }
    if (filterPitchReady === "ready") {
      rows = rows.filter((l) => leadHasPitchNotes(l.notes));
    } else if (filterPitchReady === "not_ready") {
      rows = rows.filter((l) => !leadHasPitchNotes(l.notes));
    }
    const out = [...rows];
    out.sort((a, b) => {
      if (sortKey === "name") {
        return leadTitle(a).localeCompare(leadTitle(b), undefined, { sensitivity: "base" });
      }
      if (sortKey === "followup") {
        const fa = a.nextFollowUpDate?.toMillis?.() ?? Infinity;
        const fb = b.nextFollowUpDate?.toMillis?.() ?? Infinity;
        return fa - fb;
      }
      const ta = assignedAtMs.get(a.id) ?? a.createdAt?.toMillis?.() ?? 0;
      const tb = assignedAtMs.get(b.id) ?? b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    return out;
  }, [
    workspaceTab,
    freshQueueLeads,
    calledQueueLeads,
    followUpQueueLeads,
    closedLeads,
    search,
    statusFilter,
    followFilter,
    filterPitchReady,
    sortKey,
    assignedAtMs,
    sevenDaysAhead,
  ]);

  const workspaceCallQueueIds = useMemo(() => filteredLeads.map((l) => l.id), [filteredLeads]);

  const handleWorkspaceCallSaveFinish = useCallback(
    (info: {
      andNext: boolean;
      nextLeadId: string | null;
      savedLeadId: string;
      offerMarkContacted: boolean;
    }) => {
      setCallActivityNonce((n) => n + 1);
      if (info.offerMarkContacted) setMarkContactedBannerLeadId(info.savedLeadId);
      if (info.andNext && info.nextLeadId) {
        setModal({ mode: "call", leadId: info.nextLeadId });
      } else if (info.andNext && !info.nextLeadId) {
        setModal(null);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (!modal || modal.mode !== "call") return;
    const id = modal.leadId;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-workspace-lead-row="${id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [modal?.leadId, modal?.mode]);

  const workspaceListTotalPages = Math.max(
    1,
    Math.ceil(filteredLeads.length / WORKSPACE_PAGE_SIZE),
  );

  useEffect(() => {
    setWorkspaceListPage(1);
  }, [workspaceTab, search, statusFilter, followFilter, filterPitchReady, sortKey]);

  useEffect(() => {
    setWorkspaceListPage((p) => Math.min(Math.max(1, p), workspaceListTotalPages));
  }, [workspaceListTotalPages, filteredLeads.length]);

  const paginatedFilteredLeads = useMemo(() => {
    const start = (workspaceListPage - 1) * WORKSPACE_PAGE_SIZE;
    return filteredLeads.slice(start, start + WORKSPACE_PAGE_SIZE);
  }, [filteredLeads, workspaceListPage]);

  const paginationRangeLabel = useMemo(() => {
    if (filteredLeads.length === 0) return { from: 0, to: 0 };
    const from = (workspaceListPage - 1) * WORKSPACE_PAGE_SIZE + 1;
    const to = Math.min(workspaceListPage * WORKSPACE_PAGE_SIZE, filteredLeads.length);
    return { from, to };
  }, [filteredLeads.length, workspaceListPage]);

  const freshStats = useMemo(() => {
    let assignedWeek = 0;
    for (const l of freshQueueLeads) {
      const ams = assignedAtMs.get(l.id) ?? l.createdAt?.toMillis?.() ?? 0;
      if (ams >= weekAgo) assignedWeek += 1;
    }
    return {
      count: freshQueueLeads.length,
      assignedWeek,
      onFollowUpTab: followUpQueueLeads.length,
      calledOpen: calledQueueLeads.length,
    };
  }, [freshQueueLeads, followUpQueueLeads, calledQueueLeads, assignedAtMs, weekAgo]);

  const followUpTabStats = useMemo(() => {
    const sod = new Date();
    sod.setHours(0, 0, 0, 0);
    const startMs = sod.getTime();
    let overdue = 0;
    let dueWeek = 0;
    for (const l of followUpQueueLeads) {
      const fu = l.nextFollowUpDate?.toMillis?.();
      if (fu == null || Number.isNaN(fu)) continue;
      if (fu < startMs) overdue += 1;
      else if (fu <= sevenDaysAhead) dueWeek += 1;
    }
    return { count: followUpQueueLeads.length, overdue, dueWeek };
  }, [followUpQueueLeads, sevenDaysAhead]);

  const calledStats = useMemo(() => {
    let assignedWeek = 0;
    let followDue = 0;
    for (const l of calledQueueLeads) {
      const ams = assignedAtMs.get(l.id) ?? l.createdAt?.toMillis?.() ?? 0;
      if (ams >= weekAgo) assignedWeek += 1;
      const fu = l.nextFollowUpDate?.toMillis?.();
      if (fu != null && !Number.isNaN(fu) && fu <= sevenDaysAhead) followDue += 1;
    }
    return { count: calledQueueLeads.length, assignedWeek, followDue };
  }, [calledQueueLeads, assignedAtMs, weekAgo, sevenDaysAhead]);

  const closedStats = useMemo(() => {
    let won = 0;
    let lost = 0;
    for (const l of closedLeads) {
      if (l.status === "Won") won += 1;
      else lost += 1;
    }
    return { won, lost, total: closedLeads.length };
  }, [closedLeads]);

  /** Fresh vs Call logged buckets need outreach + legacy probes; until then counts would be wrong. */
  const callSplitReady = !loadingCallFlags || queueLeads.length === 0;
  const statsNeedSplit = !callSplitReady && queueLeads.length > 0;
  const statsNeedAssignmentDates = loadingDates && leads.length > 0;
  const showOpenQueueLoader =
    !loadingList &&
    (workspaceTab === "fresh" || workspaceTab === "called") &&
    loadingCallFlags &&
    queueLeads.length > 0;

  const groupedByDay = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const l of paginatedFilteredLeads) {
      const ms =
        workspaceTab === "followups"
          ? l.nextFollowUpDate?.toMillis?.() ??
            assignedAtMs.get(l.id) ??
            l.createdAt?.toMillis?.() ??
            Date.now()
          : assignedAtMs.get(l.id) ?? l.createdAt?.toMillis?.() ?? Date.now();
      const key = formatDayKey(ms);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    const keys = [...map.keys()].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
    return keys.map((key) => {
      const items = [...(map.get(key) ?? [])];
      const labelMs =
        items.length > 0
          ? workspaceTab === "followups"
            ? items[0].nextFollowUpDate?.toMillis?.() ??
              assignedAtMs.get(items[0].id) ??
              items[0].createdAt?.toMillis?.() ??
              Date.now()
            : assignedAtMs.get(items[0].id) ?? items[0].createdAt?.toMillis?.() ?? Date.now()
          : Date.now();
      items.sort((a, b) => {
        if (workspaceTab === "followups") {
          const fa = a.nextFollowUpDate?.toMillis?.() ?? Infinity;
          const fb = b.nextFollowUpDate?.toMillis?.() ?? Infinity;
          return fa - fb;
        }
        const ta = assignedAtMs.get(a.id) ?? a.createdAt?.toMillis?.() ?? 0;
        const tb = assignedAtMs.get(b.id) ?? b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      return { key, label: formatDayLabel(labelMs), items };
    });
  }, [paginatedFilteredLeads, assignedAtMs, workspaceTab]);

  if (!user || !userProfile) return null;
  if (!mayAccessMyAssigned) return null;

  const winRate =
    closedStats.won + closedStats.lost > 0
      ? Math.round((closedStats.won / (closedStats.won + closedStats.lost)) * 100)
      : null;

  const tabBaseCount =
    workspaceTab === "fresh"
      ? freshQueueLeads.length
      : workspaceTab === "called"
        ? calledQueueLeads.length
        : workspaceTab === "followups"
          ? followUpQueueLeads.length
          : closedLeads.length;
  const statusOptions: LeadStatus[] =
    workspaceTab === "closed" ? CLOSED_STATUSES : ACTIVE_STATUSES;

  const canStatus = canAgentQuickUpdateStatus();
  const canCall = canAgentQuickLogCall();
  const canFollow = canAgentQuickSetFollowup();
  const canDelCallLog = canDeleteLeadCallLogs();
  const canApproveCallLog = canApproveCallLogs();
  const showFullLeadLink = canAccessLeadsPage();
  /** Owner / company admin: keep Status, Call, F/U on closed leads for corrections */
  const privilegedWorkspace = userProfile.isOwner === true || isAdmin;
  const conversionHubAllowed = canAccessLeadConversionHub();
  const canLinkCust = canLinkLeadCustomer();
  const canConvertWon = canConvertWonLeadToCustomer();
  const canInvoiceShortcut = canCreateInvoiceFromLead() && canCreateInvoice();

  const followLabel = (l: Lead) => {
    const sod = new Date();
    sod.setHours(0, 0, 0, 0);
    const startMs = sod.getTime();
    const fu = l.nextFollowUpDate?.toMillis?.();
    if (fu == null || Number.isNaN(fu)) return "No follow-up set";
    const d = new Date(fu);
    if (fu < startMs) return `Overdue · ${d.toLocaleString()}`;
    if (fu <= sevenDaysAhead) return `Due soon · ${d.toLocaleString()}`;
    return `Follow-up · ${d.toLocaleString()}`;
  };

  return (
    <div className="mobile-p-4 p-4 sm:p-6 w-full min-w-0 max-w-6xl mx-auto pb-16">
      {user && userProfile && modal && modalLead ? (
        <AgentWorkspaceModals
          lead={modalLead}
          mode={modal.mode}
          onClose={closeModal}
          user={user}
          userProfile={userProfile}
          canUpdateStatus={canStatus}
          canLogCall={canCall}
          canDeleteCallLog={canDelCallLog}
          canApproveCallLog={canApproveCallLog}
          canSetFollowup={canFollow}
          canAccessLeadConversionHub={conversionHubAllowed}
          onOutreachTimelineChanged={() => setCallActivityNonce((n) => n + 1)}
          workspaceCallQueueIds={workspaceCallQueueIds}
          onWorkspaceCallSaveFinish={handleWorkspaceCallSaveFinish}
        />
      ) : null}

      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            My workspace
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            {workspaceTab === "fresh"
              ? "Fresh queue: open leads with no call logged and no follow-up date yet. Set F/U or log a call and the lead leaves this list."
              : workspaceTab === "called"
                ? "Open leads you’ve already called: follow up, update status, or log another touch. Won and Lost stay under Closed."
                : workspaceTab === "followups"
                  ? "All open leads with a next follow-up scheduled, grouped by that date so nothing slips. They are not listed in Fresh queue."
                  : "Won and Lost history. For deals you won, finish by linking or creating a customer so you can invoice."}
          </p>
          {loadingDates && leads.length > 0 ? (
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">Syncing assignment dates…</p>
          ) : null}
          {loadingCallFlags && queueLeads.length > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Updating call-logged lists…
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showFullLeadLink ? (
            <Link
              to="/leads"
              className="text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              All leads
            </Link>
          ) : null}
        </div>
      </div>

      {loadingList ? (
        <MyWorkspacePageSkeleton />
      ) : (
        <>
          <div
            className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-600/80 mb-6"
            role="tablist"
            aria-label="Lead workspace"
          >
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === "fresh"}
              onClick={() => {
                setWorkspaceTab("fresh");
                setStatusFilter("");
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left sm:text-center ${
                workspaceTab === "fresh"
                  ? "bg-white dark:bg-gray-900 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span className="block">Fresh queue</span>
              <span className="text-xs font-normal opacity-90 mt-0.5 inline-flex flex-wrap items-center gap-x-1 gap-y-1 justify-start sm:justify-center w-full sm:w-auto">
                {callSplitReady ? (
                  <span>{freshQueueLeads.length} untouched</span>
                ) : (
                  <ShimmerLine className="h-3.5 w-9 sm:w-10 rounded shrink-0" />
                )}
                <span className="text-gray-400 dark:text-gray-500">·</span>
                <span>{queueLeads.length} open total</span>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === "called"}
              onClick={() => {
                setWorkspaceTab("called");
                setStatusFilter("");
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left sm:text-center ${
                workspaceTab === "called"
                  ? "bg-white dark:bg-gray-900 text-indigo-800 dark:text-indigo-200 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span className="block">Call logged</span>
              <span className="text-xs font-normal opacity-90 mt-0.5 inline-flex flex-wrap items-center gap-x-1 gap-y-1 justify-start sm:justify-center w-full sm:w-auto">
                {callSplitReady ? (
                  <span>{calledQueueLeads.length} open</span>
                ) : (
                  <ShimmerLine className="h-3.5 w-9 sm:w-10 rounded shrink-0" />
                )}
                <span className="text-gray-400 dark:text-gray-500">·</span>
                <span>call or legacy log</span>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === "followups"}
              onClick={() => {
                setWorkspaceTab("followups");
                setStatusFilter("");
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left sm:text-center ${
                workspaceTab === "followups"
                  ? "bg-white dark:bg-gray-900 text-amber-800 dark:text-amber-200 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span className="block">Follow-ups</span>
              <span className="block text-xs font-normal opacity-90 mt-0.5">
                {followUpQueueLeads.length} scheduled · open only
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === "closed"}
              onClick={() => {
                setWorkspaceTab("closed");
                setStatusFilter("");
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left sm:text-center ${
                workspaceTab === "closed"
                  ? "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span className="block">Closed</span>
              <span className="block text-xs font-normal opacity-90 mt-0.5">
                Won / Lost · {closedLeads.length} total
              </span>
            </button>
          </div>

          {workspaceTab === "fresh" ? (
            <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Fresh leads"
                value={freshStats.count}
                valuePending={statsNeedSplit}
                sub="No call · no F/U date"
              />
              <StatCard
                label="New here (7d)"
                value={freshStats.assignedWeek}
                valuePending={statsNeedSplit || statsNeedAssignmentDates}
                sub="By assignment date"
              />
              <StatCard label="Follow-ups tab" value={freshStats.onFollowUpTab} sub="Scheduled F/U" />
              <StatCard
                label="Call logged (open)"
                value={freshStats.calledOpen}
                valuePending={statsNeedSplit}
                sub="See Call logged tab"
              />
            </div>
          ) : workspaceTab === "called" ? (
            <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Call logged"
                value={calledStats.count}
                valuePending={statsNeedSplit}
                sub="Still in pipeline"
              />
              <StatCard
                label="Follow-ups"
                value={calledStats.followDue}
                valuePending={statsNeedSplit}
                sub="Next 7d or overdue"
              />
              <StatCard
                label="New here (7d)"
                value={calledStats.assignedWeek}
                valuePending={statsNeedSplit || statsNeedAssignmentDates}
                sub="By assignment date"
              />
              <StatCard label="Follow-ups tab" value={followUpTabStats.count} sub="See Follow-ups tab" />
            </div>
          ) : workspaceTab === "followups" ? (
            <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Scheduled" value={followUpTabStats.count} sub="Open pipeline" />
              <StatCard label="Overdue" value={followUpTabStats.overdue} sub="Before today" />
              <StatCard label="Due ≤ 7 days" value={followUpTabStats.dueWeek} sub="From today onward" />
              <StatCard
                label="Fresh (open)"
                value={freshStats.count}
                valuePending={statsNeedSplit}
                sub="No F/U date yet"
              />
            </div>
          ) : (
            <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Closed total" value={closedStats.total} sub="Won + Lost" />
              <StatCard label="Won" value={closedStats.won} />
              <StatCard label="Lost" value={closedStats.lost} />
              <StatCard
                label="Win rate"
                value={winRate != null ? `${winRate}%` : "-"}
                sub={winRate != null ? `${closedStats.won} won / ${closedStats.total} closed` : "No closed yet"}
              />
            </div>
          )}

          {leads.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 shadow-sm p-4 sm:p-5 mb-8 w-full min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Filters &amp; sort
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Search</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, company, email, phone…"
                    className={FILTER_FIELD}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter((e.target.value || "") as "" | LeadStatus)}
                    className={FILTER_FIELD}
                  >
                    <option value="" className={FILTER_OPT}>
                      All {workspaceTab === "closed" ? "closed" : "open"} statuses
                    </option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s} className={FILTER_OPT}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Follow-up</span>
                  <select
                    value={followFilter}
                    onChange={(e) => setFollowFilter(e.target.value as FollowFilter)}
                    className={FILTER_FIELD}
                  >
                    <option value="all" className={FILTER_OPT}>
                      All
                    </option>
                    <option value="overdue" className={FILTER_OPT}>
                      Overdue
                    </option>
                    <option value="week" className={FILTER_OPT}>
                      Due within 7 days
                    </option>
                    <option value="none" className={FILTER_OPT}>
                      None set
                    </option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Call-ready (notes)</span>
                  <select
                    value={filterPitchReady}
                    onChange={(e) => setFilterPitchReady((e.target.value || "") as "" | "ready" | "not_ready")}
                    className={FILTER_FIELD}
                  >
                    <option value="" className={FILTER_OPT}>
                      All
                    </option>
                    <option value="ready" className={FILTER_OPT}>
                      Has notes (ready)
                    </option>
                    <option value="not_ready" className={FILTER_OPT}>
                      No notes
                    </option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Sort</span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className={FILTER_FIELD}
                  >
                    <option value="assigned" className={FILTER_OPT}>
                      Assignment date (newest)
                    </option>
                    <option value="followup" className={FILTER_OPT}>
                      Follow-up date (soonest first)
                    </option>
                    <option value="name" className={FILTER_OPT}>
                      Name (A-Z)
                    </option>
                  </select>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                {filteredLeads.length === 0 ? (
                  <>
                    No leads match the current filters · {tabBaseCount} in{" "}
                    {workspaceTab === "fresh"
                      ? "fresh queue"
                      : workspaceTab === "called"
                        ? "call logged"
                        : workspaceTab === "followups"
                          ? "follow-ups"
                          : "closed"}{" "}
                    ({leads.length} assigned overall)
                  </>
                ) : (
                  <>
                    Showing <strong>{paginationRangeLabel.from}</strong> to <strong>{paginationRangeLabel.to}</strong> of{" "}
                    <strong>{filteredLeads.length}</strong> on this page (max {WORKSPACE_PAGE_SIZE} per page) ·{" "}
                    {tabBaseCount} in{" "}
                    {workspaceTab === "fresh"
                      ? "fresh queue"
                      : workspaceTab === "called"
                        ? "call logged"
                        : workspaceTab === "followups"
                          ? "follow-ups"
                          : "closed"}{" "}
                    ({leads.length} assigned overall)
                  </>
                )}
              </p>
            </div>
          ) : null}

          {showOpenQueueLoader ? (
            <div className="w-full space-y-3">
              <MyWorkspaceQueueBodySkeleton />
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 px-2">
                Preparing Fresh vs Call logged split (outreach and legacy call checks).
              </p>
            </div>
          ) : leads.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center text-gray-600 dark:text-gray-400">
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Nothing in your queue yet</p>
              <p className="text-sm mt-2 max-w-3xl mx-auto">
                When a manager assigns leads to you, they appear here instantly. You&apos;ll be able to work them with
                the actions on each card.
              </p>
            </div>
          ) : workspaceTab !== "closed" && queueLeads.length === 0 ? (
            <div className="w-full rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/25 p-10 text-center">
              <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-lg">Queue clear</p>
              <p className="text-sm text-emerald-800/90 dark:text-emerald-200/90 mt-2 max-w-3xl mx-auto">
                You don&apos;t have any open leads right now; everything assigned to you is already{" "}
                <strong>Won</strong> or <strong>Lost</strong>.
              </p>
              {closedLeads.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceTab("closed");
                    setStatusFilter("");
                  }}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-700 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  View closed leads ({closedLeads.length})
                </button>
              ) : null}
            </div>
          ) : workspaceTab === "fresh" &&
            freshQueueLeads.length === 0 &&
            queueLeads.length > 0 ? (
            <div className="w-full rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/25 p-10 text-center">
              <p className="font-semibold text-sky-900 dark:text-sky-100 text-lg">Fresh queue is clear</p>
              <p className="text-sm text-sky-900/85 dark:text-sky-200/90 mt-2 max-w-3xl mx-auto">
                Every open lead already has a call logged and/or a follow-up date. Use{" "}
                <strong>Call logged</strong> or <strong>Follow-ups</strong> to keep working them.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {calledQueueLeads.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceTab("called");
                      setStatusFilter("");
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    Call logged ({calledQueueLeads.length})
                  </button>
                ) : null}
                {followUpQueueLeads.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceTab("followups");
                      setStatusFilter("");
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-amber-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
                  >
                    Follow-ups ({followUpQueueLeads.length})
                  </button>
                ) : null}
              </div>
            </div>
          ) : workspaceTab === "called" &&
            calledQueueLeads.length === 0 &&
            queueLeads.length > 0 ? (
            <div className="w-full rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-10 text-center">
              <p className="font-semibold text-indigo-900 dark:text-indigo-100 text-lg">No call logs on open leads yet</p>
              <p className="text-sm text-indigo-900/85 dark:text-indigo-200/90 mt-2 max-w-3xl mx-auto">
                Log a call from the workspace on a lead in <strong>Fresh queue</strong> and it will appear here.
              </p>
              {freshQueueLeads.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceTab("fresh");
                    setStatusFilter("");
                  }}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-primary-700"
                >
                  Back to Fresh queue ({freshQueueLeads.length})
                </button>
              ) : null}
            </div>
          ) : workspaceTab === "followups" &&
            followUpQueueLeads.length === 0 &&
            queueLeads.length > 0 ? (
            <div className="w-full rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-10 text-center">
              <p className="font-semibold text-amber-900 dark:text-amber-100 text-lg">No follow-ups on open leads</p>
              <p className="text-sm text-amber-900/85 dark:text-amber-200/90 mt-2 max-w-3xl mx-auto">
                Set a next follow-up from a lead card (F/U) or from the call modal; then it appears here and leaves
                Fresh queue.
              </p>
              {freshQueueLeads.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceTab("fresh");
                    setStatusFilter("");
                  }}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-primary-700"
                >
                  Fresh queue ({freshQueueLeads.length})
                </button>
              ) : null}
            </div>
          ) : workspaceTab === "closed" && closedLeads.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-800 dark:text-gray-200">No closed leads yet</p>
              <p className="text-sm mt-2 max-w-3xl mx-auto">
                Won and Lost leads show up here so they stay out of your working queue.
              </p>
              {queueLeads.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceTab("fresh");
                    setStatusFilter("");
                  }}
                  className="mt-4 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Back to Fresh queue ({queueLeads.length} open)
                </button>
              ) : null}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-10 text-center">
              <p className="font-medium text-gray-800 dark:text-gray-200">No leads match your filters</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setFollowFilter("all");
                  setFilterPitchReady("");
                }}
                className="mt-3 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="w-full min-w-0 space-y-8">
              {groupedByDay.map(({ key, label, items }) => (
                <section key={key} aria-labelledby={`day-${key}`}>
                  <h2
                    id={`day-${key}`}
                    className="text-sm font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2 mb-3 flex flex-wrap items-baseline gap-2"
                  >
                    {label}
                    {workspaceTab === "followups" ? (
                      <span className="font-normal text-amber-700 dark:text-amber-300 text-xs">
                        (follow-up date)
                      </span>
                    ) : null}
                    <span className="font-normal text-gray-500 dark:text-gray-400">
                      · {items.length} lead{items.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/70 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            <th className="px-3 py-2 font-semibold w-[22%]">Lead</th>
                            <th className="px-3 py-2 font-semibold w-[7rem]">Contact</th>
                            <th className="px-3 py-2 font-semibold whitespace-nowrap w-[11%]">Status</th>
                            <th className="px-3 py-2 font-semibold min-w-[9rem]">Follow-up</th>
                            <th className="px-3 py-2 font-semibold text-right whitespace-nowrap">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((l) => {
                            const name = (l.name || "").trim();
                            const company = (l.company || "").trim();
                            const em = (l.email || "").trim();
                            const ph = (l.phone || "").trim();
                            const sod = new Date();
                            sod.setHours(0, 0, 0, 0);
                            const startMs = sod.getTime();
                            const fu = l.nextFollowUpDate?.toMillis?.();
                            let followClass =
                              "text-gray-600 dark:text-gray-300 max-w-[14rem] truncate";
                            if (fu == null || Number.isNaN(fu)) {
                              followClass = "text-gray-500 dark:text-gray-400 max-w-[14rem] truncate";
                            } else if (fu < startMs) {
                              followClass = "text-red-600 dark:text-red-400 max-w-[14rem] truncate font-medium";
                            } else if (fu <= sevenDaysAhead) {
                              followClass =
                                "text-amber-700 dark:text-amber-300 max-w-[14rem] truncate font-medium";
                            }
                            return (
                              <tr
                                key={l.id}
                                data-workspace-lead-row={l.id}
                                className="border-b border-gray-100 dark:border-gray-700/80 last:border-0 hover:bg-gray-50/90 dark:hover:bg-gray-800/50 align-top"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    {leadHasPitchNotes(l.notes) ? (
                                      <span className="shrink-0 pt-0.5">
                                        <LeadPitchReadyIcon />
                                      </span>
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-gray-900 dark:text-white leading-snug">
                                        {name || company || "-"}
                                      </div>
                                      {name && company ? (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                          {company}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    {em ? (
                                      <button
                                        type="button"
                                        title={`Copy email (${em})`}
                                        aria-label="Copy email address"
                                        onClick={() => void copyToClipboard(em, "email")}
                                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                                      >
                                        <MailIcon className="text-current" />
                                      </button>
                                    ) : null}
                                    {ph ? (
                                      <button
                                        type="button"
                                        title="Copy phone number"
                                        aria-label="Copy phone number"
                                        onClick={() => void copyToClipboard(ph, "phone")}
                                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                                      >
                                        <PhoneIcon className="text-current" />
                                      </button>
                                    ) : null}
                                    {!em && !ph ? (
                                      <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(l.status)}`}
                                  >
                                    {l.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={followClass} title={followLabel(l)}>
                                    {followLabel(l)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right align-top">
                                  {(() => {
                                    const hidePipelineClosedNormal =
                                      workspaceTab === "closed" &&
                                      !privilegedWorkspace &&
                                      (l.status === "Won" || l.status === "Lost");
                                    const closedWonBillingRow =
                                      workspaceTab === "closed" &&
                                      !privilegedWorkspace &&
                                      l.status === "Won";
                                    return (
                                      <div
                                        className={
                                          closedWonBillingRow
                                            ? "flex flex-col items-end gap-2 max-w-[16rem] ml-auto"
                                            : "inline-flex flex-col items-end gap-1"
                                        }
                                      >
                                        <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                                          {workspaceTab !== "closed" ? (
                                            <button
                                              type="button"
                                              onClick={() => openModal(l.id, "details")}
                                              className="shrink-0 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-[11px] font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/80"
                                            >
                                              Details
                                            </button>
                                          ) : null}
                                          {!hidePipelineClosedNormal && canStatus ? (
                                            <button
                                              type="button"
                                              onClick={() => openModal(l.id, "status")}
                                              className="shrink-0 rounded-md bg-primary-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-primary-700"
                                            >
                                              Status
                                            </button>
                                          ) : null}
                                          {!hidePipelineClosedNormal && canCall ? (
                                            <button
                                              type="button"
                                              onClick={() => openModal(l.id, "call")}
                                              className="shrink-0 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-[11px] font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/80"
                                            >
                                              Call
                                            </button>
                                          ) : null}
                                          {!hidePipelineClosedNormal && canFollow ? (
                                            <button
                                              type="button"
                                              onClick={() => openModal(l.id, "followup")}
                                              className="shrink-0 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-[11px] font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/80"
                                            >
                                              F/U
                                            </button>
                                          ) : null}
                                          {showFullLeadLink ? (
                                            <Link
                                              to={`/leads/${l.id}`}
                                              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/30"
                                            >
                                              Full
                                            </Link>
                                          ) : null}
                                        </div>
                                        {closedWonBillingRow ? (
                                          <div className="w-full rounded-lg border border-emerald-200/90 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/25 px-2 py-2 text-left">
                                            {!leadHasCustomerOrLink(l) ? (
                                              <>
                                                <p className="text-[10px] text-emerald-900/90 dark:text-emerald-100/90 leading-snug font-medium">
                                                  No customer on this deal yet. Link an existing contact or create one to
                                                  enable invoicing.
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                                                  {canLinkCust ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => navigate(`/leads/${l.id}?tab=details`)}
                                                      className="rounded-md border border-emerald-600/40 dark:border-emerald-500/40 bg-white dark:bg-gray-900 px-2 py-1 text-[10px] font-semibold text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40"
                                                    >
                                                      Link customer
                                                    </button>
                                                  ) : null}
                                                  {canConvertWon ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => navigate(`/leads/${l.id}?tab=conversion`)}
                                                      className="rounded-md bg-emerald-700 dark:bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-800 dark:hover:bg-emerald-500"
                                                    >
                                                      Convert to customer
                                                    </button>
                                                  ) : null}
                                                  {!canLinkCust && !canConvertWon && conversionHubAllowed ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => navigate(`/leads/${l.id}?tab=conversion`)}
                                                      className="rounded-md bg-emerald-700 dark:bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-800 dark:hover:bg-emerald-500"
                                                    >
                                                      Set up billing
                                                    </button>
                                                  ) : null}
                                                  {!canLinkCust && !canConvertWon && !conversionHubAllowed ? (
                                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 text-right w-full">
                                                      Ask your admin for lead conversion permissions.
                                                    </p>
                                                  ) : null}
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <p className="text-[10px] text-emerald-900/90 dark:text-emerald-100/90 font-medium">
                                                  Customer on file. You can create an invoice.
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                                                  {canInvoiceShortcut ? (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        navigate("/invoices/new", {
                                                          state: {
                                                            customerId: (
                                                              l.convertedCustomerId ||
                                                              l.linkedCustomerId ||
                                                              ""
                                                            ).trim(),
                                                            fromLeadConversion: true,
                                                          },
                                                        })
                                                      }
                                                      className="rounded-md bg-primary-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-primary-700"
                                                    >
                                                      New invoice
                                                    </button>
                                                  ) : null}
                                                  <button
                                                    type="button"
                                                    onClick={() => navigate(`/leads/${l.id}?tab=conversion`)}
                                                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/80"
                                                  >
                                                    {canInvoiceShortcut ? "Lead page" : "Open billing"}
                                                  </button>
                                                </div>
                                                {!canInvoiceShortcut ? (
                                                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 text-right">
                                                    Invoice shortcut needs separate permission; use Invoices or open the lead.
                                                  </p>
                                                ) : null}
                                              </>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ))}
              </div>
              {filteredLeads.length > 0 && workspaceListTotalPages > 1 ? (
                <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Page <span className="font-semibold tabular-nums">{workspaceListPage}</span> of{" "}
                    <span className="font-semibold tabular-nums">{workspaceListTotalPages}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      ({WORKSPACE_PAGE_SIZE} leads per page)
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={workspaceListPage <= 1}
                      onClick={() => setWorkspaceListPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={workspaceListPage >= workspaceListTotalPages}
                      onClick={() =>
                        setWorkspaceListPage((p) => Math.min(workspaceListTotalPages, p + 1))
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
      {copyToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
        >
          {copyToast}
        </div>
      ) : null}
      {markContactedBannerLeadId && user && userProfile && canStatus ? (
        <div
          role="dialog"
          aria-label="Pipeline quick update"
          className="fixed bottom-20 left-1/2 z-[70] w-[min(100%-1.5rem,26rem)] -translate-x-1/2 rounded-xl border border-primary-200 bg-white p-4 shadow-xl dark:border-primary-900/80 dark:bg-gray-900"
        >
          <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">
            You logged a <strong>connected</strong> call while this lead is still <strong>New</strong>. Move the deal to{" "}
            <strong>Contacted</strong> in one tap, or dismiss and use <strong>Status</strong> on the card anytime.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {(() => {
              const bl = leads.find((l) => l.id === markContactedBannerLeadId);
              return bl ? leadTitle(bl) : "Lead";
            })()}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => setMarkContactedBannerLeadId(null)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                const id = markContactedBannerLeadId;
                if (!id) return;
                void (async () => {
                  try {
                    await LeadService.updateLeadFields(id, { status: "Contacted" });
                    await ActivityLogger.logActivity(
                      user,
                      userProfile,
                      "lead_updated",
                      "Pipeline → Contacted (after connected call)",
                      { entityId: id, entityType: "lead" },
                    );
                    setMarkContactedBannerLeadId(null);
                    setCallActivityNonce((n) => n + 1);
                  } catch (e) {
                    console.error(e);
                    alert("Could not update pipeline");
                  }
                })();
              }}
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Mark Contacted
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MyAssignedLeadsPage;
