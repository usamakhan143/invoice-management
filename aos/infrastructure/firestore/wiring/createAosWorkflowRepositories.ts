import type firebase from "firebase/compat/app";
import type {
  AuditEventRepository,
  EngagementWorkflowRepository,
} from "../../../contracts/EngagementWorkflowRepository";
import type { CursorRevisionRepository } from "../../../contracts/CursorRevisionRepository";
import type { CursorSessionRepository } from "../../../contracts/CursorSessionRepository";
import type { EvaluationRepository } from "../../../contracts/EvaluationRepository";
import type { PromptVersionRepository } from "../../../contracts/PromptVersionRepository";
import type { RequirementVersionRepository } from "../../../contracts/RequirementVersionRepository";
import type { KnowledgeRepository } from "../../../contracts/KnowledgeRepository";
import type { ModuleRegistryRepository } from "../../../contracts/ModuleRegistryRepository";
import type { PlaybookRepository } from "../../../contracts/PlaybookRepository";
import { AuditEventFirestoreRepository } from "../repositories/AuditEventFirestoreRepository";
import { CursorRevisionFirestoreRepository } from "../repositories/CursorRevisionFirestoreRepository";
import { CursorSessionFirestoreRepository } from "../repositories/CursorSessionFirestoreRepository";
import { EngagementWorkflowFirestoreRepository } from "../repositories/EngagementWorkflowFirestoreRepository";
import { EvaluationFirestoreRepository } from "../repositories/EvaluationFirestoreRepository";
import { KnowledgeFirestoreRepository } from "../repositories/KnowledgeFirestoreRepository";
import { ModuleRegistryFirestoreRepository } from "../repositories/ModuleRegistryFirestoreRepository";
import { PlaybookFirestoreRepository } from "../repositories/PlaybookFirestoreRepository";
import { PromptVersionFirestoreRepository } from "../repositories/PromptVersionFirestoreRepository";
import { RequirementVersionFirestoreRepository } from "../repositories/RequirementVersionFirestoreRepository";

export interface AosWorkflowRepositoryBundle {
  workflows: EngagementWorkflowRepository;
  auditEvents: AuditEventRepository;
  requirementVersions: RequirementVersionRepository;
  promptVersions: PromptVersionRepository;
  cursorSessions: CursorSessionRepository;
  cursorRevisions: CursorRevisionRepository;
  evaluations: EvaluationRepository;
  registry: ModuleRegistryRepository;
  knowledge: KnowledgeRepository;
  playbook: PlaybookRepository;
  firestore: firebase.firestore.Firestore;
}

export interface CreateAosWorkflowRepositoriesOptions {
  firestore: firebase.firestore.Firestore;
}

export function createAosWorkflowRepositories(
  options: CreateAosWorkflowRepositoriesOptions,
): AosWorkflowRepositoryBundle {
  const { firestore } = options;

  return {
    workflows: new EngagementWorkflowFirestoreRepository(firestore),
    auditEvents: new AuditEventFirestoreRepository(firestore),
    requirementVersions: new RequirementVersionFirestoreRepository(firestore),
    promptVersions: new PromptVersionFirestoreRepository(firestore),
    cursorSessions: new CursorSessionFirestoreRepository(firestore),
    cursorRevisions: new CursorRevisionFirestoreRepository(firestore),
    evaluations: new EvaluationFirestoreRepository(firestore),
    registry: new ModuleRegistryFirestoreRepository(firestore),
    knowledge: new KnowledgeFirestoreRepository(firestore),
    playbook: new PlaybookFirestoreRepository(firestore),
    firestore,
  };
}
