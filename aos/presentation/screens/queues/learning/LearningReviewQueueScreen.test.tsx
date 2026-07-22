// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LearningCandidateListItemDto } from "../../../../application/learning/dto/LearningReviewDto";
import LearningReviewQueueScreen from "./LearningReviewQueueScreen";

const row: LearningCandidateListItemDto = {
  candidateId: "cand-1",
  companyId: "co1",
  engagementId: "eng-1",
  engagementTitle: "Portal rebuild",
  clientLabel: "Acme",
  candidateType: "knowledge_pattern",
  title: "Reuse auth middleware",
  summary: "Shared session validation.",
  status: "pending_review",
  confidence: {
    evidenceConfidence: "single_engagement",
    organizationalConfidence: "medium",
    aiConfidence: 0,
    promotionEligible: true,
  },
  promotionTarget: {
    targetKind: "knowledge_pattern",
    expectedVersionStrategy: "new_version",
  },
  version: 1,
  createdAt: "2026-07-21T00:00:00.000Z",
};

const setSearch = vi.fn();
const setStatus = vi.fn();
const setCandidateType = vi.fn();
const setSelectedCandidate = vi.fn();

vi.mock("./useLearningReviewScreenState", () => ({
  useLearningReviewScreenState: () => ({
    filters: {
      search: "",
      status: "pending_review",
      candidateType: "all",
      confidence: "all",
      targetKind: "all",
    },
    setSearch,
    setStatus,
    setCandidateType,
    setSelectedCandidate,
  }),
}));

vi.mock("../../../../hooks/queries/useLearningReviewQueries", () => ({
  useLearningReviewQueueQuery: () => ({
    data: { items: [row], totalCount: 1, pendingReviewCount: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("./LearningCandidateDetailSidePanel", () => ({
  LearningCandidateDetailSidePanel: () => null,
}));

vi.mock("../QueueScreenTemplate", () => ({
  QueueScreenTemplate: ({
    title,
    children,
    toolbarExtra,
  }: {
    title: string;
    children: React.ReactNode;
    toolbarExtra?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {toolbarExtra}
      {children}
    </div>
  ),
}));

describe("LearningReviewQueueScreen", () => {
  it("renders pending review candidates", () => {
    render(<LearningReviewQueueScreen />);
    expect(screen.getByText("Learning Review")).toBeInTheDocument();
    expect(screen.getByText("Reuse auth middleware")).toBeInTheDocument();
    expect(screen.getByText("Portal rebuild")).toBeInTheDocument();
  });

  it("exposes status filter control", () => {
    render(<LearningReviewQueueScreen />);
    const statusFilter = screen.getByLabelText("Filter by status");
    fireEvent.change(statusFilter, { target: { value: "approved" } });
    expect(setStatus).toHaveBeenCalledWith("approved");
  });
});
