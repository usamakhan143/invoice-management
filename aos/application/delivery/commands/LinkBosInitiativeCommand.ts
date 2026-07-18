/** Command — link or unlink optional BOS initiative (Sidecar read + domain audit rules). */
export interface LinkBosInitiativeCommand {
  bosInitiativeId: string | null;
  /** Required when changing initiative link after planning. */
  auditNote?: string;
}
