import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  LEAD_COUNTRY_OPTIONS,
  LEAD_CATEGORY_PRESETS,
} from "../../config/leadFormOptions";
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

function toDateInput(ts: firebase.firestore.Timestamp | null | undefined): string {
  if (!ts?.toDate) return "";
  const d = ts.toDate();
  return d.toISOString().split("T")[0];
}

function fromDateInput(s: string): firebase.firestore.Timestamp | null {
  if (!s) return null;
  const d = new Date(s + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
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

const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const {
    canAccessLeadsPage,
    canEditLead,
    canDeleteLead,
    canAssignLeads,
    canLogLeadCalls,
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
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<LeadStatus>("New");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [social, setSocial] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

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
    if (!canAccessLeadsPage()) {
      navigate("/");
    }
  }, [user, userProfile, canAccessLeadsPage, navigate]);

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
          setSource(row.source || "");
          setStatus(row.status);
          setNotes(row.notes || "");
          setFollowUp(
            toDateInput(row.nextFollowUpDate as firebase.firestore.Timestamp | null | undefined),
          );
          setSocial(row.extras?.socialMedia || "");
          setWebsite(row.extras?.website || "");
          setAddress(row.extras?.address || "");
          setExtraNotes(row.extras?.extraNotes || "");
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
    if (!source.trim()) {
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
    setSaving(true);
    try {
      const extrasPayload: LeadExtras = {
        ...(lead.extras || {}),
        socialMedia: social.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        extraNotes: extraNotes.trim() || undefined,
      };
      if (!extrasPayload.socialMedia) delete extrasPayload.socialMedia;
      if (!extrasPayload.website) delete extrasPayload.website;
      if (!extrasPayload.address) delete extrasPayload.address;
      if (!extrasPayload.extraNotes) delete extrasPayload.extraNotes;

      await LeadService.updateLeadFields(lead.id, {
        name: name.trim(),
        company: company.trim(),
        country: resolvedCountry,
        category: resolvedCategory,
        phone: phone.trim(),
        email: email.trim(),
        source: source.trim(),
        status,
        notes: notes.trim(),
        nextFollowUpDate: fromDateInput(followUp),
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
    try {
      await LeadService.addCallLog(
        lead.id,
        callOutcome,
        callNotes,
        fromDateInput(callFollowUp),
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

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="text-sm text-primary-600 hover:underline dark:text-primary-400"
        >
          ← Leads
        </button>
        {canDeleteLead() && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-600 hover:underline"
          >
            Delete lead
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {name || company || "Lead"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">ID: {lead.id}</p>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <div className="sm:col-span-1 space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-country">
              Country / location
            </label>
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
            <p className="text-xs text-gray-500 dark:text-gray-400">Open the list and search to pick a country.</p>
          </div>
          <div className="sm:col-span-1 space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300" htmlFor="lead-detail-category">
              Business category
            </label>
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
            <p className="text-xs text-gray-500 dark:text-gray-400">Search the list for an industry type.</p>
          </div>
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="space-y-1">
            <InternationalPhoneInput
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {phoneCountryIso
                ? "Formatted from country above; includes country code and spacing."
                : "Choose a country for automatic +code, or enter an international number with +."}
            </p>
          </div>
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            placeholder="Source *"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <select
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            disabled={!canEditLead()}
            type="date"
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </div>
        <textarea
          disabled={!canEditLead()}
          className="w-full mt-3 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
          placeholder="Notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            placeholder="Social"
            value={social}
            onChange={(e) => setSocial(e.target.value)}
          />
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60"
            placeholder="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <input
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60 sm:col-span-2"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <textarea
            disabled={!canEditLead()}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60 sm:col-span-2"
            placeholder="Extra notes"
            rows={2}
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
          />
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
      </section>

      {canAssignLeads() && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Assignment</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <select
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
            <input
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1 min-w-[12rem]"
              placeholder="Reason (optional)"
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAssign}
              className="px-4 py-2 bg-gray-800 text-white rounded-md dark:bg-gray-600"
            >
              Assign
            </button>
          </div>
        </section>
      )}

      {canLinkLeadCustomer() && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Link customer</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
              value={linkCustomerId}
              onChange={(e) => {
                setLinkCustomerId(e.target.value);
                setLinkBusinessId("");
              }}
            >
              <option value="">— Customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
            <select
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1"
              value={linkBusinessId}
              onChange={(e) => setLinkBusinessId(e.target.value)}
              disabled={!linkCustomerId}
            >
              <option value="">— Business (optional) —</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLink}
              className="px-4 py-2 bg-primary-600 text-white rounded-md"
            >
              Save link
            </button>
          </div>
        </section>
      )}

      {canConvertLead() && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Convert (Won only)</h2>
          {lead.convertedCustomerId ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Converted to customer{" "}
              <code className="text-xs">{lead.convertedCustomerId}</code>
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={convertBiz}
                  onChange={(e) => setConvertBiz(e.target.checked)}
                />
                Create business under new customer
              </label>
              {convertBiz && (
                <input
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-2"
                  placeholder="Business name"
                  value={convertBizName}
                  onChange={(e) => setConvertBizName(e.target.value)}
                />
              )}
              <button
                type="button"
                onClick={handleConvert}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Convert &amp; new invoice
              </button>
            </>
          )}
        </section>
      )}

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Call logs</h2>
        {canLogLeadCalls() && (
          <div className="flex flex-col gap-2 mb-4 border-b border-gray-200 dark:border-gray-600 pb-4">
            <select
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
            <textarea
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Call notes"
              rows={2}
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
            />
            <input
              type="date"
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white max-w-xs"
              value={callFollowUp}
              onChange={(e) => setCallFollowUp(e.target.value)}
            />
            <button
              type="button"
              onClick={handleCallLog}
              className="px-4 py-2 bg-primary-600 text-white rounded-md w-fit"
            >
              Add log
            </button>
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {logs.map((log) => (
            <li
              key={log.id}
              className="border border-gray-100 dark:border-gray-600 rounded p-2"
            >
              <div className="font-medium text-gray-800 dark:text-white">
                {log.outcome}{" "}
                <span className="text-xs text-gray-500">
                  {log.createdAt?.toDate?.().toLocaleString?.() || ""}
                </span>
              </div>
              <div className="text-gray-600 dark:text-gray-300">{log.notes}</div>
            </li>
          ))}
          {logs.length === 0 && (
            <li className="text-gray-500 text-sm">No call logs yet.</li>
          )}
        </ul>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Assignment history</h2>
        <ul className="space-y-2 text-sm">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="border border-gray-100 dark:border-gray-600 rounded p-2"
            >
              <div className="text-gray-800 dark:text-white">
                {ev.fromUserId || "—"} → {ev.toUserId}
              </div>
              <div className="text-xs text-gray-500">
                {ev.createdAt?.toDate?.().toLocaleString?.() || ""} by{" "}
                {ev.assignedByUserId}
              </div>
              {ev.reason ? (
                <div className="text-gray-600 dark:text-gray-300">{ev.reason}</div>
              ) : null}
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-gray-500 text-sm">No assignment events yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
};

export default LeadDetailPage;
