import { useEffect } from "react";
import { useAuth } from "./useAuth";

export const usePageTitle = (pageTitle?: string) => {
  const { userProfile } = useAuth();

  useEffect(() => {
    const companyName = userProfile?.companyName || "Invoice Management";
    const title = pageTitle
      ? `${pageTitle} - ${companyName}`
      : `${companyName} - Sales & Invoice Management`;

    document.title = title;
  }, [pageTitle, userProfile?.companyName]);
};
