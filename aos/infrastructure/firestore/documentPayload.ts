/** Firestore rejects `undefined` field values — omit optional fields instead. */
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

function isFirestoreTimestamp(value: unknown): value is firebase.firestore.Timestamp {
  return value instanceof firebase.firestore.Timestamp;
}

export function omitUndefinedFields<T extends Record<string, unknown>>(payload: T): T {
  const result = {} as T;
  for (const key of Object.keys(payload) as (keyof T)[]) {
    const value = payload[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/** Recursively omit `undefined` values from nested objects and arrays. */
export function deepOmitUndefinedFields<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (isFirestoreTimestamp(value)) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepOmitUndefinedFields(item)) as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val !== undefined) {
      result[key] = deepOmitUndefinedFields(val);
    }
  }
  return result as T;
}
