import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { db } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { CustomerService } from "../../services/customerService";
import { LeadService } from "../../services/leadService";
import type { CompanyUser, Customer, Lead, LeadExtras } from "../../types";
import {
  COUNTRY_CUSTOM_VALUE,
  CATEGORY_CUSTOM_VALUE,
  LEAD_COUNTRY_OPTIONS,
  LEAD_CATEGORY_PRESETS,
} from "../../config/leadFormOptions";
import Spinner from "../../components/Spinner";
import { SearchableLeadOptionSelect } from "../../components/SearchableLeadOptionSelect";
import { InternationalPhoneInput } from "../../components/InternationalPhoneInput";
import { getIsoFromLeadCountryName } from "../../utils/internationalPhone";
import { isValidEmailAddress } from "../../utils/emailValidation";

const SOURCE_CUSTOM_VALUE = "__custom__";

const LEAD_SOURCE_PRESETS = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold call",
  "Email campaign",
  "Event / trade show",
  "Walk-in",
  "Partner",
] as const;

const SOCIAL_PLATFORM_ROWS = [
  { flagKey: "socialFacebook" as const, urlKey: "facebookUrl" as const, label: "Facebook", urlLabel: "Facebook URL" },
  { flagKey: "socialInstagram" as const, urlKey: "instagramUrl" as const, label: "Instagram", urlLabel: "Instagram URL" },
  { flagKey: "socialLinkedin" as const, urlKey: "linkedinUrl" as const, label: "LinkedIn", urlLabel: "LinkedIn URL" },
  { flagKey: "socialTwitter" as const, urlKey: "twitterUrl" as const, label: "Twitter (X)", urlLabel: "Twitter (X) URL" },
  { flagKey: "socialTiktok" as const, urlKey: "tiktokUrl" as const, label: "TikTok", urlLabel: "TikTok URL" },
];

function isValidHttpOrHttpsUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div className="flex justify-center items-center space-x-2 mt-4">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          type="button"
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${
            currentPage === page ? "font-bold underline" : ""
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

type FormErrors = {
  nameCompany?: string;
  contact?: string;
  email?: string;
  country?: string;
  category?: string;
  source?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
};

type SubmitFeedback =
  | { type: "success"; message: string; leadId: string }
  | { type: "error"; message: string };

const LeadsPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const {
    canAccessLeadsPage,
    canCreateLead,
    leadsListViewAll,
    isOwner,
    isAdmin,
  } = usePermissions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignees, setAssignees] = useState<{ uid: string; label: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const viewAll = leadsListViewAll();

  const [form, setForm] = useState({
    name: "",
    company: "",
    countrySelect: "",
    countryCustom: "",
    categorySelect: "",
    categoryCustom: "",
    phone: "",
    email: "",
    sourceSelect: "",
    sourceCustom: "",
    notes: "",
    socialFacebook: false,
    socialInstagram: false,
    socialLinkedin: false,
    socialTwitter: false,
    socialTiktok: false,
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
    tiktokUrl: "",
    website: "",
    address: "",
    extraNotes: "",
  });
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null);

  const resolvedSource = useMemo(() => {
    if (form.sourceSelect === SOURCE_CUSTOM_VALUE) return form.sourceCustom.trim();
    return form.sourceSelect.trim();
  }, [form.sourceSelect, form.sourceCustom]);

  const resolvedCountry = useMemo(() => {
    if (form.countrySelect === COUNTRY_CUSTOM_VALUE) return form.countryCustom.trim();
    return form.countrySelect.trim();
  }, [form.countrySelect, form.countryCustom]);

  const resolvedCategory = useMemo(() => {
    if (form.categorySelect === CATEGORY_CUSTOM_VALUE) return form.categoryCustom.trim();
    return form.categorySelect.trim();
  }, [form.categorySelect, form.categoryCustom]);

  const phoneCountryIso = useMemo(
    () => getIsoFromLeadCountryName(resolvedCountry),
    [resolvedCountry],
  );

  const duplicateCustomers = useMemo(() => {
    const phoneOk = LeadService.isPhoneSufficientForDuplicateHint(form.phone);
    const emailOk = LeadService.isEmailSufficientForDuplicateHint(form.email);
    if (!phoneOk && !emailOk) return [] as Customer[];
    return LeadService.findCustomersMatchingContact(
      customers,
      phoneOk ? form.phone : "",
      emailOk ? form.email : "",
    );
  }, [customers, form.phone, form.email]);

  const duplicateLeads = useMemo(() => {
    const phoneOk = LeadService.isPhoneSufficientForDuplicateHint(form.phone);
    const emailOk = LeadService.isEmailSufficientForDuplicateHint(form.email);
    if (!phoneOk && !emailOk) return [] as Lead[];
    return LeadService.findLeadsMatchingContact(
      leads,
      phoneOk ? form.phone : "",
      emailOk ? form.email : "",
    );
  }, [leads, form.phone, form.email]);

  const showDuplicateWarning =
    duplicateCustomers.length > 0 || duplicateLeads.length > 0;

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!canAccessLeadsPage()) {
      navigate("/");
      return;
    }
  }, [user, userProfile, canAccessLeadsPage, navigate]);

  useEffect(() => {
    if (!user || !userProfile || !canAccessLeadsPage()) return;

    const unsub = LeadService.getLeadsRealTime(
      user,
      userProfile,
      viewAll,
      (rows) => {
        setLeads(rows);
        setFiltered(rows);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user, userProfile, canAccessLeadsPage, viewAll]);

  useEffect(() => {
    if (!user || !userProfile || !modalOpen) return;
    (async () => {
      const list = await CustomerService.getCustomers(
        user,
        userProfile,
        isOwner,
        isAdmin,
      );
      setCustomers(list);
    })();
  }, [user, userProfile, modalOpen, isOwner, isAdmin]);

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
    if (!searchTerm.trim()) {
      setFiltered(leads);
    } else {
      const q = searchTerm.toLowerCase();
      setFiltered(
        leads.filter(
          (l) =>
            (l.name || "").toLowerCase().includes(q) ||
            (l.company || "").toLowerCase().includes(q) ||
            (l.email || "").toLowerCase().includes(q) ||
            (l.phone || "").toLowerCase().includes(q) ||
            (l.source || "").toLowerCase().includes(q) ||
            (l.status || "").toLowerCase().includes(q) ||
            (l.country || "").toLowerCase().includes(q) ||
            (l.category || "").toLowerCase().includes(q),
        ),
      );
    }
    setCurrentPage(1);
  }, [searchTerm, leads]);

  const resetModalState = () => {
    setForm({
      name: "",
      company: "",
      countrySelect: "",
      countryCustom: "",
      categorySelect: "",
      categoryCustom: "",
      phone: "",
      email: "",
      sourceSelect: "",
      sourceCustom: "",
      notes: "",
      socialFacebook: false,
      socialInstagram: false,
      socialLinkedin: false,
      socialTwitter: false,
      socialTiktok: false,
      facebookUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
      twitterUrl: "",
      tiktokUrl: "",
      website: "",
      address: "",
      extraNotes: "",
    });
    setOptionalExpanded(false);
    setFormErrors({});
    setSubmitFeedback(null);
    setIsSubmitting(false);
  };

  const openModal = () => {
    if (!canCreateLead()) return;
    resetModalState();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetModalState();
  };

  const handleCreateAnother = () => {
    resetModalState();
  };

  const handleCreate = async () => {
    if (!user || !userProfile || isSubmitting) return;

    setSubmitFeedback(null);
    const errors: FormErrors = {};
    if (!form.name.trim() && !form.company.trim()) {
      errors.nameCompany = "Enter a contact name or a company (at least one).";
    }
    if (form.email.trim() && !isValidEmailAddress(form.email)) {
      errors.email = "Enter a valid email address (e.g. name@company.com).";
    }
    if (!form.phone.trim() && !form.email.trim()) {
      errors.contact = "Enter a phone number or email (at least one).";
    }
    if (!resolvedCountry) {
      errors.country =
        form.countrySelect === COUNTRY_CUSTOM_VALUE
          ? "Enter the country name."
          : "Select the country / location for this lead.";
    }
    if (!resolvedCategory) {
      errors.category =
        form.categorySelect === CATEGORY_CUSTOM_VALUE
          ? "Enter the business category."
          : "Select the business category.";
    }
    if (!resolvedSource) {
      errors.source =
        form.sourceSelect === SOURCE_CUSTOM_VALUE
          ? "Enter a custom source."
          : "Select a lead source.";
    }

    const web = form.website.trim();
    if (web && !isValidHttpOrHttpsUrl(web)) {
      errors.website = "Enter a valid URL starting with http:// or https://.";
    }

    if (form.socialFacebook) {
      const u = form.facebookUrl.trim();
      if (!u) errors.facebookUrl = "Enter a Facebook URL or uncheck Facebook.";
      else if (!isValidHttpOrHttpsUrl(u)) {
        errors.facebookUrl = "Enter a valid URL starting with http:// or https://.";
      }
    }
    if (form.socialInstagram) {
      const u = form.instagramUrl.trim();
      if (!u) errors.instagramUrl = "Enter an Instagram URL or uncheck Instagram.";
      else if (!isValidHttpOrHttpsUrl(u)) {
        errors.instagramUrl = "Enter a valid URL starting with http:// or https://.";
      }
    }
    if (form.socialLinkedin) {
      const u = form.linkedinUrl.trim();
      if (!u) errors.linkedinUrl = "Enter a LinkedIn URL or uncheck LinkedIn.";
      else if (!isValidHttpOrHttpsUrl(u)) {
        errors.linkedinUrl = "Enter a valid URL starting with http:// or https://.";
      }
    }
    if (form.socialTwitter) {
      const u = form.twitterUrl.trim();
      if (!u) errors.twitterUrl = "Enter a Twitter (X) URL or uncheck Twitter (X).";
      else if (!isValidHttpOrHttpsUrl(u)) {
        errors.twitterUrl = "Enter a valid URL starting with http:// or https://.";
      }
    }
    if (form.socialTiktok) {
      const u = form.tiktokUrl.trim();
      if (!u) errors.tiktokUrl = "Enter a TikTok URL or uncheck TikTok.";
      else if (!isValidHttpOrHttpsUrl(u)) {
        errors.tiktokUrl = "Enter a valid URL starting with http:// or https://.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsSubmitting(true);
    try {
      const extras: LeadExtras = {};
      if (web) extras.website = web;
      const addr = form.address.trim();
      const extra = form.extraNotes.trim();
      if (addr) extras.address = addr;
      if (extra) extras.extraNotes = extra;
      if (form.socialFacebook && form.facebookUrl.trim()) extras.facebookUrl = form.facebookUrl.trim();
      if (form.socialInstagram && form.instagramUrl.trim()) extras.instagramUrl = form.instagramUrl.trim();
      if (form.socialLinkedin && form.linkedinUrl.trim()) extras.linkedinUrl = form.linkedinUrl.trim();
      if (form.socialTwitter && form.twitterUrl.trim()) extras.twitterUrl = form.twitterUrl.trim();
      if (form.socialTiktok && form.tiktokUrl.trim()) extras.tiktokUrl = form.tiktokUrl.trim();

      const leadId = await LeadService.saveLead(
        {
          name: form.name,
          company: form.company,
          country: resolvedCountry,
          category: resolvedCategory,
          phone: form.phone,
          email: form.email,
          source: resolvedSource,
          status: "New",
          notes: form.notes,
          assignedUserId: "",
          extras: Object.keys(extras).length ? extras : {},
        },
        user,
        userProfile,
        undefined,
      );

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "lead_created",
        `Created lead: ${form.name || form.company}`,
        {
          entityId: leadId,
          entityType: "lead",
        },
      );

      setSubmitFeedback({
        type: "success",
        message: "Lead created successfully.",
        leadId,
      });
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setSubmitFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const assigneeLabel = (uid: string) => {
    if (!uid?.trim()) return "Unassigned";
    return assignees.find((a) => a.uid === uid)?.label || uid;
  };

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const pageRows = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  const formLocked = isSubmitting || submitFeedback?.type === "success";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="page-header mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Leads
          </h1>
          <div className="button-group">
            {canCreateLead() && (
              <button
                type="button"
                onClick={openModal}
                className="mobile-btn px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
              >
                New lead
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {viewAll
            ? "You are viewing all leads for your company."
            : "You are viewing leads assigned to you or created by you."}
        </p>

        <div className="relative">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {searchTerm
            ? `Found ${filtered.length} match(es)`
            : `Total ${leads.length} lead(s)`}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Name / Company</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Country</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Assigned</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((lead) => (
                <tr
                  key={lead.id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <div>{lead.name || "—"}</div>
                    <div className="text-xs text-gray-500">{lead.company || ""}</div>
                  </td>
                  <td className="px-6 py-4">{lead.status}</td>
                  <td className="px-6 py-4">{lead.source}</td>
                  <td className="px-6 py-4 text-xs">{lead.country || "—"}</td>
                  <td className="px-6 py-4 text-xs max-w-[10rem] break-words">
                    {lead.category || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs">{lead.email || "—"}</div>
                    <div className="text-xs">{lead.phone || "—"}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {assigneeLabel(lead.assignedUserId)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/leads/${lead.id}`);
                      }}
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            {isSubmitting && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 dark:bg-gray-900/60"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-2">
                  <Spinner />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Creating lead…
                  </span>
                </div>
              </div>
            )}

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              New lead
            </h3>

            {submitFeedback?.type === "success" && (
              <div
                className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-900/30 dark:text-green-100"
                role="status"
              >
                <p className="font-medium">{submitFeedback.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/leads/${submitFeedback.leadId}`);
                      closeModal();
                    }}
                    className="px-3 py-1.5 rounded-md bg-green-700 text-white text-sm hover:bg-green-800"
                  >
                    Open lead
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAnother}
                    className="px-3 py-1.5 rounded-md border border-green-700 text-green-800 dark:text-green-200 text-sm hover:bg-green-100 dark:hover:bg-green-900/40"
                  >
                    Create another
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {submitFeedback?.type === "error" && (
              <div
                className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100"
                role="alert"
              >
                {submitFeedback.message}
              </div>
            )}

            <div
              className={`space-y-4 ${formLocked ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="lead-contact-name"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Contact name
                    </label>
                    <input
                      id="lead-contact-name"
                      className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.nameCompany ? "border-red-500 ring-1 ring-red-500" : ""
                      }`}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={formLocked}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lead-company-name"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Company name
                    </label>
                    <input
                      id="lead-company-name"
                      className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.nameCompany ? "border-red-500 ring-1 ring-red-500" : ""
                      }`}
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      disabled={formLocked}
                      autoComplete="organization"
                    />
                  </div>
                </div>
                {formErrors.nameCompany && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {formErrors.nameCompany}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  At least one of contact name or company name is required.
                </p>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <label
                      htmlFor="lead-country"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Country / location
                    </label>
                    <SearchableLeadOptionSelect
                      id="lead-country"
                      ariaLabel="Country or location"
                      options={LEAD_COUNTRY_OPTIONS}
                      selectValue={form.countrySelect}
                      customValue={form.countryCustom}
                      onSelectChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          countrySelect: v,
                          countryCustom:
                            v === COUNTRY_CUSTOM_VALUE ? f.countryCustom : "",
                        }))
                      }
                      onCustomChange={(v) =>
                        setForm((f) => ({ ...f, countryCustom: v }))
                      }
                      customSentinel={COUNTRY_CUSTOM_VALUE}
                      placeholder="Select country…"
                      otherLabel="Other (type country)"
                      customPlaceholder="Country name"
                      disabled={formLocked}
                      error={!!formErrors.country}
                    />
                    {formErrors.country && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {formErrors.country}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="lead-category"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Business category
                    </label>
                    <SearchableLeadOptionSelect
                      id="lead-category"
                      ariaLabel="Business category"
                      options={LEAD_CATEGORY_PRESETS}
                      selectValue={form.categorySelect}
                      customValue={form.categoryCustom}
                      onSelectChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          categorySelect: v,
                          categoryCustom:
                            v === CATEGORY_CUSTOM_VALUE ? f.categoryCustom : "",
                        }))
                      }
                      onCustomChange={(v) =>
                        setForm((f) => ({ ...f, categoryCustom: v }))
                      }
                      customSentinel={CATEGORY_CUSTOM_VALUE}
                      placeholder="Select category…"
                      otherLabel="Other (type your own)"
                      customPlaceholder="Custom category"
                      disabled={formLocked}
                      error={!!formErrors.category}
                    />
                    {formErrors.category && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {formErrors.category}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Required: lead location (country) and type of business (category). Open each field and use Search to find an option quickly.
                </p>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="lead-email"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Email address
                    </label>
                    <input
                      id="lead-email"
                      type="email"
                      className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.email || formErrors.contact
                          ? "border-red-500 ring-1 ring-red-500"
                          : ""
                      }`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      disabled={formLocked}
                      autoComplete="email"
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-600 dark:text-red-400">{formErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="lead-phone"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Phone number
                    </label>
                    <InternationalPhoneInput
                      id="lead-phone"
                      value={form.phone}
                      onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                      countryIso={phoneCountryIso}
                      error={!!formErrors.contact}
                      disabled={formLocked}
                      autoComplete="tel"
                      placeholder={
                        phoneCountryIso
                          ? "Number with country code (auto from country)"
                          : "Select country first, or type + and country code"
                      }
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {phoneCountryIso
                        ? "Country code is filled from the location you selected above; spaces are added automatically."
                        : "Pick a country above to apply the right +country code and spacing, or enter an international number starting with +."}
                    </p>
                  </div>
                </div>
                {formErrors.contact && !formErrors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {formErrors.contact}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  At least one of email address or phone number is required.
                </p>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <label
                      htmlFor="lead-source"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Source
                    </label>
                    <select
                      id="lead-source"
                      className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.source ? "border-red-500 ring-1 ring-red-500" : ""
                      }`}
                      value={form.sourceSelect}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sourceSelect: e.target.value,
                          sourceCustom:
                            e.target.value === SOURCE_CUSTOM_VALUE ? form.sourceCustom : "",
                        })
                      }
                      disabled={formLocked}
                    >
                      <option value="">Select source…</option>
                      {LEAD_SOURCE_PRESETS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      <option value={SOURCE_CUSTOM_VALUE}>Other (type your own)</option>
                    </select>
                    {form.sourceSelect === SOURCE_CUSTOM_VALUE && (
                      <>
                        <label
                          htmlFor="lead-source-custom"
                          className="block text-xs font-medium text-gray-600 dark:text-gray-300 mt-2 mb-1"
                        >
                          Custom source
                        </label>
                        <input
                          id="lead-source-custom"
                          className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                            formErrors.source ? "border-red-500 ring-1 ring-red-500" : ""
                          }`}
                          value={form.sourceCustom}
                          onChange={(e) =>
                            setForm({ ...form, sourceCustom: e.target.value })
                          }
                          disabled={formLocked}
                        />
                      </>
                    )}
                    {formErrors.source && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {formErrors.source}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="lead-notes"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Notes
                    </label>
                    <textarea
                      id="lead-notes"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[7.5rem]"
                      rows={4}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      disabled={formLocked}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOptionalExpanded((v) => !v)}
                disabled={formLocked}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {optionalExpanded ? "Hide optional fields" : "Show optional fields"}
              </button>

              {optionalExpanded && (
                <div className="w-full space-y-4 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                  <div>
                    <label
                      htmlFor="lead-website"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Website
                    </label>
                    <input
                      id="lead-website"
                      type="url"
                      inputMode="url"
                      placeholder="https://example.com"
                      className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.website ? "border-red-500 ring-1 ring-red-500" : ""
                      }`}
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      disabled={formLocked}
                    />
                    {formErrors.website ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {formErrors.website}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Optional. Must start with http:// or https://.
                      </p>
                    )}
                  </div>

                  <fieldset className="space-y-3 border-0 p-0 m-0">
                    <legend className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Social profiles
                    </legend>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Select networks you want to store; each requires a full URL.
                    </p>
                    {SOCIAL_PLATFORM_ROWS.map((row) => {
                      const checked = form[row.flagKey];
                      const urlVal = form[row.urlKey];
                      const urlErr = formErrors[row.urlKey];
                      return (
                        <div key={row.flagKey} className="rounded-md border border-gray-100 dark:border-gray-600 p-2">
                          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 dark:border-gray-600"
                              checked={checked}
                              onChange={(e) => {
                                const on = e.target.checked;
                                setForm({
                                  ...form,
                                  [row.flagKey]: on,
                                  ...(!on ? { [row.urlKey]: "" } : {}),
                                });
                              }}
                              disabled={formLocked}
                            />
                            {row.label}
                          </label>
                          {checked && (
                            <div className="mt-2">
                              <label
                                className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                                htmlFor={`lead-${row.urlKey}`}
                              >
                                {row.urlLabel}
                              </label>
                              <input
                                id={`lead-${row.urlKey}`}
                                type="url"
                                inputMode="url"
                                placeholder="https://…"
                                className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                  urlErr ? "border-red-500 ring-1 ring-red-500" : ""
                                }`}
                                value={urlVal}
                                onChange={(e) =>
                                  setForm({ ...form, [row.urlKey]: e.target.value })
                                }
                                disabled={formLocked}
                              />
                              {urlErr && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {urlErr}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </fieldset>

                  <div>
                    <label
                      htmlFor="lead-address"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Address
                    </label>
                    <input
                      id="lead-address"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      disabled={formLocked}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lead-extra-info"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"
                    >
                      Extra info
                    </label>
                    <textarea
                      id="lead-extra-info"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={3}
                      value={form.extraNotes}
                      onChange={(e) => setForm({ ...form, extraNotes: e.target.value })}
                      disabled={formLocked}
                    />
                  </div>
                </div>
              )}

              {showDuplicateWarning && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-medium">Possible duplicates (you can still create)</p>
                  <p className="mt-1 text-xs opacity-90">
                    This shows when the <strong>phone number</strong> or <strong>email</strong> you entered is the same as a lead or customer already in your list (the name or company can be different).
                  </p>
                  {duplicateLeads.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
                        Existing leads
                      </p>
                      <ul className="mt-1 list-disc list-inside text-xs">
                        {duplicateLeads.slice(0, 5).map((l) => (
                          <li key={l.id}>
                            {(l.name || l.company || "Lead").trim()} —{" "}
                            {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {duplicateCustomers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
                        Customers
                      </p>
                      <ul className="mt-1 list-disc list-inside text-xs">
                        {duplicateCustomers.slice(0, 5).map((c) => (
                          <li key={c.id}>
                            {c.name} — {c.email || c.phone}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2 text-xs opacity-90">
                    Review on the lead detail page or link to an existing customer if needed.
                  </p>
                </div>
              )}
            </div>

            {submitFeedback?.type !== "success" && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md dark:bg-gray-600 dark:text-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg
                      className="w-4 h-4 animate-spin shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  Create lead
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
