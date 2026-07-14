import type {
  BosInitiativeId,
  BosMilestoneId,
  CompanyId,
  PaginatedResult,
  PaginationQuery,
} from "../types";
import type {
  BlockBosMilestoneInput,
  BosMilestone,
  CompleteBosMilestoneInput,
  CreateBosMilestoneInput,
  SkipBosMilestoneInput,
  StartBosMilestoneInput,
  UpdateBosMilestoneInput,
} from "../domain/entities/milestone";

export interface ReorderBosMilestonesInput {
  orderedIds: BosMilestoneId[];
  updatedById: string;
}

export interface BosMilestoneRepository {
  findById(companyId: CompanyId, id: BosMilestoneId): Promise<BosMilestone | null>;

  listByInitiative(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosMilestone>>;

  create(input: CreateBosMilestoneInput): Promise<BosMilestone>;

  batchCreate(inputs: CreateBosMilestoneInput[]): Promise<BosMilestone[]>;

  update(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: UpdateBosMilestoneInput,
  ): Promise<BosMilestone>;

  markReady(companyId: CompanyId, id: BosMilestoneId, updatedById: string): Promise<BosMilestone>;

  start(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: StartBosMilestoneInput,
  ): Promise<BosMilestone>;

  complete(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: CompleteBosMilestoneInput,
  ): Promise<BosMilestone>;

  block(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: BlockBosMilestoneInput,
  ): Promise<BosMilestone>;

  skip(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: SkipBosMilestoneInput,
  ): Promise<BosMilestone>;

  reorder(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    input: ReorderBosMilestonesInput,
  ): Promise<BosMilestone[]>;

  deletePlanned(companyId: CompanyId, id: BosMilestoneId): Promise<void>;
}

export const BOS_MILESTONE_REPOSITORY = Symbol("BosMilestoneRepository");
