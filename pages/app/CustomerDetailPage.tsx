import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { db } from "../../services/firebase";
import { resolveCompanyIdForUser } from "../../services/companyId";
import { CustomerService } from "../../services/customerService";
import { BusinessService } from "../../services/businessService";
import { InvoiceService } from "../../services/invoiceService";
import { LeadService } from "../../services/leadService";
import { ActivityLogger } from "../../services/activityLogger";
import type {
  Activity,
  Business,
  Customer,
  Invoice,
  InvoiceStatus,
  Lead,
  LeadStatus,
} from "../../types";
import Spinner from "../../components/Spinner";
import { InternationalPhoneInput } from "../../components/InternationalPhoneInput";
import type firebase from "firebase/compat/app";

function formatTs(
  t: firebase.firestore.Timestamp | { toDate?: () => Date } | undefined,
): string {
  if (!t) return "—";
  try {
    const d = "toDate" in t && typeof t.toDate === "function" ? t.toDate() : new Date();
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function leadRelationship(lead: Lead, customerId: string): string {
  const conv = (lead.convertedCustomerId || "").trim() === customerId;
  const link = (lead.linkedCustomerId || "").trim() === customerId;
  if (conv) {
    return "Converted — customer record created from this Won lead";
  }
  if (link) {
    return "Linked — CRM link to this contact (no conversion)";
  }
  return "—";
}

/** Matches Leads list — readable in light & dark mode */
function leadStatusBadgeClasses(status: LeadStatus): string {
  switch (status) {
    case "Won":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "Lost":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    case "New":
      return "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100";
    case "Contacted":
      return "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100";
    case "Qualified":
      return "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100";
    case "Proposal Sent":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
}

function LeadStatusBadge({ status }: { status: Lead["status"] | undefined }) {
  const label = (status || "").trim() || "—";
  const cls =
    label === "—"
      ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
      : leadStatusBadgeClasses(status as LeadStatus);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-tight whitespace-normal break-words ${cls}`}
    >
      {label}
    </span>
  );
}

function invoiceStatusBadgeClasses(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "sent":
      return "bg-blue-100 text-blue-900 dark:bg-blue-800/50 dark:text-blue-100";
    case "draft":
      return "bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-slate-100";
    case "overdue":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus | string | undefined }) {
  const raw = String(status || "draft").toLowerCase();
  const cls = invoiceStatusBadgeClasses(raw);
  const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "—";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}
    >
      {label}
    </span>
  );
}

const TABLE_HEAD =
  "bg-gray-100 dark:bg-gray-700/95 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600";
const TABLE_TH = "py-2.5 px-3 first:pl-4 last:pr-4";
const TABLE_ROW =
  "border-b border-gray-200/90 dark:border-gray-600/80 transition-colors odd:bg-white even:bg-gray-50/90 dark:odd:bg-gray-800 dark:even:bg-gray-800/70 hover:bg-primary-50/60 dark:hover:bg-gray-700/50";
const TABLE_TD = "py-3 px-3 first:pl-4 last:pr-4 align-middle text-gray-900 dark:text-gray-100";

function filterActivitiesForCustomer(
  activities: Activity[],
  customerId: string,
): Activity[] {
  return activities.filter((a) => {
    if (
      a.metadata?.entityId === customerId &&
      (a.type === "customer_created" ||
        a.type === "customer_updated" ||
        a.type === "customer_deleted")
    ) {
      return true;
    }
    if (a.type === "lead_converted") {
      const nv = a.metadata?.newValue as { customerId?: string } | undefined;
      if (nv?.customerId === customerId) return true;
    }
    if (
      (a.type === "business_created" ||
        a.type === "business_updated" ||
        a.type === "business_deleted") &&
      a.metadata?.entityId === customerId
    ) {
      return true;
    }
    return false;
  });
}

const CustomerDetailPage: React.FC = () => {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const {
    canViewCustomers,
    canAccessCustomerDetailPage,
    canEditCustomerOnDetailPage,
    canManageCustomerDetailBusinesses,
    canViewCustomerDetailInvoicesSection,
    canViewCustomerDetailCrmLeads,
    canViewCustomerDetailAuditLog,
    canViewCustomerDetailTechnicalIds,
    canCreateInvoice,
    canEditInvoice,
    canAccessLeadsPage,
    isOwner,
    isAdmin,
  } = usePermissions();

  const mayView = canViewCustomers() && canAccessCustomerDetailPage();
  const companyId = useMemo(
    () => (user && userProfile ? resolveCompanyIdForUser(user, userProfile) : ""),
    [user, userProfile],
  );

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [bizModal, setBizModal] = useState<"add" | "edit" | null>(null);
  const [bizForm, setBizForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [bizSubmitting, setBizSubmitting] = useState(false);

  usePageTitle(customer?.name ? `Customer · ${customer.name}` : "Customer");

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!mayView) {
      navigate("/customers", { replace: true });
    }
  }, [user, userProfile, mayView, navigate]);

  useEffect(() => {
    if (!customerId || !companyId) return;

    const unsub = db
      .collection("customers")
      .doc(customerId)
      .onSnapshot(
        (snap) => {
          if (!snap.exists) {
            setCustomer(null);
            setLoading(false);
            return;
          }
          const row = { id: snap.id, ...snap.data() } as Customer;
          const allowed =
            isOwner || isAdmin || row.createdById === user?.uid;
          if (!allowed) {
            setForbidden(true);
            setCustomer(null);
            setLoading(false);
            return;
          }
          setForbidden(false);
          setCustomer(row);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        },
      );

    return () => unsub();
  }, [customerId, companyId, isOwner, isAdmin, user?.uid]);

  const loadLeads = useCallback(async () => {
    if (!customerId || !companyId) return;
    setLeadsLoading(true);
    try {
      const list = await LeadService.findLeadsForCustomer(customerId, companyId);
      setLeads(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLeadsLoading(false);
    }
  }, [customerId, companyId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (!customerId || !companyId) return;
    const unsub = db
      .collection("businesses")
      .where("companyId", "==", companyId)
      .where("customerId", "==", customerId)
      .onSnapshot(
        (snap) => {
          const rows = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as Business,
          );
          rows.sort((a, b) => {
            const at = a.createdAt?.toMillis?.() ?? 0;
            const bt = b.createdAt?.toMillis?.() ?? 0;
            return bt - at;
          });
          setBusinesses(rows);
        },
        (e) => console.error("businesses listener", e),
      );
    return () => unsub();
  }, [customerId, companyId]);

  useEffect(() => {
    if (!user || !userProfile || !customerId || !mayView) return;
    if (!canViewCustomerDetailInvoicesSection()) {
      setInvoices([]);
      return;
    }
    const unsub = InvoiceService.getInvoicesRealTime(
      user,
      userProfile,
      isOwner,
      isAdmin,
      (all) => {
        setInvoices(all.filter((inv) => inv.customerId === customerId));
      },
    );
    return () => unsub();
  }, [
    user,
    userProfile,
    isOwner,
    isAdmin,
    customerId,
    mayView,
    userProfile?.granularPermissions,
    userProfile?.isOwner,
  ]);

  useEffect(() => {
    if (!companyId || !customerId || !canViewCustomerDetailAuditLog()) {
      setActivities([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await ActivityLogger.getCompanyActivities(companyId, 200);
        if (!cancelled) {
          setActivities(filterActivitiesForCustomer(list, customerId));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, customerId, userProfile?.granularPermissions, userProfile?.isOwner]);

  const origin = useMemo(() => {
    if (!customerId) return { label: "", detail: "" };
    const converted = leads.some(
      (l) => (l.convertedCustomerId || "").trim() === customerId,
    );
    const linkedOnly = leads.some((l) => {
      const link = (l.linkedCustomerId || "").trim() === customerId;
      const conv = (l.convertedCustomerId || "").trim() === customerId;
      return link && !conv;
    });
    if (converted) {
      return {
        label: "Lead conversion",
        detail:
          "At least one Won lead was converted into this customer record.",
      };
    }
    if (linkedOnly) {
      return {
        label: "CRM link only",
        detail:
          "This contact was linked from leads without using “Convert to customer” for this ID.",
      };
    }
    return {
      label: "Manual entry",
      detail:
        "Created from the Customers screen (or migrated). No lead conversion is recorded for this ID.",
    };
  }, [leads, customerId]);

  const stats = useMemo(() => {
    const list = invoices;
    const count = list.length;
    const totalBilled = list.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const paid = list
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + (Number(i.total) || 0), 0);
    const outstanding = list.reduce(
      (s, i) => s + (Number(i.remainingAmount) || 0),
      0,
    );
    return { count, totalBilled, paid, outstanding };
  }, [invoices]);

  const openEdit = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setEditOpen(true);
  };

  const saveCustomerEdit = async () => {
    if (!user || !userProfile || !customer || !editForm.name?.trim() || !editForm.email?.trim()) {
      alert("Name and email are required.");
      return;
    }
    setEditSubmitting(true);
    try {
      await CustomerService.saveCustomer(
        {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone?.trim() || "",
          address: editForm.address?.trim() || "",
        },
        user,
        userProfile,
        customer.id,
      );
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "customer_updated",
        `Updated customer: ${editForm.name.trim()}`,
        { entityId: customer.id, entityType: "customer" },
      );
      setEditOpen(false);
    } catch (e) {
      console.error(e);
      alert("Could not save changes.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const openAddBusiness = () => {
    setBizForm({ id: "", name: "", phone: "", email: "", notes: "" });
    setBizModal("add");
  };

  const openEditBusiness = (b: Business) => {
    setBizForm({
      id: b.id,
      name: b.name,
      phone: b.phone || "",
      email: b.email || "",
      notes: b.notes || "",
    });
    setBizModal("edit");
  };

  const saveBusiness = async () => {
    if (!user || !userProfile || !customerId || !companyId || !bizForm.name.trim()) {
      alert("Business name is required.");
      return;
    }
    setBizSubmitting(true);
    try {
      if (bizModal === "add") {
        const bid = await BusinessService.createBusiness(
          {
            customerId,
            name: bizForm.name.trim(),
            phone: bizForm.phone,
            email: bizForm.email,
            notes: bizForm.notes,
          },
          user,
          userProfile,
        );
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "business_created",
          `Added business “${bizForm.name.trim()}” for customer`,
          {
            entityId: customerId,
            entityType: "customer",
            newValue: { businessId: bid, businessName: bizForm.name.trim() },
          },
        );
      } else if (bizModal === "edit" && bizForm.id) {
        await BusinessService.updateBusiness(bizForm.id, companyId, {
          name: bizForm.name,
          phone: bizForm.phone,
          email: bizForm.email,
          notes: bizForm.notes,
        });
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "business_updated",
          `Updated business “${bizForm.name.trim()}”`,
          {
            entityId: customerId,
            entityType: "customer",
            newValue: { businessId: bizForm.id },
          },
        );
      }
      setBizModal(null);
      const list = await ActivityLogger.getCompanyActivities(companyId, 200);
      setActivities(filterActivitiesForCustomer(list, customerId));
    } catch (e) {
      console.error(e);
      alert("Could not save business.");
    } finally {
      setBizSubmitting(false);
    }
  };

  const removeBusiness = async (b: Business) => {
    if (!companyId) return;
    if (
      !window.confirm(
        `Delete business “${b.name}”? Lead references will be cleared. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await BusinessService.deleteBusiness(b.id, companyId);
      if (user && userProfile) {
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "business_deleted",
          `Deleted business “${b.name}”`,
          {
            entityId: customerId!,
            entityType: "customer",
            oldValue: { businessId: b.id },
          },
        );
      }
      loadLeads();
      const list = await ActivityLogger.getCompanyActivities(companyId, 200);
      setActivities(filterActivitiesForCustomer(list, customerId!));
    } catch (e) {
      console.error(e);
      alert("Could not delete business.");
    }
  };

  if (!mayView) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <p className="text-gray-700 dark:text-gray-300">
          You don&apos;t have access to this customer.
        </p>
        <Link
          to="/customers"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <p className="text-gray-700 dark:text-gray-300">Customer not found.</p>
        <Link
          to="/customers"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            to="/customers"
            className="text-sm text-primary-600 hover:underline mb-2 inline-block"
          >
            ← Customers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {customer.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/40 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-200">
              {origin.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-200">
              {businesses.length} business{businesses.length !== 1 ? "es" : ""}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-200">
              {stats.count} invoice{stats.count !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            {origin.detail}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canEditCustomerOnDetailPage() && (
            <button
              type="button"
              onClick={openEdit}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Edit customer
            </button>
          )}
          {canCreateInvoice() && (
            <button
              type="button"
              onClick={() =>
                navigate("/invoices/new", { state: { customerId: customer.id } })
              }
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              New invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total billed
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            ${stats.totalBilled.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Paid (closed)
          </p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            ${stats.paid.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Outstanding
          </p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            ${stats.outstanding.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Businesses
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {businesses.length}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Contact &amp; audit
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Fields stored on the customer record for traceability.
          </p>
        </div>
        <div className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <p className="font-medium text-gray-900 dark:text-white break-all">
              {customer.email || "—"}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Phone</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {customer.phone || "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Address</span>
            <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
              {customer.address || "—"}
            </p>
          </div>
          {canViewCustomerDetailTechnicalIds() ? (
            <>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Record ID</span>
                <p className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                  {customer.id}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Company scope</span>
                <p className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                  {customer.companyId || companyId || "—"}
                </p>
              </div>
            </>
          ) : null}
          {(isOwner || isAdmin) && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created by</span>
              <p className="text-gray-900 dark:text-white">
                {customer.createdBy || "—"}
              </p>
              <p className="text-xs text-gray-500">{formatTs(customer.createdAt)}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400">Last updated</span>
            <p className="text-gray-900 dark:text-white">
              {customer.updatedBy || "—"}
            </p>
            <p className="text-xs text-gray-500">{formatTs(customer.updatedAt)}</p>
          </div>
        </div>
      </section>

      {canViewCustomerDetailCrmLeads() ? (
      <section className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex flex-wrap items-center justify-between gap-2 bg-gray-50/80 dark:bg-gray-900/40">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              CRM — leads
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              How this customer connects to your leads pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadLeads()}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="p-4">
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No leads reference this customer yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
              <table className="w-full min-w-[640px] text-sm text-left">
                <thead className={TABLE_HEAD}>
                  <tr>
                    <th className={TABLE_TH}>Lead</th>
                    <th className={`${TABLE_TH} w-[9.5rem]`}>Pipeline status</th>
                    <th className={TABLE_TH}>Relationship</th>
                    <th className={`${TABLE_TH} w-28 text-right`}> </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {leads.map((l) => (
                    <tr key={l.id} className={TABLE_ROW}>
                      <td className={`${TABLE_TD} font-medium`}>
                        <span className="break-words">{l.name || l.company || "—"}</span>
                      </td>
                      <td className={TABLE_TD}>
                        <LeadStatusBadge status={l.status} />
                      </td>
                      <td className={`${TABLE_TD} max-w-md text-gray-800 dark:text-gray-200`}>
                        {leadRelationship(l, customer.id)}
                      </td>
                      <td className={`${TABLE_TD} text-right`}>
                        {canAccessLeadsPage() ? (
                          <Link
                            to={`/leads/${l.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-semibold"
                          >
                            Open lead
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex flex-wrap items-center justify-between gap-2 bg-gray-50/80 dark:bg-gray-900/40">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Businesses
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Commercial names under this customer (e.g. brand or legal entity).
            </p>
          </div>
          {canManageCustomerDetailBusinesses() && (
            <button
              type="button"
              onClick={openAddBusiness}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            >
              Add business
            </button>
          )}
        </div>
        <div className="p-4">
          {businesses.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              No businesses yet. Add one for clearer invoicing and CRM history.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {businesses.map((b) => (
                <li
                  key={b.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {b.name}
                    </p>
                    {canViewCustomerDetailTechnicalIds() ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        ID {b.id}
                      </p>
                    ) : null}
                    {(b.phone || b.email) && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {[b.phone, b.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {b.notes ? (
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                        {b.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canManageCustomerDetailBusinesses() && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditBusiness(b)}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBusiness(b)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {canViewCustomerDetailInvoicesSection() && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Invoices
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              All invoices issued to this customer (within your access scope).
            </p>
          </div>
          <div className="p-4">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No invoices yet for this customer.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="w-full min-w-[520px] text-sm text-left">
                  <thead className={TABLE_HEAD}>
                    <tr>
                      <th className={TABLE_TH}>Number</th>
                      <th className={`${TABLE_TH} w-[7.5rem]`}>Status</th>
                      <th className={`${TABLE_TH} text-right`}>Total</th>
                      <th className={TABLE_TH}>Issue date</th>
                      <th className={`${TABLE_TH} w-20 text-right`}> </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className={TABLE_ROW}>
                        <td className={`${TABLE_TD} font-mono text-[13px] text-gray-900 dark:text-gray-50`}>
                          {inv.invoiceNumber}
                        </td>
                        <td className={TABLE_TD}>
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className={`${TABLE_TD} text-right font-semibold tabular-nums text-gray-900 dark:text-gray-50`}>
                          ${(inv.total ?? 0).toFixed(2)}
                        </td>
                        <td className={`${TABLE_TD} text-xs text-gray-700 dark:text-gray-300`}>
                          {formatTs(inv.issueDate as firebase.firestore.Timestamp)}
                        </td>
                        <td className={`${TABLE_TD} text-right`}>
                          {canEditInvoice() ? (
                            <Link
                              to={`/invoices/edit/${inv.id}`}
                              className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-semibold"
                            >
                              Open
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {canViewCustomerDetailAuditLog() && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Activity (audit trail)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Customer, conversion, and business events tied to this record.
            </p>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No matching activity entries yet. Actions here are logged when you
                edit this customer or manage businesses.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="text-sm border-b border-gray-100 dark:border-gray-700/80 pb-3 last:border-0">
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ActivityLogger.getActivityIcon(a.type)}{" "}
                        {a.description}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {a.userName} · {formatTs(a.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Edit customer
            </h3>
            <div className="space-y-3">
              <input
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Name *"
                value={editForm.name || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                type="email"
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Email *"
                value={editForm.email || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
              <InternationalPhoneInput
                placeholder="Phone"
                value={editForm.phone || ""}
                onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
              />
              <textarea
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Address"
                value={editForm.address || ""}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustomerEdit}
                disabled={editSubmitting}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium disabled:opacity-50"
              >
                {editSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {bizModal === "add" ? "Add business" : "Edit business"}
            </h3>
            <div className="space-y-3">
              <input
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Business name *"
                value={bizForm.name}
                onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Phone (optional)"
                value={bizForm.phone}
                onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                type="email"
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Email (optional)"
                value={bizForm.email}
                onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))}
              />
              <textarea
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Notes (optional)"
                value={bizForm.notes}
                onChange={(e) => setBizForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBizModal(null)}
                disabled={bizSubmitting}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBusiness}
                disabled={bizSubmitting || !bizForm.name.trim()}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium disabled:opacity-50"
              >
                {bizSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
