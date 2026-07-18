/**
 * Prompt artifact type — frozen domain model §03 BR-PA-04.
 * @see docs/aos-domain-model/03_PROMPT_DOMAIN.md
 */

export const PROMPT_TYPE = {
  ARCHITECTURE: "architecture",
  INFRASTRUCTURE: "infrastructure",
  APPLICATION: "application",
  UI: "ui",
  QUALITY: "quality",
  INTEGRATION: "integration",
} as const;

export type PromptType = (typeof PROMPT_TYPE)[keyof typeof PROMPT_TYPE];

export const PROMPT_TYPE_LABELS: Record<PromptType, string> = {
  [PROMPT_TYPE.ARCHITECTURE]: "Architecture",
  [PROMPT_TYPE.INFRASTRUCTURE]: "Infrastructure",
  [PROMPT_TYPE.APPLICATION]: "Application",
  [PROMPT_TYPE.UI]: "UI",
  [PROMPT_TYPE.QUALITY]: "Quality",
  [PROMPT_TYPE.INTEGRATION]: "Integration",
};

export const PROMPT_TYPES: readonly PromptType[] = Object.values(PROMPT_TYPE);
