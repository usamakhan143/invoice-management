import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

export function epochMsToTimestamp(ms: number): firebase.firestore.Timestamp {
  return firebase.firestore.Timestamp.fromMillis(ms);
}

export function timestampToEpochMs(
  value: firebase.firestore.Timestamp | undefined | null,
): number | undefined {
  if (!value) return undefined;
  return value.toMillis();
}

export function requireTimestampMs(
  value: firebase.firestore.Timestamp | undefined | null,
  field: string,
): number {
  const ms = timestampToEpochMs(value);
  if (ms === undefined) {
    throw new Error(`Missing or invalid Firestore timestamp: ${field}`);
  }
  return ms;
}

export function nowEpochMs(): number {
  return firebase.firestore.Timestamp.now().toMillis();
}
