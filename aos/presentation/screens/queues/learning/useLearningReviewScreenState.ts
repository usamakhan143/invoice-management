import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  LearningCandidateStatus,
  LearningCandidateType,
  PromotionTargetKind,
} from "../../../../constants/learningReview";
import {
  DEFAULT_LEARNING_REVIEW_FILTERS,
  type LearningReviewFilters,
} from "../../../../hooks/queries/learningReviewFilters";

function parseStatus(value: string | null): LearningCandidateStatus | "all" {
  if (!value || value === "all") return "all";
  return value as LearningCandidateStatus;
}

function parseCandidateType(value: string | null): LearningCandidateType | "all" {
  if (!value || value === "all") return "all";
  return value as LearningCandidateType;
}

export function useLearningReviewScreenState() {
  const [params, setParams] = useSearchParams();

  const filters: LearningReviewFilters = useMemo(
    () => ({
      search: params.get("q") ?? DEFAULT_LEARNING_REVIEW_FILTERS.search,
      status: parseStatus(params.get("status")) ?? DEFAULT_LEARNING_REVIEW_FILTERS.status,
      candidateType:
        parseCandidateType(params.get("type")) ?? DEFAULT_LEARNING_REVIEW_FILTERS.candidateType,
      confidence:
        (params.get("confidence") as LearningReviewFilters["confidence"]) ??
        DEFAULT_LEARNING_REVIEW_FILTERS.confidence,
      targetKind:
        (params.get("target") as PromotionTargetKind | "all") ??
        DEFAULT_LEARNING_REVIEW_FILTERS.targetKind,
      candidateId: params.get("candidate") ?? undefined,
    }),
    [params],
  );

  const setSearch = useCallback(
    (search: string) => {
      const next = new URLSearchParams(params);
      if (search) next.set("q", search);
      else next.delete("q");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setStatus = useCallback(
    (status: LearningCandidateStatus | "all") => {
      const next = new URLSearchParams(params);
      if (status === "pending_review") next.delete("status");
      else next.set("status", status);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setCandidateType = useCallback(
    (candidateType: LearningCandidateType | "all") => {
      const next = new URLSearchParams(params);
      if (candidateType === "all") next.delete("type");
      else next.set("type", candidateType);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setSelectedCandidate = useCallback(
    (candidateId: string | undefined) => {
      const next = new URLSearchParams(params);
      if (candidateId) next.set("candidate", candidateId);
      else next.delete("candidate");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return {
    filters,
    setSearch,
    setStatus,
    setCandidateType,
    setSelectedCandidate,
  };
}
