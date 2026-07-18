import type firebase from "firebase/compat/app";
import { db } from "../../../../services/firebase";
import type { DeliveryEngagementRepository } from "../../../contracts/DeliveryEngagementRepository";
import type { DeliveryQualityReportRepository } from "../../../contracts/DeliveryQualityReportRepository";
import type { DeliveryTemplateRepository } from "../../../contracts/DeliveryTemplateRepository";
import { DeliveryEngagementFirestoreRepository } from "../repositories/DeliveryEngagementFirestoreRepository";
import { DeliveryQualityReportFirestoreRepository } from "../repositories/DeliveryQualityReportFirestoreRepository";
import { DeliveryTemplateFirestoreRepository } from "../repositories/DeliveryTemplateFirestoreRepository";

/**
 * Delivery bounded-context repository bundle — construct at composition root only.
 * No global singleton; no service locator.
 */
export interface AosDeliveryRepositoryBundle {
  engagements: DeliveryEngagementRepository;
  templates: DeliveryTemplateRepository;
  qualityReports: DeliveryQualityReportRepository;
}

export interface CreateAosDeliveryRepositoriesOptions {
  firestore?: firebase.firestore.Firestore;
}

export function createAosDeliveryRepositories(
  options: CreateAosDeliveryRepositoriesOptions = {},
): AosDeliveryRepositoryBundle {
  const firestore = options.firestore ?? db;

  return {
    engagements: new DeliveryEngagementFirestoreRepository(firestore),
    templates: new DeliveryTemplateFirestoreRepository(firestore),
    qualityReports: new DeliveryQualityReportFirestoreRepository(firestore),
  };
}
