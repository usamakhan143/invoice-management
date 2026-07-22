import type firebase from "firebase/compat/app";
import type {
  LearningCandidateRepository,
  LearningExtractionRunRepository,
  LearningPromotionRepository,
} from "../../../contracts/learning/LearningRepositories";
import { LearningCandidateFirestoreRepository } from "../repositories/LearningCandidateFirestoreRepository";
import { LearningExtractionRunFirestoreRepository } from "../repositories/LearningExtractionRunFirestoreRepository";
import { LearningPromotionFirestoreRepository } from "../repositories/LearningPromotionFirestoreRepository";

export interface AosLearningRepositoryBundle {
  extractionRuns: LearningExtractionRunRepository;
  candidates: LearningCandidateRepository;
  promotions: LearningPromotionRepository;
  firestore: firebase.firestore.Firestore;
}

export function createAosLearningRepositories(options: {
  firestore: firebase.firestore.Firestore;
}): AosLearningRepositoryBundle {
  const { firestore } = options;
  return {
    extractionRuns: new LearningExtractionRunFirestoreRepository(firestore),
    candidates: new LearningCandidateFirestoreRepository(firestore),
    promotions: new LearningPromotionFirestoreRepository(firestore),
    firestore,
  };
}
