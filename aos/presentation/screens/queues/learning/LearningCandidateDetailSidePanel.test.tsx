// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import type { LearningCandidateDetailDto } from "../../../../application/learning/dto/LearningReviewDto";
import { LearningCandidateDetailSidePanel } from "./LearningCandidateDetailSidePanel";

const baseDetail: LearningCandidateDetailDto = {
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
  proposedContent: {
    kind: "knowledge_pattern",
    title: "Reuse auth middleware",
    body: "Use shared middleware.",
    tags: ["auth"],
  },
  provenance: {
    requirementVersionId: "rv-1",
    promptVersionId: "pv-1",
    cursorSessionId: "cs-1",
    evaluationId: "ev-1",
    retrospectiveId: "retro-1",
    auditEventIds: [],
  },
  gateResult: null,
  extractionRunId: "run-1",
  retrospectiveId: "retro-1",
  canPromote: false,
};

let detailData: LearningCandidateDetailDto = baseDetail;
const approveMutate = vi.fn().mockResolvedValue({});
const promoteMutate = vi.fn().mockResolvedValue({});
let permittedKeys: string[] = [AOS_PERMISSION_KEY.LEARNING_REVIEW, AOS_PERMISSION_KEY.ADMIN];

vi.mock("../../../../hooks/queries/useLearningReviewQueries", () => ({
  useLearningCandidateDetailQuery: () => ({
    data: detailData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useLearningGovernanceMutations: () => ({
    approve: { mutateAsync: approveMutate, isPending: false },
    reject: { mutateAsync: vi.fn(), isPending: false },
    defer: { mutateAsync: vi.fn(), isPending: false },
    promote: { mutateAsync: promoteMutate, isPending: false },
  }),
}));

vi.mock("../../../../../hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: (key: string) => permittedKeys.includes(key),
  }),
}));

function renderPanel() {
  return render(
    <MemoryRouter>
      <LearningCandidateDetailSidePanel candidateId="cand-1" onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("LearningCandidateDetailSidePanel", () => {
  it("shows governance actions for pending review", () => {
    detailData = { ...baseDetail, status: "pending_review" };
    renderPanel();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("opens approval dialog on approve click", () => {
    detailData = { ...baseDetail, status: "pending_review" };
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Approve learning candidate?")).toBeInTheDocument();
  });

  it("shows promote action only when approved and eligible", () => {
    detailData = {
      ...baseDetail,
      status: "approved",
      canPromote: true,
    };
    permittedKeys = [
      AOS_PERMISSION_KEY.LEARNING_REVIEW,
      AOS_PERMISSION_KEY.LEARNING_PROMOTE,
      AOS_PERMISSION_KEY.ADMIN,
    ];
    renderPanel();
    expect(screen.getByRole("button", { name: "Promote to catalog" })).toBeInTheDocument();
  });

  it("hides review actions without LEARNING_REVIEW permission", () => {
    detailData = { ...baseDetail, status: "pending_review" };
    permittedKeys = [];
    renderPanel();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("has no axe violations in review state", async () => {
    detailData = { ...baseDetail, status: "pending_review" };
    permittedKeys = [AOS_PERMISSION_KEY.LEARNING_REVIEW, AOS_PERMISSION_KEY.ADMIN];
    const { container } = renderPanel();
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
