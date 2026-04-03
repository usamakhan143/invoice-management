import { db } from './firebase';
import type firebase from 'firebase/compat/app';

export interface SubscriptionLimits {
  maxUsers: number;
  maxInvoices: number;
  maxStorage: number;
  features: string[];
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrialActive: boolean;
  daysRemaining: number;
  planName: string;
  limits: SubscriptionLimits;
  usageCurrent: {
    users: number;
    invoices: number;
    storage: number;
  };
}

export class SubscriptionService {
  // 🎯 Check if company can perform action
  static async canPerformAction(
    companyId: string, 
    action: 'create_invoice' | 'add_user' | 'upload_file',
    actionData?: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return { allowed: false, reason: 'Company not found' };
      }
      
      const company = companyDoc.data()!;
      const status = await this.getSubscriptionStatus(companyId);
      
      if (!status.isActive && !status.isTrialActive) {
        return { allowed: false, reason: 'Subscription expired. Please upgrade your plan.' };
      }
      
      // Check specific limits
      switch (action) {
        case 'create_invoice':
          if (status.usageCurrent.invoices >= status.limits.maxInvoices) {
            return { 
              allowed: false, 
              reason: `Monthly invoice limit (${status.limits.maxInvoices}) reached. Upgrade your plan.` 
            };
          }
          break;
          
        case 'add_user':
          if (status.usageCurrent.users >= status.limits.maxUsers) {
            return { 
              allowed: false, 
              reason: `User limit (${status.limits.maxUsers}) reached. Upgrade your plan.` 
            };
          }
          break;
          
        case 'upload_file':
          const fileSize = actionData?.fileSize || 0;
          if (status.usageCurrent.storage + fileSize > status.limits.maxStorage) {
            return { 
              allowed: false, 
              reason: `Storage limit (${status.limits.maxStorage}MB) exceeded. Upgrade your plan.` 
            };
          }
          break;
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      return { allowed: false, reason: 'Unable to verify subscription status' };
    }
  }
  
  // 📊 Get current subscription status
  static async getSubscriptionStatus(companyId: string): Promise<SubscriptionStatus> {
    try {
      const [companyDoc, subscriptionDoc] = await Promise.all([
        db.collection('companies').doc(companyId).get(),
        db.collection('subscriptions').where('companyId', '==', companyId).limit(1).get()
      ]);
      
      if (!companyDoc.exists) {
        throw new Error('Company not found');
      }
      
      const company = companyDoc.data()!;
      const now = new Date();
      
      // Check trial status
      const trialEnd = company.trialEndDate?.toDate();
      const isTrialActive = trialEnd ? now < trialEnd : false;
      const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      
      // Check subscription status
      let isSubscriptionActive = false;
      let planName = 'Trial';
      
      if (!subscriptionDoc.empty) {
        const subscription = subscriptionDoc.docs[0].data();
        isSubscriptionActive = subscription.status === 'active';
        
        if (isSubscriptionActive) {
          const planDoc = await db.collection('subscriptionPlans').doc(subscription.planId).get();
          planName = planDoc.exists ? planDoc.data()!.name : 'Unknown Plan';
        }
      }
      
      // Get current usage
      const usageCurrent = await this.getCurrentUsage(companyId);
      
      // Get limits based on plan or trial
      const limits = isSubscriptionActive 
        ? await this.getPlanLimits(subscriptionDoc.docs[0].data().planId)
        : this.getTrialLimits();
      
      return {
        isActive: isSubscriptionActive,
        isTrialActive,
        daysRemaining,
        planName,
        limits,
        usageCurrent
      };
      
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }
  
  // 📈 Get current usage statistics
  static async getCurrentUsage(companyId: string) {
    try {
      const [usersSnapshot, invoicesSnapshot] = await Promise.all([
        db.collection('users').where('companyId', '==', companyId).get(),
        db.collection('invoices').where('companyId', '==', companyId).get()
      ]);
      
      return {
        users: usersSnapshot.size,
        invoices: invoicesSnapshot.size,
        storage: 0 // Implement storage calculation based on your needs
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return { users: 0, invoices: 0, storage: 0 };
    }
  }
  
  // 🎁 Get trial limits
  static getTrialLimits(): SubscriptionLimits {
    return {
      maxUsers: 3,
      maxInvoices: 50,
      maxStorage: 1024, // 1GB
      features: ['basic_invoicing', 'pdf_export', 'customer_management']
    };
  }
  
  // 💳 Get plan limits
  static async getPlanLimits(planId: string): Promise<SubscriptionLimits> {
    try {
      const planDoc = await db.collection('subscriptionPlans').doc(planId).get();
      
      if (!planDoc.exists) {
        return this.getTrialLimits();
      }
      
      const plan = planDoc.data()!;
      return {
        maxUsers: plan.maxUsers,
        maxInvoices: plan.maxInvoices,
        maxStorage: plan.maxStorage,
        features: plan.features || []
      };
    } catch (error) {
      console.error('Error getting plan limits:', error);
      return this.getTrialLimits();
    }
  }
  
  // 🎯 Start trial for new company
  static async startTrial(companyId: string, companyName: string, ownerId: string) {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial
      
      await db.collection('companies').doc(companyId).set({
        id: companyId,
        name: companyName,
        ownerId,
        
        subscriptionStatus: 'trial',
        trialStartDate: firebase.firestore.Timestamp.now(),
        trialEndDate: firebase.firestore.Timestamp.fromDate(trialEndDate),
        
        maxUsers: 3,
        maxInvoices: 50,
        maxStorage: 1024,
        currentUsers: 1,
        currentInvoices: 0,
        storageUsed: 0,
        
        createdAt: firebase.firestore.Timestamp.now(),
        isActive: true
      });
      
      console.log(`✅ Trial started for company: ${companyName}`);
    } catch (error) {
      console.error('Error starting trial:', error);
      throw error;
    }
  }
  
  // 📱 Update usage counters
  static async updateUsage(
    companyId: string, 
    type: 'users' | 'invoices' | 'storage',
    change: number
  ) {
    try {
      const companyRef = db.collection('companies').doc(companyId);
      
      await db.runTransaction(async (transaction) => {
        const companyDoc = await transaction.get(companyRef);
        
        if (!companyDoc.exists) {
          throw new Error('Company not found');
        }
        
        const currentValue = companyDoc.data()![`current${type.charAt(0).toUpperCase() + type.slice(1)}`] || 0;
        const newValue = Math.max(0, currentValue + change);
        
        transaction.update(companyRef, {
          [`current${type.charAt(0).toUpperCase() + type.slice(1)}`]: newValue
        });
      });
    } catch (error) {
      console.error('Error updating usage:', error);
      throw error;
    }
  }
}

// 🎯 Hook for React components
export const useSubscription = (companyId: string) => {
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (!companyId) return;
    
    const loadSubscriptionStatus = async () => {
      try {
        const status = await SubscriptionService.getSubscriptionStatus(companyId);
        setSubscriptionStatus(status);
      } catch (error) {
        console.error('Error loading subscription status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSubscriptionStatus();
    
    // Set up real-time listener for subscription changes
    const unsubscribe = db.collection('companies').doc(companyId)
      .onSnapshot(() => {
        loadSubscriptionStatus();
      });
    
    return unsubscribe;
  }, [companyId]);
  
  return { subscriptionStatus, loading };
};
