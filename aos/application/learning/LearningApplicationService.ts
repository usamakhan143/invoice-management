import type { AosActorScope, AosReadScope } from "../types";
import type { LearningGovernanceApplicationService } from "./LearningGovernanceApplicationService";
import type { LearningPromotionApplicationService } from "./LearningPromotionApplicationService";
import type { LearningReviewApplicationService } from "./LearningReviewApplicationService";
import type {
  ApproveLearningCandidateCommand,
  DeferLearningCandidateCommand,
  LearningGovernanceActionResultDto,
  LearningPromotionResultDto,
  PromoteLearningCandidateCommand,
  RejectLearningCandidateCommand,
  SupersedeLearningCandidateCommand,
} from "./learningGovernanceDtos";
import type {
  EngagementLearningSummaryDto,
  LearningCandidateDetailDto,
  LearningReviewListDto,
  ListLearningReviewQuery,
} from "./dto/LearningReviewDto";

/** UI-facing facade for Learning Engine governance (F4). */
export class LearningApplicationService {
  constructor(
    private readonly review: LearningReviewApplicationService,
    private readonly governance: LearningGovernanceApplicationService,
    private readonly promotion: LearningPromotionApplicationService,
  ) {}

  listReviewQueue(scope: AosActorScope, query?: ListLearningReviewQuery): Promise<LearningReviewListDto> {
    return this.review.listReviewQueue(scope, query);
  }

  getCandidateDetail(
    scope: AosActorScope,
    candidateId: string,
  ): Promise<LearningCandidateDetailDto> {
    return this.review.getCandidateDetail(scope, candidateId);
  }

  getEngagementLearningSummary(
    scope: AosReadScope,
    engagementId: string,
    retrospectiveId: string,
    retrospectiveApproved: boolean,
  ): Promise<EngagementLearningSummaryDto> {
    return this.review.getEngagementLearningSummary(
      scope,
      engagementId,
      retrospectiveId,
      retrospectiveApproved,
    );
  }

  countPendingReview(scope: AosReadScope): Promise<number> {
    return this.review.countPendingReview(scope);
  }

  approveCandidate(
    scope: AosActorScope,
    command: ApproveLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    return this.governance.approveCandidate(scope, command);
  }

  rejectCandidate(
    scope: AosActorScope,
    command: RejectLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    return this.governance.rejectCandidate(scope, command);
  }

  deferCandidate(
    scope: AosActorScope,
    command: DeferLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    return this.governance.deferCandidate(scope, command);
  }

  supersedeCandidate(
    scope: AosActorScope,
    command: SupersedeLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    return this.governance.supersedeCandidate(scope, command);
  }

  promoteCandidate(
    scope: AosActorScope,
    command: PromoteLearningCandidateCommand,
  ): Promise<LearningPromotionResultDto> {
    return this.promotion.promoteCandidate(scope, command);
  }
}
