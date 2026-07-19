# 10 — Security Audit

**Scope:** Tenant isolation, permissions, feature flags, Firestore access, information leakage  
**Method:** Source inspection of auth flow, gates, repositories, and adapters

---

## Tenant Isolation

### Company Scope Resolution

```19:28:aos/hooks/useAosScope.ts
    const companyId = resolveCompanyIdForUser(user, userProfile);
    ...
    return {
      readScope: { companyId },
      actorScope: { companyId, actorUserId: user.uid },
```

Every AOS query/mutation receives scope from authenticated user — **no client-supplied companyId** in hooks.

### Firestore Repository Isolation

| Repository | Isolation mechanism |
|------------|---------------------|
| Delivery engagements | All queries filter `companyId`; save asserts match |
| Delivery templates | Same pattern |
| Quality reports | Same pattern |

```31:31:aos/infrastructure/firestore/errors.ts
    throw new AosRepositoryError(`${entityLabel} companyId mismatch`, "AOS_COMPANY_MISMATCH");
```

**Cross-company write rejected** at repository layer.

### Read Adapter Isolation

`companyScopedDocumentData()` returns `null` when document `companyId` does not match request — treats foreign data as not found rather than exposing it.

### Memory Store Isolation

Workflow store keys: `${companyId}:${engagementId}` — company prefix on list operations.

**Gap:** Memory store is per-browser-session, not per-user — two users same company share store in same tab session (acceptable for stub; real repo needed for production).

---

## Permission Enforcement

### Route-Level Gates

```19:41:aos/presentation/gates/AosRouteGate.tsx
  if (!isEnabled(AOS_FEATURE_FLAG.MODULE_ENABLED)) → redirect
  if (!isEnabled(route.featureFlag)) → redirect
  if (!route.requiredPermissions.some(hasPermission)) → redirect
```

Every AOS page wrapped in `AosRouteGate` with route-specific permissions from `aos/config/routes.ts`.

### Component-Level Gates

| Gate | Usage |
|------|-------|
| C-090 PermissionGate | Cursor execute, approval actions |
| C-091 FeatureFlagGate | Module-specific features (Cursor, Knowledge, etc.) |
| C-092 LockedOverlay | Gate-locked workflow tabs |

**Gap:** Not every workflow mutation verifies permission server-side — Firestore security rules not audited in this frontend-only review (out of `aos/` scope but production-critical).

### Permission Source

`PermissionGate` uses ERP `usePermissions()` hook — same permission system as rest of invoicer-pro app. AOS permission keys defined in `aos/config/permissions.ts`.

---

## Feature Flags

| Flag | Enforced at |
|------|-------------|
| `MODULE_ENABLED` | Route gate — blocks entire AOS |
| Per-route flags | Route gate + FeatureFlagGate on screens |
| Cursor module | FeatureFlagGate on ST-08 |

Flags resolved via `useAosFeatureFlags()` — source in `aos/config/featureFlags.ts`.

**Gap:** Feature flags are client-side only — determined flag values could be bypassed by direct API calls unless Firestore rules enforce.

---

## Firestore Access Patterns

| Layer | Direct Firebase access? |
|-------|:-----------------------:|
| Presentation | **No** |
| Hooks | **No** |
| Application | **No** |
| Infrastructure | **Yes** — only layer with Firebase imports |

**No Firebase imports in UI** — verified by import boundary audit.

---

## Information Leakage Risks

| Risk | Severity | Evidence |
|------|----------|----------|
| Cross-company engagement read | **Low** | Repo company filter + mismatch error |
| Cross-company ERP read | **Low** | Adapter company scoping |
| Workflow data in memory leaks across companies | **Low** | Key prefix isolation |
| Error messages expose internals | **Low** | User-facing errors generic ("Could not load workflow") |
| AI insights expose other company data | **None** | Static/heuristic dashboard insights from same-company projections |
| Seed data visible to all companies | **Medium** | Registry/knowledge/playbook seeds are global — no company filter on catalog stubs |
| Client-side permission bypass | **Medium** | UI gates only; server rules unverified |
| `aos/index.ts` barrel exposes infra | **Low** | Theoretical — internal app, not npm package |

---

## Authentication Dependencies

AOS relies on ERP auth (`useAuth`, `usePermissions`) — no separate AOS auth system. Unauthenticated users get `isReady: false` and queries remain disabled.

**Gap:** No explicit session timeout handling in AOS layer — inherits ERP behavior.

---

## Data Sensitivity

| Data type | Sensitivity | Protection |
|-----------|-------------|------------|
| Delivery engagements | High | Company-scoped Firestore |
| Workflow artifacts | High | Company-scoped memory (stub) |
| ERP customer/lead refs | High | Read-only, company-scoped |
| Playbook content | Low | Global seed (non-sensitive methodology) |
| Knowledge patterns | Medium | Global seed — should be company-scoped in production |

---

## Security Score

| Dimension | Score (0–10) |
|-----------|:------------:|
| Tenant isolation (delivery) | 9 |
| Tenant isolation (stubs) | 5 |
| Permission enforcement (UI) | 8 |
| Permission enforcement (server) | **Unverified** |
| Feature flag enforcement | 6 |
| Information leakage prevention | 7 |
| Defense in depth | 5 |

---

## Verdict

Security posture for the **delivery Firestore path is solid** — company-scoped queries, mismatch rejection, and adapter scoping follow enterprise multi-tenant patterns. **Production deployment requires Firestore security rules audit** (outside this codebase scope) and company-scoping of catalog/knowledge/playbook data. Client-side gates alone are insufficient for production at Stripe/GitHub scale.
