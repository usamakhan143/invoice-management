# Initiative Detail — Phase 1 Frozen

**Status:** FROZEN as of Phase 1 completion.

The Initiative Detail module (`pages/app/bos/BosInitiativeDetailPage.tsx` and `initiativeDetail/*`) is feature-complete for Phase 1 real milestone execution.

## Frozen scope

- Milestone lifecycle UX (start, complete, block, skip)
- Business timeline vs execution history separation
- Founder completion dialog with evidence and validation
- Current situation, hero metrics, investment, decisions

## Change policy

- **Allowed:** Bug fixes, copy tweaks, regression tests, backward-compatible optional fields
- **Not allowed without Phase 2 planning:** Architecture changes, new Firestore collections, new domain entities, heuristics, inferred progress

## Regression tests

Run before any Initiative Detail changes:

```bash
npm run test:bos:completion
npm run bos:validate
npm run build
```
