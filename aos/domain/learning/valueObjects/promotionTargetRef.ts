export type PromotionTargetKind =
  | "knowledge_pattern"
  | "module_registry"
  | "prompt_template"
  | "playbook"
  | "evaluation_rubric";

export type ExpectedVersionStrategy = "new_version" | "supersede" | "annotate";

export interface PromotionTargetRef {
  readonly targetKind: PromotionTargetKind;
  readonly targetId?: string;
  readonly expectedVersionStrategy: ExpectedVersionStrategy;
}

export function createPromotionTargetRef(
  input: PromotionTargetRef,
): PromotionTargetRef {
  return Object.freeze({ ...input });
}

/** Map candidate type to default promotion target kind. */
export function defaultPromotionTargetForCandidateType(
  candidateType: string,
): PromotionTargetKind {
  switch (candidateType) {
    case "knowledge_pattern":
      return "knowledge_pattern";
    case "module":
      return "module_registry";
    case "prompt_improvement":
      return "prompt_template";
    case "playbook_improvement":
      return "playbook";
    case "evaluation_insight":
      return "evaluation_rubric";
    default:
      return "knowledge_pattern";
  }
}
