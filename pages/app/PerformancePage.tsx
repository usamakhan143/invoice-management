import React, { useEffect, useState } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { PAGES } from "../../config/permissions";
import { db } from "../../services/firebase";
import { LeadService } from "../../services/leadService";
import type { Lead, CompanyUser } from "../../types";
import LeadAssignmentDailyReport from "../../components/dashboard/LeadAssignmentDailyReport";
import MyTodayCallActivity from "../../components/dashboard/MyTodayCallActivity";
import Spinner from "../../components/Spinner";

const tabBtn =
  "rounded-xl px-4 py-2 text-sm font-semibold transition " +
  "border border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 ";
const tabBtnActive =
  "border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-100 ";

const PerformancePage: React.FC = () => {
  usePageTitle("Performance");
  const { user, userProfile } = useAuth();
  const {
    hasPageAccess,
    canViewPerformanceAssignmentReportMy,
    canViewPerformanceAssignmentReportTeam,
    canViewMyCallActivity,
    canAccessLeadsPage,
  } = usePermissions();

  /** Team report: only this Performance perm + basic Leads access. Do not require view-all/assign; that blocked normal agents. */
  const teamPerfMode =
    canViewPerformanceAssignmentReportTeam() && canAccessLeadsPage();
  const selfPerfMode = canViewPerformanceAssignmentReportMy();

  const [myAssignedLeads, setMyAssignedLeads] = useState<Lead[]>([]);
  const [companyLeadsTeamView, setCompanyLeadsTeamView] = useState<Lead[]>([]);
  const [teamAssigneeLabels, setTeamAssigneeLabels] = useState<{ uid: string; label: string }[]>(
    [],
  );
  const [assignmentTab, setAssignmentTab] = useState<"self" | "team">("self");

  useEffect(() => {
    if (selfPerfMode && !teamPerfMode) setAssignmentTab("self");
    else if (!selfPerfMode && teamPerfMode) setAssignmentTab("team");
    else if (selfPerfMode && teamPerfMode) setAssignmentTab("self");
  }, [selfPerfMode, teamPerfMode]);

  useEffect(() => {
    if (!user || !userProfile || !selfPerfMode) return;
    const unsub = LeadService.getLeadsAssignedToMeRealTime(user, userProfile, setMyAssignedLeads);
    return () => unsub();
  }, [user, userProfile, selfPerfMode]);

  useEffect(() => {
    if (!user || !userProfile || !teamPerfMode) return;
    const unsub = LeadService.getLeadsRealTime(user, userProfile, true, setCompanyLeadsTeamView);
    return () => unsub();
  }, [user, userProfile, teamPerfMode]);

  useEffect(() => {
    if (!teamPerfMode || !user || !userProfile) return;
    const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;
    if (!companyId) return;

    const load = async () => {
      const out: { uid: string; label: string }[] = [];
      const ownerSnap = await db.collection("users").doc(companyId).get();
      if (ownerSnap.exists) {
        const d = ownerSnap.data();
        out.push({
          uid: companyId,
          label: d?.displayName || d?.companyName || "Owner",
        });
      }
      const snap = await db.collection("companyUsers").where("companyId", "==", companyId).get();
      snap.docs.forEach((docSnap) => {
        const u = docSnap.data() as CompanyUser;
        const uid = u.uid || docSnap.id;
        if (!out.some((x) => x.uid === uid)) {
          out.push({
            uid,
            label: u.displayName || u.email || uid,
          });
        }
      });
      if (!out.some((x) => x.uid === user.uid)) {
        out.push({
          uid: user.uid,
          label: userProfile.displayName || userProfile.email || "Me",
        });
      }
      setTeamAssigneeLabels(out);
    };
    void load();
  }, [teamPerfMode, user, userProfile]);

  const assignmentReportCompanyId = userProfile?.isOwner
    ? (user?.uid ?? "")
    : (userProfile?.companyId ?? "");

  const showAssignmentBlock = selfPerfMode || teamPerfMode;
  const showCallActivity = canViewMyCallActivity();
  const hasContent = showAssignmentBlock || showCallActivity;

  if (!userProfile || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!hasPageAccess(PAGES.PERFORMANCE)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 text-4xl" aria-hidden>
          🔒
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Ask your administrator to turn on Performance hub access for your role (and the assignment
          / call sections you need). Without hub access, the Performance area is hidden even if other
          toggles are on.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Deeper view of assignment history and call outcomes. Use the dashboard for a same-day vs
          prior-day call snapshot only.
        </p>
      </header>

      {!hasContent ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/30">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No Performance sections are enabled for your role. Your administrator can grant
            assignment report and/or call activity permissions.
          </p>
        </div>
      ) : null}

      {showAssignmentBlock && assignmentReportCompanyId ? (
        <div className="space-y-4">
          {selfPerfMode && teamPerfMode ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={assignmentTab === "self" ? tabBtn + tabBtnActive : tabBtn}
                onClick={() => setAssignmentTab("self")}
              >
                My assignment progress
              </button>
              <button
                type="button"
                className={assignmentTab === "team" ? tabBtn + tabBtnActive : tabBtn}
                onClick={() => setAssignmentTab("team")}
              >
                Team assignment progress
              </button>
            </div>
          ) : null}

          {selfPerfMode && (!teamPerfMode || assignmentTab === "self") ? (
            <LeadAssignmentDailyReport
              mode="self"
              companyId={assignmentReportCompanyId}
              selfUserId={user.uid}
              leads={myAssignedLeads}
              assigneeLabels={[
                {
                  uid: user.uid,
                  label: userProfile.displayName || userProfile.email || "Me",
                },
              ]}
            />
          ) : null}

          {teamPerfMode && (!selfPerfMode || assignmentTab === "team") ? (
            <LeadAssignmentDailyReport
              mode="team"
              companyId={assignmentReportCompanyId}
              leads={companyLeadsTeamView}
              assigneeLabels={teamAssigneeLabels}
            />
          ) : null}
        </div>
      ) : null}

      {showCallActivity && assignmentReportCompanyId ? (
        <MyTodayCallActivity companyId={assignmentReportCompanyId} userId={user.uid} />
      ) : null}
    </div>
  );
};

export default PerformancePage;
