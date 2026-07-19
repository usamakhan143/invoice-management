/**
 * Engagement workflow read models — presentation/application DTOs.
 * Not persistence documents; backed by in-memory workflow store until Stage D+ repos land.
 */

export type WorkflowArtifactStatus = "empty" | "draft" | "in_review" | "approved" | "running" | "passed" | "failed";

export interface RequirementItemDto {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria?: string;
}

export interface RequirementSetDto {
  id: string;
  engagementId: string;
  version: number;
  status: WorkflowArtifactStatus;
  title: string;
  items: RequirementItemDto[];
  aiGenerated: boolean;
  approvalNote?: string;
  approvedAt?: number;
  updatedAt: number;
}

export interface ReuseModuleDecisionDto {
  moduleId: string;
  moduleName: string;
  matchScore: number;
  decision: "pending" | "accepted" | "rejected";
  justification?: string;
  source: "registry" | "knowledge";
}

export interface ReuseAssessmentDto {
  id: string;
  engagementId: string;
  status: WorkflowArtifactStatus;
  reuseRate: number;
  lastRunAt?: number;
  modules: ReuseModuleDecisionDto[];
  netNewJustification?: string;
  recordedAt?: number;
}

export interface PromptArtifactDto {
  id: string;
  title: string;
  body: string;
}

export interface PromptPackDto {
  id: string;
  engagementId: string;
  version: number;
  status: WorkflowArtifactStatus;
  title: string;
  artifacts: PromptArtifactDto[];
  aiGenerated: boolean;
  approvalNote?: string;
  approvedAt?: number;
  updatedAt: number;
}

export interface CursorSessionDto {
  id: string;
  engagementId: string;
  promptPackId: string;
  status: "active" | "awaiting_capture" | "submitted" | "abandoned";
  captureSummary?: string;
  startedAt: number;
  submittedAt?: number;
}

export interface EvaluationCriterionDto {
  id: string;
  label: string;
  passed: boolean;
  score: number;
}

export interface EvaluationDto {
  id: string;
  engagementId: string;
  status: WorkflowArtifactStatus;
  rubricName: string;
  scorePercent: number;
  passed: boolean;
  criteria: EvaluationCriterionDto[];
  ranAt?: number;
}

export interface QaChecklistItemDto {
  id: string;
  label: string;
  checked: boolean;
}

export interface QualityReportDto {
  id: string;
  engagementId: string;
  status: WorkflowArtifactStatus;
  checklist: QaChecklistItemDto[];
  summaryNotes?: string;
  approvedAt?: number;
}

export interface RetrospectiveLessonDto {
  id: string;
  text: string;
  promotionTarget?: "knowledge" | "registry";
}

export interface RetrospectiveDto {
  id: string;
  engagementId: string;
  status: WorkflowArtifactStatus;
  lessons: RetrospectiveLessonDto[];
  aiGenerated: boolean;
  approvalNote?: string;
  approvedAt?: number;
}

export interface TimelineEventDto {
  id: string;
  engagementId: string;
  type: string;
  title: string;
  actorLabel: string;
  timestamp: number;
}

export interface WorkflowGateStatusDto {
  requirementsApproved: boolean;
  reuseRecorded: boolean;
  promptPackApproved: boolean;
  cursorSubmitted: boolean;
  evaluationPassed: boolean;
  qaComplete: boolean;
  retrospectiveComplete: boolean;
}

export interface EngagementWorkflowDto {
  engagementId: string;
  requirementSet: RequirementSetDto | null;
  reuseAssessment: ReuseAssessmentDto | null;
  promptPack: PromptPackDto | null;
  cursorSessions: CursorSessionDto[];
  evaluation: EvaluationDto | null;
  qualityReport: QualityReportDto | null;
  retrospective: RetrospectiveDto | null;
  timeline: TimelineEventDto[];
  gates: WorkflowGateStatusDto;
}
