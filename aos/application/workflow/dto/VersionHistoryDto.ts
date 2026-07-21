/** Read models for version history queries (E3 UI). */

export interface RequirementVersionHistoryDto {
  id: string;
  engagementId: string;
  requirementSetId: string;
  versionNumber: number;
  publishedAt: number;
  publishedByUserId: string;
  title: string;
  itemCount: number;
  supersedesVersionId?: string;
  isCurrent?: boolean;
}

export interface RequirementVersionDetailDto extends RequirementVersionHistoryDto {
  items: readonly {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria?: string;
  }[];
  attachmentRefs?: readonly string[];
}

export interface PromptVersionHistoryDto {
  id: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  requirementVersionId: string;
  versionNumber: number;
  publishedAt: number;
  publishedByUserId: string;
  title: string;
  isCurrent?: boolean;
}

export interface PromptVersionDetailDto extends PromptVersionHistoryDto {
  body: string;
}

export interface CursorSessionHistoryDto {
  id: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  promptVersionId: string;
  status: string;
  startedAt: number;
  finalizedAt?: number;
  captureSummary?: string;
  readOnly: boolean;
}

export interface CursorRevisionHistoryDto {
  id: string;
  cursorSessionId: string;
  originalPromptVersionId: string;
  revisionPromptVersionId?: string;
  status: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface EvaluationHistoryDto {
  id: string;
  engagementId: string;
  cursorSessionId: string;
  promptVersionId: string;
  requirementVersionId: string;
  rubricVersionId: string;
  rubricName: string;
  status: string;
  scorePercent: number;
  passed: boolean;
  createdAt: number;
  confirmedAt?: number;
  confirmedByUserId?: string;
  overrideReason?: string;
  amendsEvaluationId?: string;
  readOnly: boolean;
}

export interface EvaluationDetailDto extends EvaluationHistoryDto {
  criteria: readonly {
    id: string;
    label: string;
    passed: boolean;
    score: number;
  }[];
  rubricCriteriaLabels: readonly string[];
}

export interface DeliveryTraceabilityRefsDto {
  requirementVersionId?: string;
  requirementVersionNumber?: number;
  promptVersionId?: string;
  promptVersionNumber?: number;
  cursorSessionId?: string;
  evaluationId?: string;
  rubricVersionId?: string;
}
