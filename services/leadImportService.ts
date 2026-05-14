/**
 * Bulk lead CSV import — validation, dedupe, and chunked Firestore writes.
 *
 * Design goals:
 *  - Reuse the same `Lead` payload shape `LeadService.saveLead` writes so the
 *    rest of the CRM (real-time listeners, search, normalisation indexes)
 *    keeps working exactly as before.
 *  - Heavy work in small chunks: validate-then-write loop yields to the
 *    event loop between chunks to keep the UI responsive.
 *  - Two-tier duplicate detection:
 *      (a) in-file (same CSV contains the same lead twice)
 *      (b) already-in-CRM (file lead already exists as a company lead)
 *  - Never touches existing leads — duplicates are SKIPPED, never overwritten.
 *  - Firestore writes use `writeBatch` (atomic per batch) with a configurable
 *    chunk size and inter-batch breathing room to avoid throttling.
 */

import firebase from "firebase/compat/app";
import { db, Timestamp } from "./firebase";
import { resolveCompanyIdForUser } from "./companyId";
import {
  TARGET_SALES_GENDER,
  normalizeLeadTargetSalesGender,
  type LeadTargetSalesGender,
} from "../config/leadTargetSalesGender";
import { isValidEmailAddress } from "../utils/emailValidation";
import type { LeadExtras, LeadStatus } from "../types";

// ---------------------------------------------------------------------------
//                                Field defs
// ---------------------------------------------------------------------------

/**
 * Canonical CRM target fields the import wizard supports. The strings are
 * used as stable identifiers in column-mapping state and in saved templates,
 * so DO NOT rename them once shipped.
 */
export const LEAD_IMPORT_FIELDS = [
  "name",
  "company",
  "country",
  "category",
  "phone",
  "email",
  "source",
  "status",
  "notes",
  "targetSalesGender",
  // Extras
  "website",
  "address",
  "facebookUrl",
  "instagramUrl",
  "linkedinUrl",
  "twitterUrl",
  "tiktokUrl",
  "whatsappPhone",
] as const;

export type LeadImportField = (typeof LEAD_IMPORT_FIELDS)[number];

/**
 * Label + small description for each field in the mapping UI. Kept here so
 * the page component stays focused on layout.
 */
export const LEAD_IMPORT_FIELD_INFO: Record<
  LeadImportField,
  { label: string; required?: boolean; hint?: string }
> = {
  name: { label: "Contact name", hint: "Person's name (first + last together)" },
  company: { label: "Company / business" },
  country: { label: "Country", hint: "Free text; matched against country list later." },
  category: { label: "Category / industry", hint: "If the file has no category column, choose a default below so every lead keeps an industry tag." },
  phone: {
    label: "Phone",
    hint: "Any format; digits-only is used for duplicate detection.",
  },
  email: { label: "Email", hint: "Validated; invalid emails block the row." },
  source: {
    label: "Lead source",
    required: true,
    hint: "Required. If your CSV has no source column, the wizard fills 'Import' as the default.",
  },
  status: {
    label: "Pipeline status",
    hint: "Must be one of New / Contacted / Qualified / Proposal Sent / Won / Lost. Defaults to New.",
  },
  notes: { label: "Notes" },
  targetSalesGender: {
    label: "Target sales agent",
    hint: "any / female / male — case-insensitive. Defaults to 'any'.",
  },
  website: { label: "Website" },
  address: { label: "Address" },
  facebookUrl: { label: "Facebook URL" },
  instagramUrl: { label: "Instagram URL" },
  linkedinUrl: { label: "LinkedIn URL" },
  twitterUrl: { label: "Twitter / X URL" },
  tiktokUrl: { label: "TikTok URL" },
  whatsappPhone: {
    label: "WhatsApp number",
    hint: "If set, lead is marked as WhatsApp-reachable. Leave empty if same as phone.",
  },
};

/**
 * Header → field auto-guess. Match is case-insensitive, ignores non-alpha-num
 * characters (so "First Name" and "first-name" both win). Keep this list
 * generous — covers Apollo, HubSpot exports, common scrapers, plus typos.
 */
const HEADER_GUESS: { field: LeadImportField; aliases: string[] }[] = [
  {
    field: "name",
    aliases: [
      "name",
      "fullname",
      "contactname",
      "contact",
      "personname",
      "firstandlastname",
      "leadname",
    ],
  },
  {
    field: "company",
    aliases: [
      "company",
      "companyname",
      "organisation",
      "organization",
      "organisationname",
      "organizationname",
      "businessname",
      "business",
      "accountname",
      "employer",
    ],
  },
  {
    field: "country",
    aliases: ["country", "nation", "countryname", "businesscountry", "personcountry"],
  },
  {
    field: "category",
    aliases: ["category", "industry", "businesstype", "vertical", "sector", "niche"],
  },
  {
    field: "phone",
    aliases: [
      "phone",
      "phonenumber",
      "mobile",
      "mobilenumber",
      "cell",
      "cellnumber",
      "primaryphone",
      "workphone",
      "directphone",
      "telephone",
      "contactnumber",
    ],
  },
  {
    field: "email",
    aliases: [
      "email",
      "emailaddress",
      "mail",
      "primaryemail",
      "workemail",
      "businessemail",
      "contactemail",
    ],
  },
  {
    field: "source",
    aliases: [
      "source",
      "leadsource",
      "channel",
      "leadchannel",
      "acquisitionsource",
      "originatingsource",
    ],
  },
  {
    field: "status",
    aliases: ["status", "leadstatus", "pipelinestage", "stage", "leadstage"],
  },
  {
    field: "notes",
    aliases: ["notes", "comment", "comments", "description", "remarks", "memo"],
  },
  {
    field: "targetSalesGender",
    aliases: [
      "targetsalesgender",
      "salesgender",
      "preferredagent",
      "preferredagentgender",
      "agentgender",
    ],
  },
  {
    field: "website",
    aliases: ["website", "url", "site", "homepage", "domain", "companywebsite"],
  },
  {
    field: "address",
    aliases: [
      "address",
      "fulladdress",
      "businessaddress",
      "street",
      "location",
      "officeaddress",
    ],
  },
  {
    field: "facebookUrl",
    aliases: ["facebookurl", "facebook", "fbprofile", "fb", "facebookprofile"],
  },
  {
    field: "instagramUrl",
    aliases: ["instagramurl", "instagram", "ig", "igprofile", "instagramprofile"],
  },
  {
    field: "linkedinUrl",
    aliases: [
      "linkedinurl",
      "linkedin",
      "linkedinprofile",
      "linkedincompany",
      "linkedinpage",
      "personlinkedin",
      "companylinkedin",
    ],
  },
  {
    field: "twitterUrl",
    aliases: [
      "twitterurl",
      "twitter",
      "x",
      "xurl",
      "xprofile",
      "twitterprofile",
    ],
  },
  {
    field: "tiktokUrl",
    aliases: ["tiktokurl", "tiktok", "tiktokprofile"],
  },
  {
    field: "whatsappPhone",
    aliases: ["whatsapp", "whatsappnumber", "whatsappphone", "wa", "wanumber"],
  },
];

const canonicalKey = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Build an initial header→field mapping. Each header is matched against
 * `HEADER_GUESS`; the first field whose alias hits wins. If no alias hits,
 * the slot is left empty so the user can pick it manually.
 *
 * Same field will not be auto-assigned twice — first header wins.
 */
export function autoGuessMapping(
  headers: string[],
): Record<number, LeadImportField | ""> {
  const used = new Set<LeadImportField>();
  const out: Record<number, LeadImportField | ""> = {};
  headers.forEach((raw, idx) => {
    const key = canonicalKey(raw);
    if (!key) {
      out[idx] = "";
      return;
    }
    for (const { field, aliases } of HEADER_GUESS) {
      if (used.has(field)) continue;
      if (aliases.some((a) => a === key || key === a)) {
        out[idx] = field;
        used.add(field);
        return;
      }
    }
    // Soft match: "contains" any alias (covers "Company name (HQ)" etc.)
    for (const { field, aliases } of HEADER_GUESS) {
      if (used.has(field)) continue;
      if (aliases.some((a) => key.includes(a))) {
        out[idx] = field;
        used.add(field);
        return;
      }
    }
    out[idx] = "";
  });
  return out;
}

// ---------------------------------------------------------------------------
//                              Normalisation
// ---------------------------------------------------------------------------

/** Digits-only phone for duplicate matching. Empty string if too few digits. */
export function normalizePhoneForDedupe(raw: string | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits;
}

/** Lowercased + trimmed email for duplicate matching. */
export function normalizeEmailForDedupe(raw: string | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Allowed pipeline stages — matches `LeadStatus` in `types.ts`. */
const ALLOWED_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
];

function normalizeStatus(raw: string | undefined): {
  ok: boolean;
  value: LeadStatus;
} {
  const t = (raw ?? "").trim();
  if (!t) return { ok: true, value: "New" };
  const found = ALLOWED_STATUSES.find(
    (s) => s.toLowerCase() === t.toLowerCase(),
  );
  if (found) return { ok: true, value: found };
  return { ok: false, value: "New" };
}

function normalizeTargetGender(raw: string | undefined): LeadTargetSalesGender {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "female" || t === "f") return TARGET_SALES_GENDER.FEMALE;
  if (t === "male" || t === "m") return TARGET_SALES_GENDER.MALE;
  return normalizeLeadTargetSalesGender(t);
}

// ---------------------------------------------------------------------------
//                          Row → Lead transformation
// ---------------------------------------------------------------------------

export type ImportRowStatus =
  | "valid"
  | "invalid"
  | "duplicate_in_file"
  | "duplicate_in_crm";

export interface ImportRowResult {
  /** 1-based row number in the original CSV (header = 0). */
  rowNumber: number;
  status: ImportRowStatus;
  /** Human-readable reasons, joined with "; " in reports. */
  errors: string[];
  /** Built payload for `valid` rows, ready for Firestore. Otherwise null. */
  payload: BuiltLeadPayload | null;
  /** Snapshot of mapped values (useful for the preview UI / error report). */
  mapped: Partial<Record<LeadImportField, string>>;
  /** Duplicate match info — present on duplicate_* rows for tooltips. */
  duplicateOf?: { source: "file" | "crm"; key: string };
}

export interface BuiltLeadPayload {
  // Stored fields — keep names aligned with `Lead` in types.ts.
  name: string;
  company: string;
  country: string;
  category: string;
  phone: string;
  email: string;
  source: string;
  status: LeadStatus;
  notes: string;
  targetSalesGender: LeadTargetSalesGender;
  extras: LeadExtras;
  phoneNormalized: string | null;
  emailNormalized: string | null;
  // Defaults applied at commit-time:
  // assignedUserId, companyId, createdById, createdAt, updatedAt, linkedCustomerId, …
}

/** Pull cell from raw row, returning "" if mapping not set or cell missing. */
function cell(
  row: string[],
  mapping: Record<number, LeadImportField | "">,
  field: LeadImportField,
): string {
  for (const [idxStr, target] of Object.entries(mapping)) {
    if (target !== field) continue;
    const idx = Number(idxStr);
    const v = row[idx];
    return typeof v === "string" ? v : "";
  }
  return "";
}

export interface ValidateRowOptions {
  /** Used when CSV has no `source` column. Default `"Import"`. */
  defaultSource?: string;
  /** Used when the mapped category cell is empty, or when category is not mapped at all. */
  defaultCategory?: string;
  /** When false, an empty phone+email is allowed (row still imports as a “light” lead). */
  requireContact?: boolean;
}

/**
 * Validate + transform a single CSV row.
 * Duplicate status (`duplicate_in_file` / `duplicate_in_crm`) is decided by
 * the caller after the row is built — this function only handles
 * format/validation errors.
 */
export function validateRow(
  row: string[],
  rowNumber: number,
  mapping: Record<number, LeadImportField | "">,
  opts: ValidateRowOptions = {},
): ImportRowResult {
  const errors: string[] = [];
  const mapped: Partial<Record<LeadImportField, string>> = {};
  for (const f of LEAD_IMPORT_FIELDS) {
    mapped[f] = cell(row, mapping, f).trim();
  }

  const email = (mapped.email ?? "").trim();
  const phoneRaw = (mapped.phone ?? "").trim();
  const phoneNorm = normalizePhoneForDedupe(phoneRaw);
  const emailNorm = normalizeEmailForDedupe(email);

  if (email && !isValidEmailAddress(email)) {
    errors.push(`Invalid email format ("${email}")`);
  }
  if (opts.requireContact && !email && !phoneRaw) {
    errors.push("At least one of email / phone is required");
  }

  // Status guard
  const statusGuess = normalizeStatus(mapped.status);
  if (!statusGuess.ok) {
    errors.push(
      `Unknown status ("${mapped.status}"). Allowed: ${ALLOWED_STATUSES.join(", ")}`,
    );
  }

  // Source default
  let source = (mapped.source ?? "").trim();
  if (!source) source = opts.defaultSource ?? "Import";

  let category = (mapped.category ?? "").trim();
  const defCategory = (opts.defaultCategory ?? "").trim();
  if (!category && defCategory) category = defCategory;
  if (!category) {
    errors.push(
      "Business category is missing — map a Category / industry column, or set a default category in the import wizard for rows without a value.",
    );
  }

  // Extras
  const extras: LeadExtras = {};
  if (mapped.website) extras.website = mapped.website;
  if (mapped.address) extras.address = mapped.address;
  if (mapped.facebookUrl) extras.facebookUrl = mapped.facebookUrl;
  if (mapped.instagramUrl) extras.instagramUrl = mapped.instagramUrl;
  if (mapped.linkedinUrl) extras.linkedinUrl = mapped.linkedinUrl;
  if (mapped.twitterUrl) extras.twitterUrl = mapped.twitterUrl;
  if (mapped.tiktokUrl) extras.tiktokUrl = mapped.tiktokUrl;
  const wa = (mapped.whatsappPhone ?? "").trim();
  if (wa) {
    extras.hasWhatsapp = true;
    if (normalizePhoneForDedupe(wa) === phoneNorm && phoneNorm) {
      extras.whatsappSameAsPhone = true;
    } else {
      extras.whatsappSameAsPhone = false;
      extras.whatsappPhone = wa;
    }
  }

  if (errors.length > 0) {
    return {
      rowNumber,
      status: "invalid",
      errors,
      payload: null,
      mapped,
    };
  }

  const payload: BuiltLeadPayload = {
    name: (mapped.name ?? "").trim(),
    company: (mapped.company ?? "").trim(),
    country: (mapped.country ?? "").trim(),
    category,
    phone: phoneRaw,
    email,
    source,
    status: statusGuess.value,
    notes: (mapped.notes ?? "").trim(),
    targetSalesGender: normalizeTargetGender(mapped.targetSalesGender),
    extras,
    phoneNormalized: phoneNorm || null,
    emailNormalized: emailNorm || null,
  };

  return {
    rowNumber,
    status: "valid",
    errors: [],
    payload,
    mapped,
  };
}

// ---------------------------------------------------------------------------
//                          Existing CRM dedupe index
// ---------------------------------------------------------------------------

export interface ExistingDedupeIndex {
  /** Lower-cased emails already in CRM. */
  emails: Set<string>;
  /** Digits-only phone numbers already in CRM (only if they have enough digits). */
  phones: Set<string>;
  /** Total lead documents scanned. */
  scanned: number;
}

/** Min digits required before we count a phone toward the duplicate set. */
export const MIN_PHONE_DIGITS_FOR_DEDUPE = 7;

/**
 * Paginated scan of the company's `leads` collection, projecting just the
 * normalised email / phone fields. Designed for big tenants:
 *  - 500 docs per page (Firestore's hard max for list reads); calls
 *    `setTimeout(0)` between pages so the main thread can paint.
 *  - Caller can cancel by mutating `signal.aborted`.
 *  - Each call yields the running totals via `onProgress`.
 *
 * We accept both new-style normalised fields and fall back to live raw fields
 * for older leads that pre-date the normalisation indexes.
 */
export async function buildExistingDedupeIndex(
  user: firebase.User,
  userProfile: { isOwner?: boolean; companyId?: string },
  signal: { aborted: boolean },
  onProgress?: (scanned: number) => void,
): Promise<ExistingDedupeIndex> {
  const companyId = resolveCompanyIdForUser(user, userProfile);
  const emails = new Set<string>();
  const phones = new Set<string>();
  let scanned = 0;
  if (!companyId) {
    return { emails, phones, scanned: 0 };
  }

  // Page using doc id as cursor — stable, no extra index required.
  let last: firebase.firestore.QueryDocumentSnapshot | null = null;
  const pageSize = 500;

  const docIdPath = firebase.firestore.FieldPath.documentId();

  while (!signal.aborted) {
    let q = db
      .collection("leads")
      .where("companyId", "==", companyId)
      .orderBy(docIdPath)
      .limit(pageSize);
    if (last) q = q.startAfter(last);
    // eslint-disable-next-line no-await-in-loop
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;

      const emailNorm =
        typeof d.emailNormalized === "string" && d.emailNormalized.length > 0
          ? (d.emailNormalized as string)
          : normalizeEmailForDedupe(d.email as string | undefined);
      if (emailNorm) emails.add(emailNorm);

      const phoneNorm =
        typeof d.phoneNormalized === "string" && d.phoneNormalized.length > 0
          ? (d.phoneNormalized as string)
          : normalizePhoneForDedupe(d.phone as string | undefined);
      if (phoneNorm && phoneNorm.length >= MIN_PHONE_DIGITS_FOR_DEDUPE) {
        phones.add(phoneNorm);
      }
    }
    scanned += snap.docs.length;
    onProgress?.(scanned);
    if (snap.docs.length < pageSize) break;
    last = snap.docs[snap.docs.length - 1];

    // Yield between pages so the UI thread isn't starved during the index build.
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return { emails, phones, scanned };
}

// ---------------------------------------------------------------------------
//                                Dedupe pass
// ---------------------------------------------------------------------------

/**
 * Apply dedupe in-place to validated row results.
 *  - Email match (preferred) → key = `email:<normalized>`.
 *  - Phone match (if digits >= MIN_PHONE_DIGITS_FOR_DEDUPE) → key = `phone:<normalized>`.
 *  - First occurrence of a key wins; later occurrences become
 *    `duplicate_in_file`. Rows already present in CRM become
 *    `duplicate_in_crm`.
 *
 * Rows without any dedupe key (no email, no phone) are left as-is.
 */
export function applyDedupe(
  results: ImportRowResult[],
  existing: ExistingDedupeIndex,
): {
  validCount: number;
  duplicateInFile: number;
  duplicateInCrm: number;
  invalid: number;
} {
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  let validCount = 0;
  let duplicateInFile = 0;
  let duplicateInCrm = 0;
  let invalid = 0;

  for (const r of results) {
    if (r.status === "invalid" || !r.payload) {
      invalid += 1;
      continue;
    }
    const e = r.payload.emailNormalized ?? "";
    const p = r.payload.phoneNormalized ?? "";

    const phoneEligible = p.length >= MIN_PHONE_DIGITS_FOR_DEDUPE;

    // CRM duplicate?
    if (e && existing.emails.has(e)) {
      r.status = "duplicate_in_crm";
      r.duplicateOf = { source: "crm", key: `email:${e}` };
      r.payload = null;
      duplicateInCrm += 1;
      continue;
    }
    if (phoneEligible && existing.phones.has(p)) {
      r.status = "duplicate_in_crm";
      r.duplicateOf = { source: "crm", key: `phone:${p}` };
      r.payload = null;
      duplicateInCrm += 1;
      continue;
    }

    // In-file duplicate?
    if (e && seenEmail.has(e)) {
      r.status = "duplicate_in_file";
      r.duplicateOf = { source: "file", key: `email:${e}` };
      r.payload = null;
      duplicateInFile += 1;
      continue;
    }
    if (phoneEligible && seenPhone.has(p)) {
      r.status = "duplicate_in_file";
      r.duplicateOf = { source: "file", key: `phone:${p}` };
      r.payload = null;
      duplicateInFile += 1;
      continue;
    }

    if (e) seenEmail.add(e);
    if (phoneEligible) seenPhone.add(p);
    validCount += 1;
  }

  return { validCount, duplicateInFile, duplicateInCrm, invalid };
}

// ---------------------------------------------------------------------------
//                                Commit pass
// ---------------------------------------------------------------------------

export interface CommitOptions {
  /** Firestore writes per batch. Default 100 — well below the 500 limit and
   *  small enough to stream progress responsively. */
  batchSize?: number;
  /** Pause between batches (ms). Default 30. Throttles writes so the rest
   *  of the app stays smooth and avoids rate limits on huge imports. */
  interBatchDelayMs?: number;
  /** Optional assignment for newly created leads (uid). */
  defaultAssignedUserId?: string;
  /** Stop early. */
  signal?: { aborted: boolean };
}

export interface CommitProgress {
  written: number;
  total: number;
  failed: number;
}

/** Build the final Firestore document body from a built payload. */
function buildLeadDoc(
  payload: BuiltLeadPayload,
  companyId: string,
  createdById: string,
  assignedUserId: string,
): Record<string, unknown> {
  const now = Timestamp.now();
  return {
    name: payload.name,
    company: payload.company,
    country: payload.country,
    category: payload.category,
    phone: payload.phone,
    email: payload.email,
    source: payload.source,
    status: payload.status,
    notes: payload.notes,
    nextFollowUpDate: null,
    companyId,
    extras: payload.extras,
    linkedCustomerId: null,
    linkedBusinessId: null,
    phoneNormalized: payload.phoneNormalized,
    emailNormalized: payload.emailNormalized,
    targetSalesGender: payload.targetSalesGender,
    updatedAt: now,
    createdAt: now,
    createdById,
    assignedUserId,
    convertedCustomerId: null,
    convertedBusinessId: null,
  };
}

/**
 * Commit valid rows in batches. Returns the final counters.
 *
 * Sequential batches keep ordering predictable and avoid blowing past
 * Firestore's per-write quota during huge imports. The inter-batch delay
 * gives the rest of the app (real-time listeners, UI paints) breathing room.
 *
 * Errors on a batch are caught: the whole batch is retried once, then if it
 * still fails the rows are marked failed and the import continues.
 */
export async function commitLeadsBatched(
  rows: ImportRowResult[],
  user: firebase.User,
  userProfile: { isOwner?: boolean; companyId?: string },
  opts: CommitOptions = {},
  onProgress?: (p: CommitProgress) => void,
): Promise<{ written: number; failed: number; failedRows: ImportRowResult[] }> {
  const validRows = rows.filter((r) => r.status === "valid" && r.payload);
  const total = validRows.length;
  const batchSize = Math.max(1, Math.min(500, opts.batchSize ?? 100));
  const delay = Math.max(0, opts.interBatchDelayMs ?? 30);
  const signal = opts.signal;

  const companyId = resolveCompanyIdForUser(user, userProfile);
  if (!companyId) {
    throw new Error(
      "Company is still loading. Wait a moment and try again, or sign out and back in.",
    );
  }
  const assignedUserId = (opts.defaultAssignedUserId ?? "").trim();

  let written = 0;
  let failed = 0;
  const failedRows: ImportRowResult[] = [];

  for (let offset = 0; offset < validRows.length; offset += batchSize) {
    if (signal?.aborted) break;
    const slice = validRows.slice(offset, offset + batchSize);
    const batch = db.batch();
    const refs: { ref: firebase.firestore.DocumentReference; row: ImportRowResult }[] = [];
    for (const r of slice) {
      if (!r.payload) continue;
      const ref = db.collection("leads").doc();
      batch.set(
        ref,
        buildLeadDoc(r.payload, companyId, user.uid, assignedUserId),
      );
      refs.push({ ref, row: r });
    }

    let ok = false;
    let attempts = 0;
    while (attempts < 2 && !ok && !signal?.aborted) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
        ok = true;
      } catch (err) {
        attempts += 1;
        if (attempts >= 2) {
          console.error("[leadImport] batch failed after retry:", err);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => setTimeout(resolve, 250));
        }
      }
    }

    if (ok) {
      written += refs.length;
    } else {
      failed += refs.length;
      for (const { row } of refs) failedRows.push(row);
    }

    onProgress?.({ written, total, failed });

    if (delay > 0 && offset + batchSize < validRows.length && !signal?.aborted) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  return { written, failed, failedRows };
}

// ---------------------------------------------------------------------------
//                              Error report CSV
// ---------------------------------------------------------------------------

/** Quote a CSV cell when needed. */
function csvEscape(value: string): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV containing every row that was NOT imported, with a reason
 * column. Columns are the canonical CRM field names (not the original CSV
 * headers) — that makes it easier to spot which CRM field a row failed on.
 */
export function buildErrorReportCsv(rows: ImportRowResult[]): string {
  const fields: LeadImportField[] = LEAD_IMPORT_FIELDS.slice();
  const out: string[] = [];
  const headerCells = ["Row #", "Status", "Reason", ...fields.map((f) => LEAD_IMPORT_FIELD_INFO[f].label)];
  out.push(headerCells.map(csvEscape).join(","));

  for (const r of rows) {
    if (r.status === "valid") continue;
    const reason =
      r.status === "duplicate_in_file"
        ? `Duplicate in file (${r.duplicateOf?.key ?? ""})`
        : r.status === "duplicate_in_crm"
          ? `Already in CRM (${r.duplicateOf?.key ?? ""})`
          : r.errors.join("; ");
    const mappedCells = fields.map((f) => r.mapped[f] ?? "");
    out.push(
      [String(r.rowNumber), r.status, reason, ...mappedCells]
        .map(csvEscape)
        .join(","),
    );
  }
  return out.join("\r\n");
}
