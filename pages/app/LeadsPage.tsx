import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompanyUserOptions } from "../../hooks/useCompanyUserOptions";
import { usePermissions } from "../../hooks/usePermissions";
import { ActivityLogger } from "../../services/activityLogger";
import { CustomerService } from "../../services/customerService";
import { LeadService } from "../../services/leadService";
import type { Customer, Lead, LeadExtras, LeadStatus } from "../../types";
import {
  COUNTRY_CUSTOM_VALUE,
  CATEGORY_CUSTOM_VALUE,
  SOURCE_CUSTOM_VALUE,
  LEAD_COUNTRY_OPTIONS,
  LEAD_CATEGORY_PRESETS,
  LEAD_SOURCE_PRESETS,
} from "../../config/leadFormOptions";
import Spinner from "../../components/Spinner";
import LeadPitchReadyIcon, { leadHasPitchNotes } from "../../components/LeadPitchReadyIcon";
import FieldInfoTip from "../../components/FieldInfoTip";
import DuplicateContactTip from "../../components/DuplicateContactTip";
import { SearchableLeadOptionSelect } from "../../components/SearchableLeadOptionSelect";
import { InternationalPhoneInput } from "../../components/InternationalPhoneInput";
import { getIsoFromLeadCountryName } from "../../utils/internationalPhone";
import { isValidEmailAddress } from "../../utils/emailValidation";
import {
  LEAD_TARGET_SALES_GENDER_OPTIONS,
  TARGET_SALES_GENDER,
  normalizeLeadTargetSalesGender,
  type LeadTargetSalesGender,
} from "../../config/leadTargetSalesGender";

const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
];

const MailIcon: React.FC<{ className?: string }> = ({ className = "text-current" }) => (
  <svg className={`w-4 h-4 shrink-0 ${className}`.trim()} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className = "text-current" }) => (
  <svg className={`w-4 h-4 shrink-0 ${className}`.trim()} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

/** Call log action (clipboard + list). */
const LogCallActionIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9 2 2 0 012-2h4a2 2 0 012 2m-6 9 2 2 0 002 2h4a2 2 0 002-2m-6-9h.01M10 11h4"
    />
  </svg>
);

/** Conversion / handoff action. */
const ConvertActionIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  </svg>
);

function leadListStatusBadgeClasses(status: LeadStatus): string {
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

type ContactPresenceFilter = "" | "has_email" | "has_phone" | "has_both" | "has_any";

/** Notes filled = pitch/call context on file (matches green check in list). */
type PitchReadyFilter = "" | "ready" | "not_ready";

type FilterTargetSalesGender = "" | LeadTargetSalesGender;

const SOCIAL_PLATFORM_ROWS = [
  { flagKey: "socialFacebook" as const, urlKey: "facebookUrl" as const, label: "Facebook", urlLabel: "Facebook URL" },
  { flagKey: "socialInstagram" as const, urlKey: "instagramUrl" as const, label: "Instagram", urlLabel: "Instagram URL" },
  { flagKey: "socialLinkedin" as const, urlKey: "linkedinUrl" as const, label: "LinkedIn", urlLabel: "LinkedIn URL" },
  { flagKey: "socialTwitter" as const, urlKey: "twitterUrl" as const, label: "Twitter (X)", urlLabel: "Twitter (X) URL" },
  { flagKey: "socialTiktok" as const, urlKey: "tiktokUrl" as const, label: "TikTok", urlLabel: "TikTok URL" },
];

function createEmptyLeadForm() {
  return {
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
    targetSalesGender: TARGET_SALES_GENDER.ANY as LeadTargetSalesGender,
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
    hasWhatsapp: false,
    whatsappSameAsPhone: true,
    whatsappPhone: "",
  };
}

function buildDuplicateTooltipText(
  kind: "email" | "phone",
  leadRows: Lead[],
  customerRows: Customer[],
): string {
  const bits: string[] = [];
  if (leadRows.length) {
    const names = leadRows
      .slice(0, 3)
      .map((l) => (l.name || l.company || "Lead").trim())
      .join(", ");
    bits.push(
      `${leadRows.length} lead${leadRows.length === 1 ? "" : "s"}${leadRows.length > 3 ? " (showing first 3)" : ""}: ${names}`,
    );
  }
  if (customerRows.length) {
    const names = customerRows
      .slice(0, 3)
      .map((c) => c.name.trim())
      .join(", ");
    bits.push(
      `${customerRows.length} customer${customerRows.length === 1 ? "" : "s"}${customerRows.length > 3 ? " (showing first 3)" : ""}: ${names}`,
    );
  }
  const field = kind === "email" ? "email" : "phone number";
  return `This ${field} matches existing data in your company. ${bits.join(" ")} You can still create this lead if it is a different person.`;
}

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
  whatsappPhone?: string;
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
    canAssignLeads,
    canBulkDeleteLeads,
    canLogLeadCalls,
    canConvertLead,
    leadsListViewAll,
    isOwner,
    isAdmin,
  } = usePermissions();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const [filterContact, setFilterContact] = useState<ContactPresenceFilter>("");
  const [filterPitchReady, setFilterPitchReady] = useState<PitchReadyFilter>("");
  const [filterTargetGender, setFilterTargetGender] = useState<FilterTargetSalesGender>("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const assignees = useCompanyUserOptions(user, userProfile);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const copyToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkLeadAction, setBulkLeadAction] = useState<"assign" | "delete">("assign");
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("__pick__");
  const [bulkAssignReason, setBulkAssignReason] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllHeaderRef = useRef<HTMLInputElement>(null);

  const viewAll = leadsListViewAll();
  /** Assignee + creator filters/columns are for company admins only */
  const isLeadsAdmin = isOwner || isAdmin;
  /** "Assigned" column + assignee search match — same as Leads Assign permission */
  const showAssigneeColumn = canAssignLeads();

  const [form, setForm] = useState(() => createEmptyLeadForm());
  const [additionalExpanded, setAdditionalExpanded] = useState(false);
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

  /** Phone-only / email-only matches so we can warn on the specific field. */
  const contactDuplicateDetails = useMemo(() => {
    const phoneOk = LeadService.isPhoneSufficientForDuplicateHint(form.phone);
    const emailOk = LeadService.isEmailSufficientForDuplicateHint(form.email);
    const phoneStr = phoneOk ? form.phone : "";
    const emailStr = emailOk ? form.email : "";
    const leadsPhone = phoneOk
      ? LeadService.findLeadsMatchingContact(leads, phoneStr, "")
      : ([] as Lead[]);
    const leadsEmail = emailOk
      ? LeadService.findLeadsMatchingContact(leads, "", emailStr)
      : ([] as Lead[]);
    const custPhone = phoneOk
      ? LeadService.findCustomersMatchingContact(customers, phoneStr, "")
      : ([] as Customer[]);
    const custEmail = emailOk
      ? LeadService.findCustomersMatchingContact(customers, "", emailStr)
      : ([] as Customer[]);
    return { leadsPhone, leadsEmail, custPhone, custEmail, phoneOk, emailOk };
  }, [leads, customers, form.phone, form.email]);

  const emailDuplicateWarn =
    contactDuplicateDetails.emailOk &&
    (contactDuplicateDetails.leadsEmail.length > 0 ||
      contactDuplicateDetails.custEmail.length > 0);

  const phoneDuplicateWarn =
    contactDuplicateDetails.phoneOk &&
    (contactDuplicateDetails.leadsPhone.length > 0 ||
      contactDuplicateDetails.custPhone.length > 0);

  const mayAccessLeads = canAccessLeadsPage();

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!mayAccessLeads) {
      navigate("/");
      return;
    }
  }, [user, userProfile, mayAccessLeads, navigate]);

  useEffect(() => {
    if (!user || !userProfile || !mayAccessLeads) return;

    const unsub = LeadService.getLeadsRealTime(
      user,
      userProfile,
      viewAll,
      (rows) => {
        setLeads(rows);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user, userProfile, mayAccessLeads, viewAll]);

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

  const assigneeLabel = useCallback((uid: string) => {
    if (!uid?.trim()) return "Unassigned";
    return assignees.find((a) => a.uid === uid)?.label || uid;
  }, [assignees]);

  const creatorLabel = useCallback((uid: string | undefined) => {
    if (!uid?.trim()) return "—";
    return assignees.find((a) => a.uid === uid)?.label || uid;
  }, [assignees]);

  const copyToClipboard = useCallback(async (text: string, kind: "email" | "phone") => {
    const t = text.trim();
    if (!t) return;
    const show = (msg: string) => {
      if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
      setCopyToast(msg);
      copyToastTimer.current = setTimeout(() => setCopyToast(null), 2000);
    };
    try {
      await navigator.clipboard.writeText(t);
      show(kind === "email" ? "Email copied" : "Phone number copied");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        show(kind === "email" ? "Email copied" : "Phone number copied");
      } catch {
        show("Could not copy");
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
    };
  }, []);

  const uniqueSources = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => {
      if (l.source?.trim()) s.add(l.source.trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const filteredRows = useMemo(() => {
    let rows = leads;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      rows = rows.filter((l) => {
        const createdUid = (l.createdById || "").trim();
        const createdMatch =
          isLeadsAdmin &&
          (createdUid.toLowerCase().includes(q) ||
            (createdUid && assigneeLabel(createdUid).toLowerCase().includes(q)));
        const assigneeSearchMatch =
          showAssigneeColumn &&
          assigneeLabel(l.assignedUserId).toLowerCase().includes(q);
        return (
          (l.name || "").toLowerCase().includes(q) ||
          (l.company || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.phone || "").toLowerCase().includes(q) ||
          (l.source || "").toLowerCase().includes(q) ||
          (l.status || "").toLowerCase().includes(q) ||
          (l.country || "").toLowerCase().includes(q) ||
          (l.category || "").toLowerCase().includes(q) ||
          assigneeSearchMatch ||
          createdMatch
        );
      });
    }
    if (filterStatus) rows = rows.filter((l) => l.status === filterStatus);
    if (filterSource) rows = rows.filter((l) => (l.source || "").trim() === filterSource);
    if (isLeadsAdmin && filterAssignee) {
      if (filterAssignee === "__unassigned__") {
        rows = rows.filter((l) => !(l.assignedUserId || "").trim());
      } else {
        rows = rows.filter((l) => (l.assignedUserId || "") === filterAssignee);
      }
    }
    if (isLeadsAdmin && filterCreatedBy) {
      rows = rows.filter((l) => (l.createdById || "") === filterCreatedBy);
    }
    if (filterContact) {
      rows = rows.filter((l) => {
        const hasEmail = !!(l.email || "").trim();
        const hasPhone = !!(l.phone || "").trim();
        switch (filterContact) {
          case "has_email":
            return hasEmail;
          case "has_phone":
            return hasPhone;
          case "has_both":
            return hasEmail && hasPhone;
          case "has_any":
            return hasEmail || hasPhone;
          default:
            return true;
        }
      });
    }
    if (filterPitchReady === "ready") {
      rows = rows.filter((l) => leadHasPitchNotes(l.notes));
    } else if (filterPitchReady === "not_ready") {
      rows = rows.filter((l) => !leadHasPitchNotes(l.notes));
    }
    if (filterTargetGender) {
      rows = rows.filter(
        (l) => normalizeLeadTargetSalesGender(l.targetSalesGender) === filterTargetGender,
      );
    }
    return rows;
  }, [
    leads,
    searchTerm,
    filterStatus,
    filterSource,
    filterAssignee,
    filterCreatedBy,
    filterContact,
    filterPitchReady,
    filterTargetGender,
    assigneeLabel,
    isLeadsAdmin,
    showAssigneeColumn,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterStatus,
    filterSource,
    filterAssignee,
    filterCreatedBy,
    filterContact,
    filterPitchReady,
    filterTargetGender,
  ]);

  /** Primary line + subtitle for name/company column (consistent layout). */
  function leadNameCompanyLines(l: Lead): { primary: string; secondary: string | null } {
    const name = (l.name || "").trim();
    const company = (l.company || "").trim();
    if (name && company) return { primary: name, secondary: company };
    if (name) return { primary: name, secondary: null };
    if (company) return { primary: company, secondary: null };
    return { primary: "Untitled lead", secondary: null };
  }

  const resetModalState = () => {
    setForm(createEmptyLeadForm());
    setAdditionalExpanded(false);
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
    if (form.hasWhatsapp && !form.whatsappSameAsPhone && !form.whatsappPhone.trim()) {
      errors.whatsappPhone =
        "Enter the WhatsApp number or choose “Same as phone number above”.";
    }

    if (Object.keys(errors).length > 0) {
      if (errors.whatsappPhone) setAdditionalExpanded(true);
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
      if (form.hasWhatsapp) {
        extras.hasWhatsapp = true;
        extras.whatsappSameAsPhone = form.whatsappSameAsPhone;
        if (!form.whatsappSameAsPhone && form.whatsappPhone.trim()) {
          extras.whatsappPhone = form.whatsappPhone.trim();
        }
      }

      const leadId = await LeadService.saveLead(
        {
          name: form.name,
          company: form.company,
          country: resolvedCountry,
          category: resolvedCategory,
          phone: form.phone,
          email: form.email,
          source: resolvedSource,
          targetSalesGender: normalizeLeadTargetSalesGender(form.targetSalesGender),
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
      setForm(createEmptyLeadForm());
      setFormErrors({});
      setAdditionalExpanded(false);
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

  const totalPages = Math.ceil(filteredRows.length / perPage) || 1;
  const pageRows = filteredRows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  const allowBulkAssign = canAssignLeads();
  const allowBulkDelete = canBulkDeleteLeads();
  const allowBulkRowSelect = allowBulkAssign || allowBulkDelete;

  useEffect(() => {
    if (allowBulkAssign && !allowBulkDelete) setBulkLeadAction("assign");
    else if (!allowBulkAssign && allowBulkDelete) setBulkLeadAction("delete");
  }, [allowBulkAssign, allowBulkDelete]);

  const selectedSet = useMemo(() => new Set(selectedLeadIds), [selectedLeadIds]);
  const allPageIdsSelected =
    allowBulkRowSelect &&
    pageRows.length > 0 &&
    pageRows.every((l) => selectedSet.has(l.id));
  const allFilteredIdsSelected =
    allowBulkRowSelect &&
    filteredRows.length > 0 &&
    filteredRows.every((l) => selectedSet.has(l.id));

  useEffect(() => {
    const el = selectAllHeaderRef.current;
    if (!el || !allowBulkRowSelect || pageRows.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    const onPage = pageRows.filter((l) => selectedSet.has(l.id)).length;
    el.indeterminate = onPage > 0 && onPage < pageRows.length;
  }, [allowBulkRowSelect, pageRows, selectedSet]);

  const toggleLeadSelected = useCallback((leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId],
    );
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      const everyOnPage = pageRows.length > 0 && pageRows.every((l) => next.has(l.id));
      if (everyOnPage) {
        pageRows.forEach((l) => next.delete(l.id));
      } else {
        pageRows.forEach((l) => next.add(l.id));
      }
      return Array.from(next);
    });
  }, [pageRows]);

  const selectAllFilteredLeads = useCallback(() => {
    setSelectedLeadIds(filteredRows.map((l) => l.id));
  }, [filteredRows]);

  const clearLeadSelection = useCallback(() => {
    setSelectedLeadIds([]);
    setBulkAssignUserId("__pick__");
    setBulkAssignReason("");
  }, []);

  const handleBulkDeleteLeads = useCallback(async () => {
    if (!user || !userProfile || !allowBulkDelete || selectedLeadIds.length === 0 || bulkDeleting) {
      return;
    }
    const n = selectedLeadIds.length;
    if (
      !window.confirm(
        `Delete ${n} lead${n === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      for (const leadId of selectedLeadIds) {
        const lead = leads.find((l) => l.id === leadId);
        await LeadService.deleteLead(leadId);
        await ActivityLogger.logActivity(user, userProfile, "lead_deleted", "Bulk deleted lead", {
          entityId: leadId,
          entityType: "lead",
          oldValue: lead ? { name: lead.name, company: lead.company } : undefined,
        });
      }
      clearLeadSelection();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Bulk delete failed.");
    } finally {
      setBulkDeleting(false);
    }
  }, [
    user,
    userProfile,
    allowBulkDelete,
    selectedLeadIds,
    bulkDeleting,
    leads,
    clearLeadSelection,
  ]);

  const handleBulkAssign = useCallback(async () => {
    if (!user || !userProfile || !allowBulkAssign || bulkAssignUserId === "__pick__" || selectedLeadIds.length === 0) {
      return;
    }
    const toId = bulkAssignUserId.trim();
    setBulkAssigning(true);
    const reasonTrim = bulkAssignReason.trim();
    try {
      for (const leadId of selectedLeadIds) {
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) continue;
        const current = (lead.assignedUserId || "").trim();
        if (!toId) {
          if (!current) continue;
          await LeadService.updateLeadFields(leadId, { assignedUserId: "" });
          await ActivityLogger.logActivity(user, userProfile, "lead_assigned", "Bulk unassigned lead", {
            entityId: leadId,
            entityType: "lead",
          });
        } else {
          if (current === toId) continue;
          await LeadService.assignLead(
            leadId,
            (lead.assignedUserId || "").trim() ? lead.assignedUserId : null,
            toId,
            user.uid,
            reasonTrim || undefined,
          );
          await ActivityLogger.logActivity(user, userProfile, "lead_assigned", "Bulk assigned lead", {
            entityId: leadId,
            entityType: "lead",
          });
        }
      }
      clearLeadSelection();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Bulk assign failed.");
    } finally {
      setBulkAssigning(false);
    }
  }, [
    user,
    userProfile,
    allowBulkAssign,
    bulkAssignUserId,
    bulkAssignReason,
    selectedLeadIds,
    leads,
    clearLeadSelection,
  ]);

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
            type="search"
            placeholder={
              (() => {
                let h =
                  "Search name, company, email, phone, source, status, country, category";
                if (isLeadsAdmin) h += ", creator";
                if (showAssigneeColumn) h += ", assignee";
                return `${h}…`;
              })()
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[9rem]"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {LEAD_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[10rem]"
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {isLeadsAdmin && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[10rem]"
              aria-label="Filter by assignee"
            >
              <option value="">All assignees</option>
              <option value="__unassigned__">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.uid} value={a.uid}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
          {isLeadsAdmin && (
            <select
              value={filterCreatedBy}
              onChange={(e) => setFilterCreatedBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[11rem]"
              aria-label="Filter by creator"
            >
              <option value="">All creators</option>
              {assignees.map((a) => (
                <option key={a.uid} value={a.uid}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={filterContact}
            onChange={(e) => setFilterContact(e.target.value as ContactPresenceFilter)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[11rem]"
            aria-label="Filter by email or phone on file"
          >
            <option value="">All leads (no contact filter)</option>
            <option value="has_email">Has email</option>
            <option value="has_phone">Has phone</option>
            <option value="has_both">Has email &amp; phone</option>
            <option value="has_any">Has email or phone</option>
          </select>
          <select
            value={filterPitchReady}
            onChange={(e) => setFilterPitchReady(e.target.value as PitchReadyFilter)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[12rem]"
            aria-label="Filter by call-ready notes"
          >
            <option value="">All leads (notes filter)</option>
            <option value="ready">Ready for calls (has notes)</option>
            <option value="not_ready">Not ready (no notes)</option>
          </select>
          <select
            value={filterTargetGender}
            onChange={(e) =>
              setFilterTargetGender((e.target.value || "") as FilterTargetSalesGender)
            }
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[12rem]"
            aria-label="Filter by sales agent preference"
          >
            <option value="">All agent preferences</option>
            {LEAD_TARGET_SALES_GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(filterStatus ||
            filterSource ||
            (isLeadsAdmin && filterAssignee) ||
            (isLeadsAdmin && filterCreatedBy) ||
            filterContact ||
            filterPitchReady ||
            filterTargetGender) && (
            <button
              type="button"
              className="text-sm text-primary-600 hover:underline dark:text-primary-400"
              onClick={() => {
                setFilterStatus("");
                setFilterSource("");
                setFilterAssignee("");
                setFilterCreatedBy("");
                setFilterContact("");
                setFilterPitchReady("");
                setFilterTargetGender("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {searchTerm ||
          filterStatus ||
          filterSource ||
          (isLeadsAdmin && filterAssignee) ||
          (isLeadsAdmin && filterCreatedBy) ||
          filterContact ||
          filterPitchReady ||
          filterTargetGender
            ? `Showing ${filteredRows.length} of ${leads.length} lead(s)`
            : `Total ${leads.length} lead(s)`}
        </div>
      </div>

      {allowBulkRowSelect && selectedLeadIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/90 p-3 dark:border-primary-800 dark:bg-primary-950/40 sm:flex-row sm:flex-wrap sm:items-end"
          role="region"
          aria-label="Bulk actions for leads"
        >
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? "" : "s"} selected
          </div>
          {allowBulkAssign && allowBulkDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="bulk-lead-action" className="sr-only">
                Bulk action
              </label>
              <select
                id="bulk-lead-action"
                value={bulkLeadAction}
                onChange={(e) =>
                  setBulkLeadAction(e.target.value as "assign" | "delete")
                }
                disabled={bulkAssigning || bulkDeleting}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white min-w-[10rem]"
              >
                <option value="assign">Assign</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          ) : null}
          {bulkLeadAction === "assign" && allowBulkAssign ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="bulk-assign-user">
                Assign to user
              </label>
              <select
                id="bulk-assign-user"
                value={bulkAssignUserId}
                onChange={(e) => setBulkAssignUserId(e.target.value)}
                disabled={bulkAssigning}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white min-w-[12rem]"
              >
                <option value="__pick__">Select user…</option>
                <option value="">Unassign</option>
                {assignees.map((a) => (
                  <option key={a.uid} value={a.uid}>
                    {a.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Note (optional)"
                value={bulkAssignReason}
                onChange={(e) => setBulkAssignReason(e.target.value)}
                disabled={bulkAssigning}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 min-w-[10rem] max-w-[16rem] dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                aria-label="Optional note for assignment history"
              />
              <button
                type="button"
                disabled={bulkAssigning || bulkAssignUserId === "__pick__"}
                onClick={() => void handleBulkAssign()}
                className="text-sm px-3 py-1.5 rounded-md bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkAssigning ? "Applying…" : "Apply assignment"}
              </button>
            </div>
          ) : null}
          {bulkLeadAction === "delete" && allowBulkDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => void handleBulkDeleteLeads()}
                className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? "Deleting…" : "Delete selected"}
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkAssigning || bulkDeleting}
              onClick={clearLeadSelection}
              className="text-sm px-2 py-1.5 text-gray-600 hover:underline dark:text-gray-300"
            >
              Clear selection
            </button>
          </div>
          {!allFilteredIdsSelected && filteredRows.length > pageRows.length ? (
            <button
              type="button"
              disabled={bulkAssigning || bulkDeleting}
              onClick={selectAllFilteredLeads}
              className="text-sm text-primary-700 hover:underline dark:text-primary-400 sm:ml-auto"
            >
              Select all {filteredRows.length} matching leads
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {allowBulkRowSelect ? (
                  <th scope="col" className="w-10 px-2 py-3">
                    <span className="sr-only">Select row</span>
                    <input
                      ref={selectAllHeaderRef}
                      type="checkbox"
                      checked={allPageIdsSelected}
                      onChange={toggleSelectAllOnPage}
                      disabled={pageRows.length === 0}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                      aria-label="Select all leads on this page"
                    />
                  </th>
                ) : null}
                <th className="px-6 py-3 max-w-[26ch]">Name / Company</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Country</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Contact</th>
                {isLeadsAdmin ? <th className="px-6 py-3">Created by</th> : null}
                {showAssigneeColumn ? (
                  <th className="px-6 py-3">Assigned</th>
                ) : null}
                <th className="px-4 py-3 w-0 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((lead) => (
                <tr
                  key={lead.id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  {allowBulkRowSelect ? (
                    <td
                      className="w-10 px-2 py-4 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(lead.id)}
                        onChange={() => toggleLeadSelected(lead.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        aria-label={`Select lead ${leadNameCompanyLines(lead).primary}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-6 py-4 font-medium max-w-[26ch] min-w-0 align-top">
                    {(() => {
                      const { primary, secondary } = leadNameCompanyLines(lead);
                      const pitchReady = leadHasPitchNotes(lead.notes);
                      return (
                        <div className="flex items-start gap-2 min-w-0">
                          {pitchReady ? (
                            <span className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                              <LeadPitchReadyIcon />
                            </span>
                          ) : null}
                          <div className="min-w-0 space-y-0.5 flex-1">
                            <div
                              className="truncate text-gray-900 dark:text-white"
                              title={primary}
                            >
                              {primary}
                            </div>
                            {secondary ? (
                              <div
                                className="truncate text-xs text-gray-500 dark:text-gray-400"
                                title={secondary}
                              >
                                {secondary}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${leadListStatusBadgeClasses(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">{lead.country || "—"}</td>
                  <td className="px-6 py-4 text-xs max-w-[10rem] break-words">
                    {lead.category || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {lead.email?.trim() ? (
                        <button
                          type="button"
                          title="Copy email"
                          aria-label="Copy email address"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyToClipboard(lead.email!, "email");
                          }}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                        >
                          <MailIcon className="text-current" />
                        </button>
                      ) : null}
                      {lead.phone?.trim() ? (
                        <button
                          type="button"
                          title="Copy phone number"
                          aria-label="Copy phone number"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyToClipboard(lead.phone!, "phone");
                          }}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                        >
                          <PhoneIcon className="text-current" />
                        </button>
                      ) : null}
                      {!lead.email?.trim() && !lead.phone?.trim() ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : null}
                    </div>
                  </td>
                  {isLeadsAdmin ? (
                    <td className="px-6 py-4 text-xs">
                      {creatorLabel(lead.createdById)}
                    </td>
                  ) : null}
                  {showAssigneeColumn ? (
                    <td className="px-6 py-4 text-xs">
                      {assigneeLabel(lead.assignedUserId)}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <div className="inline-flex flex-col gap-0.5">
                      {canLogLeadCalls() ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/leads/${lead.id}?tab=calls`);
                          }}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] leading-tight font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 dark:text-primary-300 dark:bg-primary-900/25 dark:hover:bg-primary-900/40"
                        >
                          <LogCallActionIcon className="w-3.5 h-3.5 shrink-0 text-current" />
                          <span>Log call</span>
                        </button>
                      ) : null}
                      {canConvertLead() ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/leads/${lead.id}?tab=conversion`);
                          }}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] leading-tight font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 dark:text-teal-200 dark:bg-teal-900/30 dark:hover:bg-teal-900/45"
                        >
                          <ConvertActionIcon className="w-3.5 h-3.5 shrink-0 text-current" />
                          <span>Conversion</span>
                        </button>
                      ) : null}
                      {!canLogLeadCalls() && !canConvertLead() ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : null}
                    </div>
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

      {copyToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
        >
          {copyToast}
        </div>
      ) : null}

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
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>At least one of contact name or company name is required.</span>
                  <FieldInfoTip text="Enter the person’s name, the company name, or both. You must fill at least one so the lead can be identified in your list." />
                </div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-country"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Country / location
                      </label>
                      <FieldInfoTip text="Required together with business category. Open the list and type to search for a country quickly." />
                    </div>
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
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-category"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Business category
                      </label>
                      <FieldInfoTip text="Required together with country. Search the list to pick an industry type, or choose Other and type your own." />
                    </div>
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
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-1 flex-wrap">
                      <label
                        htmlFor="lead-email"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Email address
                      </label>
                      <FieldInfoTip text="At least one of email or phone is required. Use a valid address if you enter one (e.g. name@company.com)." />
                      {emailDuplicateWarn && !(formErrors.email || formErrors.contact) ? (
                        <DuplicateContactTip
                          text={buildDuplicateTooltipText(
                            "email",
                            contactDuplicateDetails.leadsEmail,
                            contactDuplicateDetails.custEmail,
                          )}
                        />
                      ) : null}
                    </div>
                    <input
                      id="lead-email"
                      type="email"
                      className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        formErrors.email || formErrors.contact
                          ? "border-red-500 ring-1 ring-red-500"
                          : emailDuplicateWarn
                            ? "border-amber-500 ring-1 ring-amber-400/80 bg-amber-50/50 dark:bg-amber-900/15"
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
                    <div className="mb-1 flex items-center gap-1 flex-wrap">
                      <label
                        htmlFor="lead-phone"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Phone number
                      </label>
                      <FieldInfoTip
                        text={
                          phoneCountryIso
                            ? "Country code comes from the location you selected above; spacing is applied automatically."
                            : "Pick a country first for the right +country code and formatting, or enter an international number starting with +."
                        }
                      />
                      {phoneDuplicateWarn && !formErrors.contact ? (
                        <DuplicateContactTip
                          text={buildDuplicateTooltipText(
                            "phone",
                            contactDuplicateDetails.leadsPhone,
                            contactDuplicateDetails.custPhone,
                          )}
                        />
                      ) : null}
                    </div>
                    <InternationalPhoneInput
                      id="lead-phone"
                      value={form.phone}
                      onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                      countryIso={phoneCountryIso}
                      error={!!formErrors.contact}
                      warning={phoneDuplicateWarn && !formErrors.contact}
                      disabled={formLocked}
                      autoComplete="tel"
                      placeholder={
                        phoneCountryIso
                          ? "Number with country code (auto from country)"
                          : "Select country first, or type + and country code"
                      }
                    />
                  </div>
                </div>
                {formErrors.contact && !formErrors.email && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {formErrors.contact}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-1">
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-source"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Source
                      </label>
                      <FieldInfoTip text="Open the list and type to search (e.g. Fiverr, Instagram, Yellow Pages). Choose Other if your source is not listed." />
                    </div>
                      <SearchableLeadOptionSelect
                        id="lead-source"
                        ariaLabel="Lead source"
                        options={LEAD_SOURCE_PRESETS}
                        selectValue={form.sourceSelect}
                        customValue={form.sourceCustom}
                        onSelectChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            sourceSelect: v,
                            sourceCustom:
                              v === SOURCE_CUSTOM_VALUE ? f.sourceCustom : "",
                          }))
                        }
                        onCustomChange={(v) =>
                          setForm((f) => ({ ...f, sourceCustom: v }))
                        }
                        customSentinel={SOURCE_CUSTOM_VALUE}
                        placeholder="Search or select source…"
                        otherLabel="Other (type your own)"
                        customPlaceholder="Custom source name"
                        disabled={formLocked}
                        error={!!formErrors.source}
                      />
                      {formErrors.source && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {formErrors.source}
                        </p>
                      )}
                    </div>
                  <div className="space-y-1">
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-target-sales-gender"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Sales agent preference
                      </label>
                      <FieldInfoTip text="Used to filter leads on the list when you want to assign work to female or male sales agents (or leave as any)." />
                    </div>
                    <select
                      id="lead-target-sales-gender"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.targetSalesGender}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          targetSalesGender: normalizeLeadTargetSalesGender(e.target.value),
                        }))
                      }
                      disabled={formLocked}
                    >
                      {LEAD_TARGET_SALES_GENDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="mb-1 flex items-center gap-1">
                    <label
                      htmlFor="lead-notes"
                      className="text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                      Notes
                    </label>
                    <FieldInfoTip text="Optional internal notes about this lead. Visible on the lead detail page after you save." />
                  </div>
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

              <button
                type="button"
                onClick={() => setAdditionalExpanded((v) => !v)}
                disabled={formLocked}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {additionalExpanded ? "Hide additional fields" : "Show additional fields"}
              </button>

              {additionalExpanded && (
                <div className="w-full space-y-4 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                  <div className="rounded-md border border-gray-200 dark:border-gray-600 p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600"
                          checked={form.hasWhatsapp}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setForm((f) => ({
                              ...f,
                              hasWhatsapp: on,
                              whatsappSameAsPhone: on ? f.whatsappSameAsPhone : true,
                              whatsappPhone: on ? f.whatsappPhone : "",
                            }));
                          }}
                          disabled={formLocked}
                        />
                        Has WhatsApp
                      </label>
                      <FieldInfoTip text="Turn on if this contact uses WhatsApp. You can use the same number as phone or enter a separate WhatsApp number." />
                    </div>
                    {form.hasWhatsapp ? (
                      <div className="space-y-3 pl-1 border-l-2 border-primary-200 dark:border-primary-800 ml-1">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          WhatsApp number
                        </p>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input
                            type="radio"
                            name="lead-whatsapp-mode"
                            className="border-gray-300 dark:border-gray-600"
                            checked={form.whatsappSameAsPhone}
                            onChange={() =>
                              setForm((f) => ({ ...f, whatsappSameAsPhone: true, whatsappPhone: "" }))
                            }
                            disabled={formLocked}
                          />
                          Same as phone number above
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input
                            type="radio"
                            name="lead-whatsapp-mode"
                            className="border-gray-300 dark:border-gray-600"
                            checked={!form.whatsappSameAsPhone}
                            onChange={() => setForm((f) => ({ ...f, whatsappSameAsPhone: false }))}
                            disabled={formLocked}
                          />
                          Different WhatsApp number
                        </label>
                        {!form.whatsappSameAsPhone ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <label
                                htmlFor="lead-whatsapp-phone"
                                className="text-xs font-medium text-gray-600 dark:text-gray-300"
                              >
                                WhatsApp number
                              </label>
                              <FieldInfoTip text="Enter the number they use on WhatsApp, including country code if needed." />
                            </div>
                            <input
                              id="lead-whatsapp-phone"
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="e.g. +92 300 1234567"
                              className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                formErrors.whatsappPhone ? "border-red-500 ring-1 ring-red-500" : ""
                              }`}
                              value={form.whatsappPhone}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, whatsappPhone: e.target.value }))
                              }
                              disabled={formLocked}
                            />
                            {formErrors.whatsappPhone ? (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {formErrors.whatsappPhone}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-website"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Website
                      </label>
                      <FieldInfoTip text="Optional. Must start with http:// or https:// when provided." />
                    </div>
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
                    ) : null}
                  </div>

                  <fieldset className="space-y-3 border-0 p-0 m-0">
                    <legend className="mb-2 flex w-full items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                      <span>Social profiles</span>
                      <FieldInfoTip text="Select each network you want to store. When checked, enter a full URL starting with http:// or https://." />
                    </legend>
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
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-address"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Address
                      </label>
                      <FieldInfoTip text="Optional mailing or business address for this lead." />
                    </div>
                    <input
                      id="lead-address"
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      disabled={formLocked}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1">
                      <label
                        htmlFor="lead-extra-info"
                        className="text-xs font-medium text-gray-600 dark:text-gray-300"
                      >
                        Extra info
                      </label>
                      <FieldInfoTip text="Optional extra context stored only in lead extras (not the main notes field)." />
                    </div>
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
