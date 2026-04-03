import { db } from './firebase';
import type firebase from 'firebase/compat/app';

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
      migratedAt: firebase.firestore.Timestamp.now(),
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
        migratedAt: firebase.firestore.Timestamp.now(),
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
        migratedAt: firebase.firestore.Timestamp.now()
      });
    });
    
    await batch.commit();
  }
  
  // 📤 Export company data
  static async exportCompanyData(companyId: string): Promise<any> {
    try {
      const companyData: any = {
        exportedAt: new Date().toISOString(),
        companyId,
        structure: 'v2',
        data: {}
      };
      
      // Get company profile
      const profileDoc = await db.doc(`companies/${companyId}/profile/main`).get();
      if (profileDoc.exists) {
        companyData.data.profile = profileDoc.data();
      }
      
      // Export all collections
      const collections = [
        'invoices', 'customers', 'products', 'bankAccounts', 
        'expenses', 'activity', 'companyUsers', 'customRoles'
      ];
      
      for (const collection of collections) {
        const snapshot = await db.collection(`companies/${companyId}/${collection}`).get();
        companyData.data[collection] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      return companyData;
      
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }
  
  // 📥 Import company data
  static async importCompanyData(companyId: string, data: any): Promise<void> {
    try {
      const batch = db.batch();
      
      // Import company profile
      if (data.data.profile) {
        const profileRef = db.doc(`companies/${companyId}/profile/main`);
        batch.set(profileRef, {
          ...data.data.profile,
          importedAt: firebase.firestore.Timestamp.now()
        });
      }
      
      // Import all collections
      const collections = [
        'invoices', 'customers', 'products', 'bankAccounts',
        'expenses', 'activity', 'companyUsers', 'customRoles'
      ];
      
      for (const collection of collections) {
        if (data.data[collection] && Array.isArray(data.data[collection])) {
          data.data[collection].forEach((item: any) => {
            const docRef = db.doc(`companies/${companyId}/${collection}/${item.id}`);
            const { id, ...itemData } = item;
            batch.set(docRef, {
              ...itemData,
              importedAt: firebase.firestore.Timestamp.now()
            });
          });
        }
      }
      
      await batch.commit();
      
    } catch (error) {
      console.error('Import failed:', error);
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
