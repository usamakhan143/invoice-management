import { useEffect, useState } from "react";
import type firebase from "firebase/compat/app";
import { db } from "../services/firebase";
import type { CompanyUser, UserProfile } from "../types";

export type CompanyUserOption = { uid: string; label: string };

/**
 * Company owner + team members from `companyUsers`, for filter dropdowns (created-by, assignee, etc.).
 */
export function useCompanyUserOptions(
  user: firebase.User | null | undefined,
  userProfile: UserProfile | null | undefined,
): CompanyUserOption[] {
  const [options, setOptions] = useState<CompanyUserOption[]>([]);

  useEffect(() => {
    if (!userProfile?.companyId && !userProfile?.isOwner) return;
    const companyId = userProfile.isOwner ? user?.uid : userProfile.companyId;
    if (!companyId || !user) return;

    let cancelled = false;

    const load = async () => {
      const out: CompanyUserOption[] = [];
      const ownerSnap = await db.collection("users").doc(companyId).get();
      if (cancelled) return;
      if (ownerSnap.exists) {
        const d = ownerSnap.data();
        out.push({
          uid: companyId,
          label: d?.displayName || d?.companyName || "Owner",
        });
      }
      const snap = await db
        .collection("companyUsers")
        .where("companyId", "==", companyId)
        .get();
      if (cancelled) return;
      snap.docs.forEach((doc) => {
        const u = doc.data() as CompanyUser;
        const uid = u.uid || doc.id;
        if (!out.some((x) => x.uid === uid)) {
          out.push({
            uid,
            label: u.displayName || u.email || uid,
          });
        }
      });
      if (!out.some((x) => x.uid === user.uid)) {
        out.push({
          uid: user.uid,
          label: userProfile.displayName || userProfile.email || "Me",
        });
      }
      setOptions(out);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, userProfile]);

  return options;
}
