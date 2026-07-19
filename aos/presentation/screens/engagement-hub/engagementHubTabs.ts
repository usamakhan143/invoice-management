/**
 * ST-04 Engagement Hub tab definitions — URL segments sync with EngagementTabBar.
 */
export interface EngagementHubTabDefinition {
  id: string;
  label: string;
  path: string;
}

export const ENGAGEMENT_HUB_TABS: readonly EngagementHubTabDefinition[] = [
  { id: "overview", label: "Overview", path: "" },
  { id: "requirements", label: "Requirements", path: "requirements" },
  { id: "reuse", label: "Reuse", path: "reuse" },
  { id: "prompts", label: "Prompts", path: "prompts" },
  { id: "cursor", label: "Cursor", path: "cursor" },
  { id: "evaluation", label: "Evaluation", path: "evaluation" },
  { id: "qa", label: "QA / Handoff", path: "qa" },
  { id: "retrospective", label: "Retrospective", path: "retrospective" },
] as const;

export function getEngagementHubBasePath(engagementId: string): string {
  return `/aos/delivery/${engagementId}`;
}

export function getEngagementHubTabPath(engagementId: string, tabPath: string): string {
  const base = getEngagementHubBasePath(engagementId);
  return tabPath ? `${base}/${tabPath}` : base;
}

export function resolveEngagementHubTabId(pathname: string, engagementId: string): string {
  const base = getEngagementHubBasePath(engagementId);
  const suffix = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";
  const match = ENGAGEMENT_HUB_TABS.find((tab) => tab.path === suffix);
  return match?.id ?? "overview";
}
