import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type firebase from "firebase/compat/app";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { db, Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { BusinessService } from "../../services/businessService";
import { CustomerService } from "../../services/customerService";
import { LeadService } from "../../services/leadService";
import {
  COUNTRY_CUSTOM_VALUE,
  CATEGORY_CUSTOM_VALUE,
  SOURCE_CUSTOM_VALUE,
  LEAD_COUNTRY_OPTIONS,
  LEAD_CATEGORY_PRESETS,
  LEAD_SOURCE_PRESETS,
} from "../../config/leadFormOptions";
import {
  LEAD_TARGET_SALES_GENDER_OPTIONS,
  normalizeLeadTargetSalesGender,
  type LeadTargetSalesGender,
} from "../../config/leadTargetSalesGender";
import type {
  CompanyUser,
  Customer,
  Business,
  Lead,
  LeadExtras,
  LeadCallLog,
  LeadCallOutcome,
  LeadAssignmentEvent,
  LeadStatus,
} from "../../types";
import Spinner from "../../components/Spinner";
import CallLogAdminControls from "../../components/leads/CallLogAdminControls";
import FieldInfoTip from "../../components/FieldInfoTip";
import { SearchableLeadOptionSelect } from "../../components/SearchableLeadOptionSelect";
import { InternationalPhoneInput } from "../../components/InternationalPhoneInput";
import { formatPhoneForDisplay, getIsoFromLeadCountryName } from "../../utils/internationalPhone";

const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
];

const CALL_OUTCOMES: LeadCallOutcome[] = [
  "No Answer",
  "Busy",
  "Connected",
  "Wrong Number",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local date+time string for input[type="datetime-local"] */
function toDatetimeLocalValue(ts: firebase.firestore.Timestamp | null | undefined): string {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): firebase.firestore.Timestamp | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

/** Start of today (local) for datetime-local `min` — blocks past calendar dates. */
function minDatetimeLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T00:00`;
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const COUNTRY_LIST = LEAD_COUNTRY_OPTIONS as readonly string[];
const CATEGORY_LIST = LEAD_CATEGORY_PRESETS as readonly string[];

function splitStoredCountry(stored: string | undefined): { select: string; custom: string } {
  const c = (stored || "").trim();
  if (!c) return { select: "", custom: "" };
  if (COUNTRY_LIST.includes(c)) return { select: c, custom: "" };
  return { select: COUNTRY_CUSTOM_VALUE, custom: c };
}

function splitStoredCategory(stored: string | undefined): { select: string; custom: string } {
  const c = (stored || "").trim();
  if (!c) return { select: "", custom: "" };
  if (CATEGORY_LIST.includes(c)) return { select: c, custom: "" };
  return { select: CATEGORY_CUSTOM_VALUE, custom: c };
}

const SOURCE_LIST = LEAD_SOURCE_PRESETS as readonly string[];

function splitStoredSource(stored: string | undefined): { select: string; custom: string } {
  const s = (stored || "").trim();
  if (!s) return { select: "", custom: "" };
  if (SOURCE_LIST.includes(s)) return { select: s, custom: "" };
  return { select: SOURCE_CUSTOM_VALUE, custom: s };
}

type LeadDetailTab = "details" | "calls" | "conversion" | "assignment";

function statusBadgeClasses(status: LeadStatus): string {
  switch (status) {
    case "Won":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "Lost":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    case "New":
      return "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100";
    default:
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
  }
}

const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const {
    canAccessLeadsPage,
    canAccessMyAssignedLeadsPage,
    canEditLead,
    canDeleteLead,
    canAssignLeads,
    canLogLeadCalls,
    canDeleteLeadCallLogs,
    canApproveCallLogs,
    canLinkLeadCustomer,
    canConvertLead,
    leadsListViewAll,
    isOwner,
    isAdmin,
  } = usePermissions();

  const viewAll = leadsListViewAll();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [countrySelect, setCountrySelect] = useState("");
  const [countryCustom, setCountryCustom] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryCustom, setCategoryCustom] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sourceSelect, setSourceSelect] = useState("");
  const [sourceCustom, setSourceCustom] = useState("");
  const [targetSalesGender, setTargetSalesGender] = useState<LeadTargetSalesGender>(
    normalizeLeadTargetSalesGender(undefined),
  );
  const [status, setStatus] = useState<LeadStatus>("New");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [hasWhatsapp, setHasWhatsapp] = useState(false);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const [activeTab, setActiveTab] = useState<LeadDetailTab>("details");
  const [convertMode, setConvertMode] = useState<"new" | "existing">("new");

  useEffect(() => {
    const raw = searchParams.get("tab");
    const next: LeadDetailTab =
      raw === "details" || raw === "calls" || raw === "conversion" || raw === "assignment"
        ? raw
        : "details";
    setActiveTab(next);
  }, [id, searchParams]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [linkCustomerId, setLinkCustomerId] = useState("");
  const [linkBusinessId, setLinkBusinessId] = useState("");

  const [assignees, setAssignees] = useState<{ uid: string; label: string }[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [assignReason, setAssignReason] = useState("");

  const [callOutcome, setCallOutcome] = useState<LeadCallOutcome>("Connected");
  const [callNotes, setCallNotes] = useState("");
  const [callFollowUp, setCallFollowUp] = useState("");

  const [logs, setLogs] = useState<LeadCallLog[]>([]);
  const [events, setEvents] = useState<LeadAssignmentEvent[]>([]);

  const [saving, setSaving] = useState(false);
  const [convertBiz, setConvertBiz] = useState(false);
  const [convertBizName, setConvertBizName] = useState("");

  const phoneCountryIso = useMemo(() => {
    const name =
      countrySelect === COUNTRY_CUSTOM_VALUE ? countryCustom.trim() : countrySelect.trim();
    return getIsoFromLeadCountryName(name);
  }, [countrySelect, countryCustom]);

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!canAccessLeadsPage() && !canAccessMyAssignedLeadsPage()) {
      navigate("/");
    }
  }, [user, userProfile, canAccessLeadsPage, canAccessMyAssignedLeadsPage, navigate]);

  useEffect(() => {
    if (!id || !user || !userProfile) return;

    const unsubLead = db
      .collection("leads")
      .doc(id)
      .onSnapshot(
        (docSnap) => {
          if (!docSnap.exists) {
            setLead(null);
            setLoading(false);
            return;
          }
          const row = { id: docSnap.id, ...docSnap.data() } as Lead;
          const allowed = LeadService.userCanViewLead(row, user.uid, viewAll);
          if (!allowed) {
            setForbidden(true);
            setLead(null);
            setLoading(false);
            return;
          }
          setForbidden(false);
          setLead(row);
          setName(row.name || "");
          setCompany(row.company || "");
          const co = splitStoredCountry(row.country);
          setCountrySelect(co.select);
          setCountryCustom(co.custom);
          const cat = splitStoredCategory(row.category);
          setCategorySelect(cat.select);
          setCategoryCustom(cat.custom);
          const resolvedCountryName =
            co.select === COUNTRY_CUSTOM_VALUE ? co.custom.trim() : co.select.trim();
          const phoneIso = getIsoFromLeadCountryName(resolvedCountryName);
          setPhone(formatPhoneForDisplay(row.phone || "", phoneIso));
          setEmail(row.email || "");
          const src = splitStoredSource(row.source);
          setSourceSelect(src.select);
          setSourceCustom(src.custom);
          setTargetSalesGender(normalizeLeadTargetSalesGender(row.targetSalesGender));
          setStatus(row.status);
          setNotes(row.notes || "");
          setFollowUp(
            toDatetimeLocalValue(row.nextFollowUpDate as firebase.firestore.Timestamp | null | undefined),
          );
          setFacebookUrl(row.extras?.facebookUrl || "");
          setInstagramUrl(row.extras?.instagramUrl || "");
          setLinkedinUrl(row.extras?.linkedinUrl || "");
          setWebsite(row.extras?.website || "");
          setAddress(row.extras?.address || "");
          setExtraNotes(row.extras?.extraNotes || "");
          const ex = row.extras || {};
          setHasWhatsapp(!!ex.hasWhatsapp);
          setWhatsappSameAsPhone(ex.whatsappSameAsPhone !== false);
          setWhatsappPhone(ex.whatsappPhone || "");
          setLinkCustomerId(row.linkedCustomerId || "");
          setLinkBusinessId(row.linkedBusinessId || "");
          setAssignTo(row.assignedUserId || "");
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        },
      );

    return () => unsubLead();
  }, [id, user, userProfile, viewAll]);

  useEffect(() => {
    if (!id) return;
    const u1 = LeadService.subscribeCallLogs(id, setLogs);
    const u2 = LeadService.subscribeAssignmentEvents(id, setEvents);
    return () => {
      u1();
      u2();
    };
  }, [id]);

  useEffect(() => {
    if (!userProfile?.companyId && !userProfile?.isOwner) return;
    const companyId = userProfile.isOwner ? user?.uid : userProfile.companyId;
    if (!companyId || !user) return;

    const load = async () => {
      const out: { uid: string; label: string }[] = [];
      const ownerSnap = await db.collection("users").doc(companyId).get();
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
      setAssignees(out);
    };
    load();
  }, [user, userProfile]);

  const resolveUserLabel = useCallback(
    (uid: string | null | undefined) => {
      if (!uid?.trim()) return "—";
      return assignees.find((a) => a.uid === uid)?.label || uid;
    },
    [assignees],
  );

  useEffect(() => {
    if (!user || !userProfile || !lead) return;
    if (!canLinkLeadCustomer() && !canConvertLead()) return;
    (async () => {
      const list = await CustomerService.getCustomers(
        user,
        userProfile,
        isOwner,
        isAdmin,
      );
      setCustomers(list);
    })();
  }, [user, userProfile, lead, canLinkLeadCustomer, canConvertLead, isOwner, isAdmin]);

  useEffect(() => {
    if (!lead || !linkCustomerId || !userProfile) return;
    const companyId = userProfile.isOwner ? user?.uid : userProfile.companyId;
    if (!companyId) return;
    (async () => {
      const list = await BusinessService.listByCustomer(linkCustomerId, companyId);
      setBusinesses(list);
    })();
  }, [lead, linkCustomerId, userProfile, user]);

  const handleSave = async () => {
    if (!user || !userProfile || !lead || !canEditLead()) return;
    const resolvedSource =
      sourceSelect === SOURCE_CUSTOM_VALUE ? sourceCustom.trim() : sourceSelect.trim();
    if (!resolvedSource) {
      alert("Source is required");
      return;
    }
    const resolvedCountry =
      countrySelect === COUNTRY_CUSTOM_VALUE ? countryCustom.trim() : countrySelect.trim();
    const resolvedCategory =
      categorySelect === CATEGORY_CUSTOM_VALUE ? categoryCustom.trim() : categorySelect.trim();
    if (!resolvedCountry || !resolvedCategory) {
      alert("Country / location and business category are required.");
      return;
    }
    if (hasWhatsapp && !whatsappSameAsPhone && !whatsappPhone.trim()) {
      alert("Enter the WhatsApp number or choose “Same as phone number”.");
      return;
    }
    setSaving(true);
    try {
      const extrasPayload: LeadExtras = { ...(lead.extras || {}) };
      delete extrasPayload.socialMedia;
      extrasPayload.facebookUrl = facebookUrl.trim() || undefined;
      extrasPayload.instagramUrl = instagramUrl.trim() || undefined;
      extrasPayload.linkedinUrl = linkedinUrl.trim() || undefined;
      extrasPayload.website = website.trim() || undefined;
      extrasPayload.address = address.trim() || undefined;
      extrasPayload.extraNotes = extraNotes.trim() || undefined;
      if (!extrasPayload.facebookUrl) delete extrasPayload.facebookUrl;
      if (!extrasPayload.instagramUrl) delete extrasPayload.instagramUrl;
      if (!extrasPayload.linkedinUrl) delete extrasPayload.linkedinUrl;
      if (!extrasPayload.website) delete extrasPayload.website;
      if (!extrasPayload.address) delete extrasPayload.address;
      if (!extrasPayload.extraNotes) delete extrasPayload.extraNotes;

      if (hasWhatsapp) {
        extrasPayload.hasWhatsapp = true;
        extrasPayload.whatsappSameAsPhone = whatsappSameAsPhone;
        if (!whatsappSameAsPhone && whatsappPhone.trim()) {
          extrasPayload.whatsappPhone = whatsappPhone.trim();
        } else {
          delete extrasPayload.whatsappPhone;
        }
      } else {
        extrasPayload.hasWhatsapp = false;
        delete extrasPayload.whatsappSameAsPhone;
        delete extrasPayload.whatsappPhone;
      }

      await LeadService.updateLeadFields(lead.id, {
        name: name.trim(),
        company: company.trim(),
        country: resolvedCountry,
        category: resolvedCategory,
        phone: phone.trim(),
        email: email.trim(),
        source: resolvedSource,
        targetSalesGender: normalizeLeadTargetSalesGender(targetSalesGender),
        status,
        notes: notes.trim(),
        nextFollowUpDate: fromDatetimeLocalValue(followUp),
        extras: extrasPayload,
      });
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", `Updated lead: ${name || company}`, {
        entityId: lead.id,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !userProfile || !lead || !canDeleteLead()) return;
    if (!window.confirm("Delete this lead?")) return;
    try {
      await LeadService.deleteLead(lead.id);
      await ActivityLogger.logActivity(user, userProfile, "lead_deleted", `Deleted lead: ${lead.name || lead.company}`, {
        entityId: lead.id,
        entityType: "lead",
      });
      navigate("/leads");
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    }
  };

  const handleAssign = async () => {
    if (!user || !userProfile || !lead || !canAssignLeads()) return;
    try {
      if (!assignTo.trim()) {
        await LeadService.updateLeadFields(lead.id, { assignedUserId: "" });
        await ActivityLogger.logActivity(user, userProfile, "lead_assigned", `Cleared lead assignment`, {
          entityId: lead.id,
          entityType: "lead",
        });
      } else {
        await LeadService.assignLead(
          lead.id,
          lead.assignedUserId?.trim() ? lead.assignedUserId : null,
          assignTo,
          user.uid,
          assignReason.trim() || undefined,
        );
        await ActivityLogger.logActivity(user, userProfile, "lead_assigned", `Reassigned lead`, {
          entityId: lead.id,
          entityType: "lead",
        });
      }
      setAssignReason("");
    } catch (e) {
      console.error(e);
      alert("Failed to assign");
    }
  };

  const handleCallLog = async () => {
    if (!user || !userProfile || !lead || !canLogLeadCalls()) return;
    let followTs: firebase.firestore.Timestamp | null = null;
    if (callFollowUp.trim()) {
      const parsed = fromDatetimeLocalValue(callFollowUp);
      if (!parsed) {
        alert("Enter a valid follow-up date and time, or leave it blank.");
        return;
      }
      if (parsed.toDate() < startOfTodayLocal()) {
        alert("Follow-up cannot be before today. Choose today (with a time) or a future date.");
        return;
      }
      followTs = parsed;
    }
    try {
      await LeadService.addCallLog(
        lead.id,
        callOutcome,
        callNotes,
        followTs,
        user,
        userProfile,
      );
      setCallNotes("");
      setCallFollowUp("");
      await ActivityLogger.logActivity(user, userProfile, "lead_call_logged", `Call log on lead`, {
        entityId: lead.id,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to add call log");
    }
  };

  const handleDeleteCallLog = async (logId: string) => {
    if (!user || !userProfile || !lead || !canDeleteLeadCallLogs()) return;
    if (!window.confirm("Delete this call log? This cannot be undone.")) return;
    try {
      await LeadService.deleteCallLog(lead.id, logId);
      await ActivityLogger.logActivity(user, userProfile, "lead_updated", `Deleted a call log on lead`, {
        entityId: lead.id,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete call log");
    }
  };

  const handleLink = async () => {
    if (!user || !userProfile || !lead || !canLinkLeadCustomer()) return;
    try {
      await LeadService.updateLeadFields(lead.id, {
        linkedCustomerId: linkCustomerId || null,
        linkedBusinessId: linkBusinessId || null,
      });
      await ActivityLogger.logActivity(user, userProfile, "lead_linked_customer", `Linked lead to customer`, {
        entityId: lead.id,
        entityType: "lead",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to link");
    }
  };

  const handleConvert = async () => {
    if (!user || !userProfile || !lead || !canConvertLead()) return;
    if (convertMode !== "new") return;
    if (lead.status !== "Won") {
      alert("Set the lead to Won before converting");
      return;
    }
    if (lead.convertedCustomerId) {
      alert("Already converted");
      return;
    }
    if (!email.trim() && !window.confirm("No email on file — a placeholder email will be used for the customer record. Continue?")) {
      return;
    }
    try {
      const { customerId } = await LeadService.convertWonLead(lead, user, userProfile, {
        createBusiness: convertBiz,
        businessName: convertBizName,
      });
      await ActivityLogger.logActivity(user, userProfile, "lead_converted", `Converted lead to customer`, {
        entityId: lead.id,
        entityType: "lead",
        newValue: { customerId },
      });
      navigate("/invoices/new", { state: { customerId } });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Convert failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (forbidden || !lead) {
    return (
      <div className="p-6 text-center text-gray-600 dark:text-gray-300">
        {forbidden ? "You do not have access to this lead." : "Lead not found."}
        <div className="mt-4">
          <button
            type="button"
            className="text-primary-600 underline"
            onClick={() => navigate("/leads")}
          >
            Back to leads
          </button>
        </div>
      </div>
    );
  }

  const tabItems: { id: LeadDetailTab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "calls", label: "Call logs" },
    { id: "conversion", label: "Conversion" },
    { id: "assignment", label: "Assignment" },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12 px-1">
      <header className="mb-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate("/leads")}
              className="text-sm text-primary-600 hover:underline dark:text-primary-400"
            >
              ← Back to leads
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {name || company || "Lead"}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(lead.status)}`}
              >
                {lead.status}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Assigned to:{" "}
                <strong className="font-medium text-gray-800 dark:text-gray-200">
                  {(lead.assignedUserId || "").trim()
                    ? resolveUserLabel(lead.assignedUserId)
                    : "Unassigned"}
                </strong>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lead ID: {lead.id}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canEditLead() && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
            {canDeleteLead() && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-md border border-red-300 dark:border-red-800 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete lead
              </button>
            )}
          </div>
        </div>
        <nav
          className="flex gap-1 mt-6 border-b border-gray-200 dark:border-gray-600 overflow-x-auto"
          aria-label="Lead sections"
        >
          {tabItems.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "details" && (
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Lead details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-name">
                Contact name
              </label>
              <FieldInfoTip text="Enter the person’s name, the company name, or both. At least one is required together with the other required fields." />
            </div>
            <input
              id="lead-detail-name"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="Contact name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" htmlFor="lead-detail-company">
              Company name
            </label>
            <input
              id="lead-detail-company"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="Company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="sm:col-span-1 space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-country">
                Country / location
              </label>
              <FieldInfoTip text="Required with business category. Open the list and type to search for a country quickly." />
            </div>
            <SearchableLeadOptionSelect
              id="lead-detail-country"
              ariaLabel="Country or location"
              options={LEAD_COUNTRY_OPTIONS}
              selectValue={countrySelect}
              customValue={countryCustom}
              onSelectChange={(v) => {
                setCountrySelect(v);
                if (v !== COUNTRY_CUSTOM_VALUE) setCountryCustom("");
              }}
              onCustomChange={setCountryCustom}
              customSentinel={COUNTRY_CUSTOM_VALUE}
              placeholder="Select country…"
              otherLabel="Other (type country)"
              customPlaceholder="Country name"
              disabled={!canEditLead()}
            />
          </div>
          <div className="sm:col-span-1 space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-category">
                Business category
              </label>
              <FieldInfoTip text="Required with country. Search the list for an industry type, or choose Other and type your own." />
            </div>
            <SearchableLeadOptionSelect
              id="lead-detail-category"
              ariaLabel="Business category"
              options={LEAD_CATEGORY_PRESETS}
              selectValue={categorySelect}
              customValue={categoryCustom}
              onSelectChange={(v) => {
                setCategorySelect(v);
                if (v !== CATEGORY_CUSTOM_VALUE) setCategoryCustom("");
              }}
              onCustomChange={setCategoryCustom}
              customSentinel={CATEGORY_CUSTOM_VALUE}
              placeholder="Select category…"
              otherLabel="Other (type your own)"
              customPlaceholder="Custom category"
              disabled={!canEditLead()}
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-email">
                Email address
              </label>
              <FieldInfoTip text="At least one of email or phone should be provided for a usable lead record." />
            </div>
            <input
              id="lead-detail-email"
              disabled={!canEditLead()}
              type="email"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-phone">
                Phone number
              </label>
              <FieldInfoTip
                text={
                  phoneCountryIso
                    ? "Country code comes from the location you selected; spacing is applied automatically."
                    : "Pick a country first for +code and formatting, or enter an international number starting with +."
                }
              />
            </div>
            <InternationalPhoneInput
              id="lead-detail-phone"
              value={phone}
              onChange={setPhone}
              countryIso={phoneCountryIso}
              disabled={!canEditLead()}
              placeholder={
                phoneCountryIso
                  ? "Number with country code"
                  : "Select country or type + and code"
              }
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-source">
                Lead source
              </label>
              <FieldInfoTip text="Search the preset list or choose Other for a custom source (e.g. a campaign name)." />
            </div>
            <SearchableLeadOptionSelect
              id="lead-detail-source"
              ariaLabel="Lead source"
              options={LEAD_SOURCE_PRESETS}
              selectValue={sourceSelect}
              customValue={sourceCustom}
              onSelectChange={(v) => {
                setSourceSelect(v);
                if (v !== SOURCE_CUSTOM_VALUE) setSourceCustom("");
              }}
              onCustomChange={setSourceCustom}
              customSentinel={SOURCE_CUSTOM_VALUE}
              placeholder="Search or select source…"
              otherLabel="Other (type your own)"
              customPlaceholder="Custom source name"
              disabled={!canEditLead()}
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label
                className="text-xs font-medium text-gray-600 dark:text-gray-300"
                htmlFor="lead-detail-target-gender"
              >
                Sales agent preference
              </label>
              <FieldInfoTip text="Filter leads on the list by female or male sales agent preference when assigning work." />
            </div>
            <select
              id="lead-detail-target-gender"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              value={targetSalesGender}
              onChange={(e) =>
                setTargetSalesGender(normalizeLeadTargetSalesGender(e.target.value))
              }
            >
              {LEAD_TARGET_SALES_GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-notes">
                Notes
              </label>
              <FieldInfoTip text="Internal notes about this lead. Saved with the rest of the details when you click Save changes." />
            </div>
            <textarea
              id="lead-detail-notes"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="Internal notes about this lead"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-3 sm:col-span-2 rounded-md border border-gray-200 dark:border-gray-600 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600"
                  checked={hasWhatsapp}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setHasWhatsapp(on);
                    if (!on) {
                      setWhatsappSameAsPhone(true);
                      setWhatsappPhone("");
                    }
                  }}
                  disabled={!canEditLead()}
                />
                Has WhatsApp
              </label>
              <FieldInfoTip text="Turn on if this contact uses WhatsApp. Use the same number as phone or enter a separate WhatsApp number." />
            </div>
            {hasWhatsapp ? (
              <div className="space-y-3 pl-1 border-l-2 border-primary-200 dark:border-primary-800 ml-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">WhatsApp number</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="lead-detail-whatsapp-mode"
                    className="border-gray-300 dark:border-gray-600"
                    checked={whatsappSameAsPhone}
                    onChange={() => {
                      setWhatsappSameAsPhone(true);
                      setWhatsappPhone("");
                    }}
                    disabled={!canEditLead()}
                  />
                  Same as phone number above
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="lead-detail-whatsapp-mode"
                    className="border-gray-300 dark:border-gray-600"
                    checked={!whatsappSameAsPhone}
                    onChange={() => setWhatsappSameAsPhone(false)}
                    disabled={!canEditLead()}
                  />
                  Different WhatsApp number
                </label>
                {!whatsappSameAsPhone ? (
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-whatsapp">
                        WhatsApp number
                      </label>
                      <FieldInfoTip text="Enter the number they use on WhatsApp, including country code if needed." />
                    </div>
                    <input
                      id="lead-detail-whatsapp"
                      type="tel"
                      inputMode="tel"
                      disabled={!canEditLead()}
                      placeholder="e.g. +92 300 1234567"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1" htmlFor="lead-detail-status">
              Pipeline status
            </label>
            <select
              id="lead-detail-status"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-followup">
                Next follow-up (date &amp; time)
              </label>
              <FieldInfoTip text="Stored in your local timezone. Dates before today are disabled; clear the field to remove a follow-up." />
            </div>
            <input
              id="lead-detail-followup"
              disabled={!canEditLead()}
              type="datetime-local"
              step={60}
              min={minDatetimeLocalToday()}
              className="w-full max-w-md p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mt-5 mb-2">Social &amp; web</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex flex-wrap items-center gap-1">
          <span>Optional links and extras.</span>
          <FieldInfoTip text="Each URL should start with http:// or https://. Leave blank to remove a value when you save." />
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-fb">
              Facebook URL
            </label>
            <input
              id="lead-detail-fb"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="https://facebook.com/…"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-ig">
              Instagram URL
            </label>
            <input
              id="lead-detail-ig"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="https://instagram.com/…"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-li">
              LinkedIn URL
            </label>
            <input
              id="lead-detail-li"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="https://linkedin.com/in/…"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-website">
                Website URL
              </label>
              <FieldInfoTip text="Optional public website for this lead or company." />
            </div>
            <input
              id="lead-detail-website"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="https://…"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-address">
                Address
              </label>
              <FieldInfoTip text="Optional mailing or business address." />
            </div>
            <input
              id="lead-detail-address"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="Street, city, region"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="mb-1 flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-extra">
                Extra notes
              </label>
              <FieldInfoTip text="Optional extra context stored in lead extras (separate from the main Notes field above)." />
            </div>
            <textarea
              id="lead-detail-extra"
              disabled={!canEditLead()}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
              placeholder="Additional context (optional)"
              rows={2}
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
            />
          </div>
        </div>
        {canEditLead() && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}

        {canLinkLeadCustomer() && (
          <div id="lead-link-customer" className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Link to customer</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Connect this lead to an existing customer (and optional business) for invoicing and history.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
                aria-label="Customer to link"
                value={linkCustomerId}
                onChange={(e) => {
                  setLinkCustomerId(e.target.value);
                  setLinkBusinessId("");
                }}
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              <select
                className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
                aria-label="Business to link"
                value={linkBusinessId}
                onChange={(e) => setLinkBusinessId(e.target.value)}
                disabled={!linkCustomerId}
              >
                <option value="">Business (optional)…</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLink}
                className="px-4 py-2 bg-primary-600 text-white rounded-md shrink-0"
              >
                Save link
              </button>
            </div>
          </div>
        )}
      </section>
      )}

      {activeTab === "assignment" && (
        <>
          {canAssignLeads() && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Assign owner</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Choose who owns follow-up for this lead. Add an optional note for the audit trail.
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-assign-to">
                    Assign to
                  </label>
                  <select
                    id="lead-assign-to"
                    className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[12rem]"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => (
                      <option key={a.uid} value={a.uid}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 flex-1 min-w-[12rem]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-assign-reason">
                    Reason (optional)
                  </label>
                  <input
                    id="lead-assign-reason"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Why reassign?"
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAssign}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md dark:bg-gray-600 shrink-0"
                >
                  Apply assignment
                </button>
              </div>
            </section>
          )}

          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Assignment history</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Past reassignments with timestamps and reasons.
            </p>
            <ul className="space-y-3 text-sm">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-3"
                >
                  <div className="font-medium text-gray-800 dark:text-white">
                    {resolveUserLabel(ev.fromUserId)} → {resolveUserLabel(ev.toUserId)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {ev.createdAt?.toDate?.().toLocaleString?.() || ""}
                    {" · "}
                    By {resolveUserLabel(ev.assignedByUserId)}
                  </div>
                  {ev.reason ? (
                    <div className="text-gray-600 dark:text-gray-300 mt-2 text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                      {ev.reason}
                    </div>
                  ) : null}
                </li>
              ))}
              {events.length === 0 && (
                <li className="text-gray-500 text-sm py-4 text-center border border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                  No assignment changes recorded yet.
                </li>
              )}
            </ul>
          </section>
        </>
      )}

      {activeTab === "conversion" && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Convert to customer</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Won leads can be tied to your customer list for billing. Choose the path that matches how you already track this contact.
          </p>
          {!canConvertLead() ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">You don&apos;t have permission to convert leads.</p>
          ) : lead.convertedCustomerId ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already converted — customer ID{" "}
              <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1 rounded">{lead.convertedCustomerId}</code>
            </p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:border-gray-300 dark:hover:border-gray-500">
                  <input
                    type="radio"
                    className="mt-1"
                    name="lead-convert-mode"
                    checked={convertMode === "new"}
                    onChange={() => setConvertMode("new")}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-semibold text-gray-900 dark:text-white">New customer</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Create a customer record from this lead and go to new invoice (optional business record).
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:border-gray-300 dark:hover:border-gray-500">
                  <input
                    type="radio"
                    className="mt-1"
                    name="lead-convert-mode"
                    checked={convertMode === "existing"}
                    onChange={() => setConvertMode("existing")}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-semibold text-gray-900 dark:text-white">Existing customer</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Avoid duplicates — link this lead to a customer you already have (Details tab → Link to customer).
                    </span>
                  </span>
                </label>
              </div>

              {convertMode === "existing" ? (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-sm text-gray-600 dark:text-gray-300">
                  <p className="mb-2">
                    Open the{" "}
                    <button
                      type="button"
                      className="text-primary-600 dark:text-primary-400 font-medium underline"
                      onClick={() => setActiveTab("details")}
                    >
                      Details
                    </button>{" "}
                    tab, pick the customer under <strong>Link to customer</strong>, then click{" "}
                    <strong>Save link</strong>.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Use <strong>New customer</strong> when you need a fresh CRM contact created from this lead.
                  </p>
                </div>
              ) : (
                <>
                  {lead.status !== "Won" && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3 rounded-md bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                      Set pipeline status to <strong>Won</strong> before converting.
                    </p>
                  )}
                  <label className="flex items-center gap-2 text-sm mb-2 text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={convertBiz}
                      onChange={(e) => setConvertBiz(e.target.checked)}
                    />
                    Also create a business under the new customer
                  </label>
                  {convertBiz && (
                    <div className="space-y-1 mb-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="convert-biz-name">
                        Business name
                      </label>
                      <input
                        id="convert-biz-name"
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Business name"
                        value={convertBizName}
                        onChange={(e) => setConvertBizName(e.target.value)}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleConvert}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                  >
                    Convert &amp; new invoice
                  </button>
                </>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === "calls" && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-1">Call logs</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Log outcomes and follow-up dates. History is shown newest-first below.
          </p>
          {canLogLeadCalls() && (
            <div className="flex flex-col gap-3 mb-6 rounded-lg border border-gray-200 dark:border-gray-600 p-4 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="call-outcome">
                  Call outcome
                </label>
                <select
                  id="call-outcome"
                  className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white max-w-xs"
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value as LeadCallOutcome)}
                >
                  {CALL_OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="call-notes-input">
                  Notes
                </label>
                <textarea
                  id="call-notes-input"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="What was discussed?"
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="call-followup-input">
                  Follow-up date &amp; time (optional)
                </label>
                <input
                  id="call-followup-input"
                  type="datetime-local"
                  step={60}
                  min={minDatetimeLocalToday()}
                  className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white max-w-full sm:max-w-md"
                  value={callFollowUp}
                  onChange={(e) => setCallFollowUp(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dates before today are not allowed. Time is required when a date is selected.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCallLog}
                className="px-4 py-2 bg-primary-600 text-white rounded-md w-fit text-sm font-medium"
              >
                Add call log
              </button>
            </div>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Previous logs ({logs.length})
          </h3>
          <ul className="space-y-3 text-sm">
            {[...logs]
              .sort((a, b) => {
                const ta = a.createdAt?.toMillis?.() ?? 0;
                const tb = b.createdAt?.toMillis?.() ?? 0;
                return tb - ta;
              })
              .map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/30 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="inline-flex items-center rounded-full bg-white dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
                        {log.outcome}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {log.createdAt?.toDate?.().toLocaleString?.() || ""}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        · {log.createdBy}
                      </span>
                    </div>
                    {canDeleteLeadCallLogs() && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCallLog(log.id)}
                        className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 rounded border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {log.notes?.trim() ? (
                    <p className="text-gray-700 dark:text-gray-200 mt-2 whitespace-pre-wrap">{log.notes}</p>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 mt-2 text-xs italic">No notes</p>
                  )}
                  {log.nextFollowUpDate?.toDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Follow-up: {log.nextFollowUpDate.toDate().toLocaleString()}
                    </p>
                  )}
                  {(log.recordingRef || "").trim() ? (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                      <span className="font-medium text-gray-500 dark:text-gray-400">Ref: </span>
                      {(log.recordingRef || "").trim()}
                    </p>
                  ) : null}
                  {log.callVerifiedAt?.toDate ? (
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-1">
                      Call verified by admin
                    </p>
                  ) : null}
                  {user && userProfile ? (
                    <CallLogAdminControls
                      leadId={lead.id}
                      log={log}
                      canApprove={canApproveCallLogs()}
                      user={user}
                      userProfile={userProfile}
                    />
                  ) : null}
                </li>
              ))}
            {logs.length === 0 && (
              <li className="text-gray-500 text-sm py-8 text-center border border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                No call logs yet. Add one above when you reach out.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
};

export default LeadDetailPage;
