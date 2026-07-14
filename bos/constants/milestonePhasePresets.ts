/**
 * UI-only phase suggestions for the milestone form dropdown.
 * Stored value is always a free-form string — never restricted to this list.
 */

export const MILESTONE_PHASE_PRESET = {
  PLANNING: "Planning",
  DISCOVERY: "Discovery",
  IMPLEMENTATION: "Implementation",
  LAUNCH: "Launch",
  OPTIMIZATION: "Optimization",
  CUSTOM: "__custom__",
} as const;

export type MilestonePhasePreset =
  (typeof MILESTONE_PHASE_PRESET)[keyof typeof MILESTONE_PHASE_PRESET];

/** Preset labels shown in the phase dropdown (excluding Custom sentinel). */
export const MILESTONE_PHASE_PRESET_OPTIONS: readonly string[] = [
  MILESTONE_PHASE_PRESET.PLANNING,
  MILESTONE_PHASE_PRESET.DISCOVERY,
  MILESTONE_PHASE_PRESET.IMPLEMENTATION,
  MILESTONE_PHASE_PRESET.LAUNCH,
  MILESTONE_PHASE_PRESET.OPTIMIZATION,
];

export function isKnownPhasePreset(value: string): boolean {
  return MILESTONE_PHASE_PRESET_OPTIONS.includes(value);
}
