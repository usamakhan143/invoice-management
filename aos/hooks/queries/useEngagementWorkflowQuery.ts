import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EngagementWorkflowDto } from "../../application/workflow/dto/EngagementWorkflowDto";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";

export function useEngagementWorkflowQuery(engagementId: string | undefined) {
  const { workflow } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<EngagementWorkflowDto>({
    queryKey: aosQueryKeys.deliveries.workflow(engagementId ?? ""),
    queryFn: async () => {
      if (!readScope || !engagementId) {
        throw new Error("Workflow context is not ready");
      }
      return workflow.getWorkflow(readScope, { engagementId });
    },
    enabled: isReady && Boolean(engagementId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.evaluation?.status === "running") return 5000;
      if (data?.reuseAssessment?.status === "running") return 10000;
      return false;
    },
  });
}

export function useEngagementWorkflowMutations(engagementId: string) {
  const { workflow } = useAosServices();
  const { actorScope } = useAosScope();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: aosQueryKeys.deliveries.workflow(engagementId) }),
      queryClient.invalidateQueries({ queryKey: aosQueryKeys.deliveries.detail(engagementId) }),
      queryClient.invalidateQueries({ queryKey: [...aosQueryKeys.all, "queues"] }),
    ]);
  };

  const wrap = <TVariables>(
    mutationFn: (variables: TVariables) => Promise<EngagementWorkflowDto>,
  ) =>
    useMutation({
      mutationFn,
      onSuccess: invalidate,
    });

  const requireScope = () => {
    if (!actorScope) throw new Error("Actor context is not ready");
    return actorScope;
  };

  return {
    generateRequirementsDraft: wrap(() => workflow.generateRequirementsDraft(requireScope(), engagementId)),
    updateRequirementDraft: wrap((body: string) =>
      workflow.updateRequirementDraft(requireScope(), engagementId, body),
    ),
    approveRequirements: wrap((note: string) =>
      workflow.approveRequirements(requireScope(), engagementId, note),
    ),
    runReuseAssessment: wrap(() => workflow.runReuseAssessment(requireScope(), engagementId)),
    setReuseModuleDecision: wrap(
      (input: { moduleId: string; decision: "accepted" | "rejected"; justification?: string }) =>
        workflow.setReuseModuleDecision(
          requireScope(),
          engagementId,
          input.moduleId,
          input.decision,
          input.justification,
        ),
    ),
    recordReuseDecisions: wrap((input: { netNewJustification?: string }) =>
      workflow.recordReuseDecisions(requireScope(), engagementId, input),
    ),
    generatePromptPack: wrap(() => workflow.generatePromptPack(requireScope(), engagementId)),
    approvePromptPack: wrap((note: string) => workflow.approvePromptPack(requireScope(), engagementId, note)),
    startCursorSession: wrap(() => workflow.startCursorSession(requireScope(), engagementId)),
    submitCursorCapture: wrap((input: { sessionId: string; captureSummary: string }) =>
      workflow.submitCursorCapture(requireScope(), engagementId, input.sessionId, input.captureSummary),
    ),
    runEvaluation: wrap(() => workflow.runEvaluation(requireScope(), engagementId)),
    updateQaChecklist: wrap((input: { itemId: string; checked: boolean }) =>
      workflow.updateQaChecklist(requireScope(), engagementId, input.itemId, input.checked),
    ),
    approveQaHandoff: wrap((note: string) => workflow.approveQaHandoff(requireScope(), engagementId, note)),
    generateRetrospective: wrap(() => workflow.generateRetrospective(requireScope(), engagementId)),
    approveRetrospective: wrap((note: string) =>
      workflow.approveRetrospective(requireScope(), engagementId, note),
    ),
  };
}
