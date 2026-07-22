import { AosRepositoryError } from "../../infrastructure/firestore/errors";

export function mapLearningErrorMessage(error: unknown): string {
  if (error instanceof AosRepositoryError) {
    switch (error.code) {
      case "VERSION_CONFLICT":
        return "This candidate changed since you opened it. Refresh and review the latest version.";
      case "AOS_NOT_FOUND":
        return "This learning candidate is no longer available.";
      case "AOS_UPDATE_FAILED":
        return friendlyUpdateMessage(error.message);
      default:
        return friendlyUpdateMessage(error.message);
    }
  }
  if (error instanceof Error) {
    return friendlyUpdateMessage(error.message);
  }
  return "Something went wrong. Try again or contact your administrator.";
}

function friendlyUpdateMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("gate") || lower.includes("gk-") || lower.includes("gm-") || lower.includes("gp-")) {
    return "Promotion is blocked by quality gates. Review evidence and gate results below.";
  }
  if (lower.includes("not approved") || lower.includes("pending_review")) {
    return "Approve this candidate before promoting it to organizational catalogs.";
  }
  if (lower.includes("already promoted")) {
    return "This candidate was already promoted. Refresh to see the latest state.";
  }
  if (lower.includes("ai cannot")) {
    return "Only a human reviewer can perform this action.";
  }
  if (lower.includes("permission") || lower.includes("denied")) {
    return "You do not have permission for this action.";
  }
  if (lower.includes("cross-company")) {
    return "This candidate belongs to another workspace.";
  }
  return message.replace(/^LearningCandidate\.|^LearningPromotion\.|^AosRepositoryError: /, "");
}
