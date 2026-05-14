import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATEGORY_CUSTOM_VALUE, LEAD_CATEGORY_PRESETS } from "../../config/leadFormOptions";
import { useAuth } from "../../hooks/useAuth";
import { useCompanyUserOptions } from "../../hooks/useCompanyUserOptions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { SearchableLeadOptionSelect } from "../../components/SearchableLeadOptionSelect";
import { ActivityLogger } from "../../services/activityLogger";
import {
  applyDedupe,
  autoGuessMapping,
  buildErrorReportCsv,
  buildExistingDedupeIndex,
  commitLeadsBatched,
  LEAD_IMPORT_FIELDS,
  LEAD_IMPORT_FIELD_INFO,
  validateRow,
  type ImportRowResult,
  type LeadImportField,
} from "../../services/leadImportService";
import { detectCsvDelimiter, streamCsv } from "../../utils/csvStream";

/** Maximum rows we render in the preview table. Counters always reflect the full file. */
const PREVIEW_ROW_CAP = 200;

/** Hard cap on rows we’ll process in a single import. Keeps memory bounded; the user
 *  can split very huge files and import in waves. */
const MAX_ROWS_PER_IMPORT = 100_000;

type WizardStep =
  | "upload"
  | "parsing"
  | "mapping"
  | "validating"
  | "ready"
  | "importing"
  | "done";

type StatusCounters = {
  total: number;
  valid: number;
  duplicateInFile: number;
  duplicateInCrm: number;
  invalid: number;
};

const ZERO_COUNTERS: StatusCounters = {
  total: 0,
  valid: 0,
  duplicateInFile: 0,
  duplicateInCrm: 0,
  invalid: 0,
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const LeadImportPage: React.FC = () => {
  usePageTitle("Import leads");
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { canImportLeads } = usePermissions();
  const assignees = useCompanyUserOptions(user, userProfile);

  const [step, setStep] = useState<WizardStep>("upload");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<string>(",");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, LeadImportField | "">>({});
  const [defaultAssignee, setDefaultAssignee] = useState<string>("");
  const [importCategorySelect, setImportCategorySelect] = useState("");
  const [importCategoryCustom, setImportCategoryCustom] = useState("");

  // Parse + validation state
  const [parseProgress, setParseProgress] = useState<{
    bytes: number;
    total: number;
  }>({ bytes: 0, total: 0 });
  const [parseTruncated, setParseTruncated] = useState(false);

  const [rowResults, setRowResults] = useState<ImportRowResult[]>([]);
  const [counters, setCounters] = useState<StatusCounters>(ZERO_COUNTERS);

  // Dedupe / index state
  const [indexScanned, setIndexScanned] = useState(0);
  const [indexBuilding, setIndexBuilding] = useState(false);

  // Import progress
  const [importProgress, setImportProgress] = useState<{
    written: number;
    failed: number;
    total: number;
  }>({ written: 0, failed: 0, total: 0 });
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);
  const [importFinishedAt, setImportFinishedAt] = useState<number | null>(null);

  // Abort signals — single source of truth, mutated to cancel work.
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  // Permission guard
  useEffect(() => {
    if (!canImportLeads()) navigate("/leads");
  }, [canImportLeads, navigate]);

  // Cancel anything in-flight on unmount.
  useEffect(() => {
    return () => {
      abortRef.current.aborted = true;
    };
  }, []);

  // Derived: column mapping coverage
  const sourceMapped = useMemo(
    () => Object.values(mapping).some((v) => v === "source"),
    [mapping],
  );
  const categoryMapped = useMemo(
    () => Object.values(mapping).some((v) => v === "category"),
    [mapping],
  );

  const resolvedImportCategoryDefault = useMemo(() => {
    if (importCategorySelect === CATEGORY_CUSTOM_VALUE) return importCategoryCustom.trim();
    return importCategorySelect.trim();
  }, [importCategorySelect, importCategoryCustom]);

  /** Blocks “Continue” until a fallback category exists when the file has no category column. */
  const categoryContinueBlockedReason = useMemo(() => {
    if (!categoryMapped && !resolvedImportCategoryDefault) {
      return "Choose a default business category below. It is required when your CSV has no Category / industry column so every imported lead stays filterable.";
    }
    return null;
  }, [categoryMapped, resolvedImportCategoryDefault]);

  const resetForNewFile = useCallback(() => {
    abortRef.current.aborted = true;
    abortRef.current = { aborted: false };
    setRowResults([]);
    setCounters(ZERO_COUNTERS);
    setParseProgress({ bytes: 0, total: 0 });
    setParseTruncated(false);
    setImportProgress({ written: 0, failed: 0, total: 0 });
    setImportStartedAt(null);
    setImportFinishedAt(null);
    setIndexScanned(0);
    setError(null);
    setImportCategorySelect("");
    setImportCategoryCustom("");
  }, []);

  /**
   * Step 1 → 2: read header + small sample so the user can map columns.
   * We only scan ~256 KB to keep this snappy on multi-GB files.
   */
  const beginUpload = useCallback(
    async (f: File) => {
      resetForNewFile();
      setFile(f);
      setStep("parsing");
      try {
        const detected = await detectCsvDelimiter(f);
        setDelimiter(detected);
        const sample: string[][] = [];
        const result = await streamCsv(
          f,
          { delimiter: detected, batchRows: 50, maxRows: 50 },
          (rows) => {
            for (const r of rows) {
              if (sample.length < 50) sample.push(r);
            }
          },
        );
        if (result.header.length === 0) {
          setError(
            "CSV looks empty — no header row found. Make sure the first row is your column names.",
          );
          setStep("upload");
          setFile(null);
          return;
        }
        setHeaders(result.header);
        setSampleRows(sample);
        setMapping(autoGuessMapping(result.header));
        setStep("mapping");
      } catch (e) {
        console.error("[LeadImport] beginUpload failed:", e);
        setError(
          "Could not read this file. Make sure it’s a valid CSV (UTF-8 recommended).",
        );
        setStep("upload");
        setFile(null);
      }
    },
    [resetForNewFile],
  );

  /**
   * Step 2 → 3: stream the whole file, validate every row, build the
   * CRM dedupe index in parallel, then run dedupe. We chunk everything
   * to keep the UI responsive on huge files.
   */
  const runValidation = useCallback(async () => {
    if (!file || !user || !userProfile) return;
    setStep("validating");
    setError(null);
    setRowResults([]);
    setCounters(ZERO_COUNTERS);
    setIndexBuilding(true);

    abortRef.current = { aborted: false };
    const signal = abortRef.current;

    try {
      // Kick off the existing-CRM index in parallel with the parse.
      const indexPromise = buildExistingDedupeIndex(
        user,
        userProfile,
        signal,
        (scanned) => setIndexScanned(scanned),
      );

      // Stream parse + validate. Each batch updates running counters so the
      // user sees live progress instead of a frozen UI.
      const collected: ImportRowResult[] = [];
      let logicalRowNumber = 1; // header was row 1
      let running = { ...ZERO_COUNTERS };
      const flushUiEvery = 5; // batches between React state updates
      let batchesSinceFlush = 0;

      await streamCsv(
        file,
        {
          delimiter,
          batchRows: 1000,
          maxRows: MAX_ROWS_PER_IMPORT,
          signal,
        },
        (rows) => {
          for (const r of rows) {
            logicalRowNumber += 1;
            const validated = validateRow(r, logicalRowNumber, mapping, {
              defaultSource: "Import",
              defaultCategory: resolvedImportCategoryDefault || undefined,
            });
            collected.push(validated);
            running.total += 1;
            if (validated.status === "valid") running.valid += 1;
            else if (validated.status === "invalid") running.invalid += 1;
          }
          batchesSinceFlush += 1;
          if (batchesSinceFlush >= flushUiEvery) {
            batchesSinceFlush = 0;
            setCounters({ ...running });
          }
        },
        (bytesRead, total) => {
          setParseProgress({ bytes: bytesRead, total });
        },
      ).then((res) => {
        setParseTruncated(res.truncated);
      });
      setCounters({ ...running });

      if (signal.aborted) return;

      // Now combine with the existing CRM index for full dedupe.
      const existing = await indexPromise;
      setIndexBuilding(false);
      if (signal.aborted) return;

      const dedupe = applyDedupe(collected, existing);
      const final: StatusCounters = {
        total: collected.length,
        valid: dedupe.validCount,
        duplicateInFile: dedupe.duplicateInFile,
        duplicateInCrm: dedupe.duplicateInCrm,
        invalid: dedupe.invalid,
      };
      setCounters(final);
      setRowResults(collected);
      setStep("ready");
    } catch (e) {
      console.error("[LeadImport] validation failed:", e);
      setError(
        "Could not parse the file. Try a smaller subset to confirm the format.",
      );
      setStep("mapping");
    } finally {
      setIndexBuilding(false);
    }
  }, [file, user, userProfile, delimiter, mapping, resolvedImportCategoryDefault]);

  /**
   * Step 3 → 4: write valid rows to Firestore in batched transactions.
   */
  const runImport = useCallback(async () => {
    if (!user || !userProfile) return;
    setStep("importing");
    setImportStartedAt(Date.now());
    setImportFinishedAt(null);
    setImportProgress({
      written: 0,
      failed: 0,
      total: counters.valid,
    });
    abortRef.current = { aborted: false };
    const signal = abortRef.current;

    try {
      const result = await commitLeadsBatched(
        rowResults,
        user,
        userProfile,
        {
          batchSize: 100,
          interBatchDelayMs: 30,
          defaultAssignedUserId: defaultAssignee.trim(),
          signal,
        },
        (p) => setImportProgress({ ...p }),
      );

      if (result.written > 0) {
        try {
          await ActivityLogger.logActivity(
            user,
            userProfile,
            "lead_imported",
            `Imported ${result.written} lead${result.written === 1 ? "" : "s"} from CSV`,
            { entityType: "lead" },
          );
        } catch (e) {
          // Activity log failure must never block the user — just warn.
          console.warn("[LeadImport] activity log failed:", e);
        }
      }

      setImportFinishedAt(Date.now());
      setStep("done");
    } catch (e) {
      console.error("[LeadImport] commit failed:", e);
      setError(
        "Import failed before finishing. Some rows may have been saved — check the leads list.",
      );
      setImportFinishedAt(Date.now());
      setStep("done");
    }
  }, [counters.valid, rowResults, defaultAssignee, user, userProfile]);

  /** Stop everything and return to mapping. Memory-safe — we drop result arrays. */
  const cancelEverything = useCallback(() => {
    abortRef.current.aborted = true;
    setIndexBuilding(false);
    if (step === "validating" || step === "parsing") {
      setStep("mapping");
    } else if (step === "importing") {
      setStep("ready");
    }
  }, [step]);

  /** Download a CSV of every row that wasn't imported, with reasons. */
  const downloadErrorReport = useCallback(() => {
    const csv = buildErrorReportCsv(rowResults);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-import-skipped-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rowResults]);

  // -------------------------------------------------------------- render

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6">
      <header className="mb-6 flex flex-col gap-2 border-b border-gray-200/90 pb-5 dark:border-gray-700/80 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mobile-text-2xl text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Import leads
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Bulk upload a CSV from Apollo, a scraper, or your own list. We map
            your columns to the CRM, drop duplicates, and write only the rows
            that pass every check.
          </p>
        </div>
        <Link
          to="/leads"
          className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          ← Back to leads
        </Link>
      </header>

      <Stepper step={step} />

      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {step === "upload" || step === "parsing" ? (
        <UploadStep
          parsing={step === "parsing"}
          onFile={beginUpload}
        />
      ) : null}

      {step === "mapping" ? (
        <MappingStep
          file={file}
          headers={headers}
          sampleRows={sampleRows}
          mapping={mapping}
          setMapping={setMapping}
          sourceMapped={sourceMapped}
          categoryMapped={categoryMapped}
          importCategorySelect={importCategorySelect}
          setImportCategorySelect={setImportCategorySelect}
          importCategoryCustom={importCategoryCustom}
          setImportCategoryCustom={setImportCategoryCustom}
          categoryContinueBlockedReason={categoryContinueBlockedReason}
          assignees={assignees}
          defaultAssignee={defaultAssignee}
          setDefaultAssignee={setDefaultAssignee}
          onRemap={() => {
            setMapping(autoGuessMapping(headers));
          }}
          onBack={() => {
            setStep("upload");
            setFile(null);
          }}
          onContinue={() => void runValidation()}
        />
      ) : null}

      {step === "validating" ? (
        <ValidatingStep
          parseProgress={parseProgress}
          counters={counters}
          indexScanned={indexScanned}
          indexBuilding={indexBuilding}
          truncated={parseTruncated}
          onCancel={cancelEverything}
        />
      ) : null}

      {step === "ready" ? (
        <PreviewStep
          counters={counters}
          rowResults={rowResults}
          truncated={parseTruncated}
          onBack={() => setStep("mapping")}
          onConfirm={() => void runImport()}
          onDownloadReport={downloadErrorReport}
        />
      ) : null}

      {step === "importing" ? (
        <ImportingStep
          progress={importProgress}
          startedAt={importStartedAt}
          onCancel={cancelEverything}
        />
      ) : null}

      {step === "done" ? (
        <DoneStep
          progress={importProgress}
          counters={counters}
          startedAt={importStartedAt}
          finishedAt={importFinishedAt}
          onDownloadReport={downloadErrorReport}
          onStartOver={() => {
            resetForNewFile();
            setFile(null);
            setHeaders([]);
            setSampleRows([]);
            setMapping({});
            setStep("upload");
          }}
        />
      ) : null}
    </div>
  );
};

export default LeadImportPage;

// ---------------------------------------------------------------------------
//                                  Stepper
// ---------------------------------------------------------------------------

function Stepper({ step }: { step: WizardStep }) {
  const items: { id: WizardStep[]; label: string }[] = [
    { id: ["upload", "parsing"], label: "Upload" },
    { id: ["mapping"], label: "Map columns" },
    { id: ["validating", "ready"], label: "Preview & validate" },
    { id: ["importing", "done"], label: "Import" },
  ];
  const activeIdx = items.findIndex((x) => x.id.includes(step));
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {items.map((it, idx) => {
        const isActive = idx === activeIdx;
        const isDone = idx < activeIdx;
        return (
          <React.Fragment key={it.label}>
            <li
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                isActive
                  ? "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100"
                  : isDone
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-xs font-semibold text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                {isDone ? "✓" : idx + 1}
              </span>
              <span className="font-medium">{it.label}</span>
            </li>
            {idx < items.length - 1 ? (
              <span className="text-gray-300 dark:text-gray-600">›</span>
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
//                               Upload step
// ---------------------------------------------------------------------------

function UploadStep({
  parsing,
  onFile,
}: {
  parsing: boolean;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };
  return (
    <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm dark:border-gray-700/90 dark:bg-gray-900/60 sm:p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-primary-400 bg-primary-50/70 dark:border-primary-500 dark:bg-primary-950/30"
            : "border-gray-300 bg-gray-50/60 dark:border-gray-600 dark:bg-gray-800/40"
        }`}
      >
        <svg
          className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Drop a CSV file here, or click to browse
        </h2>
        <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
          We support files from Apollo, scrapers, spreadsheets — anything with
          a header row. Up to {formatNumber(MAX_ROWS_PER_IMPORT)} rows per
          import.
        </p>
        <button
          type="button"
          disabled={parsing}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
        >
          {parsing ? "Reading…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            // Allow re-selecting the same file later.
            e.target.value = "";
          }}
        />
      </div>

      <ul className="mt-6 grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-3">
        <li className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/60">
          <strong className="block text-gray-800 dark:text-white">
            Streaming parse
          </strong>
          Big files are read in chunks — your browser tab stays responsive.
        </li>
        <li className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/60">
          <strong className="block text-gray-800 dark:text-white">
            Duplicate-safe
          </strong>
          Skips rows already in your CRM and repeats inside the file itself.
        </li>
        <li className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/60">
          <strong className="block text-gray-800 dark:text-white">
            Map &amp; preview
          </strong>
          You choose which CSV column maps to which CRM field before saving.
        </li>
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
//                              Mapping step
// ---------------------------------------------------------------------------

function MappingStep({
  file,
  headers,
  sampleRows,
  mapping,
  setMapping,
  sourceMapped,
  categoryMapped,
  importCategorySelect,
  setImportCategorySelect,
  importCategoryCustom,
  setImportCategoryCustom,
  categoryContinueBlockedReason,
  assignees,
  defaultAssignee,
  setDefaultAssignee,
  onRemap,
  onBack,
  onContinue,
}: {
  file: File | null;
  headers: string[];
  sampleRows: string[][];
  mapping: Record<number, LeadImportField | "">;
  setMapping: React.Dispatch<
    React.SetStateAction<Record<number, LeadImportField | "">>
  >;
  sourceMapped: boolean;
  categoryMapped: boolean;
  importCategorySelect: string;
  setImportCategorySelect: React.Dispatch<React.SetStateAction<string>>;
  importCategoryCustom: string;
  setImportCategoryCustom: React.Dispatch<React.SetStateAction<string>>;
  categoryContinueBlockedReason: string | null;
  assignees: { uid: string; label: string }[];
  defaultAssignee: string;
  setDefaultAssignee: React.Dispatch<React.SetStateAction<string>>;
  onRemap: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  // Build a set of fields already used so the dropdown can disable them
  // elsewhere (a CRM field shouldn't be filled from two CSV columns).
  const usedFields = useMemo(() => {
    const s = new Set<LeadImportField>();
    Object.values(mapping).forEach((v) => {
      if (v) s.add(v);
    });
    return s;
  }, [mapping]);

  return (
    <section className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-700/90 dark:bg-gray-900/60 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Map columns
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {file ? (
              <>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {file.name}
                </span>{" "}
                · {formatBytes(file.size)} · {headers.length} columns
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRemap}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Auto-guess again
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            ← Choose a different file
          </button>
        </div>
      </div>

      {/* Mapping rows */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/90 dark:border-gray-700/90">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2.5">CSV column</th>
              <th className="px-4 py-2.5">Sample values</th>
              <th className="px-4 py-2.5">CRM field</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
            {headers.map((h, idx) => {
              const current = mapping[idx] ?? "";
              const samples = sampleRows
                .slice(0, 3)
                .map((r) => r[idx])
                .filter((v) => v && String(v).trim() !== "");
              return (
                <tr
                  key={`${h}-${idx}`}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                    {h || <em className="text-gray-400">(blank)</em>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                    {samples.length === 0
                      ? "—"
                      : samples.map((s, i) => (
                          <span
                            key={i}
                            className="mr-1 inline-block max-w-[16rem] truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700/70 dark:text-gray-200"
                            title={String(s)}
                          >
                            {String(s)}
                          </span>
                        ))}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={current}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [idx]: e.target.value as LeadImportField | "",
                        }))
                      }
                      className="w-full max-w-[18rem] rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">— Ignore this column —</option>
                      {LEAD_IMPORT_FIELDS.map((f) => {
                        const info = LEAD_IMPORT_FIELD_INFO[f];
                        const disabled = usedFields.has(f) && current !== f;
                        return (
                          <option
                            key={f}
                            value={f}
                            disabled={disabled}
                          >
                            {info.label}
                            {info.required ? " *" : ""}
                            {disabled ? " (already used)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Defaults panel */}
      <div className="mt-5 grid gap-4 rounded-xl border border-gray-200/90 bg-gray-50/60 p-4 dark:border-gray-700/90 dark:bg-gray-800/40 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Assign new leads to
          </label>
          <select
            value={defaultAssignee}
            onChange={(e) => setDefaultAssignee(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">— Unassigned —</option>
            {assignees.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Applied to every imported lead. You can reassign later from the
            leads list.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Source default
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            If your CSV has no <code>source</code> column, rows are saved with{" "}
            <span className="font-semibold">“Import”</span> as the source. Map a
            column to <em>Lead source</em> to use a value from the file instead.
          </p>
          {!sourceMapped ? (
            <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              No source column mapped — default will be used.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200/90 bg-white p-4 dark:border-gray-700/90 dark:bg-gray-900/50">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <label className="text-sm font-medium text-gray-800 dark:text-gray-100" htmlFor="import-default-category">
            Default business category
            {!categoryMapped ? (
              <span className="ml-1 text-red-600 dark:text-red-400" title="Required">
                *
              </span>
            ) : null}
          </label>
          {!categoryMapped ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              No category column mapped — this default applies to every row
            </span>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Optional — used only when a row&apos;s category cell is empty
            </span>
          )}
        </div>
        <SearchableLeadOptionSelect
          id="import-default-category"
          ariaLabel="Default business category for import"
          options={LEAD_CATEGORY_PRESETS}
          selectValue={importCategorySelect}
          customValue={importCategoryCustom}
          onSelectChange={(v) => {
            setImportCategorySelect(v);
            if (v !== CATEGORY_CUSTOM_VALUE) setImportCategoryCustom("");
          }}
          onCustomChange={(v) => setImportCategoryCustom(v)}
          customSentinel={CATEGORY_CUSTOM_VALUE}
          placeholder="Select default category…"
          otherLabel="Other (type your own)"
          customPlaceholder="Custom category"
          error={!!categoryContinueBlockedReason}
        />
        {categoryContinueBlockedReason ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{categoryContinueBlockedReason}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Leads are filtered by category in the CRM. If your file has no industry column, pick the type that best
            describes this list so imports stay searchable.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={!!categoryContinueBlockedReason}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          Validate &amp; preview
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//                            Validating step
// ---------------------------------------------------------------------------

function ValidatingStep({
  parseProgress,
  counters,
  indexScanned,
  indexBuilding,
  truncated,
  onCancel,
}: {
  parseProgress: { bytes: number; total: number };
  counters: StatusCounters;
  indexScanned: number;
  indexBuilding: boolean;
  truncated: boolean;
  onCancel: () => void;
}) {
  const pct =
    parseProgress.total > 0
      ? Math.min(100, (parseProgress.bytes / parseProgress.total) * 100)
      : 0;
  return (
    <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm dark:border-gray-700/90 dark:bg-gray-900/60">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
        Reading &amp; validating
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        We’re parsing the file in chunks and checking for duplicates already in
        your CRM. This stays responsive even on huge files.
      </p>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>File read</span>
          <span>
            {formatBytes(parseProgress.bytes)} / {formatBytes(parseProgress.total)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <CounterCard label="Rows seen" value={counters.total} tone="neutral" />
        <CounterCard label="Looks valid (pre-dedupe)" value={counters.valid} tone="success" />
        <CounterCard label="Invalid so far" value={counters.invalid} tone="danger" />
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {indexBuilding
          ? `Scanning existing leads to detect duplicates… (${formatNumber(indexScanned)} so far)`
          : `Existing-CRM scan complete (${formatNumber(indexScanned)} leads).`}
      </p>

      {truncated ? (
        <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          Row cap reached ({formatNumber(MAX_ROWS_PER_IMPORT)}). Anything past
          this point in the file was skipped — split the file to import the
          rest.
        </p>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//                              Preview step
// ---------------------------------------------------------------------------

function PreviewStep({
  counters,
  rowResults,
  truncated,
  onBack,
  onConfirm,
  onDownloadReport,
}: {
  counters: StatusCounters;
  rowResults: ImportRowResult[];
  truncated: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onDownloadReport: () => void;
}) {
  const [filter, setFilter] = useState<
    "all" | "valid" | "invalid" | "duplicate_in_file" | "duplicate_in_crm"
  >("all");

  const filtered = useMemo(() => {
    if (filter === "all") return rowResults;
    return rowResults.filter((r) => r.status === filter);
  }, [filter, rowResults]);

  const visible = filtered.slice(0, PREVIEW_ROW_CAP);
  const hidden = filtered.length - visible.length;

  return (
    <section className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-700/90 dark:bg-gray-900/60 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Preview &amp; confirm
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Only{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {formatNumber(counters.valid)}
            </span>{" "}
            row{counters.valid === 1 ? "" : "s"} will be imported. Everything
            else is blocked before it touches Firestore.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            ← Back to mapping
          </button>
          <button
            type="button"
            disabled={counters.invalid + counters.duplicateInCrm + counters.duplicateInFile === 0}
            onClick={onDownloadReport}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Download skipped report
          </button>
          <button
            type="button"
            disabled={counters.valid === 0}
            onClick={onConfirm}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            Import {formatNumber(counters.valid)} lead
            {counters.valid === 1 ? "" : "s"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <CounterCard label="Total rows" value={counters.total} tone="neutral" />
        <CounterCard label="Will import" value={counters.valid} tone="success" />
        <CounterCard
          label="Dup in file"
          value={counters.duplicateInFile}
          tone="warning"
        />
        <CounterCard
          label="Already in CRM"
          value={counters.duplicateInCrm}
          tone="warning"
        />
        <CounterCard label="Invalid" value={counters.invalid} tone="danger" />
      </div>

      {truncated ? (
        <p className="mt-3 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          Row cap reached. Trailing rows in the file were skipped.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3 text-sm dark:border-gray-700">
        <span className="font-medium text-gray-700 dark:text-gray-200">
          Filter:
        </span>
        {(
          [
            ["all", "All"],
            ["valid", "Valid"],
            ["invalid", "Invalid"],
            ["duplicate_in_file", "Dup in file"],
            ["duplicate_in_crm", "Already in CRM"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === key
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200/90 dark:border-gray-700/90">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 w-12">Row</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Name / Company</th>
              <th className="px-3 py-2">Phone / Email</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
            {visible.map((r) => (
              <tr key={r.rowNumber} className="align-top">
                <td className="px-3 py-2 tabular-nums text-gray-500 dark:text-gray-400">
                  {r.rowNumber}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
                  <div className="font-medium">{r.mapped.name || "—"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {r.mapped.company || "—"}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                  <div className="text-xs">{r.mapped.phone || "—"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {r.mapped.email || "—"}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {r.status === "valid" ? (
                    <span>
                      {r.mapped.source ? `Source: ${r.mapped.source}` : "Source: Import"}
                      {r.mapped.status ? ` · ${r.mapped.status}` : ""}
                    </span>
                  ) : r.status === "invalid" ? (
                    <span className="text-red-700 dark:text-red-300">
                      {r.errors.join("; ")}
                    </span>
                  ) : r.status === "duplicate_in_file" ? (
                    <span className="text-amber-700 dark:text-amber-300">
                      Already appears earlier in this file ({r.duplicateOf?.key})
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300">
                      Already exists in CRM ({r.duplicateOf?.key})
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No rows for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {hidden > 0 ? (
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400">
            Showing first {formatNumber(visible.length)} rows.{" "}
            {formatNumber(hidden)} more not shown. Use the “Download skipped
            report” for the full list.
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//                             Importing step
// ---------------------------------------------------------------------------

function ImportingStep({
  progress,
  startedAt,
  onCancel,
}: {
  progress: { written: number; failed: number; total: number };
  startedAt: number | null;
  onCancel: () => void;
}) {
  const pct =
    progress.total > 0
      ? Math.min(100, (progress.written / progress.total) * 100)
      : 0;
  const elapsedSec = startedAt
    ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    : 0;
  const rps = elapsedSec > 0 ? Math.round(progress.written / elapsedSec) : 0;

  return (
    <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm dark:border-gray-700/90 dark:bg-gray-900/60">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
        Importing leads
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Writing in batches with throttling so the rest of the CRM stays
        responsive. Closing this tab cancels the import.
      </p>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatNumber(progress.written)} of {formatNumber(progress.total)}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CounterCard label="Written" value={progress.written} tone="success" />
        <CounterCard label="Failed" value={progress.failed} tone="danger" />
        <CounterCard label={`Rate (rows/s, ${elapsedSec}s)`} value={rps} tone="neutral" />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Stop now
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//                                Done step
// ---------------------------------------------------------------------------

function DoneStep({
  progress,
  counters,
  startedAt,
  finishedAt,
  onDownloadReport,
  onStartOver,
}: {
  progress: { written: number; failed: number; total: number };
  counters: StatusCounters;
  startedAt: number | null;
  finishedAt: number | null;
  onDownloadReport: () => void;
  onStartOver: () => void;
}) {
  const durationSec =
    startedAt && finishedAt
      ? Math.max(1, Math.round((finishedAt - startedAt) / 1000))
      : 0;
  return (
    <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/30">
      <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
        Import complete
      </h2>
      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
        {formatNumber(progress.written)} new lead
        {progress.written === 1 ? "" : "s"} written
        {durationSec ? ` in ${durationSec}s` : ""}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <CounterCard label="Written" value={progress.written} tone="success" />
        <CounterCard label="Failed (write)" value={progress.failed} tone="danger" />
        <CounterCard
          label="Dup in file (skipped)"
          value={counters.duplicateInFile}
          tone="warning"
        />
        <CounterCard
          label="Dup in CRM (skipped)"
          value={counters.duplicateInCrm}
          tone="warning"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/leads"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Open leads list
        </Link>
        <button
          type="button"
          onClick={onDownloadReport}
          disabled={counters.invalid + counters.duplicateInCrm + counters.duplicateInFile === 0}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Download skipped report
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Import another file
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//                              Small bits
// ---------------------------------------------------------------------------

function CounterCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-100"
      : tone === "warning"
        ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-100"
        : tone === "danger"
          ? "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-100"
          : "bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800/60 dark:border-gray-700 dark:text-gray-100";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{formatNumber(value)}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportRowResult["status"] }) {
  const map: Record<ImportRowResult["status"], { label: string; cls: string }> = {
    valid: {
      label: "Valid",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
    invalid: {
      label: "Invalid",
      cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    },
    duplicate_in_file: {
      label: "Dup in file",
      cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    },
    duplicate_in_crm: {
      label: "In CRM",
      cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    },
  };
  const info = map[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${info.cls}`}
    >
      {info.label}
    </span>
  );
}
