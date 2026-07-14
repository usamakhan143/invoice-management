/** Firestore rejects `undefined` field values — omit optional fields instead. */
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
