import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/useAuth";
import { usePermissions } from "../../../hooks/usePermissions";
import { CustomerService } from "../../../services/customerService";
import { useAosScope } from "../useAosScope";
import { aosQueryKeys } from "./keys";

export interface ErpCustomerOption {
  id: string;
  name: string;
}

export function useErpCustomersQuery() {
  const { user, userProfile } = useAuth();
  const { isOwner, isAdmin } = usePermissions();
  const { companyId, isReady } = useAosScope();

  return useQuery<ErpCustomerOption[]>({
    queryKey: aosQueryKeys.erp.customers(companyId),
    queryFn: async () => {
      if (!user || !userProfile) {
        throw new Error("Authentication is required");
      }

      const customers = await CustomerService.getCustomers(
        user,
        userProfile,
        isOwner,
        isAdmin,
      );

      return customers
        .map((customer) => ({
          id: customer.id,
          name: customer.name?.trim() || "Unnamed customer",
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    enabled: isReady && Boolean(user && userProfile),
  });
}
