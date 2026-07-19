/** Shared queue layout for ST-12–ST-15 (PageHeader + TableToolbar + content). */
import React from "react";
import { FeatureFlagGate } from "../../gates";
import { PageHeader, PageShell } from "../../layouts";
import {
  EmptyState,
  ErrorState,
  InAppAlert,
  LoadingState,
  SearchInput,
  TableToolbar,
} from "../../ui";
import type { AosFeatureFlag } from "../../../config/featureFlags";

export interface QueueScreenTemplateProps {
  title: string;
  description: string;
  featureFlag: AosFeatureFlag;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  toolbarExtra?: React.ReactNode;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  children: React.ReactNode;
}

export const QueueScreenTemplate: React.FC<QueueScreenTemplateProps> = ({
  title,
  description,
  featureFlag,
  search,
  onSearchChange,
  searchPlaceholder = "Search engagements or clients",
  toolbarExtra,
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  children,
}) => (
  <FeatureFlagGate flag={featureFlag} fallback={<InAppAlert variant="info" title="Feature disabled" message={`${title} is not enabled for this workspace.`} />}>
    <PageShell>
      <PageHeader title={title} description={description} />
      <TableToolbar
        left={
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            aria-label={`Search ${title.toLowerCase()}`}
          />
        }
        right={toolbarExtra}
      />
      {isLoading ? <LoadingState message={`Loading ${title.toLowerCase()}…`} /> : null}
      {isError ? (
        <ErrorState
          title={`Unable to load ${title.toLowerCase()}`}
          message={error?.message ?? "Something went wrong."}
          onRetry={onRetry}
        />
      ) : null}
      {!isLoading && !isError && isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
      {!isLoading && !isError && !isEmpty ? children : null}
    </PageShell>
  </FeatureFlagGate>
);
