import { useQuery } from "@tanstack/react-query";
import type {
  CursorRevisionHistoryDto,
  CursorSessionHistoryDto,
  EvaluationDetailDto,
  EvaluationHistoryDto,
  PromptVersionDetailDto,
  PromptVersionHistoryDto,
  RequirementVersionDetailDto,
  RequirementVersionHistoryDto,
} from "../../application/workflow/dto/VersionHistoryDto";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";

const IMMUTABLE_STALE_MS = 5 * 60 * 1000;

export function useRequirementVersionHistoryQuery(
  engagementId: string | undefined,
  requirementSetId: string | undefined,
  enabled: boolean,
) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<RequirementVersionHistoryDto[]>({
    queryKey: aosQueryKeys.versionHistory.requirements(engagementId ?? "", requirementSetId ?? ""),
    queryFn: async () => {
      if (!readScope || !engagementId) throw new Error("Context not ready");
      return workflow.listRequirementVersions(readScope, engagementId, requirementSetId);
    },
    enabled: isReady && enabled && Boolean(engagementId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function useRequirementVersionDetailQuery(versionId: string | undefined, enabled: boolean) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<RequirementVersionDetailDto | null>({
    queryKey: aosQueryKeys.versionHistory.requirementDetail(versionId ?? ""),
    queryFn: async () => {
      if (!readScope || !versionId) throw new Error("Context not ready");
      return workflow.getRequirementVersionDetail(readScope, versionId);
    },
    enabled: isReady && enabled && Boolean(versionId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function usePromptVersionHistoryQuery(
  promptArtifactId: string | undefined,
  engagementId: string | undefined,
  enabled: boolean,
) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<PromptVersionHistoryDto[]>({
    queryKey: aosQueryKeys.versionHistory.prompts(promptArtifactId ?? "", engagementId ?? ""),
    queryFn: async () => {
      if (!readScope || !promptArtifactId) throw new Error("Context not ready");
      return workflow.listPromptVersions(readScope, promptArtifactId, engagementId);
    },
    enabled: isReady && enabled && Boolean(promptArtifactId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function usePromptVersionDetailQuery(versionId: string | undefined, enabled: boolean) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<PromptVersionDetailDto | null>({
    queryKey: aosQueryKeys.versionHistory.promptDetail(versionId ?? ""),
    queryFn: async () => {
      if (!readScope || !versionId) throw new Error("Context not ready");
      return workflow.getPromptVersionDetail(readScope, versionId);
    },
    enabled: isReady && enabled && Boolean(versionId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function useCursorSessionHistoryQuery(engagementId: string | undefined, enabled: boolean) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<CursorSessionHistoryDto[]>({
    queryKey: aosQueryKeys.versionHistory.cursorSessions(engagementId ?? ""),
    queryFn: async () => {
      if (!readScope || !engagementId) throw new Error("Context not ready");
      return workflow.listCursorSessions(readScope, engagementId);
    },
    enabled: isReady && enabled && Boolean(engagementId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function useCursorRevisionHistoryQuery(
  cursorSessionId: string | undefined,
  enabled: boolean,
) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<CursorRevisionHistoryDto[]>({
    queryKey: aosQueryKeys.versionHistory.cursorRevisions(cursorSessionId ?? ""),
    queryFn: async () => {
      if (!readScope || !cursorSessionId) throw new Error("Context not ready");
      return workflow.listCursorRevisions(readScope, cursorSessionId);
    },
    enabled: isReady && enabled && Boolean(cursorSessionId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function useEvaluationHistoryQuery(engagementId: string | undefined, enabled: boolean) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<EvaluationHistoryDto[]>({
    queryKey: aosQueryKeys.versionHistory.evaluations(engagementId ?? ""),
    queryFn: async () => {
      if (!readScope || !engagementId) throw new Error("Context not ready");
      return workflow.listEvaluations(readScope, engagementId);
    },
    enabled: isReady && enabled && Boolean(engagementId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}

export function useEvaluationDetailQuery(evaluationId: string | undefined, enabled: boolean) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<EvaluationDetailDto | null>({
    queryKey: aosQueryKeys.versionHistory.evaluationDetail(evaluationId ?? ""),
    queryFn: async () => {
      if (!readScope || !evaluationId) throw new Error("Context not ready");
      return workflow.getEvaluationDetail(readScope, evaluationId);
    },
    enabled: isReady && enabled && Boolean(evaluationId),
    staleTime: IMMUTABLE_STALE_MS,
  });
}
