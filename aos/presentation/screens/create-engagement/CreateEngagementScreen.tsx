/** ST-03 — Create Engagement full-page screen composer. */
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import { useCompanyUserOptions } from "../../../../hooks/useCompanyUserOptions";
import { usePermissions } from "../../../../hooks/usePermissions";
import type { AgencyType } from "../../../constants/agencyType";
import { AGENCY_TYPES, AGENCY_TYPE_LABELS } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import { ENGAGEMENT_TYPES, ENGAGEMENT_TYPE_LABELS } from "../../../constants/engagementType";
import { AOS_PERMISSION_KEY } from "../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import type { CreateDeliveryEngagementCommand } from "../../../types/presentation";
import { useCreateEngagementMutation } from "../../../hooks/mutations/useCreateEngagementMutation";
import { useErpCustomersQuery } from "../../../hooks/queries/useErpCustomersQuery";
import { FeatureFlagGate } from "../../gates";
import { PageHeader, PageShell, StickyFooterBar } from "../../layouts";
import {
  Breadcrumb,
  Button,
  ErrorState,
  FormField,
  FormSection,
  InAppAlert,
  LinkButton,
  SearchInput,
  Select,
  SkeletonBlock,
  TextArea,
  TextInput,
} from "../../ui";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

const CreateEngagementScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(AOS_PERMISSION_KEY.ENGAGEMENTS_MANAGE);
  const userOptions = useCompanyUserOptions(user, userProfile);
  const customersQuery = useErpCustomersQuery();
  const createMutation = useCreateEngagementMutation();

  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300);
  const [erpCustomerId, setErpCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [scopeSummary, setScopeSummary] = useState("");
  const [deliveryLeadUserId, setDeliveryLeadUserId] = useState(user?.uid ?? "");
  const [agencyType, setAgencyType] = useState("");
  const [engagementType, setEngagementType] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.uid && !deliveryLeadUserId) {
      setDeliveryLeadUserId(user.uid);
    }
  }, [deliveryLeadUserId, user?.uid]);

  const filteredCustomers = useMemo(() => {
    const options = customersQuery.data ?? [];
    const query = debouncedCustomerSearch.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.id.toLowerCase().includes(query),
    );
  }, [customersQuery.data, debouncedCustomerSearch]);

  const selectedCustomer = customersQuery.data?.find((customer) => customer.id === erpCustomerId);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!erpCustomerId) errors.erpCustomerId = "Select an ERP customer";
    if (!title.trim()) errors.title = "Title is required";
    if (!deliveryLeadUserId) errors.deliveryLeadUserId = "Delivery lead is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const command: CreateDeliveryEngagementCommand = {
      title: title.trim(),
      scopeSummary: scopeSummary.trim() || undefined,
      erpCustomerId,
      deliveryLeadUserId,
      agencyType: agencyType ? (agencyType as AgencyType) : undefined,
      engagementType: engagementType ? (engagementType as EngagementType) : undefined,
    };

    try {
      const created = await createMutation.mutateAsync(command);
      navigate(`/aos/delivery/${created.id}`);
    } catch {
      // mutation error surfaced below
    }
  };

  if (!canCreate) {
    return <Navigate to="/aos/delivery" replace />;
  }

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.DELIVERY}
      fallback={
        <PageShell>
          <InAppAlert variant="warning" title="Delivery module disabled">
            The Delivery feature flag is off for this workspace.
          </InAppAlert>
        </PageShell>
      }
    >
      <PageShell>
        <PageHeader
          breadcrumb={
            <Breadcrumb
              items={[
                { label: "Delivery", href: "/aos/delivery" },
                { label: "Create engagement" },
              ]}
            />
          }
          title="Create engagement"
          subtitle="Bind an existing ERP customer before opening a delivery engagement."
        />

        {customersQuery.isError ? (
          <ErrorState
            title="Could not load ERP customers"
            message={customersQuery.error?.message}
            onRetry={() => void customersQuery.refetch()}
            retrying={customersQuery.isFetching}
          />
        ) : (
          <form
            className="mx-auto flex w-full max-w-3xl flex-col gap-[var(--space-stack-xl)]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <FormSection title="Customer binding">
              {customersQuery.isLoading ? (
                <SkeletonBlock lines={2} />
              ) : (
                <>
                  <FormField label="Search customers" htmlFor="customer-search">
                    <SearchInput
                      id="customer-search"
                      value={customerSearch}
                      onChange={setCustomerSearch}
                      placeholder="Search ERP customers…"
                      aria-label="Search ERP customers"
                    />
                  </FormField>
                  <FormField
                    label="ERP customer"
                    htmlFor="erp-customer"
                    error={fieldErrors.erpCustomerId}
                  >
                    <Select
                      id="erp-customer"
                      value={erpCustomerId}
                      onChange={(event) => setErpCustomerId(event.target.value)}
                      options={filteredCustomers.map((customer) => ({
                        value: customer.id,
                        label: customer.name,
                      }))}
                      placeholder="Select customer"
                      hasError={Boolean(fieldErrors.erpCustomerId)}
                    />
                  </FormField>
                  {selectedCustomer ? (
                    <LinkButton
                      icon="external"
                      onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                    >
                      View customer in ERP
                    </LinkButton>
                  ) : null}
                </>
              )}
            </FormSection>

            <FormSection title="Engagement details">
              <FormField label="Title" htmlFor="engagement-title" error={fieldErrors.title}>
                <TextInput
                  id="engagement-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  hasError={Boolean(fieldErrors.title)}
                />
              </FormField>
              <FormField label="Scope summary" htmlFor="scope-summary">
                <TextArea
                  id="scope-summary"
                  value={scopeSummary}
                  onChange={(event) => setScopeSummary(event.target.value)}
                  rows={4}
                />
              </FormField>
              <FormField
                label="Delivery lead"
                htmlFor="delivery-lead"
                error={fieldErrors.deliveryLeadUserId}
              >
                <Select
                  id="delivery-lead"
                  value={deliveryLeadUserId}
                  onChange={(event) => setDeliveryLeadUserId(event.target.value)}
                  options={userOptions.map((option) => ({
                    value: option.uid,
                    label: option.label,
                  }))}
                  placeholder="Select delivery lead"
                  hasError={Boolean(fieldErrors.deliveryLeadUserId)}
                />
              </FormField>
              <FormField label="Agency type" htmlFor="agency-type">
                <Select
                  id="agency-type"
                  value={agencyType}
                  onChange={(event) => setAgencyType(event.target.value)}
                  options={AGENCY_TYPES.map((type) => ({
                    value: type,
                    label: AGENCY_TYPE_LABELS[type],
                  }))}
                  placeholder="Optional"
                />
              </FormField>
              <FormField label="Engagement type" htmlFor="engagement-type">
                <Select
                  id="engagement-type"
                  value={engagementType}
                  onChange={(event) => setEngagementType(event.target.value)}
                  options={ENGAGEMENT_TYPES.map((type) => ({
                    value: type,
                    label: ENGAGEMENT_TYPE_LABELS[type],
                  }))}
                  placeholder="Optional"
                />
              </FormField>
            </FormSection>

            {createMutation.isError ? (
              <InAppAlert variant="error" title="Create failed">
                {createMutation.error.message}
              </InAppAlert>
            ) : null}

            <StickyFooterBar>
              <Button variant="secondary" type="button" onClick={() => navigate("/aos/delivery")}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create engagement
              </Button>
            </StickyFooterBar>
          </form>
        )}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default CreateEngagementScreen;
