import { useQuery } from "@tanstack/react-query";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";

export interface QueueQueryFilters {
  search?: string;
  statusFilter?: string;
}

export function useRequirementsQueueQuery(filters: QueueQueryFilters = {}) {
  const readScope = useAosScope();
  const { queues } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.queues.requirements(filters),
    queryFn: () =>
      queues.listRequirementsQueue(readScope, {
        search: filters.search,
        statusFilter: filters.statusFilter,
      }),
  });
}

export function usePromptsQueueQuery(filters: QueueQueryFilters = {}) {
  const readScope = useAosScope();
  const { queues } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.queues.prompts(filters),
    queryFn: () =>
      queues.listPromptsQueue(readScope, {
        search: filters.search,
        statusFilter: filters.statusFilter,
      }),
  });
}

export function useCursorQueueQuery(filters: QueueQueryFilters = {}) {
  const readScope = useAosScope();
  const { queues } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.queues.cursor(filters),
    queryFn: () =>
      queues.listCursorQueue(readScope, {
        search: filters.search,
        statusFilter: filters.statusFilter,
      }),
  });
}

export function useEvaluationQueueQuery(filters: QueueQueryFilters = {}) {
  const readScope = useAosScope();
  const { queues } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.queues.evaluation(filters),
    queryFn: () =>
      queues.listEvaluationQueue(readScope, {
        search: filters.search,
        statusFilter: filters.statusFilter,
      }),
  });
}

export function useQueueBadgeCountsQuery() {
  const readScope = useAosScope();
  const { queues } = useAosServices();

  return useQuery({
    queryKey: [...aosQueryKeys.all, "queues", "badge-counts"] as const,
    queryFn: () => queues.getBadgeCounts(readScope),
    staleTime: 30_000,
  });
}
