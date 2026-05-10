/** 4-digit screen / revenue PIN: hashed with uid-bound salt (SHA-256). */

export const screenPinSessionStorageKey = (uid: string): string =>
  `screen_pin_gate_${uid}`;

export function isValidFourDigitPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function hashScreenPin(uid: string, pin: string): Promise<string> {
  const normalized = pin.trim();
  if (!isValidFourDigitPin(normalized)) {
    throw new Error("PIN must be exactly 4 digits");
  }
  const enc = new TextEncoder().encode(`inv-screen-pin:v1:${uid}:${normalized}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyScreenPin(
  uid: string,
  pin: string,
  storedHash: string | undefined,
): Promise<boolean> {
  if (!storedHash || !isValidFourDigitPin(pin.trim())) return false;
  const h = await hashScreenPin(uid, pin.trim());
  return h === storedHash;
}
