# 35 — Testing Strategy

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen

---

## Purpose

Define the **testing pyramid** and expectations so D2 ships with verifiable quality — without debating what to test per PR.

---

## Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  Few — critical founder paths
                   ┌┴─────────┴┐
                   │ Integration │  Hooks + application + infra (existing)
                  ┌┴─────────────┴┐
                  │   Component    │  UI states — props in, DOM out
                 ┌┴───────────────┴┐
                 │      Unit        │  Pure formatters, key factories, mappers
                 └───────────────────┘
```

---

## Test Locations

| Type | Location | Runner |
|------|----------|--------|
| Unit | `aos/**/*.test.ts` colocated or `aos/**/__tests__/` | Vitest |
| Component | `presentation/ui/**/*.test.tsx` | Vitest + jsdom |
| Hook integration | `aos/hooks/**/*.test.tsx` | Vitest + mock services |
| Application integration | `aos/infrastructure/integration/` | Vitest (+ emulator optional) |
| E2E | `e2e/aos/` (create M6) | Playwright or Cypress — **lock Playwright** at M6 if no existing E2E |
| a11y | Component tests + manual checklist | axe-core in component tests for primitives |

**Existing:** `npm run test:aos` — extend, do not replace.

---

## Unit Tests

### Scope

- Query key factory functions  
- DTO display mappers (date format, enum label)  
- URL filter parse/serialize  
- Permission flag helpers  
- Copy/template helpers if any  

### Not unit tested in UI layer

- Domain rules — tested in domain  
- Application commands — tested in application/integration  

### Coverage expectation

**80%** line coverage on `aos/hooks/queries/keys.ts`, `aos/presentation/ui/**/utils.ts` — measured Phase 1b.

---

## Component Tests

### Scope

Every L1 primitive and L2 composite C-xxx catalog component:

| Assert | Detail |
|--------|--------|
| States | loading, empty, disabled, error props render correct region |
| Events | click handlers fire |
| a11y | role, aria-label on IconButton |
| Forbidden | snapshot-only tests without behavior assert — discouraged |

### Pattern

- Render with minimal props  
- No router unless screen-level — wrap MemoryRouter when needed  
- No real Firebase  
- Mock props for AI/Approved variants  

### Coverage expectation

**100%** of L1 primitives before M3 complete.  
**90%** of L2 composites before M5 complete.

---

## Integration Tests

### Hook + application

- Mock `AosServicesProvider` with stub application service  
- Assert query returns DTO → screen would render  
- Mutation invalidates keys (mock query client)  

### Infrastructure (existing)

- Firestore repository tests — emulator when JDK available  
- Pure verification tests always run  

### Coverage expectation

Every `use*Mutation` hook has at least one success + one error test.

---

## E2E Tests

### Phase 1 critical paths (minimum)

| ID | Path |
|----|------|
| E2E-01 | Login → Dashboard loads skeleton then content |
| E2E-02 | Delivery list → open engagement → overview tab |
| E2E-03 | Create engagement (happy path) |
| E2E-04 | Requirements tab → approve flow (with test fixture data) |
| E2E-05 | Queue row → navigate to engagement tab |

### Environment

- Firebase emulator seed data or dedicated test company  
- Not run in default CI until emulator in CI — document in M6  

---

## Accessibility Testing

| Level | Method |
|-------|--------|
| Primitives | axe-core automated in component test |
| Screens | Manual [27 UI Review Standard](../aos-design-freeze/27_UI_REVIEW_STANDARD.md) checklist before merge |
| Keyboard | Manual E2E-02 path tab-only |
| Reduced motion | Manual media query test on dialog |

**Blocker:** axe serious/critical violations on new components.

---

## Visual Regression

**Phase 1:** Not required — design tokens reduce drift.

**Phase 1b (optional):** Chromatic or Percy on L1 Storybook if Storybook added — not locked Phase 1.

Manual visual review against ST-xx on first ship of each screen.

---

## Interaction Testing

| Interaction | Test type |
|-------------|-------------|
| ApprovalDialog confirm | Component + E2E-04 |
| DangerDialog required reason | Component |
| SidePanel Esc close | Component |
| AttentionQueue keyboard | Component a11y |
| Polling pause on hidden | Unit test visibility hook |

---

## AI UI Testing

| Concern | Approach |
|---------|----------|
| AI banner visible | Component test AiDraftPanel props |
| Approve not auto | E2E assert no approved state without dialog |
| AI label copy | Component text assert from copy guidelines |
| Generation loading | Component skeleton state |

**No LLM in tests** — mock DTOs with `source: 'ai_draft'`.

---

## Coverage Expectations Summary

| Area | Phase 1 expectation |
|------|---------------------|
| Domain + application | Existing standard — maintain |
| UI L1 primitives | 100% components have tests |
| UI L2 composites | 90% before screen ship |
| Hooks mutations | 100% success + error |
| E2E | 5 paths minimum by M8 |
| a11y axe | 0 critical on new UI PRs |

---

## CI Gates (Locked)

| Gate | When |
|------|------|
| `npm run test:aos` pass | Every PR touching `aos/` |
| UI Review ST-xx sign-off | Screen PRs |
| No new eslint import boundary violations | M0 onward |

---

## Testing Anti-Patterns

1. Testing implementation details (internal state)  
2. Snapshot-only PRs  
3. E2E for every button variant  
4. Real Firestore in component tests  
5. Skipping error state tests  
6. No tests because “placeholder UI” — placeholders removed when screen ships  

---

## Related Documents

- [27 UI Review Standard](../aos-design-freeze/27_UI_REVIEW_STANDARD.md)
- [31 Component Architecture](./31_COMPONENT_ARCHITECTURE.md)
- [37 Implementation Sequence](./37_IMPLEMENTATION_SEQUENCE.md)
