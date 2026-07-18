import type { AgencyType } from "../../../constants/agencyType";
import type { CompanyId, EpochMs, UserId } from "../../../types";
import type { DeliveryTemplateState } from "../templateState";
import type { DeliveryTemplateId } from "../valueObjects";

/**
 * DeliveryTemplate — agency-type delivery configuration (not a project plan).
 *
 * Lifecycle: draft → active → deprecated
 */
export interface DeliveryTemplate {
  id: DeliveryTemplateId;
  companyId: CompanyId;
  name: string;
  agencyType: AgencyType;
  status: DeliveryTemplateState;
  versionNumber: number;
  lifecyclePhaseKeys: readonly string[];
  description?: string;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  createdById: UserId;
  updatedById?: UserId;
}

export interface CreateDeliveryTemplateInput {
  companyId: CompanyId;
  name: string;
  agencyType: AgencyType;
  lifecyclePhaseKeys: readonly string[];
  description?: string;
  createdById: UserId;
}

export interface UpdateDeliveryTemplateInput {
  name?: string;
  lifecyclePhaseKeys?: readonly string[];
  description?: string;
  updatedById: UserId;
}

export interface ApplyDeliveryTemplateInput {
  templateId: DeliveryTemplateId;
  templateVersion: number;
  appliedById: UserId;
}
