import type { MilestonePriority } from "../../../constants/milestonePriority";
import { isMilestonePriority } from "../../../constants/milestonePriority";
import type { MilestoneCompletionRequirements } from "../../../constants/milestoneCompletionRequirement";
import { isMilestoneDurationUnit } from "../../../constants/milestoneDurationUnit";
import { isMilestoneBusinessImpact } from "../../../constants/milestoneBusinessImpact";
import { MILESTONE_TEMPLATE_VISIBILITY } from "../../../constants/milestoneTemplateVisibility";
import type { MilestoneTemplateVisibility } from "../../../constants/milestoneTemplateVisibility";
import type {
  BosMilestoneTemplate,
  BosMilestoneTemplateStep,
} from "../../../domain/entities/milestoneTemplate";
import type firebase from "firebase/compat/app";
import {
  epochMsToTimestamp,
  requireTimestampMs,
} from "../timestamp";
import { omitUndefinedFields } from "../documentPayload";

export interface BosMilestoneTemplateStepDocument {
  id: string;
  title: string;
  description?: string;
  sequence: number;
  defaultDurationDays?: number;
  phase?: string;
  priority?: MilestonePriority;
  milestoneType?: string;
  businessImpact?: string;
  estimatedDuration?: number;
  estimatedDurationUnit?: string;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: string;
  successCriteria?: string;
  completionRequirements?: MilestoneCompletionRequirements;
  tags?: string[];
}

export interface BosMilestoneTemplateDocument {
  companyId: string;
  name: string;
  category?: string;
  description?: string;
  steps: BosMilestoneTemplateStepDocument[];
  visibility: MilestoneTemplateVisibility;
  ownerUserId: string;
  sourceInitiativeId?: string;
  createdById: string;
  updatedById?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

const VALID_VISIBILITY = new Set<string>(Object.values(MILESTONE_TEMPLATE_VISIBILITY));

function stepsFromFirestore(data: unknown): BosMilestoneTemplateStep[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const step = row as BosMilestoneTemplateStepDocument;
      if (!step.title) return null;
      return {
        id: String(step.id ?? ""),
        title: String(step.title),
        description: step.description ? String(step.description) : undefined,
        sequence: Number(step.sequence ?? 0),
        defaultDurationDays:
          step.defaultDurationDays !== undefined ? Number(step.defaultDurationDays) : undefined,
        phase: step.phase ? String(step.phase) : undefined,
        priority: isMilestonePriority(step.priority) ? step.priority : undefined,
        milestoneType: step.milestoneType ? String(step.milestoneType) : undefined,
        businessImpact: isMilestoneBusinessImpact(step.businessImpact)
          ? step.businessImpact
          : undefined,
        estimatedDuration:
          step.estimatedDuration !== undefined ? Number(step.estimatedDuration) : undefined,
        estimatedDurationUnit: isMilestoneDurationUnit(step.estimatedDurationUnit)
          ? step.estimatedDurationUnit
          : undefined,
        estimatedCostAmount:
          step.estimatedCostAmount !== undefined ? Number(step.estimatedCostAmount) : undefined,
        estimatedCostCurrency: step.estimatedCostCurrency
          ? String(step.estimatedCostCurrency)
          : undefined,
        successCriteria: step.successCriteria ? String(step.successCriteria) : undefined,
        completionRequirements: step.completionRequirements as MilestoneCompletionRequirements | undefined,
        tags: Array.isArray(step.tags) ? step.tags.map((t) => String(t)) : undefined,
      };
    })
    .filter((s): s is BosMilestoneTemplateStep => s !== null);
}

export function isMilestoneTemplateVisibility(
  value: unknown,
): value is MilestoneTemplateVisibility {
  return typeof value === "string" && VALID_VISIBILITY.has(value);
}

export function milestoneTemplateFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): BosMilestoneTemplate | null {
  if (!data || !isMilestoneTemplateVisibility(data.visibility)) return null;
  const steps = stepsFromFirestore(data.steps);
  if (!steps.length) return null;

  return {
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? ""),
    category: data.category ? String(data.category) : undefined,
    description: data.description ? String(data.description) : undefined,
    steps,
    visibility: data.visibility,
    ownerUserId: String(data.ownerUserId ?? ""),
    sourceInitiativeId: data.sourceInitiativeId ? String(data.sourceInitiativeId) : undefined,
    createdById: String(data.createdById ?? ""),
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
  };
}

export function milestoneTemplateToFirestore(
  template: Omit<BosMilestoneTemplate, "id">,
): BosMilestoneTemplateDocument {
  return omitUndefinedFields({
    companyId: template.companyId,
    name: template.name.trim(),
    category: template.category?.trim() || undefined,
    description: template.description?.trim() || undefined,
    steps: template.steps.map((step) =>
      omitUndefinedFields({
        id: step.id,
        title: step.title.trim(),
        description: step.description?.trim() || undefined,
        sequence: step.sequence,
        defaultDurationDays: step.defaultDurationDays,
        phase: step.phase?.trim() || undefined,
        priority: step.priority,
        milestoneType: step.milestoneType?.trim() || undefined,
        businessImpact: step.businessImpact,
        estimatedDuration: step.estimatedDuration,
        estimatedDurationUnit: step.estimatedDurationUnit,
        estimatedCostAmount: step.estimatedCostAmount,
        estimatedCostCurrency: step.estimatedCostCurrency,
        successCriteria: step.successCriteria?.trim() || undefined,
        completionRequirements: step.completionRequirements,
        tags: step.tags?.length ? step.tags : undefined,
      }),
    ),
    visibility: template.visibility,
    ownerUserId: template.ownerUserId,
    sourceInitiativeId: template.sourceInitiativeId,
    createdById: template.createdById,
    updatedById: template.updatedById,
    createdAt: epochMsToTimestamp(template.createdAt),
    updatedAt: epochMsToTimestamp(template.updatedAt),
  }) as BosMilestoneTemplateDocument;
}
