# Phase E — Acceptance Criteria

Phase E closes when immutable version chains (ADR-004/005/006/007) are **implemented and runtime-verified** without regressing D4.

---

## 1. ADR Compliance Checklist

| ADR | Criterion | Verification |
|-----|-----------|--------------|
| **ADR-004** | Requirement Version immutable after publish | Domain unit + emulator update rejected |
| **ADR-004** | Monotonic version numbers per set | Domain unit + Firestore uniqueness |
| **ADR-004** | Prompt Pack references Requirement Version | Domain rule + integration test |
| **ADR-005** | Prompt Version immutable after publish | Emulator update/delete rejected |
| **ADR-005** | Pack replan creates new pack version / archive | Domain unit |
| **ADR-006** | Cursor Session append-only | Emulator delete rejected |
| **ADR-006** | Session references exact Prompt Version | Integration test field assertion |
| **ADR-006** | Cursor Revision chain on failure | Domain + integration (minimal path) |
| **ADR-007** | Evaluation immutable after confirm | Emulator update rejected post-confirm |
| **ADR-007** | Evaluation stores rubric version snapshot | Document shape + unit test |
| **ADR-013** | Mutable head + immutable published | Architecture review + tests |
| **ADR-014** | Version publish emits audit evidence | Audit event on each publish |

---

## 2. Domain Tests (Required)

| Test area | Cases |
|-----------|-------|
| **Immutable history** | Published version reject update/delete at domain validation |
| **Monotonic versions** | v1 → v2 → v3; reject v2 reuse |
| **Draft-only edit** | `updateRequirementDraft` fails when set approved |
| **Approve publishes** | Approve creates snapshot distinct from head |
| **Supersession** | New set/version links `supersedesVersionId` |
| **Ref integrity** | Prompt publish without requirement version fails |
| **Session pin** | Session without promptVersionId fails |
| **Eval confirm** | Post-confirm mutation fails; amendment creates new record |
| **Tenant** | Domain validators require matching `companyId` on refs |

**Command:** `npm run test:aos` includes all new domain tests.

---

## 3. Application Tests (Required)

| Test area | Cases |
|-----------|-------|
| **Create draft** | Generate requirement draft → head only, no version doc |
| **Revise draft** | Update draft items pre-approve |
| **Approve** | Publishes version + updates pointers + audit |
| **Supersede** | New version after material change |
| **Retrieve history** | `listRequirementVersions` returns ordered history |
| **Orchestration** | Application does not embed domain rules (mock repos) |

Existing application tests updated; no rule logic duplicated in application layer.

---

## 4. Firestore Emulator Tests (Required)

| Test area | Cases |
|-----------|-------|
| **Version persistence** | Publish → read → identical snapshot |
| **Reload** | New repository instance reads same version |
| **Concurrent protection** | Parallel publish same version number → one fails |
| **Cross-company isolation** | Company A cannot read/write Company B version docs |
| **Historical update rejected** | Client update on published version → permission denied |
| **Historical delete rejected** | Client delete on published version → permission denied |
| **Cursor session append-only** | Delete rejected |
| **Evaluation post-confirm** | Update rejected after confirm |

**Command:** `npm run test:aos:integration` — minimum **32 existing + new version tests** all PASS.

Suggested new suites:

- `versionPersistence.integration.test.ts`
- `versionChain.integration.test.ts`

---

## 5. Integration Traceability Test (Required)

Single emulator-backed test proving chain:

```
1. Create engagement (delivery)
2. Generate + approve requirements        → RequirementVersion v1
3. Run reuse + generate + approve prompts → PromptVersion v1 (refs req v1)
4. Start cursor session                   → refs PromptVersion v1
5. Submit capture + run evaluation        → Evaluation refs session + prompt v1
6. Complete QA + retrospective
7. Assert retrospective / audit payload contains:
   - requirementVersionId
   - promptVersionId
   - cursorSessionId
   - evaluationId
```

---

## 6. D4 Regression (Required)

| Check | Must pass |
|-------|-----------|
| `npm run build` | YES |
| `npm run test:aos` | YES (≥67 tests + new) |
| `npm run aos:validate` | YES |
| `npm run aos:import-boundaries` | YES |
| `npm run aos:security` | YES |
| `npm run test:aos:integration` | YES |
| `workflowStack.integration.test.ts` | YES |
| `founderJourney.integration.test.ts` | YES |
| `firestoreSecurity.integration.test.ts` | YES |
| ADR-014 audit append-only | Still PASS — not weakened |

---

## 7. UI Acceptance (E3)

| Screen | Criterion |
|--------|-----------|
| **Requirements** | Shows current version number; approved state distinct from draft |
| **Requirements history** | Read-only list of prior versions accessible |
| **Prompts** | Shows pack version + artifact version refs |
| **Cursor** | Shows executed prompt version |
| **Evaluation** | Shows rubric version + linked session |
| **Design system** | Reuses existing components (badges, tables, panels) — no new design language |

---

## 8. Migration Acceptance

| Criterion | Verification |
|-----------|--------------|
| Pre-E engagements readable | Load engagement with embedded-only data |
| Lazy materialization | First post-E approve creates v1 + audit |
| No data deletion | Count docs before/after migration unchanged |
| Rollback flag | With flag off, app reads embedded fields |

---

## 9. Learning / Knowledge Preparation (E3)

Not implemented — only verified **refs exist** for future engines:

| Question | Required ref stored |
|----------|----------------------|
| Which Requirement Version caused this decision? | `requirementVersionId` on prompt/eval/audit |
| Which Prompt Version was executed? | `promptVersionId` on session/eval |
| Which Cursor Session executed it? | `cursorSessionId` on eval |
| Which Evaluation assessed execution? | `evaluationId` on audit/retro |
| Which Retrospective generated learning? | `retrospectiveId` + version refs on retro doc |

Promotion pipelines remain Phase post-E.

---

## 10. Phase E Close Gate

Stage E status moves to **CLOSED** when:

1. All Section 1 ADR criteria verified with runtime evidence
2. Section 6 regression matrix green
3. Section 5 traceability integration test green
4. `docs/aos-production-audit/STAGE_E_FINAL_VERIFICATION.md` published
5. No known blocker bugs in version immutability

**Partial close forbidden:** Do not mark E closed if only domain tests pass without emulator proof.

---

## 11. Out of Scope (Cannot Block Phase E Close)

- Learning Engine promotion execution
- Knowledge pattern auto-promotion
- Version diff UI
- Cursor SDK automation
- Parallel prompt tracks
- Full `in_review` workflow UI polish (domain support sufficient)
