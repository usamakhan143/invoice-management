/** Queue projection read models — cross-engagement index views (ST-12–ST-15). */

export interface QueueRowBaseDto {
  engagementId: string;
  engagementTitle: string;
  clientLabel: string;
  updatedAt: number;
  tabHref: string;
}

export interface RequirementsQueueRowDto extends QueueRowBaseDto {
  setVersion: number;
  status: string;
  itemCount: number;
}

export interface PromptsQueueRowDto extends QueueRowBaseDto {
  packVersion: number;
  status: string;
  artifactCount: number;
}

export interface CursorQueueRowDto extends QueueRowBaseDto {
  sessionId: string;
  artifactLabel: string;
  sessionStatus: string;
  captureStatus: string;
}

export interface EvaluationQueueRowDto extends QueueRowBaseDto {
  evaluationId: string;
  sessionLabel: string;
  result: string;
  scorePercent: number;
}

export interface QueueListDto<TRow> {
  items: TRow[];
  totalCount: number;
}

export interface QueueBadgeCountsDto {
  requirements: number;
  prompts: number;
  cursor: number;
  evaluation: number;
  learning: number;
}

export interface ListQueueQuery {
  search?: string;
  statusFilter?: string;
}
