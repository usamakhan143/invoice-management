import type { BosMilestone } from "../../../../bos/domain/entities/milestone";
import type { BosMilestoneTemplate } from "../../../../bos/domain/entities/milestoneTemplate";
import type { MilestonePriority } from "../../../../bos/constants/milestonePriority";
import type { MilestoneCompletionRequirements } from "../../../../bos/constants/milestoneCompletionRequirement";
import { EMPTY_MILESTONE_COMPLETION_REQUIREMENTS } from "../../../../bos/constants/milestoneCompletionRequirement";
import type { MilestoneDurationUnit } from "../../../../bos/constants/milestoneDurationUnit";
import type { MilestoneBusinessImpact } from "../../../../bos/constants/milestoneBusinessImpact";
import {
  isKnownMilestoneTypePreset,
  MILESTONE_TYPE_PRESET,
} from "../../../../bos/constants/milestoneType";

/** Values collected by the production milestone form (create & edit). */
export interface MilestoneFormValues {
  title: string;
  description: string;
  phasePreset: string;
  customPhase: string;
  priority: MilestonePriority | "";
  businessImpact: MilestoneBusinessImpact | "";
  estimatedDuration: string;
  estimatedDurationUnit: MilestoneDurationUnit | "";
  estimatedCostAmount: string;
  estimatedCostCurrency: string;
  targetDate: string;
  ownerUserId: string;
  successCriteria: string;
  completionRequirements: MilestoneCompletionRequirements;
  dependencyId: string;
  milestoneTypePreset: string;
  customMilestoneType: string;
  tags: string[];
  saveAsTemplate: boolean;
}

export interface MilestoneFormSubmitPayload {
  title: string;
  description?: string;
  milestoneType?: string;
  phase?: string;
  priority?: MilestonePriority;
  businessImpact?: MilestoneBusinessImpact;
  estimatedDuration?: number;
  estimatedDurationUnit?: MilestoneDurationUnit;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: string;
  plannedEndDate?: number;
  ownerUserId?: string;
  successCriteria: string;
  completionRequirements?: MilestoneCompletionRequirements;
  dependencyIds?: string[];
  tags?: string[];
  saveAsTemplate?: boolean;
}

export interface UserOption {
  uid: string;
  label: string;
}

export const TAG_SUGGESTIONS = [
  "Marketing",
  "Sales",
  "Finance",
  "Legal",
  "Operations",
  "Product",
  "HR",
] as const;

export function emptyMilestoneFormValues(defaultCurrency = "USD"): MilestoneFormValues {
  return {
    title: "",
    description: "",
    phasePreset: "",
    customPhase: "",
    priority: "",
    businessImpact: "",
    estimatedDuration: "",
    estimatedDurationUnit: "",
    estimatedCostAmount: "",
    estimatedCostCurrency: defaultCurrency,
    targetDate: "",
    ownerUserId: "",
    successCriteria: "",
    completionRequirements: { ...EMPTY_MILESTONE_COMPLETION_REQUIREMENTS },
    dependencyId: "",
    milestoneTypePreset: "",
    customMilestoneType: "",
    tags: [],
    saveAsTemplate: false,
  };
}

export function milestoneToFormValues(
  milestone: BosMilestone,
  defaultCurrency = "USD",
): MilestoneFormValues {
  const phase = milestone.phase ?? "";
  const isPreset =
    phase &&
    ["Planning", "Discovery", "Implementation", "Launch", "Optimization"].includes(phase);

  const milestoneType = milestone.milestoneType ?? "";
  const isTypePreset = milestoneType && isKnownMilestoneTypePreset(milestoneType);

  return {
    title: milestone.title,
    description: milestone.description ?? "",
    phasePreset: isPreset ? phase : phase ? "__custom__" : "",
    customPhase: isPreset ? "" : phase,
    priority: milestone.priority ?? "",
    businessImpact: milestone.businessImpact ?? "",
    estimatedDuration:
      milestone.estimatedDuration !== undefined ? String(milestone.estimatedDuration) : "",
    estimatedDurationUnit: milestone.estimatedDurationUnit ?? "",
    estimatedCostAmount:
      milestone.estimatedCostAmount !== undefined ? String(milestone.estimatedCostAmount) : "",
    estimatedCostCurrency: milestone.estimatedCostCurrency ?? defaultCurrency,
    targetDate: milestone.plannedEndDate
      ? new Date(milestone.plannedEndDate).toISOString().slice(0, 10)
      : "",
    ownerUserId: milestone.ownerUserId ?? "",
    successCriteria: milestone.successCriteria ?? "",
    completionRequirements: milestone.completionRequirements
      ? { ...milestone.completionRequirements }
      : { ...EMPTY_MILESTONE_COMPLETION_REQUIREMENTS },
    dependencyId: milestone.dependencyIds?.[0] ?? "",
    milestoneTypePreset: isTypePreset ? milestoneType : milestoneType ? MILESTONE_TYPE_PRESET.CUSTOM : "",
    customMilestoneType: isTypePreset ? "" : milestoneType,
    tags: milestone.tags ? [...milestone.tags] : [],
    saveAsTemplate: false,
  };
}

export function resolvePhaseFromForm(values: MilestoneFormValues): string | undefined {
  if (!values.phasePreset) return undefined;
  if (values.phasePreset === "__custom__") {
    const custom = values.customPhase.trim();
    return custom || undefined;
  }
  return values.phasePreset;
}

export function resolveMilestoneTypeFromForm(values: MilestoneFormValues): string | undefined {
  if (!values.milestoneTypePreset) return undefined;
  if (values.milestoneTypePreset === MILESTONE_TYPE_PRESET.CUSTOM) {
    const custom = values.customMilestoneType.trim();
    return custom || undefined;
  }
  return values.milestoneTypePreset;
}

function parseOptionalPositiveNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

function parseOptionalNonNegativeNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

export function formValuesToSubmitPayload(
  values: MilestoneFormValues,
  parseTargetDate: (s: string) => number | undefined,
): MilestoneFormSubmitPayload {
  const phase = resolvePhaseFromForm(values);
  const milestoneType = resolveMilestoneTypeFromForm(values);
  const plannedEndDate = values.targetDate ? parseTargetDate(values.targetDate) : undefined;
  const hasRequirements = Object.values(values.completionRequirements).some(Boolean);
  const estimatedDuration = parseOptionalPositiveNumber(values.estimatedDuration);
  const estimatedCostAmount = parseOptionalNonNegativeNumber(values.estimatedCostAmount);

  return {
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    milestoneType,
    phase,
    priority: values.priority || undefined,
    businessImpact: values.businessImpact || undefined,
    estimatedDuration,
    estimatedDurationUnit:
      estimatedDuration && values.estimatedDurationUnit
        ? values.estimatedDurationUnit
        : undefined,
    estimatedCostAmount,
    estimatedCostCurrency:
      estimatedCostAmount !== undefined && values.estimatedCostCurrency.trim()
        ? values.estimatedCostCurrency.trim()
        : undefined,
    plannedEndDate,
    ownerUserId: values.ownerUserId || undefined,
    successCriteria: values.successCriteria.trim(),
    completionRequirements: hasRequirements ? values.completionRequirements : undefined,
    dependencyIds: values.dependencyId ? [values.dependencyId] : undefined,
    tags: values.tags.length ? values.tags : undefined,
    saveAsTemplate: values.saveAsTemplate,
  };
}

export function milestoneToTemplateStepFromForm(
  values: MilestoneFormValues,
  stepId: string,
  sequence: number,
): BosMilestoneTemplate["steps"][number] {
  const payload = formValuesToSubmitPayload(values, () => undefined);
  return {
    id: stepId,
    title: payload.title,
    description: payload.description,
    sequence,
    phase: payload.phase,
    priority: payload.priority,
    milestoneType: payload.milestoneType,
    businessImpact: payload.businessImpact,
    estimatedDuration: payload.estimatedDuration,
    estimatedDurationUnit: payload.estimatedDurationUnit,
    estimatedCostAmount: payload.estimatedCostAmount,
    estimatedCostCurrency: payload.estimatedCostCurrency,
    successCriteria: payload.successCriteria,
    completionRequirements: payload.completionRequirements,
    tags: payload.tags,
  };
}
