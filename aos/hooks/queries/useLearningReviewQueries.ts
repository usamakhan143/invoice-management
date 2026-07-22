import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isLearningEngineEnabled } from "../../config/learningEngineConfig";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";
import type { LearningReviewFilters } from "./learningReviewFilters";
import { learningReviewFiltersToQueryKey } from "./learningReviewFilters";
import type { LearningCandidateDetailDto } from "../../application/learning/dto/LearningReviewDto";

export function useLearningReviewQueueQuery(filters: LearningReviewFilters) {
  const { learning } = useAosServices();
  const { actorScope, isReady } = useAosScope();

  return useQuery({
    queryKey: aosQueryKeys.learning.reviewQueue(learningReviewFiltersToQueryKey(filters)),
    queryFn: async () => {
      if (!actorScope) throw new Error("Scope not ready");
      return learning.listReviewQueue(actorScope, {
        search: filters.search,
        status: filters.status,
        candidateType: filters.candidateType,
        confidence: filters.confidence,
        targetKind: filters.targetKind,
      });
    },
    enabled: isReady && isLearningEngineEnabled() && Boolean(actorScope),
    staleTime: 15_000,
  });
}

export function useLearningCandidateDetailQuery(candidateId: string | undefined) {
  const { learning } = useAosServices();
  const { readScope, actorScope, isReady } = useAosScope();

  return useQuery<LearningCandidateDetailDto>({
    queryKey: aosQueryKeys.learning.candidateDetail(candidateId ?? ""),
    queryFn: async () => {
      if (!actorScope || !candidateId) {
        throw new Error("Context not ready");
      }
      return learning.getCandidateDetail(actorScope, candidateId);
    },
    enabled: isReady && isLearningEngineEnabled() && Boolean(candidateId),
  });
}

export function useEngagementLearningSummaryQuery(
  engagementId: string | undefined,
  retrospectiveId: string | undefined,
  retrospectiveApproved: boolean,
) {
  const { learning } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery({
    queryKey: aosQueryKeys.learning.engagementSummary(engagementId ?? ""),
    queryFn: async () => {
      if (!readScope || !engagementId || !retrospectiveId) {
        throw new Error("Context not ready");
      }
      return learning.getEngagementLearningSummary(
        readScope,
        engagementId,
        retrospectiveId,
        retrospectiveApproved,
      );
    },
    enabled:
      isReady &&
      isLearningEngineEnabled() &&
      Boolean(engagementId && retrospectiveId && retrospectiveApproved),
    staleTime: 10_000,
  });
}

export function useLearningGovernanceMutations() {
  const { learning } = useAosServices();
  const { actorScope } = useAosScope();
  const queryClient = useQueryClient();

  const invalidate = async (candidateId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: aosQueryKeys.learning.all() }),
      queryClient.invalidateQueries({ queryKey: aosQueryKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: [...aosQueryKeys.all, "queues"] }),
      ...(candidateId
        ? [queryClient.invalidateQueries({ queryKey: aosQueryKeys.learning.candidateDetail(candidateId) })]
        : []),
    ]);
  };

  const requireScope = () => {
    if (!actorScope) throw new Error("Actor context is not ready");
    return actorScope;
  };

  return {
    approve: useMutation({
      mutationFn: (input: { candidateId: string; expectedVersion: number; approvalNote?: string }) =>
        learning.approveCandidate(requireScope(), input),
      onSuccess: async (_data, variables) => invalidate(variables.candidateId),
    }),
    reject: useMutation({
      mutationFn: (input: { candidateId: string; expectedVersion: number; rejectionReason: string }) =>
        learning.rejectCandidate(requireScope(), input),
      onSuccess: async (_data, variables) => invalidate(variables.candidateId),
    }),
    defer: useMutation({
      mutationFn: (input: { candidateId: string; expectedVersion: number; deferReason?: string }) =>
        learning.deferCandidate(requireScope(), input),
      onSuccess: async (_data, variables) => invalidate(variables.candidateId),
    }),
    supersede: useMutation({
      mutationFn: (input: {
        candidateId: string;
        expectedVersion: number;
        reason?: string;
        supersededByCandidateId?: string;
      }) => learning.supersedeCandidate(requireScope(), input),
      onSuccess: async (_data, variables) => invalidate(variables.candidateId),
    }),
    promote: useMutation({
      mutationFn: (input: { candidateId: string; expectedVersion: number }) =>
        learning.promoteCandidate(requireScope(), input),
      onSuccess: async (_data, variables) => invalidate(variables.candidateId),
    }),
  };
}
