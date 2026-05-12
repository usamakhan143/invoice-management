import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardSection from "../DashboardSection";
import Spinner from "../Spinner";
import type { AssigneeAssignmentLog, Lead } from "../../types";
import { AssigneeAssignmentLogService } from "../../services/assigneeAssignmentLogService";
import { LeadService } from "../../services/leadService";
import { OutreachService } from "../../services/outreachService";
import { formatLocalDayKey, parseLocalDayKey } from "../../utils/localDayKey";

const DATE_FIELD =
  "mt-1 w-full max-w-[11rem] rounded-lg border text-sm text-gray-900 bg-white border-gray-300 shadow-sm " +
  "dark:text-gray-50 dark:bg-gray-950 dark:border-gray-500 dark:[color-scheme:dark] px-3 py-2";

function leadHasFollowUpScheduled(l: Lead | undefined): boolean {
  if (!l) return false;
  const fu = l.nextFollowUpDate?.toMillis?.();
  return fu != null && !Number.isNaN(fu);
}

async function resolveLeadsWithCallLogged(companyId: string, leadIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(leadIds.filter(Boolean))];
  const out = new Set<string>();
  if (unique.length === 0) return out;

  const fromOutreach = await OutreachService.getLeadIdsWithCallOutreach(companyId, unique);
  fromOutreach.forEach((id) => out.add(id));

  const missing = unique.filter((id) => !out.has(id));
  const chunkSize = 25;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const flags = await Promise.all(chunk.map((id) => LeadService.hasAnyLegacyCallLog(id)));
    chunk.forEach((id, j) => {
      if (flags[j]) out.add(id);
    });
  }
  return out;
}

export type LeadAssignmentDailyReportMode = "team" | "self";

interface LeadAssignmentDailyReportProps {
  mode: LeadAssignmentDailyReportMode;
  companyId: string;
  /** Required when mode === "self" */
  selfUserId?: string;
  leads: Lead[];
  assigneeLabels: { uid: string; label: string }[];
}

const linkPillClass =
  "inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium " +
  "text-primary-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 " +
  "dark:text-primary-300 dark:hover:bg-gray-700";

const LeadAssignmentDailyReport: React.FC<LeadAssignmentDailyReportProps> = ({
  mode,
  companyId,
  selfUserId,
  leads,
  assigneeLabels,
}) => {
  const [fromDay, setFromDay] = useState(() => {
    const t = new Date();
    const d = new Date(t);
    d.setDate(d.getDate() - 29);
    return formatLocalDayKey(d);
  });
  const [toDay, setToDay] = useState(() => formatLocalDayKey(new Date()));

  const [logs, setLogs] = useState<AssigneeAssignmentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [callLeadIds, setCallLeadIds] = useState<Set<string>>(() => new Set());

  const leadsById = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leads) m.set(l.id, l);
    return m;
  }, [leads]);

  const labelForUid = useCallback(
    (uid: string) => assigneeLabels.find((a) => a.uid === uid)?.label || uid,
    [assigneeLabels],
  );

  const loadLogs = useCallback(async () => {
    if (!companyId.trim()) return;
    if (mode === "self" && !(selfUserId || "").trim()) return;

    const from = parseLocalDayKey(fromDay);
    const to = parseLocalDayKey(toDay);
    if (!from || !to || from > to) {
      setLoadError("Invalid date range.");
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const rows =
        mode === "team"
          ? await AssigneeAssignmentLogService.fetchForCompany(companyId, fromDay, toDay)
          : await AssigneeAssignmentLogService.fetchForAssignee(
              companyId,
              selfUserId!,
              fromDay,
              toDay,
            );
      setLogs(rows);
    } catch (e) {
      console.error("[LeadAssignmentDailyReport]", e);
      setLoadError("Could not load assignment history.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, fromDay, toDay, mode, selfUserId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const uniqueLeadIdsFromLogs = [...new Set(logs.map((r) => r.leadId))];
    if (!companyId.trim() || uniqueLeadIdsFromLogs.length === 0) {
      setCallLeadIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const set = await resolveLeadsWithCallLogged(companyId, uniqueLeadIdsFromLogs);
        if (!cancelled) setCallLeadIds(set);
      } catch (e) {
        console.error("[LeadAssignmentDailyReport] call flags", e);
        if (!cancelled) setCallLeadIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, logs]);

  type Row = {
    dayKey: string;
    assigneeUserId: string;
    assigneeLabel: string;
    assignedDistinct: number;
    called: number;
    withFollowUp: number;
  };

  const tableRows: Row[] = useMemo(() => {
    const cell = new Map<string, Set<string>>();
    for (const r of logs) {
      const key = `${r.dayKey}\t${r.assigneeUserId}`;
      if (!cell.has(key)) cell.set(key, new Set());
      cell.get(key)!.add(r.leadId);
    }

    const out: Row[] = [];
    for (const [key, leadSet] of cell) {
      const [dayKey, assigneeUserId] = key.split("\t");

      let called = 0;
      let withFollowUp = 0;
      for (const lid of leadSet) {
        if (callLeadIds.has(lid)) called += 1;
        const lead = leadsById.get(lid);
        if (leadHasFollowUpScheduled(lead)) withFollowUp += 1;
      }

      out.push({
        dayKey,
        assigneeUserId,
        assigneeLabel: labelForUid(assigneeUserId),
        assignedDistinct: leadSet.size,
        called,
        withFollowUp,
      });
    }

    out.sort((a, b) => {
      if (a.dayKey !== b.dayKey) return a.dayKey < b.dayKey ? 1 : -1;
      return a.assigneeLabel.localeCompare(b.assigneeLabel, undefined, { sensitivity: "base" });
    });
    return out;
  }, [logs, callLeadIds, leadsById, labelForUid]);

  const totals = useMemo(() => {
    let assigned = 0;
    let called = 0;
    let fu = 0;
    for (const r of tableRows) {
      assigned += r.assignedDistinct;
      called += r.called;
      fu += r.withFollowUp;
    }
    return { rows: tableRows.length, assigned, called, fu };
  }, [tableRows]);

  const title =
    mode === "team" ? "Daily assignment report (team)" : "My daily assignment progress";
  const description =
    mode === "team"
      ? "Each row is one team member on one calendar day: distinct leads assigned that day, how many of those leads now have a call logged, and how many have a follow-up scheduled. Data is recorded from now onward when leads are assigned."
      : "Your assignment activity by day: distinct leads assigned to you, how many of those now have a call logged, and how many have a follow-up. Only new assignments are logged after this update.";

  return (
    <DashboardSection
      title={title}
      description={description}
      headerAction={
        <Link to="/leads" className={linkPillClass}>
          Leads →
        </Link>
      }
      bodyClassName="!py-0 sm:!py-0"
    >
      <div className="flex flex-col gap-4 border-b border-gray-200/90 px-5 py-4 dark:border-gray-700 sm:px-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block min-w-0">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">From</span>
            <input
              type="date"
              value={fromDay}
              onChange={(e) => setFromDay(e.target.value)}
              className={DATE_FIELD}
            />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">To</span>
            <input
              type="date"
              value={toDay}
              onChange={(e) => setToDay(e.target.value)}
              className={DATE_FIELD}
            />
          </label>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Dates use your browser&apos;s local calendar. Totals across visible rows:{" "}
          <strong>{totals.assigned}</strong> lead-day assignments (sum of distinct leads per row),{" "}
          <strong>{totals.called}</strong> with call logged, <strong>{totals.fu}</strong> with follow-up
          (current lead state).
        </p>
        {loadError ? <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p> : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : tableRows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400 sm:px-6">
          No assignment events in this range yet. Assignments are logged automatically when someone
          saves a new assignee on a lead.
        </p>
      ) : (
        <div className="table-responsive -mx-5 w-full min-w-0 sm:-mx-6">
          <table className="w-full min-w-[720px] text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="border-b border-gray-200/90 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Date</th>
                {mode === "team" ? (
                  <th className="px-3 py-3 font-medium">Team member</th>
                ) : null}
                <th className="px-3 py-3 text-right font-medium">Leads assigned</th>
                <th className="px-3 py-3 text-right font-medium">Call logged</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">Follow-up set</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
              {tableRows.map((row) => (
                <tr
                  key={`${row.dayKey}-${row.assigneeUserId}`}
                  className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white sm:px-6 whitespace-nowrap">
                    {row.dayKey}
                  </td>
                  {mode === "team" ? (
                    <td className="px-3 py-3 text-gray-900 dark:text-white">{row.assigneeLabel}</td>
                  ) : null}
                  <td className="px-3 py-3 text-right tabular-nums">{row.assignedDistinct}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.called}</td>
                  <td className="px-5 py-3 text-right tabular-nums sm:px-6">{row.withFollowUp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  );
};

export default LeadAssignmentDailyReport;
