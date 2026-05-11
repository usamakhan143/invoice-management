import { db } from "./firebase";
import type { Vendor } from "../types";

export function subscribeCompanyVendors(
  companyId: string,
  onUpdate: (vendors: Vendor[]) => void,
): () => void {
  if (!companyId) {
    onUpdate([]);
    return () => {};
  }
  return db
    .collection("vendors")
    .where("companyId", "==", companyId)
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Vendor,
        );
        rows.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
        onUpdate(rows);
      },
      (err) => {
        console.error("Payee directory listener error:", err);
        onUpdate([]);
      },
    );
}
