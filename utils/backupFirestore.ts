import { Timestamp } from "../services/firebase";

/** JSON-safe snapshot of Firestore field values (Timestamps → plain object). */
export function serializeDocData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    out[key] = serializeValue(val);
  }
  return out;
}

function serializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (val instanceof Timestamp) {
    return { __fsTimestamp: true, seconds: val.seconds, nanoseconds: val.nanoseconds };
  }
  if (Array.isArray(val)) return val.map(serializeValue);
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    if (
      typeof v.seconds === "number" &&
      typeof v.nanoseconds === "number" &&
      Object.keys(v).length <= 3
    ) {
      return { __fsTimestamp: true, seconds: v.seconds, nanoseconds: v.nanoseconds };
    }
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (x !== undefined) o[k] = serializeValue(x);
    }
    return o;
  }
  return val;
}

/** Restore Timestamp markers after JSON.parse. */
export function reviveFirestoreValues<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((x) => reviveFirestoreValues(x)) as T;
  }
  const rec = obj as Record<string, unknown>;
  if (rec.__fsTimestamp === true && typeof rec.seconds === "number") {
    return new Timestamp(
      rec.seconds as number,
      (rec.nanoseconds as number) ?? 0,
    ) as T;
  }
  const keys = Object.keys(rec);
  if (
    typeof rec.seconds === "number" &&
    typeof rec.nanoseconds === "number" &&
    keys.length <= 3
  ) {
    return new Timestamp(rec.seconds, rec.nanoseconds) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[k] = reviveFirestoreValues(v);
  }
  return out as T;
}
