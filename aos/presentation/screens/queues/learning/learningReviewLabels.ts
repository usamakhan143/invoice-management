import type { PromotedAssetKind } from "../../../../constants/learningReview";

export function formatCandidateType(type: string): string {
  return type.replace(/_/g, " ");
}

export function formatCandidateStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function formatTargetKind(kind: string): string {
  return kind.replace(/_/g, " ");
}

export function formatVersionStrategy(strategy: string): string {
  switch (strategy) {
    case "new_version":
      return "Create new version";
    case "supersede":
      return "Supersede existing asset";
    case "annotate":
      return "Annotate (non-behavioral)";
    default:
      return strategy;
  }
}

export function resolvePromotedAssetHref(
  kind: PromotedAssetKind,
  assetId: string,
): string {
  switch (kind) {
    case "knowledge_pattern":
      return `/aos/knowledge?pattern=${encodeURIComponent(assetId)}`;
    case "module_registry":
      return `/aos/registry/${encodeURIComponent(assetId)}`;
    case "prompt_template":
      return `/aos/playbook?entry=${encodeURIComponent(assetId)}`;
    case "playbook":
      return `/aos/playbook?entry=${encodeURIComponent(assetId)}`;
    case "evaluation_rubric":
      return `/aos/playbook?entry=${encodeURIComponent(assetId)}`;
    default:
      return "/aos/knowledge";
  }
}

export function statusChipVariant(
  status: string,
): "approved" | "warning" | "error" | "neutral" | "ai" {
  switch (status) {
    case "pending_review":
      return "warning";
    case "approved":
      return "approved";
    case "promoted":
      return "approved";
    case "promotion_failed":
      return "error";
    case "rejected":
      return "error";
    case "gate_deferred":
      return "neutral";
    default:
      return "neutral";
  }
}
