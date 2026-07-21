import type { LearningCandidateType } from "../../domain/learning/entities/learningCandidate";
import type { LearningProposedContent } from "../../domain/learning/valueObjects/proposedContent";

export interface SanitizedEvidenceBundle {
  readonly engagementId: string;
  readonly retrospectiveId: string;
  readonly retrospectiveApproved: boolean;
  readonly summaryText: string;
}

export interface AiCandidateProposal {
  readonly candidateType: LearningCandidateType;
  readonly title: string;
  readonly summary: string;
  readonly proposedContent: LearningProposedContent;
  readonly aiConfidence?: number;
}

export interface LearningExtractionAiInput {
  readonly evidenceBundle: SanitizedEvidenceBundle;
  readonly candidateTypesRequested: readonly LearningCandidateType[];
  readonly modelPolicy: { maxCandidates: number; temperature: number };
}

export interface LearningExtractionAiOutput {
  readonly proposals: readonly AiCandidateProposal[];
  readonly modelMetadata: { provider: string; modelId: string; promptVersion: string };
  readonly rawResponseHash: string;
}

/** Provider-agnostic AI extraction port — proposals only, no governed writes. */
export interface LearningExtractionAiPort {
  proposeCandidates(input: LearningExtractionAiInput): Promise<LearningExtractionAiOutput>;
}

export const LEARNING_EXTRACTION_AI_PORT = Symbol("LearningExtractionAiPort");
