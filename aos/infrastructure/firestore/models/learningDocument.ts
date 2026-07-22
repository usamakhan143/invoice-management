import type { LearningCandidate } from "../../../domain/learning/entities/learningCandidate";
import type { LearningExtractionRun } from "../../../domain/learning/entities/learningExtractionRun";
import type { LearningPromotionRecord } from "../../../domain/learning/entities/learningPromotionRecord";
import firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";

export interface LearningExtractionRunDocument {
  extractionRunId: string;
  companyId: string;
  engagementId: string;
  retrospectiveId: string;
  status: LearningExtractionRun["status"];
  provenance: LearningExtractionRun["provenance"];
  candidateIds: string[];
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  aiJobMetadata?: LearningExtractionRun["aiJobMetadata"];
  idempotencyKey: string;
  updatedAt: firebase.firestore.Timestamp;
}

export interface LearningCandidateDocument {
  candidateId: string;
  companyId: string;
  engagementId: string;
  retrospectiveId: string;
  extractionRunId: string;
  candidateType: LearningCandidate["candidateType"];
  title: string;
  summary: string;
  proposedContent: LearningCandidate["proposedContent"];
  status: LearningCandidate["status"];
  confidence: LearningCandidate["confidence"];
  promotionTarget: LearningCandidate["promotionTarget"];
  provenance: LearningCandidate["provenance"];
  gateResult: LearningCandidate["gateResult"];
  createdAt: string;
  createdBy: LearningCandidate["createdBy"];
  sourceFingerprint: string;
  version: number;
  aiRecommendation?: LearningCandidate["aiRecommendation"];
  approval?: LearningCandidate["approval"];
  rejection?: LearningCandidate["rejection"];
  defer?: LearningCandidate["defer"];
  promotion?: LearningCandidate["promotion"];
  supersession?: LearningCandidate["supersession"];
  amendmentOfCandidateId?: string;
  bundleId?: string;
  gateRuleSetVersion?: string;
  updatedAt?: string;
}

export interface LearningPromotionDocument {
  promotionId: string;
  companyId: string;
  candidateId: string;
  extractionRunId: string;
  promotedAssetKind: LearningPromotionRecord["promotedAssetKind"];
  promotedAssetId: string;
  promotedVersion: string;
  promotedAt: string;
  promotedBy: string;
  sourceProvenance: LearningPromotionRecord["sourceProvenance"];
  learningSourceRef: LearningPromotionRecord["learningSourceRef"];
  rollbackOfPromotionId?: string;
  kilHandoff?: LearningPromotionRecord["kilHandoff"];
  createdAt: firebase.firestore.Timestamp;
}

function timestampNow(): firebase.firestore.Timestamp {
  return firebase.firestore.Timestamp.now();
}

export function learningExtractionRunToFirestore(
  run: LearningExtractionRun,
  updatedAtMs = Date.now(),
): LearningExtractionRunDocument {
  return deepOmitUndefinedFields({
    extractionRunId: run.extractionRunId,
    companyId: run.companyId,
    engagementId: run.engagementId,
    retrospectiveId: run.retrospectiveId,
    status: run.status,
    provenance: run.provenance,
    candidateIds: [...run.candidateIds],
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    failureReason: run.failureReason,
    aiJobMetadata: run.aiJobMetadata,
    idempotencyKey: run.idempotencyKey,
    updatedAt: firebase.firestore.Timestamp.fromMillis(updatedAtMs),
  }) as LearningExtractionRunDocument;
}

export function learningExtractionRunFromFirestore(
  docId: string,
  data: firebase.firestore.DocumentData | undefined,
): LearningExtractionRun | null {
  if (!data || typeof data.companyId !== "string") return null;
  return {
    extractionRunId: (data.extractionRunId as string) ?? docId,
    companyId: data.companyId,
    engagementId: data.engagementId,
    retrospectiveId: data.retrospectiveId,
    status: data.status,
    provenance: data.provenance,
    candidateIds: Array.isArray(data.candidateIds) ? data.candidateIds : [],
    startedAt: data.startedAt,
    completedAt: data.completedAt,
    failureReason: data.failureReason,
    aiJobMetadata: data.aiJobMetadata,
    idempotencyKey: data.idempotencyKey ?? docId,
  };
}

export function learningCandidateToFirestore(
  candidate: LearningCandidate,
): LearningCandidateDocument {
  return deepOmitUndefinedFields({
    candidateId: candidate.candidateId,
    companyId: candidate.companyId,
    engagementId: candidate.engagementId,
    retrospectiveId: candidate.retrospectiveId,
    extractionRunId: candidate.extractionRunId,
    candidateType: candidate.candidateType,
    title: candidate.title,
    summary: candidate.summary,
    proposedContent: candidate.proposedContent,
    status: candidate.status,
    confidence: candidate.confidence,
    promotionTarget: candidate.promotionTarget,
    provenance: candidate.provenance,
    gateResult: candidate.gateResult,
    createdAt: candidate.createdAt,
    createdBy: candidate.createdBy,
    sourceFingerprint: candidate.sourceFingerprint,
    version: candidate.version,
    aiRecommendation: candidate.aiRecommendation,
    approval: candidate.approval,
    rejection: candidate.rejection,
    defer: candidate.defer,
    promotion: candidate.promotion,
    supersession: candidate.supersession,
    amendmentOfCandidateId: candidate.amendmentOfCandidateId,
    bundleId: candidate.bundleId,
    gateRuleSetVersion: candidate.gateRuleSetVersion,
    updatedAt: candidate.updatedAt,
  }) as LearningCandidateDocument;
}

export function learningCandidateFromFirestore(
  docId: string,
  data: firebase.firestore.DocumentData | undefined,
): LearningCandidate | null {
  if (!data || typeof data.companyId !== "string") return null;
  return {
    candidateId: (data.candidateId as string) ?? docId,
    companyId: data.companyId,
    engagementId: data.engagementId,
    retrospectiveId: data.retrospectiveId,
    extractionRunId: data.extractionRunId,
    candidateType: data.candidateType,
    title: data.title,
    summary: data.summary,
    proposedContent: data.proposedContent,
    status: data.status,
    confidence: data.confidence,
    promotionTarget: data.promotionTarget,
    provenance: data.provenance,
    gateResult: data.gateResult ?? null,
    createdAt: data.createdAt,
    createdBy: data.createdBy,
    sourceFingerprint: data.sourceFingerprint,
    version: data.version ?? 1,
    aiRecommendation: data.aiRecommendation,
    approval: data.approval,
    rejection: data.rejection,
    defer: data.defer,
    promotion: data.promotion,
    supersession: data.supersession,
    amendmentOfCandidateId: data.amendmentOfCandidateId,
    bundleId: data.bundleId,
    gateRuleSetVersion: data.gateRuleSetVersion,
    updatedAt: data.updatedAt,
  };
}

export function learningPromotionToFirestore(
  record: LearningPromotionRecord,
): LearningPromotionDocument {
  return deepOmitUndefinedFields({
    promotionId: record.promotionId,
    companyId: record.companyId,
    candidateId: record.candidateId,
    extractionRunId: record.extractionRunId,
    promotedAssetKind: record.promotedAssetKind,
    promotedAssetId: record.promotedAssetId,
    promotedVersion: record.promotedVersion,
    promotedAt: record.promotedAt,
    promotedBy: record.promotedBy,
    sourceProvenance: record.sourceProvenance,
    learningSourceRef: record.learningSourceRef,
    rollbackOfPromotionId: record.rollbackOfPromotionId,
    kilHandoff: record.kilHandoff,
    createdAt: timestampNow(),
  }) as LearningPromotionDocument;
}

export function learningPromotionFromFirestore(
  docId: string,
  data: firebase.firestore.DocumentData | undefined,
): LearningPromotionRecord | null {
  if (!data || typeof data.companyId !== "string") return null;
  return {
    promotionId: (data.promotionId as string) ?? docId,
    companyId: data.companyId,
    candidateId: data.candidateId,
    extractionRunId: data.extractionRunId,
    promotedAssetKind: data.promotedAssetKind,
    promotedAssetId: data.promotedAssetId,
    promotedVersion: data.promotedVersion,
    promotedAt: data.promotedAt,
    promotedBy: data.promotedBy,
    sourceProvenance: data.sourceProvenance,
    learningSourceRef: data.learningSourceRef,
    rollbackOfPromotionId: data.rollbackOfPromotionId,
    kilHandoff: data.kilHandoff,
  };
}
