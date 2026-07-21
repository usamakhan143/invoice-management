# 12 — Phase F Acceptance Criteria

Permanent invariants for implementation gates. Each maps to automated tests where noted.

---

## LF Invariant Matrix

| ID | Invariant | Verify in |
|----|-----------|-----------|
| **LF-01** | Immutable provenance on every candidate | F1 unit, F2 integration |
| **LF-02** | Tenant isolation; foreign evidence rejected | F2 security integration |
| **LF-03** | Idempotent extraction (run + candidate IDs) | F2 integration |
| **LF-04** | Retro approval never fails on extraction error | F2 integration |
| **LF-05** | AI cannot approve or promote | F1 unit, F3 integration |
| **LF-06** | Human approval before promotion | F3 integration, F4 UI |
| **LF-07** | Audit before promotion commit | F3 integration |
| **LF-08** | Non-destructive org versioning | F3 integration |
| **LF-09** | No client-fact leakage to promotable fields | F1 gate unit, F2 scan |
| **LF-10** | Prefer immutable Phase E versions | F2 integration |
| **LF-11** | No duplicate promotion | F3 integration |
| **LF-12** | gate_blocked excluded from queue | F1 unit, F4 UI |
| **LF-13** | Promotion traceability to Phase E IDs | F3 integration |
| **LF-14** | Concurrent approve safety | F2/F3 integration |
| **LF-15** | Centralized aosAuditEvents taxonomy | F2+ audit tests |

---

## Sprint Exit Checklists

### F1 Exit

- [ ] Domain entities match doc 02
- [ ] Lifecycle transitions match doc 03
- [ ] Gate G-001–G-005 implemented
- [ ] AI port interface + null adapter defined
- [ ] No infrastructure imports in domain
- [ ] Unit tests ≥ 90% domain learning module

### F2 Exit

- [ ] 3 collections live in emulator
- [ ] Security rules deny cross-tenant
- [ ] scheduleExtraction idempotent
- [ ] Null AI path creates deterministic candidates
- [ ] Learning audit events append

### F3 Exit

- [ ] Knowledge + module + playbook promotion paths
- [ ] LearningSourceRef on promoted assets
- [ ] Transaction rollback on failure
- [ ] Phase E versions untouched

### F4 Exit

- [ ] Queue + detail + approve/reject
- [ ] Evidence deep links work
- [ ] axe 0 violations

### F5 Exit

- [ ] Full flywheel E2E test
- [ ] All LF-01…LF-15 green
- [ ] Stub retrospective lessons replaced
- [ ] Phase F closure report

---

## Regression Requirements (All Sprints)

- Existing Phase E version chain tests remain green
- `npm run test:unit`, `test:integration`, `build`, boundary checks

---

## Non-Functional

- No new distributed queue infra in F2
- Feature flag default off until F2 verified in staging
- Documentation: sprint report per phase under `docs/aos-phase-f/`
