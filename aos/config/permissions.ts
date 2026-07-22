import {
  AOS_PERMISSION_CATEGORY,
  AOS_PERMISSION_KEY,
  type AosPermissionDefinition,
} from "../constants/permissionKeys";

/**
 * AOS permission registry — maps keys to UI labels for RoleManagement.
 * Keys registered in config/permissions.ts — never create a third namespace.
 */
export const AOS_PERMISSION_DEFINITIONS: readonly AosPermissionDefinition[] = [
  {
    key: AOS_PERMISSION_KEY.DASHBOARD_VIEW,
    label: "View AOS dashboard",
    description: "View AOS delivery dashboard placeholder",
    category: AOS_PERMISSION_CATEGORY.DASHBOARD,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.ENGAGEMENTS_VIEW,
    label: "View delivery engagements",
    description: "View Delivery Engagement records",
    category: AOS_PERMISSION_CATEGORY.DELIVERY,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.ENGAGEMENTS_MANAGE,
    label: "Manage delivery engagements",
    description: "Create and update Delivery Engagements",
    category: AOS_PERMISSION_CATEGORY.DELIVERY,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.REGISTRY_VIEW,
    label: "View module registry",
    description: "Browse Module Registry entries",
    category: AOS_PERMISSION_CATEGORY.REGISTRY,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.REGISTRY_MANAGE,
    label: "Manage module registry",
    description: "Register and deprecate modules",
    category: AOS_PERMISSION_CATEGORY.REGISTRY,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.REQUIREMENTS_VIEW,
    label: "View requirements",
    description: "View Requirement Sets and Requirements",
    category: AOS_PERMISSION_CATEGORY.REQUIREMENTS,
    phase: "1b",
  },
  {
    key: AOS_PERMISSION_KEY.REQUIREMENTS_EDIT,
    label: "Edit requirements",
    description: "Create and edit draft requirements",
    category: AOS_PERMISSION_CATEGORY.REQUIREMENTS,
    phase: "1b",
  },
  {
    key: AOS_PERMISSION_KEY.REQUIREMENTS_APPROVE,
    label: "Approve requirements",
    description: "Approve Requirement Sets for planning",
    category: AOS_PERMISSION_CATEGORY.REQUIREMENTS,
    phase: "1b",
  },
  {
    key: AOS_PERMISSION_KEY.PROMPTS_VIEW,
    label: "View prompt packs",
    description: "View Prompt Packs and artifacts",
    category: AOS_PERMISSION_CATEGORY.PROMPTS,
    phase: "2",
  },
  {
    key: AOS_PERMISSION_KEY.PROMPTS_MANAGE,
    label: "Manage prompt packs",
    description: "Create and approve Prompt Packs",
    category: AOS_PERMISSION_CATEGORY.PROMPTS,
    phase: "2",
  },
  {
    key: AOS_PERMISSION_KEY.CURSOR_VIEW,
    label: "View Cursor sessions",
    description: "View Cursor Session records",
    category: AOS_PERMISSION_CATEGORY.CURSOR,
    phase: "3",
  },
  {
    key: AOS_PERMISSION_KEY.CURSOR_EXECUTE,
    label: "Execute Cursor sessions",
    description: "Start and capture Cursor Sessions",
    category: AOS_PERMISSION_CATEGORY.CURSOR,
    phase: "3",
  },
  {
    key: AOS_PERMISSION_KEY.EVALUATION_VIEW,
    label: "View evaluations",
    description: "View Evaluation records and rubrics",
    category: AOS_PERMISSION_CATEGORY.EVALUATION,
    phase: "3",
  },
  {
    key: AOS_PERMISSION_KEY.EVALUATION_MANAGE,
    label: "Manage evaluations",
    description: "Confirm or override evaluation scores",
    category: AOS_PERMISSION_CATEGORY.EVALUATION,
    phase: "3",
  },
  {
    key: AOS_PERMISSION_KEY.KNOWLEDGE_VIEW,
    label: "View knowledge",
    description: "View Knowledge Records and Patterns",
    category: AOS_PERMISSION_CATEGORY.KNOWLEDGE,
    phase: "4",
  },
  {
    key: AOS_PERMISSION_KEY.KNOWLEDGE_MANAGE,
    label: "Manage knowledge",
    description: "Create and promote knowledge records",
    category: AOS_PERMISSION_CATEGORY.KNOWLEDGE,
    phase: "4",
  },
  {
    key: AOS_PERMISSION_KEY.LEARNING_VIEW,
    label: "View learning review queue",
    description: "View learning candidates extracted from retrospectives",
    category: AOS_PERMISSION_CATEGORY.LEARNING,
    phase: "4",
  },
  {
    key: AOS_PERMISSION_KEY.LEARNING_REVIEW,
    label: "Review learning candidates",
    description: "Approve, reject, defer, or supersede learning candidates",
    category: AOS_PERMISSION_CATEGORY.LEARNING,
    phase: "4",
  },
  {
    key: AOS_PERMISSION_KEY.LEARNING_PROMOTE,
    label: "Promote learning candidates",
    description: "Promote approved candidates into organizational catalogs",
    category: AOS_PERMISSION_CATEGORY.LEARNING,
    phase: "4",
  },
  {
    key: AOS_PERMISSION_KEY.PLAYBOOK_VIEW,
    label: "View agency playbook",
    description: "View Agency Playbook sections",
    category: AOS_PERMISSION_CATEGORY.PLAYBOOK,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.PLAYBOOK_MANAGE,
    label: "Manage agency playbook",
    description: "Edit Agency Playbook content",
    category: AOS_PERMISSION_CATEGORY.PLAYBOOK,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.TEMPLATES_VIEW,
    label: "View delivery templates",
    description: "View Delivery and Prompt Templates",
    category: AOS_PERMISSION_CATEGORY.PLAYBOOK,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.TEMPLATES_MANAGE,
    label: "Manage delivery templates",
    description: "Create and activate templates",
    category: AOS_PERMISSION_CATEGORY.PLAYBOOK,
    phase: "1a",
  },
  {
    key: AOS_PERMISSION_KEY.RUBRICS_VIEW,
    label: "View evaluation rubrics",
    description: "View Evaluation Rubrics",
    category: AOS_PERMISSION_CATEGORY.EVALUATION,
    phase: "3",
  },
  {
    key: AOS_PERMISSION_KEY.RUBRICS_MANAGE,
    label: "Manage evaluation rubrics",
    description: "Create and activate rubrics",
    category: AOS_PERMISSION_CATEGORY.EVALUATION,
    phase: "3",
  },
  {
    key: AOS_PERMISSION_KEY.ADMIN,
    label: "AOS administrator",
    description: "Full AOS access within company",
    category: AOS_PERMISSION_CATEGORY.ADMIN,
    phase: "1a",
  },
] as const;

export const PHASE_1A_AOS_PERMISSION_KEYS: readonly string[] =
  AOS_PERMISSION_DEFINITIONS.filter((p) => p.phase === "1a").map((p) => p.key);

/** Owner bypass remains in ERP usePermissions — AOS respects isOwner at app layer. */
export const AOS_DEFAULT_DENY = true as const;
