import type { KnowledgePattern } from "../../catalog/entities/knowledgePattern";
import type { ModuleRegistryEntry } from "../../catalog/entities/moduleRegistry";
import type { PlaybookEntry } from "../../catalog/entities/playbookEntry";
import { AGENCY_TYPE } from "../../../constants/agencyType";
import { MODULE_TYPE } from "../../../constants/moduleType";
import type { PromotedAssetKind } from "../entities/learningPromotionRecord";
import type { LearningCandidate } from "../entities/learningCandidate";
import type { LearningSourceRef } from "../valueObjects/learningSourceRef";
import {
  type EvaluationInsightProposedContent,
  type KnowledgePatternProposedContent,
  type ModuleProposedContent,
  type PlaybookImprovementProposedContent,
  type PromptImprovementProposedContent,
} from "../valueObjects/proposedContent";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

export type PromotionWriteStrategy = "create" | "new_version" | "supersede";

export interface PromotionWritePlan {
  readonly strategy: PromotionWriteStrategy;
  readonly promotedAssetKind: PromotedAssetKind;
  readonly assetId: string;
  readonly versionLabel: string;
  readonly priorAssetId?: string;
  readonly markPriorStale: boolean;
  readonly knowledgePattern?: KnowledgePattern;
  readonly moduleEntry?: ModuleRegistryEntry;
  readonly playbookEntry?: PlaybookEntry;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function bumpSemver(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return "1.0.0";
  const patch = Number(match[3]) + 1;
  return `${match[1]}.${match[2]}.${patch}`;
}

function bumpPlaybookVersion(version: string): string {
  const match = /^(\d+)\.(\d+)$/.exec(version);
  if (!match) return "1.1";
  const minor = Number(match[2]) + 1;
  return `${match[1]}.${minor}`;
}

function sourceReferenceFromCandidate(candidate: LearningCandidate) {
  const refs = [];
  if (candidate.provenance.evaluationId) {
    refs.push({
      id: candidate.provenance.evaluationId,
      label: `Evaluation ${candidate.provenance.evaluationId}`,
      kind: "evaluation" as const,
    });
  }
  if (candidate.provenance.retrospectiveId) {
    refs.push({
      id: candidate.provenance.retrospectiveId,
      label: `Retrospective ${candidate.provenance.retrospectiveId}`,
      kind: "retrospective" as const,
    });
  }
  return refs;
}

export interface ResolvePromotionWritePlanInput {
  candidate: LearningCandidate;
  learningSource: LearningSourceRef;
  existingKnowledge?: KnowledgePattern | null;
  existingModule?: ModuleRegistryEntry | null;
  existingPlaybook?: PlaybookEntry | null;
}

export function resolvePromotionWritePlan(
  input: ResolvePromotionWritePlanInput,
): LearningResult<PromotionWritePlan> {
  switch (input.candidate.candidateType) {
    case "knowledge_pattern":
      return resolveKnowledgeWritePlan(input);
    case "module":
      return resolveModuleWritePlan(input);
    case "prompt_improvement":
      return resolvePromptTemplateWritePlan(input);
    case "playbook_improvement":
      return resolvePlaybookWritePlan(input, "playbook");
    case "evaluation_insight":
      return resolvePlaybookWritePlan(input, "evaluation_rubric");
    default:
      return learningFailOne(
        "LEARNING_NOT_PROMOTION_ELIGIBLE",
        `Unsupported candidate type ${input.candidate.candidateType}`,
      );
  }
}

function resolveKnowledgeWritePlan(
  input: ResolvePromotionWritePlanInput,
): LearningResult<PromotionWritePlan> {
  const content = input.candidate.proposedContent as KnowledgePatternProposedContent;
  const targetId =
    input.candidate.promotionTarget.targetId ??
    input.existingKnowledge?.patternId ??
    `kp-${slugify(content.patternName || input.candidate.title)}`;

  const strategy = input.existingKnowledge
    ? input.candidate.promotionTarget.expectedVersionStrategy === "supersede"
      ? "supersede"
      : "new_version"
    : "create";

  const nextVersion = input.existingKnowledge
    ? input.existingKnowledge.patternVersion + 1
    : 1;

  const versionedPatternId =
    strategy === "create" ? targetId : `${targetId}-v${nextVersion}`;

  const pattern: KnowledgePattern = {
    patternId: versionedPatternId,
    title: content.patternName || input.candidate.title,
    primaryDomain: content.category || "General",
    agencyTypes: [AGENCY_TYPE.WEB, AGENCY_TYPE.SAAS],
    knowledgeType: "lesson",
    confidence: "validated",
    promotionStatus: "pattern_active",
    patternVersion: nextVersion,
    tags: [...content.applicabilityTags],
    summary: input.candidate.summary,
    body: [content.description, content.generalizationNotes, content.antiPatternNotes]
      .filter(Boolean)
      .join("\n\n"),
    learningOrigin: "retrospective",
    sourceReferences: sourceReferenceFromCandidate(input.candidate),
    relatedModules: [],
    relatedPrompts: [],
    relatedPatterns: input.existingKnowledge
      ? [{ patternId: input.existingKnowledge.patternId, title: input.existingKnowledge.title }]
      : [],
    aiSuggestedPatterns: [],
    learningSource: input.learningSource,
    supersedesPatternId: input.existingKnowledge?.patternId,
  };

  return learningOk({
    strategy,
    promotedAssetKind: "knowledge_pattern",
    assetId: versionedPatternId,
    versionLabel: String(nextVersion),
    priorAssetId: input.existingKnowledge?.patternId,
    markPriorStale: Boolean(input.existingKnowledge),
    knowledgePattern: pattern,
  });
}

function resolveModuleWritePlan(
  input: ResolvePromotionWritePlanInput,
): LearningResult<PromotionWritePlan> {
  const content = input.candidate.proposedContent as ModuleProposedContent;
  const baseId =
    content.targetModuleId ??
    input.candidate.promotionTarget.targetId ??
    slugify(content.moduleName);

  const strategy = input.existingModule ? "new_version" : "create";
  const nextVersion = input.existingModule
    ? bumpSemver(input.existingModule.version)
    : "1.0.0";

  const versionedModuleId =
    strategy === "create" ? baseId : `${baseId}-v${nextVersion.replace(/\./g, "-")}`;

  const moduleEntry: ModuleRegistryEntry = {
    moduleId: versionedModuleId,
    moduleName: content.moduleName,
    moduleType: MODULE_TYPE.DOMAIN_PATTERN,
    agencyTypes: [AGENCY_TYPE.WEB, AGENCY_TYPE.SAAS],
    status: "experimental",
    version: nextVersion,
    reuseCount: input.existingModule?.reuseCount ?? 0,
    qualityScore: input.existingModule?.qualityScore ?? 0.75,
    tags: [...content.capabilityTags],
    description: content.description,
    locationReference: content.sidecarComplianceNotes,
    origin: "learning_promotion",
    usageHistory: input.existingModule?.usageHistory ?? [],
    knowledgeLinks: input.existingModule?.knowledgeLinks ?? [],
    learningSource: input.learningSource,
    supersedesModuleId: input.existingModule?.moduleId,
  };

  return learningOk({
    strategy,
    promotedAssetKind: "module_registry",
    assetId: versionedModuleId,
    versionLabel: nextVersion,
    priorAssetId: input.existingModule?.moduleId,
    markPriorStale: Boolean(input.existingModule),
    moduleEntry,
  });
}

function resolvePromptTemplateWritePlan(
  input: ResolvePromotionWritePlanInput,
): LearningResult<PromotionWritePlan> {
  const content = input.candidate.proposedContent as PromptImprovementProposedContent;
  const baseId =
    content.targetTemplateId ??
    input.candidate.promotionTarget.targetId ??
    `pt-${slugify(content.changeSummary)}`;

  const strategy = input.existingPlaybook ? "new_version" : "create";
  const nextVersion = input.existingPlaybook
    ? bumpPlaybookVersion(input.existingPlaybook.version)
    : "1.0";

  const versionedEntryId =
    strategy === "create" ? baseId : `${baseId}-v${nextVersion.replace(".", "-")}`;

  const entry: PlaybookEntry = {
    entryId: versionedEntryId,
    title: content.changeSummary.slice(0, 80) || input.candidate.title,
    entryType: "prompt_template",
    agencyTypes: [AGENCY_TYPE.AI, AGENCY_TYPE.WEB],
    version: nextVersion,
    summary: input.candidate.summary,
    tags: ["prompt-template", "learning-promotion"],
    body: [content.proposedTemplateDiff, content.exemplarAnonymized]
      .filter(Boolean)
      .join("\n\n---\n\n"),
    checklist: [],
    knowledgeReferences: [],
    relatedTemplates: input.existingPlaybook
      ? [{ entryId: input.existingPlaybook.entryId, title: input.existingPlaybook.title }]
      : [],
    learningSource: input.learningSource,
    supersedesEntryId: input.existingPlaybook?.entryId,
  };

  return learningOk({
    strategy,
    promotedAssetKind: "prompt_template",
    assetId: versionedEntryId,
    versionLabel: nextVersion,
    priorAssetId: input.existingPlaybook?.entryId,
    markPriorStale: Boolean(input.existingPlaybook),
    playbookEntry: entry,
  });
}

function resolvePlaybookWritePlan(
  input: ResolvePromotionWritePlanInput,
  promotedAssetKind: "playbook" | "evaluation_rubric",
): LearningResult<PromotionWritePlan> {
  const content = input.candidate.proposedContent as
    | PlaybookImprovementProposedContent
    | EvaluationInsightProposedContent;

  const isRubric = promotedAssetKind === "evaluation_rubric";
  const sectionTitle = isRubric
    ? (content as EvaluationInsightProposedContent).description.slice(0, 80)
    : (content as PlaybookImprovementProposedContent).sectionTitle;

  const sectionBody = isRubric
    ? [
        (content as EvaluationInsightProposedContent).description,
        (content as EvaluationInsightProposedContent).linkedEvaluationOutcome,
        JSON.stringify(
          (content as EvaluationInsightProposedContent).proposedRubricChange ?? {},
        ),
      ].join("\n\n")
    : (content as PlaybookImprovementProposedContent).proposedSectionBody;

  const baseId =
    (!isRubric &&
      (content as PlaybookImprovementProposedContent).targetSectionId) ||
    input.candidate.promotionTarget.targetId ||
    `${isRubric ? "rubric" : "pb"}-${slugify(sectionTitle)}`;

  const strategy = input.existingPlaybook ? "new_version" : "create";
  const nextVersion = input.existingPlaybook
    ? bumpPlaybookVersion(input.existingPlaybook.version)
    : "1.0";

  const versionedEntryId =
    strategy === "create" ? baseId : `${baseId}-v${nextVersion.replace(".", "-")}`;

  const entry: PlaybookEntry = {
    entryId: versionedEntryId,
    title: sectionTitle || input.candidate.title,
    entryType: isRubric ? "rubric" : "agency_playbook",
    agencyTypes: [AGENCY_TYPE.WEB, AGENCY_TYPE.SAAS],
    version: nextVersion,
    summary: input.candidate.summary,
    tags: isRubric ? ["rubric", "learning-promotion"] : ["playbook", "learning-promotion"],
    body: sectionBody,
    checklist: [],
    knowledgeReferences: [],
    relatedTemplates: input.existingPlaybook
      ? [{ entryId: input.existingPlaybook.entryId, title: input.existingPlaybook.title }]
      : [],
    learningSource: input.learningSource,
    supersedesEntryId: input.existingPlaybook?.entryId,
  };

  return learningOk({
    strategy,
    promotedAssetKind,
    assetId: versionedEntryId,
    versionLabel: nextVersion,
    priorAssetId: input.existingPlaybook?.entryId,
    markPriorStale: Boolean(input.existingPlaybook),
    playbookEntry: entry,
  });
}
