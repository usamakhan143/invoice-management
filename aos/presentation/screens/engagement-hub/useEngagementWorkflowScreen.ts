import { useEngagementContext } from "./EngagementContextProvider";
import {
  useEngagementWorkflowMutations,
  useEngagementWorkflowQuery,
} from "../../../hooks/queries/useEngagementWorkflowQuery";

export function useEngagementWorkflowScreen() {
  const { engagementId } = useEngagementContext();
  const workflowQuery = useEngagementWorkflowQuery(engagementId);
  const mutations = useEngagementWorkflowMutations(engagementId);

  return {
    engagementId,
    workflow: workflowQuery.data,
    isLoading: workflowQuery.isLoading,
    isError: workflowQuery.isError,
    error: workflowQuery.error,
    refetch: workflowQuery.refetch,
    mutations,
  };
}
