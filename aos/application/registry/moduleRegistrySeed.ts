import { AGENCY_TYPE } from "../../constants/agencyType";
import { MODULE_TYPE } from "../../constants/moduleType";
import type {
  ModuleRegistryDetailDto,
  ModuleRegistryListItemDto,
} from "./dto/ModuleRegistryDto";

const SEED_MODULES: readonly ModuleRegistryDetailDto[] = [
  {
    moduleId: "auth-firebase-v2",
    moduleName: "Firebase Auth Module",
    moduleType: MODULE_TYPE.INTEGRATION_PATTERN,
    agencyTypes: [AGENCY_TYPE.WEB, AGENCY_TYPE.SAAS, AGENCY_TYPE.MOBILE],
    status: "stable",
    version: "2.1.0",
    reuseCount: 14,
    qualityScore: 92,
    tags: ["auth", "firebase", "security"],
    description: "Reusable Firebase authentication bootstrap with session persistence and role gates.",
    locationReference: "aos/infrastructure/firebase/",
    origin: "erp_builtin",
    usageHistory: [
      {
        engagementId: "eng-portal-01",
        engagementTitle: "Client Portal Rebuild",
        usedAt: Date.parse("2026-06-12"),
        versionUsed: "2.1.0",
      },
      {
        engagementId: "eng-saas-04",
        engagementTitle: "SaaS Onboarding Hub",
        usedAt: Date.parse("2026-05-03"),
        versionUsed: "2.0.0",
      },
    ],
    knowledgeLinks: [
      { patternId: "kp-auth-gates", title: "Auth gate sequencing", scope: "architecture" },
    ],
  },
  {
    moduleId: "form-field-kit",
    moduleName: "Form Field Kit",
    moduleType: MODULE_TYPE.COMPONENT,
    agencyTypes: [AGENCY_TYPE.WEB, AGENCY_TYPE.SAAS],
    status: "stable",
    version: "1.4.2",
    reuseCount: 22,
    qualityScore: 88,
    tags: ["forms", "validation", "ui"],
    description: "Accessible form field primitives with validation messaging and ERP token styling.",
    locationReference: "aos/presentation/ui/forms/",
    origin: "aos_builtin",
    usageHistory: [
      {
        engagementId: "eng-portal-01",
        engagementTitle: "Client Portal Rebuild",
        usedAt: Date.parse("2026-06-18"),
        versionUsed: "1.4.2",
      },
    ],
    knowledgeLinks: [
      { patternId: "kp-form-a11y", title: "Form accessibility checklist", scope: "quality" },
    ],
  },
  {
    moduleId: "data-table-shell",
    moduleName: "DataTable Shell",
    moduleType: MODULE_TYPE.COMPONENT,
    agencyTypes: [AGENCY_TYPE.WEB, AGENCY_TYPE.SAAS, AGENCY_TYPE.AI],
    status: "stable",
    version: "3.0.1",
    reuseCount: 31,
    qualityScore: 95,
    tags: ["tables", "lists", "ui"],
    description: "Compact and comfortable table shell with sortable headers and row actions.",
    locationReference: "aos/presentation/ui/tables/DataTable.tsx",
    origin: "aos_builtin",
    usageHistory: [],
    knowledgeLinks: [],
  },
  {
    moduleId: "cursor-prompt-pack-gen",
    moduleName: "Prompt Pack Generator Skill",
    moduleType: MODULE_TYPE.CURSOR_SKILL,
    agencyTypes: [AGENCY_TYPE.AI, AGENCY_TYPE.WEB],
    status: "experimental",
    version: "0.9.0",
    reuseCount: 6,
    qualityScore: 78,
    tags: ["prompts", "cursor", "ai"],
    description: "Cursor skill for drafting prompt packs from approved requirement sets.",
    locationReference: ".cursor/skills/prompt-pack-gen/",
    origin: "manual",
    usageHistory: [
      {
        engagementId: "eng-ai-02",
        engagementTitle: "AI Workflow Pilot",
        usedAt: Date.parse("2026-07-01"),
        versionUsed: "0.9.0",
      },
    ],
    knowledgeLinks: [
      { patternId: "kp-prompt-structure", title: "Prompt pack structure", scope: "prompting" },
    ],
  },
  {
    moduleId: "legacy-stripe-hooks",
    moduleName: "Legacy Stripe Hooks",
    moduleType: MODULE_TYPE.HOOK,
    agencyTypes: [AGENCY_TYPE.SAAS],
    status: "deprecated",
    version: "1.0.0",
    reuseCount: 3,
    qualityScore: 54,
    tags: ["payments", "stripe", "legacy"],
    description: "Deprecated Stripe subscription hooks superseded by billing-service-v2 pattern.",
    locationReference: "legacy/hooks/useStripeSubscription.ts",
    origin: "client_extraction",
    usageHistory: [
      {
        engagementId: "eng-billing-legacy",
        engagementTitle: "Billing Migration",
        usedAt: Date.parse("2025-11-20"),
        versionUsed: "1.0.0",
      },
    ],
    knowledgeLinks: [],
  },
  {
    moduleId: "mobile-push-bridge",
    moduleName: "Mobile Push Bridge",
    moduleType: MODULE_TYPE.INTEGRATION_PATTERN,
    agencyTypes: [AGENCY_TYPE.MOBILE],
    status: "experimental",
    version: "0.3.0",
    reuseCount: 1,
    qualityScore: 70,
    tags: ["mobile", "push", "notifications"],
    description: "Bridge pattern for FCM push registration with engagement-scoped device tokens.",
    locationReference: "mobile/integrations/push-bridge/",
    origin: "manual",
    usageHistory: [],
    knowledgeLinks: [],
  },
];

export function getModuleRegistrySeedCatalog(): readonly ModuleRegistryDetailDto[] {
  return SEED_MODULES;
}

export function toRegistryListItem(detail: ModuleRegistryDetailDto): ModuleRegistryListItemDto {
  const { usageHistory: _usageHistory, knowledgeLinks: _knowledgeLinks, locationReference: _locationReference, origin: _origin, ...listItem } =
    detail;
  return listItem;
}
