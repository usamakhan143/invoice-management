# Outreach, campaigns, and integration (A–Z)

This is the **single source of truth** for how CRM campaigns, campaign tags, and the outreach event timeline work in the app — how data is stored, how permissions map to UI, and how external systems (webhooks, dialers, AI tools) should integrate without causing scale problems.

---

## Mental model (one sentence per concept)

- **Campaign** — A named initiative (e.g. "Q2 Outbound", "Partner Referrals"). Company-scoped, has a status: `draft`, `active`, or `archived`.
- **Campaign tag** — A label **inside** a campaign used for lead segmentation (e.g. "Hot", "Callback", "Not interested"). Tags belong to exactly one campaign.
- **Lead** — Optionally has `campaignId` and `campaignTagIds[]` linking it to one campaign and its tags. All strategy / context lives in the existing **Notes** field — no parallel "fit notes" fields exist.
- **Outreach event** — One row in the single `outreachEvents` top-level collection. Phone call → `channel: "call"`; email, WhatsApp, SMS, in-person → other channel values. This replaced the old per-lead `callLogs` subcollection from day 1 of CRM scale planning.

---

## Firestore collections

### `campaigns`
| Field | Type | Notes |
|-------|------|-------|
| `companyId` | string | Required — company boundary |
| `name` | string | Required |
| `description` | string? | Optional tagline |
| `channelsHint` | string? | e.g. "Cold call + WhatsApp follow-up" — informational |
| `status` | `"draft" \| "active" \| "archived"` | |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp? | |
| `createdById` | string | userId of creator |

### `campaignTags`
| Field | Type | Notes |
|-------|------|-------|
| `companyId` | string | |
| `campaignId` | string | Parent campaign |
| `slug` | string | Lowercase no-spaces identifier (auto-derived from label) |
| `label` | string | Display text shown in UI |
| `color` | string? | Tailwind color key e.g. "emerald", "rose" |
| `description` | string? | |
| `sortOrder` | number | For ordered display |
| `createdAt` | Timestamp | |

### `outreachEvents`
| Field | Type | Notes |
|-------|------|-------|
| `companyId` | string | Required — company boundary |
| `leadId` | string | Required — which lead this event belongs to |
| `channel` | `OutreachChannel` | `"call"`, `"email"`, `"whatsapp"`, `"sms"`, `"in_person"`, `"other"` |
| `notes` | string | What was discussed / outcome notes |
| `outcome` | string? | For calls: `"Connected"`, `"No Answer"`, etc. Free text for other channels |
| `nextFollowUpDate` | Timestamp? | If set, also propagated to the lead doc |
| `createdAt` | Timestamp | |
| `createdByUserId` | string | |
| `createdByDisplayName` | string | |
| `campaignId` | string? | Optional — which campaign context this outreach happened in |
| `campaignTagIds` | string[]? | Optional tag context |
| `recordingRef` | string? | Dialer ID / CRM link / ticket # (admin only) |
| `callVerifiedAt` | Timestamp? | Admin QA: when call was marked as verified |
| `callVerifiedByUserId` | string? | Admin QA |
| `externalSource` | string? | e.g. `"zapier"`, `"twilio"` — for webhook writes |
| `externalId` | string? | Idempotency key from external source |
| `metadata` | `Record<string, unknown>?` | Future extensions without schema change |

### `leads` (existing — additive changes only)
| New field | Type | Notes |
|-----------|------|-------|
| `campaignId` | string? | Links lead to a campaign |
| `campaignTagIds` | string[]? | Tags within the campaign |

**All new fields are optional** — existing 100+ leads are untouched.

---

## Indexes (deploy with `firebase deploy --only firestore:indexes`)

- `outreachEvents` → `companyId ASC, leadId ASC, createdAt DESC` — per-lead timeline query.
- `campaigns` → `companyId ASC, updatedAt DESC` — sorted campaign list.
- `campaignTags` → `campaignId ASC, sortOrder ASC` — ordered tags for a campaign.

If you see a `failed-precondition` error in the browser console with a link, click the link to auto-create the index. Wait until it shows **Enabled** in the Firebase console.

---

## Permissions matrix

| Key | Description | Who normally gets it |
|-----|-------------|---------------------|
| `campaigns_view` | Open the Campaigns page (read-only if no manage) | All team members with leads access |
| `campaigns_manage` | Create, edit, archive campaigns and their tags | Admin / manager |
| `leads_campaign_assign` | Change a lead's campaign + tags | Also granted when user has `leads_edit` |
| `leads_log_calls` | Log outreach events and view the Outreach tab | Agent (name kept for backward compat) |
| `leads_delete_call_logs` | Delete outreach events on a lead | Admin |
| `leads_call_log_approve` | Set recording/reference and verify call events (QA) | Admin |

Owners (`isOwner`) bypass all permission checks.

---

## UI map

| Location | What it shows | Permission needed |
|----------|--------------|------------------|
| Sidebar → "Campaigns" | Campaign list page | `campaigns_view` |
| Campaign page | List + create/edit/archive | `campaigns_manage` to write |
| Campaign page → Tags | Manage tags per campaign | `campaigns_manage` |
| Lead detail → Details tab | Campaign dropdown + tag checkboxes | `leads_campaign_assign` or `leads_edit` |
| Lead detail → Outreach tab | Event timeline + add form | `leads_log_calls` |
| Outreach event admin block | Recording ref + call verification | `leads_call_log_approve` |
| My workspace → Call modal | Outreach event (channel = call) | `leads_log_calls` |

---

## Backup format v4

`DatabaseMigrationService.exportCompanyData` exports format version `4`. New root arrays:
- `campaigns` — all campaigns for the company.
- `campaignTags` — all tags (across all campaigns) for the company.
- `outreachEvents` — all outreach events for the company.
- `callLogs` is no longer written on import (legacy subcollection data in old backups is preserved but not re-created).

---

## External / webhook integration (future)

1. Cloud Function receives POST with shared secret header.
2. Validates and maps payload to `OutreachEvent` shape.
3. Sets `externalSource` (e.g. `"twilio"`) and `externalId` for idempotency.
4. Writes to `outreachEvents` with the relevant `companyId` + `leadId`.
5. If `nextFollowUpDate` is provided, also updates the lead doc.

Do **not** write directly to `callLogs` subcollection — it is legacy.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Outreach tab blank / spinner loops | Firestore composite index missing | Deploy `firestore.indexes.json`; wait for index **Enabled** |
| "Permission denied" when saving outreach | Rules not deployed or `companyId` mismatch | Deploy `firestore.rules`; ensure event `companyId` = lead `companyId` |
| Tags don't appear on lead | `campaignId` on lead ≠ tag's `campaignId` | Campaign selector on lead detail |
| Role can't see Campaigns | Missing `campaigns_view` in granular permissions | User Management → role → Campaigns section |
| Role can't log outreach | Missing `leads_log_calls` | User Management → role → Leads section |
| Backup import misses events | Old backup (v1–3) had no `outreachEvents` | Expected — events were never in old backups |
