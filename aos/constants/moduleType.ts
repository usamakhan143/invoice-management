/**
 * Module registry entry type — frozen domain model §06.
 * @see docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md
 */

export const MODULE_TYPE = {
  COMPONENT: "component",
  SERVICE: "service",
  UTILITY: "utility",
  HOOK: "hook",
  DOMAIN_PATTERN: "domain_pattern",
  INTEGRATION_PATTERN: "integration_pattern",
  CURSOR_SKILL: "cursor_skill",
  CURSOR_RULE: "cursor_rule",
  PROMPT_TEMPLATE: "prompt_template",
  CLIENT_EXTRACTION: "client_extraction",
} as const;

export type ModuleType = (typeof MODULE_TYPE)[keyof typeof MODULE_TYPE];

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  [MODULE_TYPE.COMPONENT]: "Component",
  [MODULE_TYPE.SERVICE]: "Service",
  [MODULE_TYPE.UTILITY]: "Utility",
  [MODULE_TYPE.HOOK]: "Hook",
  [MODULE_TYPE.DOMAIN_PATTERN]: "Domain pattern",
  [MODULE_TYPE.INTEGRATION_PATTERN]: "Integration pattern",
  [MODULE_TYPE.CURSOR_SKILL]: "Cursor skill",
  [MODULE_TYPE.CURSOR_RULE]: "Cursor rule",
  [MODULE_TYPE.PROMPT_TEMPLATE]: "Prompt template",
  [MODULE_TYPE.CLIENT_EXTRACTION]: "Client extraction",
};

export const MODULE_TYPES: readonly ModuleType[] = Object.values(MODULE_TYPE);
