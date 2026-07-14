/**
 * Application service layer — the only entry point future BOS UI hooks should call.
 * React components must NOT import Firestore repositories directly.
 */

export type { BosActorScope, BosReadScope } from "./types";
export { BosApplicationError, mapRepositoryError } from "./errors";
export {
  BosVentureApplicationService,
  bosVentureApplicationService,
} from "./BosVentureApplicationService";
export {
  BosInitiativeApplicationService,
  bosInitiativeApplicationService,
} from "./BosInitiativeApplicationService";
export {
  BosDecisionApplicationService,
  bosDecisionApplicationService,
} from "./BosDecisionApplicationService";
export {
  BosAttributionApplicationService,
  bosAttributionApplicationService,
} from "./BosAttributionApplicationService";
export {
  BosMilestoneApplicationService,
  bosMilestoneApplicationService,
  type CreateMilestoneDraftInput,
} from "./BosMilestoneApplicationService";
export {
  BosMilestoneTemplateApplicationService,
  bosMilestoneTemplateApplicationService,
} from "./BosMilestoneTemplateApplicationService";
export {
  computeMilestoneSituation,
  buildMilestoneSituationRows,
  buildMilestoneTimelineEvents,
  buildExecutionHistoryEvents,
  buildNextFounderAction,
  computeMilestoneProgressPercent,
  type MilestoneSituationSnapshot,
  type MilestoneSituationRow,
  type MilestoneExecutionEvent,
  type MilestoneExecutionEventKind,
} from "./milestoneSituation";
export type {
  InitiativeInvestmentSummary,
  InitiativeInvestmentLine,
} from "./BosAttributionApplicationService";
export { assertApplicationDomainOk } from "./validation";
