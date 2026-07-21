# 07 — AI Boundary and Confidence Model

---

## 1. AI Port (Frozen Interface — F1 Contracts)

Provider-agnostic port in **application/infrastructure boundary**:

```typescript
interface LearningExtractionAiPort {
  proposeCandidates(input: LearningExtractionAiInput): Promise<LearningExtractionAiOutput>;
}

interface LearningExtractionAiInput {
  evidenceBundle: SanitizedEvidenceBundle;  // no raw client PII
  candidateTypesRequested: CandidateType[];
  modelPolicy: { maxCandidates: number; temperature: number };
}

interface LearningExtractionAiOutput {
  proposals: AiCandidateProposal[];
  modelMetadata: { provider: string; modelId: string; promptVersion: string };
  rawResponseHash: string;  // audit only, not stored on candidate body
}

interface AiCandidateProposal {
  candidateType: CandidateType;
  title: string;
  summary: string;
  proposedContent: object;
  aiConfidence?: number;  // UNTRUSTED
}
```

**Rules:**

- No OpenAI/Gemini/Anthropic imports in domain
- F1 ships **NullLearningExtractionAiPort** (returns empty proposals)
- F2+ binds real adapter in infrastructure only
- AI MUST NOT write to Firestore catalogs directly

---

## 2. Trust Boundary

```
AI output → application validates schema
         → domain sanitization rules
         → domain quality gates
         → candidate persisted as extracted + aiRecommendation
         → human review
```

Untrusted until gates pass and human approves.

---

## 3. Confidence Model (Reconciled)

Sources per `11_KNOWLEDGE_CONFIDENCE_LEVELS.md`, `08_QUALITY_GATES.md`, `06_AI_RECOMMENDATION_RULES.md`:

| Layer | Source | Used for |
|-------|--------|----------|
| **AI confidence** | LLM output | Display hint only; never promotion |
| **Evidence confidence** | Domain rules from provenance | Gate input |
| **Organizational confidence** | Post-approval / reuse history | Future; F3 read |
| **promotionEligible** | Domain composite | Queue admission |

### Evidence confidence rules (deterministic)

| Condition | Level |
|-----------|-------|
| Missing evaluation or retro | `insufficient` |
| Single engagement + confirmed eval | `single_engagement` |
| Eval + reuse + retro lessons aligned | `multi_signal` |
| Prior promoted pattern same category + human validated | `validated` |

### Gate mapping (from 08_QUALITY_GATES)

- GK-002: `evidenceConfidence >= validated` OR human override flag for `single_engagement` with strong eval pass
- G-004: AI proposals require `modelMetadata` on extraction run
- **LLM confidence alone NEVER sets `promotionEligible: true`**

### Organizational confidence

Set to `proven` only after promotion + future reuse success — **not Phase F operational**.

---

## 4. Sanitization (Application)

Before AI call and before gate G-003:

- Strip client names, emails, URLs with client domains
- Replace with `[CLIENT]` tokens
- Retro qualitative text scanned; block if PII detected in promotable fields

Domain owns PII pattern rules; application runs scan.

---

## 5. Structured AI Output Schema

JSON schema per `candidateType` — validated in application. Invalid proposals dropped with audit log entry on run.

---

## 6. Future AI Training

Per `20_FUTURE_AI_TRAINING_STRATEGY.md` — **OUT OF F SCOPE**. Phase F only stores rejection labels via audit for future export.
