# Phase E — Implementation Sequence

Three controlled sprints. Adjust only if E1 domain work reveals blocking coupling (none expected).

---

## Sprint E1 — Domain + Contracts

### Scope

Introduce version domain modules and repository contracts. **No Firestore changes. No UI changes.**

| Deliverable | Detail |
|-------------|--------|
| Domain entities | `RequirementVersion`, `PromptVersion`, `CursorSession`, `CursorRevision`, `Evaluation` (+ rubric ref stub) |
| Domain rules | Publish, monotonic version, draft-only edit guards, ref integrity |
| Aggregate commands | Publish version, start session, confirm evaluation — pure functions returning `WorkflowResult` / domain results |
| Refactor workflow aggregate | Delegate publish side-effects; slim `EngagementWorkflow` to head + pointers |
| Contracts | New repository interfaces |
| Unit tests | All V-01…V-15 invariants at domain level |

### Files / layers affected

```
aos/domain/requirements/          NEW
aos/domain/prompt/                NEW
aos/domain/cursor/                NEW
aos/domain/evaluation/            NEW
aos/domain/workflow/              CHANGE (aggregate + entities)
aos/contracts/                    NEW interfaces
aos/domain/**/**/*.test.ts        NEW + CHANGE
```

### Forbidden in E1

- Firestore repository implementations
- `firestore.rules` changes
- Application service persistence wiring
- Presentation / UI changes
- Migration scripts
- Learning Engine / knowledge promotion code

### Tests required (exit)

- [ ] Publish requirement version creates immutable snapshot; second publish increments version
- [ ] Edit approved requirement rejected at domain layer
- [ ] Publish prompt version requires `requirementVersionId`
- [ ] Cursor session creation requires published `promptVersionId`
- [ ] Evaluation confirm makes record immutable; re-score creates amendment
- [ ] Monotonic version rejection on duplicate version number
- [ ] All existing `aos/domain/workflow` unit tests green (updated for head model)

### Exit criteria

- Domain modules pass unit tests in isolation
- Contracts reviewed against [03_PERSISTENCE_AND_SECURITY_PLAN.md](./03_PERSISTENCE_AND_SECURITY_PLAN.md)
- Import boundaries script still PASS (extend if new modules need boundary entries)
- **No regression** in `npm run test:aos` (application/infra tests may skip new contracts until E2)

---

## Sprint E2 — Application + Firestore + Migration + Security

### Scope

Wire domain to Firestore; extend application orchestration; security rules; lazy migration.

| Deliverable | Detail |
|-------------|--------|
| Firestore models + converters | Version/session/evaluation documents |
| Repositories | Implement E1 contracts |
| Wiring | Extend `createAosWorkflowRepositories` bundle |
| Application service | `EngagementWorkflowApplicationService` calls version repos in `persistCommand` flow |
| DTOs | Add version IDs, history list DTOs (read models) |
| Security rules | New collections immutable per [03](./03_PERSISTENCE_AND_SECURITY_PLAN.md) |
| Indexes | `firestore.indexes.json` |
| Migration | Lazy materialization + audit events |
| Integration tests | Version persist, reload, immutability rejection (emulator) |

### Files / layers affected

```
aos/infrastructure/firestore/models/       NEW
aos/infrastructure/firestore/repositories/ NEW
aos/infrastructure/firestore/collections.ts CHANGE
aos/infrastructure/firestore/wiring/       CHANGE
aos/application/workflow/                  CHANGE
firestore.rules                            CHANGE
firestore.indexes.json                     CHANGE
scripts/verify-aos-firestore-security.ts   CHANGE
aos/infrastructure/integration/            NEW version persistence tests
```

### Forbidden in E2

- UI screen redesign
- New routes or navigation structure
- Learning Engine promotion
- Removing embedded D4 fields (dual projection kept)
- Destructive migration

### Tests required (exit)

- [ ] `npm run aos:validate` — new converter checks
- [ ] `npm run aos:security` — structural rules for new collections
- [ ] `npm run aos:import-boundaries` — PASS
- [ ] Emulator: publish requirement version → reload → identical snapshot
- [ ] Emulator: cross-company read/write rejected on version docs
- [ ] Emulator: update/delete rejected on published version docs
- [ ] Emulator: cursor session stores `promptVersionId`
- [ ] Emulator: confirmed evaluation immutable
- [ ] `npm run test:aos:integration` — existing 32 tests **still PASS**
- [ ] New integration file: `versionPersistence.integration.test.ts` green

### Exit criteria

- All E2 emulator tests pass (JDK 21)
- D4 integration suite green (no founder journey regression)
- Lazy migration audited on first publish
- Build passes (`npm run build`)

---

## Sprint E3 — UI Integration + Traceability + E2E + Verification

### Scope

Expose version information in existing D2 screens; complete traceability refs; Phase E acceptance.

| Deliverable | Detail |
|-------------|--------|
| UI (minimal) | Version badge on Requirements/Prompts; session/eval show version refs |
| Version history panel | Reusable read-only list component (existing table/card system) |
| Hooks / queries | `useRequirementVersionHistory`, etc. |
| Traceability refs | Retrospective + audit payloads include version IDs for Learning prep |
| E2E integration | Full chain test: Req vN → Prompt vM → Session → Eval → Retro refs |
| Documentation | `STAGE_E_FINAL_VERIFICATION.md` in `docs/aos-production-audit/` |
| Optional cleanup | Stop writing full snapshots to embedded fields (feature-flagged) |

### Files / layers affected

```
aos/presentation/screens/engagement-hub/requirements/  CHANGE
aos/presentation/screens/engagement-hub/prompts/       CHANGE
aos/presentation/screens/engagement-hub/cursor/        CHANGE
aos/presentation/screens/engagement-hub/evaluation/    CHANGE
aos/presentation/components/                           ADD (VersionHistoryPanel)
aos/application/workflow/dto/                          CHANGE (if query DTOs not done in E2)
aos/infrastructure/integration/versionChain.integration.test.ts  NEW
docs/aos-production-audit/STAGE_E_FINAL_VERIFICATION.md NEW
```

### Forbidden in E3

- Design system changes
- New engagement hub tabs
- Learning Engine implementation
- Knowledge promotion execution
- Removing D4 audit events or weakening rules

### Tests required (exit)

- [ ] Full regression matrix (build, test:aos, validate, boundaries, security, integration)
- [ ] `versionChain.integration.test.ts` — end-to-end traceability
- [ ] Founder journey integration test green
- [ ] Workflow stack integration test green
- [ ] Presentation unit tests for version display components
- [ ] Manual smoke: Requirements → Prompts → Cursor → Evaluation screens show version numbers

### Exit criteria

- [05_PHASE_E_ACCEPTANCE_CRITERIA.md](./05_PHASE_E_ACCEPTANCE_CRITERIA.md) all items PASS
- Stage E status: **CLOSED**
- ADR-004/005/006/007 runtime verification documented

---

## Dependency Graph

```
E1 Domain + Contracts
        │
        ▼
E2 Firestore + Application + Rules + Migration
        │
        ▼
E3 UI + Traceability + Full Verification
```

**Parallel work forbidden:** E2 cannot start until E1 contracts frozen. E3 cannot start until E2 emulator persistence green.

---

## Estimated File Volume (Order of Magnitude)

| Sprint | New files | Changed files |
|--------|-----------|---------------|
| E1 | ~25–35 | ~5–8 |
| E2 | ~20–30 | ~15–20 |
| E3 | ~5–10 | ~10–15 |

---

## Risk Controls by Sprint

| Sprint | Risk | Control |
|--------|------|---------|
| E1 | Domain split breaks workflow tests | Keep workflow aggregate tests; incremental refactor |
| E2 | Dual-write inconsistency | Transactions; dual projection; feature flag |
| E2 | Rules too strict block legitimate draft updates | Separate collections for immutable vs head |
| E3 | UI scope creep | Version badge + history panel only; no new flows |
| E3 | Founder journey regression | Run integration suite after every E3 PR |

---

## Authorization Gate

| Sprint | Prerequisite |
|--------|--------------|
| **E1** | This planning freeze accepted — **GO** |
| **E2** | E1 exit criteria met |
| **E3** | E2 exit criteria met |
