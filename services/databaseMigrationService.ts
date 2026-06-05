import { db, FieldPath, Timestamp } from './firebase';
import type firebase from 'firebase/compat/app';
import { reviveFirestoreValues, serializeDocData } from '../utils/backupFirestore';
import { CampaignService } from './campaignService';
import { OutreachService } from './outreachService';

/** Canonical on-device backup: root collections + companyId / owner userId. */
export const FLAT_BACKUP_FORMAT_VERSION = 5;

const BACKUP_PAGE_SIZE = 400;
const FIRESTORE_BATCH_LIMIT = 450;

/** Major export milestones (company meta → … → finalize). Used for progress UI. */
export const BACKUP_EXPORT_TOTAL_STAGES = 28;

export interface BackupExportProgress {
  /** Stages fully finished (0 … totalStages). */
  completedStages: number;
  totalStages: number;
  /** What we are doing now (or just finished, same label). */
  stageLabel: string;
  detail?: string;
}

/**
 * New Database Structure:
 * 
 * firestore/
 * ├── users/                     ← Global user profiles
 * ├── platform/                  ← Platform-wide data
 * │   ├── subscriptionPlans/
 * │   ├── platformMetrics/
 * │   └── systemConfigs/
 * └── companies/
 *     └── {companyId}/
 *         ├── profile             ← Company profile document
 *         ├── subscription        ← Company subscription document  
 *         ├── invoices/           ← Company-specific invoices
 *         ├── customers/          ← Company-specific customers
 *         ├── products/           ← Company-specific products
 *         ├── bankAccounts/       ← Company-specific bank accounts
 *         ├── expenses/           ← Company-specific expenses
 *         ├── activity/           ← Company-specific activity logs
 *         ├── companyUsers/       ← Company team members
 *         ├── customRoles/        ← Company custom roles
 *         └── backups/            ← Company backup records
 */

export interface MigrationProgress {
  totalCompanies: number;
  processedCompanies: number;
  currentCompany: string;
  stage: string;
  errors: string[];
  completed: boolean;
}

export class DatabaseMigrationService {
  
  // 🚀 Main migration function
  static async migrateToCompanyStructure(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationProgress> {
    const progress: MigrationProgress = {
      totalCompanies: 0,
      processedCompanies: 0,
      currentCompany: '',
      stage: 'Starting migration',
      errors: [],
      completed: false
    };

    try {
      // Step 1: Get all companies
      progress.stage = 'Loading companies';
      onProgress?.(progress);
      
      const companiesSnapshot = await db.collection('companies').get();
      progress.totalCompanies = companiesSnapshot.size;
      
      // Step 2: Migrate each company
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const companyData = companyDoc.data();
        
        progress.currentCompany = companyData.name || companyId;
        progress.stage = `Migrating ${progress.currentCompany}`;
        onProgress?.(progress);
        
        try {
          await this.migrateCompanyData(companyId, companyData);
          progress.processedCompanies++;
        } catch (error) {
          console.error(`Error migrating company ${companyId}:`, error);
          progress.errors.push(`${companyData.name || companyId}: ${error}`);
        }
        
        onProgress?.(progress);
      }
      
      // Step 3: Migrate platform-wide data
      progress.stage = 'Migrating platform data';
      onProgress?.(progress);
      await this.migratePlatformData();
      
      progress.completed = true;
      progress.stage = 'Migration completed';
      onProgress?.(progress);
      
    } catch (error) {
      console.error('Migration failed:', error);
      progress.errors.push(`Migration failed: ${error}`);
      progress.stage = 'Migration failed';
      onProgress?.(progress);
    }
    
    return progress;
  }
  
  // 🏢 Migrate single company data
  private static async migrateCompanyData(companyId: string, companyData: any) {
    const batch = db.batch();
    
    // Create company profile document
    const companyRef = db.doc(`companies/${companyId}/profile/main`);
    batch.set(companyRef, {
      ...companyData,
      migratedAt: Timestamp.now(),
      structure: 'v2' // Mark as new structure
    });
    
    // Migrate invoices
    await this.migrateCollection('invoices', companyId, 'invoices');
    
    // Migrate customers
    await this.migrateCollection('customers', companyId, 'customers');
    
    // Migrate products
    await this.migrateCollection('products', companyId, 'products');
    
    // Migrate bank accounts
    await this.migrateCollection('bankAccounts', companyId, 'bankAccounts');
    
    // Migrate expenses
    await this.migrateCollection('expenses', companyId, 'expenses');
    
    // Migrate activity logs
    await this.migrateCollection('activity', companyId, 'activity');
    
    // Migrate company users
    await this.migrateCollection('companyUsers', companyId, 'companyUsers');
    
    // Migrate custom roles
    await this.migrateCollection('customRoles', companyId, 'customRoles');
    
    await batch.commit();
  }
  
  // 📋 Migrate specific collection for a company
  private static async migrateCollection(
    sourceCollection: string, 
    companyId: string, 
    targetCollection: string
  ) {
    const sourceQuery = db.collection(sourceCollection)
      .where('companyId', '==', companyId);
    
    const snapshot = await sourceQuery.get();
    
    if (snapshot.empty) return;
    
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      const newRef = db.doc(`companies/${companyId}/${targetCollection}/${doc.id}`);
      const data = doc.data();
      
      batch.set(newRef, {
        ...data,
        migratedAt: Timestamp.now(),
        originalId: doc.id
      });
    });
    
    await batch.commit();
  }
  
  // 🌐 Migrate platform-wide data
  private static async migratePlatformData() {
    // Move subscription plans to platform collection
    const plansSnapshot = await db.collection('subscriptionPlans').get();
    const batch = db.batch();
    
    plansSnapshot.docs.forEach(doc => {
      const platformRef = db.doc(`platform/subscriptionPlans/plans/${doc.id}`);
      batch.set(platformRef, {
        ...doc.data(),
        migratedAt: Timestamp.now()
      });
    });
    
    await batch.commit();
  }
  
  // 📤 Export company data (flat root collections — matches running app)
  static async exportCompanyData(
    companyId: string,
    onProgress?: (p: BackupExportProgress) => void,
  ): Promise<Record<string, unknown>> {
    const totalStages = BACKUP_EXPORT_TOTAL_STAGES;
    let completed = 0;

    const emit = (stageLabel: string, detail?: string) => {
      onProgress?.({
        completedStages: completed,
        totalStages,
        stageLabel,
        detail,
      });
    };

    const finishStage = (stageLabel: string, detail?: string) => {
      completed = Math.min(completed + 1, totalStages);
      onProgress?.({
        completedStages: completed,
        totalStages,
        stageLabel,
        detail,
      });
    };

    try {
      const data: Record<string, unknown> = {};

      emit("Company profile", "Reading…");
      const companySnap = await db.collection("companies").doc(companyId).get();
      data.companyMeta = companySnap.exists
        ? serializeDocData(companySnap.data() as Record<string, unknown>)
        : null;
      finishStage(
        "Company profile",
        companySnap.exists ? "Loaded" : "No company document",
      );

      const toRows = (rows: { id: string; data: Record<string, unknown> }[]) =>
        rows.map(({ id, data: row }) => ({
          id,
          ...serializeDocData(row),
        }));

      const countFmt = (n: number) =>
        `${n.toLocaleString()} document${n === 1 ? "" : "s"}`;

      const runQueryStage = async (
        stageLabel: string,
        collectionName: string,
        field: "companyId" | "userId",
        value: string,
      ) => {
        emit(stageLabel, "Reading…");
        const rows = await this.queryAllByField(collectionName, field, value, (n) => {
          emit(stageLabel, countFmt(n));
        });
        finishStage(stageLabel, countFmt(rows.length));
        return rows;
      };

      data.invoices = toRows(await runQueryStage("Invoices", "invoices", "companyId", companyId));
      data.customers = toRows(await runQueryStage("Customers", "customers", "companyId", companyId));
      data.products = toRows(await runQueryStage("Products", "products", "companyId", companyId));

      {
        emit("Bank accounts", "Reading company-linked…");
        const baCo = await this.queryAllByField("bankAccounts", "companyId", companyId, (n) =>
          emit("Bank accounts", `Company-linked: ${countFmt(n)}`),
        );
        emit("Bank accounts", "Reading legacy owner-linked…");
        const baLegacy = await this.queryAllByField("bankAccounts", "userId", companyId, (n) =>
          emit("Bank accounts", `Owner-linked: ${countFmt(n)}`),
        );
        const baMerged = new Map<string, { id: string; data: Record<string, unknown> }>();
        for (const row of [...baCo, ...baLegacy]) {
          baMerged.set(row.id, row);
        }
        data.bankAccounts = toRows(Array.from(baMerged.values()));
        finishStage("Bank accounts", `${countFmt(baMerged.size)} merged`);
      }

      {
        emit("Expenses", "Reading company-linked…");
        const expByCompany = await this.queryAllByField(
          "expenses",
          "companyId",
          companyId,
          (n) => emit("Expenses", `Company-linked: ${countFmt(n)}`),
        );
        emit("Expenses", "Reading by owner user…");
        const expByOwnerUserId = await this.queryAllByField(
          "expenses",
          "userId",
          companyId,
          (n) => emit("Expenses", `By owner user: ${countFmt(n)}`),
        );
        const expMerged = new Map<string, { id: string; data: Record<string, unknown> }>();
        for (const row of [...expByCompany, ...expByOwnerUserId]) {
          expMerged.set(row.id, row);
        }
        data.expenses = toRows(Array.from(expMerged.values()));
        finishStage("Expenses", `${countFmt(expMerged.size)} merged`);
      }

      data.activities = toRows(
        await runQueryStage("Activities", "activities", "companyId", companyId),
      );
      data.activity = toRows(
        await runQueryStage("Activity (legacy)", "activity", "companyId", companyId),
      );
      data.vendors = toRows(await runQueryStage("Vendors", "vendors", "companyId", companyId));
      data.expenseCategories = toRows(
        await runQueryStage("Expense categories", "expenseCategories", "companyId", companyId),
      );
      data.bankTransfers = toRows(
        await runQueryStage("Bank transfers", "bankTransfers", "companyId", companyId),
      );
      data.expenseReturns = toRows(
        await runQueryStage("Expense returns", "expenseReturns", "companyId", companyId),
      );
      data.loans = toRows(
        await runQueryStage("Loans", "loans", "companyId", companyId),
      );
      data.loanRepayments = toRows(
        await runQueryStage("Loan repayments", "loanRepayments", "companyId", companyId),
      );
      data.bankReconciliations = toRows(
        await runQueryStage(
          "Bank reconciliations",
          "bankReconciliations",
          "companyId",
          companyId,
        ),
      );
      data.assigneeAssignmentLog = toRows(
        await runQueryStage(
          "Assignment audit log",
          "assigneeAssignmentLog",
          "companyId",
          companyId,
        ),
      );
      data.companyUsers = toRows(
        await runQueryStage("Team (company users)", "companyUsers", "companyId", companyId),
      );
      data.customRoles = toRows(
        await runQueryStage("Custom roles", "customRoles", "companyId", companyId),
      );
      data.businesses = toRows(
        await runQueryStage("Businesses", "businesses", "companyId", companyId),
      );

      data.leads = await this.exportLeadsNested(companyId, (i, total) => {
        emit("Leads & nested logs", `${i.toLocaleString()} / ${total.toLocaleString()} leads`);
      });
      finishStage(
        "Leads & nested logs",
        Array.isArray(data.leads) ? `${countFmt(data.leads.length)} with call logs / events` : "—",
      );

      data.subscriptions = toRows(
        await runQueryStage("Subscriptions", "subscriptions", "companyId", companyId),
      );

      emit("Campaigns", "Reading…");
      const campaigns = await CampaignService.getAllForCompany(companyId);
      data.campaigns = campaigns.map((c) => ({ ...serializeDocData(c as unknown as Record<string, unknown>) }));
      finishStage("Campaigns", countFmt(campaigns.length));

      emit("Campaign tags", "Reading…");
      const campaignTags = await CampaignService.getAllTagsForCompany(companyId);
      data.campaignTags = campaignTags.map((t) => ({ ...serializeDocData(t as unknown as Record<string, unknown>) }));
      finishStage("Campaign tags", countFmt(campaignTags.length));

      emit("Outreach events", "Reading…");
      const outreachEvents = await OutreachService.getAllForCompany(companyId);
      data.outreachEvents = outreachEvents.map((e) => ({ ...serializeDocData(e as unknown as Record<string, unknown>) }));
      finishStage("Outreach events", countFmt(outreachEvents.length));

      emit("Users", "Reading…");
      data.users = toRows(await this.exportUsersForCompany(companyId, (n) => emit("Users", countFmt(n))));
      finishStage("Users", countFmt((data.users as unknown[]).length));

      emit("Company app settings", "Reading…");
      const companyAppSettingsSnap = await db
        .collection("companyAppSettings")
        .doc(companyId)
        .get();
      data.companyAppSettings = companyAppSettingsSnap.exists
        ? serializeDocData(
            companyAppSettingsSnap.data() as Record<string, unknown>,
          )
        : null;
      finishStage(
        "Company app settings",
        companyAppSettingsSnap.exists ? "Loaded" : "None",
      );

      emit("Expense category init", "Reading…");
      const expenseCategoryInitSnap = await db
        .collection("expenseCategoryInit")
        .doc(companyId)
        .get();
      data.expenseCategoryInit = expenseCategoryInitSnap.exists
        ? serializeDocData(
            expenseCategoryInitSnap.data() as Record<string, unknown>,
          )
        : null;
      finishStage(
        "Expense category init",
        expenseCategoryInitSnap.exists ? "Loaded" : "None",
      );

      emit("Building file", "Serializing JSON — almost done…");
      const payload = {
        formatVersion: FLAT_BACKUP_FORMAT_VERSION,
        structure: "flat",
        exportedAt: new Date().toISOString(),
        companyId,
        data,
      };
      finishStage("Building file", "Starting download…");

      return payload;
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  }

  /**
   * Paginated equality query; falls back to single .get() if composite index missing.
   */
  private static async exportLeadsNested(
    companyId: string,
    onLeadProgress?: (index: number, total: number) => void,
  ): Promise<unknown[]> {
    const rows = await this.queryAllByField("leads", "companyId", companyId);
    const out: unknown[] = [];
    const n = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (onLeadProgress && (i % 2 === 0 || i === n - 1)) {
        onLeadProgress(i + 1, n);
      }
      const logsSnap = await db
        .collection("leads")
        .doc(row.id)
        .collection("callLogs")
        .get();
      const evSnap = await db
        .collection("leads")
        .doc(row.id)
        .collection("assignmentEvents")
        .get();
      out.push({
        id: row.id,
        ...serializeDocData(row.data as Record<string, unknown>),
        callLogs: logsSnap.docs.map((d) => ({
          id: d.id,
          ...serializeDocData(d.data() as Record<string, unknown>),
        })),
        assignmentEvents: evSnap.docs.map((d) => ({
          id: d.id,
          ...serializeDocData(d.data() as Record<string, unknown>),
        })),
      });
    }
    return out;
  }

  private static async queryAllByField(
    collectionName: string,
    field: "companyId" | "userId",
    value: string,
    onAccumulatedCount?: (totalLoaded: number) => void,
  ): Promise<{ id: string; data: Record<string, unknown> }[]> {
    const coll = db.collection(collectionName);
    const acc: { id: string; data: Record<string, unknown> }[] = [];

    try {
      let last: firebase.firestore.QueryDocumentSnapshot | null = null;
      for (;;) {
        let q = coll
          .where(field, "==", value)
          .orderBy(FieldPath.documentId())
          .limit(BACKUP_PAGE_SIZE);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        snap.docs.forEach((d) =>
          acc.push({ id: d.id, data: d.data() as Record<string, unknown> }),
        );
        onAccumulatedCount?.(acc.length);
        if (snap.size < BACKUP_PAGE_SIZE) break;
        last = snap.docs[snap.docs.length - 1];
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "failed-precondition") {
        console.warn(
          `[backup] Paginated export unavailable for ${collectionName}; add composite index (${field} + __name__) or using single query.`,
        );
        const snap = await coll.where(field, "==", value).get();
        snap.docs.forEach((d) =>
          acc.push({ id: d.id, data: d.data() as Record<string, unknown> }),
        );
        onAccumulatedCount?.(acc.length);
      } else {
        throw e;
      }
    }

    return acc;
  }

  private static async exportUsersForCompany(
    companyId: string,
    onStaffCount?: (n: number) => void,
  ): Promise<{ id: string; data: Record<string, unknown> }[]> {
    const byMap = new Map<string, { id: string; data: Record<string, unknown> }>();

    const staff = await this.queryAllByField("users", "companyId", companyId, onStaffCount);
    staff.forEach((r) => byMap.set(r.id, r));

    const ownerDoc = await db.collection("users").doc(companyId).get();
    if (ownerDoc.exists) {
      byMap.set(ownerDoc.id, {
        id: ownerDoc.id,
        data: ownerDoc.data() as Record<string, unknown>,
      });
    }

    return [...byMap.values()];
  }

  private static normalizeImportData(raw: Record<string, unknown>): Record<string, unknown[]> {
    const d = { ...raw };
    if (!Array.isArray(d.activities) && Array.isArray(d.activity)) {
      d.activities = d.activity as unknown[];
      delete d.activity;
    }
    const out: Record<string, unknown[]> = {};
    for (const [k, v] of Object.entries(d)) {
      if (Array.isArray(v)) out[k] = v;
    }
    return out;
  }

  private static async commitBatches(
    ops: { ref: firebase.firestore.DocumentReference; data: Record<string, unknown> }[],
  ): Promise<void> {
    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = db.batch();
      const slice = ops.slice(i, i + FIRESTORE_BATCH_LIMIT);
      slice.forEach(({ ref, data }) => {
        batch.set(ref, data, { merge: true });
      });
      await batch.commit();
    }
  }

  // 📥 Import into flat root collections (matches running app)
  static async importCompanyData(
    companyId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      if (!payload.data || typeof payload.data !== "object") {
        throw new Error("Invalid backup: missing data object");
      }
      const backupCompanyId = payload.companyId as string | undefined;
      if (backupCompanyId && backupCompanyId !== companyId) {
        throw new Error(
          `Backup belongs to another company (${backupCompanyId}). Import only into the same organization.`,
        );
      }

      const rawData = payload.data as Record<string, unknown>;

      let companyMetaRaw: unknown = rawData.companyMeta ?? rawData.profile;
      if (companyMetaRaw && typeof companyMetaRaw === "object" && !Array.isArray(companyMetaRaw)) {
        const revived = reviveFirestoreValues(companyMetaRaw) as Record<string, unknown>;
        delete revived.importedAt;
        await db
          .collection("companies")
          .doc(companyId)
          .set(
            {
              ...revived,
              backupImportedAt: Timestamp.now(),
            },
            { merge: true },
          );
      }

      const companyAppSettingsRaw = rawData.companyAppSettings;
      if (
        companyAppSettingsRaw &&
        typeof companyAppSettingsRaw === "object" &&
        !Array.isArray(companyAppSettingsRaw)
      ) {
        const revived = reviveFirestoreValues(
          companyAppSettingsRaw as Record<string, unknown>,
        ) as Record<string, unknown>;
        delete revived.importedAt;
        await db
          .collection("companyAppSettings")
          .doc(companyId)
          .set(
            {
              ...revived,
              backupImportedAt: Timestamp.now(),
            },
            { merge: true },
          );
      }

      const expenseCategoryInitRaw = rawData.expenseCategoryInit;
      if (
        expenseCategoryInitRaw &&
        typeof expenseCategoryInitRaw === "object" &&
        !Array.isArray(expenseCategoryInitRaw)
      ) {
        const revived = reviveFirestoreValues(
          expenseCategoryInitRaw as Record<string, unknown>,
        ) as Record<string, unknown>;
        delete revived.importedAt;
        await db
          .collection("expenseCategoryInit")
          .doc(companyId)
          .set(
            {
              ...revived,
              backupImportedAt: Timestamp.now(),
            },
            { merge: true },
          );
      }

      const {
        companyMeta: _c,
        profile: _p,
        companyAppSettings: _cas,
        expenseCategoryInit: _eci,
        ...restForRows
      } = rawData;
      const rows = this.normalizeImportData(restForRows as Record<string, unknown>);

      const collectionOrder: [string, string][] = [
        ["customRoles", "customRoles"],
        ["users", "users"],
        ["companyUsers", "companyUsers"],
        ["bankAccounts", "bankAccounts"],
        ["bankTransfers", "bankTransfers"],
        ["bankReconciliations", "bankReconciliations"],
        ["products", "products"],
        ["customers", "customers"],
        ["businesses", "businesses"],
        ["vendors", "vendors"],
        ["expenseCategories", "expenseCategories"],
        ["invoices", "invoices"],
        ["expenses", "expenses"],
        ["expenseReturns", "expenseReturns"],
        ["loans", "loans"],
        ["loanRepayments", "loanRepayments"],
        ["activities", "activities"],
        ["activity", "activity"],
        ["subscriptions", "subscriptions"],
        ["campaigns", "campaigns"],
        ["campaignTags", "campaignTags"],
        ["outreachEvents", "outreachEvents"],
      ];

      for (const [jsonKey, collection] of collectionOrder) {
        const list = rows[jsonKey];
        if (!list?.length) continue;

        const ops: {
          ref: firebase.firestore.DocumentReference;
          data: Record<string, unknown>;
        }[] = [];

        for (const item of list) {
          if (!item || typeof item !== "object") continue;
          const rec = item as Record<string, unknown>;
          const id = rec.id as string | undefined;
          if (!id) continue;
          const { id: _id, ...rest } = rec;
          const revived = reviveFirestoreValues(rest) as Record<string, unknown>;
          delete revived.importedAt;
          revived.backupImportedAt = Timestamp.now();
          ops.push({
            ref: db.collection(collection).doc(id),
            data: revived,
          });
        }

        if (ops.length) await this.commitBatches(ops);
      }

      const leadList = rows.leads;
      if (Array.isArray(leadList) && leadList.length) {
        for (const raw of leadList) {
          if (!raw || typeof raw !== "object") continue;
          const item = raw as Record<string, unknown>;
          const lid = item.id as string | undefined;
          if (!lid) continue;
          const callLogs = item.callLogs;
          const assignmentEvents = item.assignmentEvents;
          const { id: _lid, callLogs: _cl, assignmentEvents: _ae, ...leadRest } = item;
          const revivedLead = reviveFirestoreValues(leadRest) as Record<string, unknown>;
          delete revivedLead.importedAt;
          revivedLead.backupImportedAt = Timestamp.now();
          await db.collection("leads").doc(lid).set(revivedLead, { merge: true });

          if (Array.isArray(callLogs)) {
            for (const log of callLogs) {
              if (!log || typeof log !== "object") continue;
              const logRec = log as Record<string, unknown>;
              const logId = logRec.id as string | undefined;
              if (!logId) continue;
              const { id: _logId, ...logBody } = logRec;
              const revivedLog = reviveFirestoreValues(logBody) as Record<string, unknown>;
              delete revivedLog.importedAt;
              revivedLog.backupImportedAt = Timestamp.now();
              await db
                .collection("leads")
                .doc(lid)
                .collection("callLogs")
                .doc(logId)
                .set(revivedLog, { merge: true });
            }
          }

          if (Array.isArray(assignmentEvents)) {
            for (const ev of assignmentEvents) {
              if (!ev || typeof ev !== "object") continue;
              const evRec = ev as Record<string, unknown>;
              const evId = evRec.id as string | undefined;
              if (!evId) continue;
              const { id: _evId, ...evBody } = evRec;
              const revivedEv = reviveFirestoreValues(evBody) as Record<string, unknown>;
              delete revivedEv.importedAt;
              revivedEv.backupImportedAt = Timestamp.now();
              await db
                .collection("leads")
                .doc(lid)
                .collection("assignmentEvents")
                .doc(evId)
                .set(revivedEv, { merge: true });
            }
          }
        }
      }

      const assigneeLogs = rows.assigneeAssignmentLog;
      if (Array.isArray(assigneeLogs) && assigneeLogs.length) {
        const ops: {
          ref: firebase.firestore.DocumentReference;
          data: Record<string, unknown>;
        }[] = [];
        for (const item of assigneeLogs) {
          if (!item || typeof item !== "object") continue;
          const rec = item as Record<string, unknown>;
          const id = rec.id as string | undefined;
          if (!id) continue;
          const { id: _id, ...rest } = rec;
          const revived = reviveFirestoreValues(rest) as Record<string, unknown>;
          delete revived.importedAt;
          revived.backupImportedAt = Timestamp.now();
          ops.push({
            ref: db.collection("assigneeAssignmentLog").doc(id),
            data: revived,
          });
        }
        if (ops.length) await this.commitBatches(ops);
      }
    } catch (error) {
      console.error("Import failed:", error);
      throw error;
    }
  }
  
  // 🗑️ Cleanup old structure (DANGEROUS - use with caution)
  static async cleanupOldStructure(companyId: string, confirm: boolean = false): Promise<void> {
    if (!confirm) {
      throw new Error('Cleanup requires explicit confirmation');
    }
    
    try {
      const collections = [
        'invoices', 'customers', 'products', 'bankAccounts',
        'expenses', 'activity', 'companyUsers', 'customRoles'
      ];
      
      for (const collection of collections) {
        const query = db.collection(collection).where('companyId', '==', companyId);
        const snapshot = await query.get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (!snapshot.empty) {
          await batch.commit();
        }
      }
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  }
  
  // ✅ Verify migration completeness
  static async verifyMigration(companyId: string): Promise<{
    success: boolean;
    collections: Record<string, { old: number; new: number; match: boolean }>;
    errors: string[];
  }> {
    const result = {
      success: true,
      collections: {} as Record<string, { old: number; new: number; match: boolean }>,
      errors: [] as string[]
    };
    
    const collections = [
      'invoices', 'customers', 'products', 'bankAccounts',
      'expenses', 'activity', 'companyUsers', 'customRoles'
    ];
    
    for (const collection of collections) {
      try {
        // Count old structure
        const oldSnapshot = await db.collection(collection)
          .where('companyId', '==', companyId)
          .get();
        
        // Count new structure
        const newSnapshot = await db.collection(`companies/${companyId}/${collection}`)
          .get();
        
        const oldCount = oldSnapshot.size;
        const newCount = newSnapshot.size;
        const match = oldCount === newCount;
        
        result.collections[collection] = { old: oldCount, new: newCount, match };
        
        if (!match) {
          result.success = false;
          result.errors.push(`${collection}: Old=${oldCount}, New=${newCount}`);
        }
        
      } catch (error) {
        result.success = false;
        result.errors.push(`${collection}: Verification failed - ${error}`);
      }
    }
    
    return result;
  }
}
