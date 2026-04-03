/**
 * Read-only analytics for Super Admin. No Firestore writes — safe for production tenant data.
 * (Platform catalog writes belong in SubscriptionPlansManager behind config/superAdmin.ts.)
 */
import { db } from './firebase';
import type firebase from 'firebase/compat/app';
import type { Invoice, UserProfile, BankAccount } from '../types';

export interface CompanyAnalytics {
  companyId: string;
  companyName: string;
  ownerEmail: string;
  ownerName: string;
  
  // 📊 Subscription Info
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  planName: string;
  trialDaysRemaining?: number;
  subscriptionStartDate?: Date;
  nextBillingDate?: Date;
  monthlyRevenue: number;
  
  // 👥 User Stats
  totalUsers: number;
  activeUsers: number;
  maxUsersAllowed: number;
  userUtilization: number; // percentage
  
  // 📄 Invoice Stats
  totalInvoices: number;
  thisMonthInvoices: number;
  maxInvoicesAllowed: number;
  invoiceUtilization: number; // percentage
  highestInvoiceAmount: number;
  averageInvoiceAmount: number;
  totalRevenueGenerated: number; // sum of all paid invoices
  
  // 💰 Business Scale Indicators
  businessScale: 'small' | 'medium' | 'large' | 'enterprise';
  scaleScore: number; // 1-100
  scaleFactors: {
    invoiceVolume: number;
    invoiceValue: number;
    userBase: number;
    activity: number;
  };
  
  // 📈 Usage Patterns
  lastActiveDate: Date;
  loginFrequency: number; // logins per week
  featureUsage: {
    pdfDownloads: number;
    customerManagement: number;
    productManagement: number;
    expenseTracking: number;
  };
  
  // 💾 Storage & Performance
  storageUsed: number; // in MB
  maxStorageAllowed: number;
  storageUtilization: number; // percentage
  
  // 🎯 Risk Indicators
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  churnProbability: number; // 0-100
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformMetrics {
  // 📊 Overall Statistics
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  paidCompanies: number;
  expiredCompanies: number;
  
  // 💰 Revenue Metrics
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  totalRevenue: number;
  averageRevenuePerUser: number;
  
  // 📈 Growth Metrics
  newSignupsThisMonth: number;
  churnRateThisMonth: number;
  conversionRate: number; // trial to paid
  
  // 🎯 Usage Metrics
  totalUsers: number;
  totalInvoicesCreated: number;
  totalRevenueProcessed: number;
  averageInvoicesPerCompany: number;
  
  // 📊 Scale Distribution
  scaleDistribution: {
    small: number;
    medium: number;
    large: number;
    enterprise: number;
  };
  
  // 🏆 Top Performers
  topCompaniesByRevenue: CompanyAnalytics[];
  topCompaniesByInvoices: CompanyAnalytics[];
  topCompaniesByUsers: CompanyAnalytics[];
}

export class AdminAnalyticsService {
  
  // 🏢 Get detailed analytics for a specific company
  static async getCompanyAnalytics(companyId: string): Promise<CompanyAnalytics> {
    try {
      const [
        companyDoc,
        usersSnapshot,
        invoicesSnapshot,
        subscriptionSnapshot,
        activitySnapshot
      ] = await Promise.all([
        db.collection('companies').doc(companyId).get(),
        db.collection('users').where('companyId', '==', companyId).get(),
        db.collection('invoices').where('companyId', '==', companyId).get(),
        db.collection('subscriptions').where('companyId', '==', companyId).limit(1).get(),
        db.collection('activity').where('companyId', '==', companyId).orderBy('timestamp', 'desc').limit(100).get()
      ]);

      if (!companyDoc.exists) {
        throw new Error('Company not found');
      }

      const company = companyDoc.data()!;
      const ownerDoc = await db.collection('users').doc(company.ownerId).get();
      const owner = ownerDoc.data();

      // Calculate invoice statistics
      const invoices = invoicesSnapshot.docs.map(doc => doc.data() as Invoice);
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthInvoices = invoices.filter(inv => 
        inv.createdAt.toDate() >= thisMonth
      );

      const invoiceAmounts = invoices.map(inv => inv.total);
      const highestInvoiceAmount = invoiceAmounts.length > 0 ? Math.max(...invoiceAmounts) : 0;
      const averageInvoiceAmount = invoiceAmounts.length > 0 
        ? invoiceAmounts.reduce((sum, amt) => sum + amt, 0) / invoiceAmounts.length 
        : 0;

      // Calculate business scale
      const scaleFactors = {
        invoiceVolume: Math.min(100, (invoices.length / 1000) * 100),
        invoiceValue: Math.min(100, (highestInvoiceAmount / 1000000) * 100),
        userBase: Math.min(100, (usersSnapshot.size / 50) * 100),
        activity: Math.min(100, (activitySnapshot.size / 100) * 100)
      };
      
      const scaleScore = Object.values(scaleFactors).reduce((sum, val) => sum + val, 0) / 4;
      const businessScale = scaleScore >= 75 ? 'enterprise' : 
                           scaleScore >= 50 ? 'large' : 
                           scaleScore >= 25 ? 'medium' : 'small';

      // Calculate risk factors
      const riskFactors: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      
      if (company.subscriptionStatus === 'trial') {
        const trialEnd = company.trialEndDate?.toDate();
        const daysRemaining = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        if (daysRemaining <= 2) {
          riskFactors.push('Trial ending soon');
          riskLevel = 'high';
        }
      }

      if (invoices.length === 0) {
        riskFactors.push('No invoices created');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      const lastActivity = activitySnapshot.docs[0]?.data()?.timestamp?.toDate();
      if (lastActivity && (Date.now() - lastActivity.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        riskFactors.push('Inactive for 7+ days');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      // Get subscription info
      let subscriptionStatus = company.subscriptionStatus || 'trial';
      let planName = 'Trial';
      let monthlyRevenue = 0;
      let nextBillingDate: Date | undefined;

      if (!subscriptionSnapshot.empty) {
        const subscription = subscriptionSnapshot.docs[0].data();
        subscriptionStatus = subscription.status;
        nextBillingDate = subscription.nextPaymentDate?.toDate();
        monthlyRevenue = subscription.amount || 0;

        if (subscription.planId) {
          const planDoc = await db.collection('subscriptionPlans').doc(subscription.planId).get();
          planName = planDoc.exists ? planDoc.data()!.name : 'Unknown Plan';
        }
      }

      return {
        companyId,
        companyName: company.name || owner?.companyName || 'Unknown Company',
        ownerEmail: owner?.email || 'Unknown',
        ownerName: owner?.displayName || owner?.email || 'Unknown',
        
        subscriptionStatus,
        planName,
        trialDaysRemaining: company.trialEndDate ? 
          Math.max(0, Math.ceil((company.trialEndDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 
          undefined,
        subscriptionStartDate: company.subscriptionStartDate?.toDate(),
        nextBillingDate,
        monthlyRevenue,
        
        totalUsers: usersSnapshot.size,
        activeUsers: usersSnapshot.docs.filter(doc => doc.data().isActive !== false).length,
        maxUsersAllowed: company.maxUsers || 3,
        userUtilization: Math.round((usersSnapshot.size / (company.maxUsers || 3)) * 100),
        
        totalInvoices: invoices.length,
        thisMonthInvoices: thisMonthInvoices.length,
        maxInvoicesAllowed: company.maxInvoices || 50,
        invoiceUtilization: Math.round((invoices.length / (company.maxInvoices || 50)) * 100),
        highestInvoiceAmount,
        averageInvoiceAmount,
        totalRevenueGenerated: paidInvoices.reduce((sum, inv) => sum + inv.total, 0),
        
        businessScale,
        scaleScore: Math.round(scaleScore),
        scaleFactors,
        
        lastActiveDate: lastActivity || company.createdAt?.toDate() || new Date(),
        loginFrequency: activitySnapshot.docs.filter(doc => 
          doc.data().type === 'login' && 
          (Date.now() - doc.data().timestamp.toDate().getTime()) < 7 * 24 * 60 * 60 * 1000
        ).length,
        featureUsage: {
          pdfDownloads: activitySnapshot.docs.filter(doc => doc.data().description?.includes('PDF')).length,
          customerManagement: activitySnapshot.docs.filter(doc => doc.data().type?.includes('customer')).length,
          productManagement: activitySnapshot.docs.filter(doc => doc.data().type?.includes('product')).length,
          expenseTracking: activitySnapshot.docs.filter(doc => doc.data().type?.includes('expense')).length,
        },
        
        storageUsed: company.storageUsed || 0,
        maxStorageAllowed: company.maxStorage || 1024,
        storageUtilization: Math.round(((company.storageUsed || 0) / (company.maxStorage || 1024)) * 100),
        
        riskLevel,
        riskFactors,
        churnProbability: riskFactors.length * 25, // Simple calculation
        
        createdAt: company.createdAt?.toDate() || new Date(),
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('Error getting company analytics:', error);
      throw error;
    }
  }

  // 📊 Get analytics for all companies
  static async getAllCompaniesAnalytics(): Promise<CompanyAnalytics[]> {
    try {
      const companiesSnapshot = await db.collection('companies').get();
      const companies: CompanyAnalytics[] = [];
      
      for (const doc of companiesSnapshot.docs) {
        try {
          const analytics = await this.getCompanyAnalytics(doc.id);
          companies.push(analytics);
        } catch (error) {
          console.error(`Error getting analytics for company ${doc.id}:`, error);
        }
      }
      
      return companies.sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated);
    } catch (error) {
      console.error('Error getting all companies analytics:', error);
      throw error;
    }
  }

  // 🏆 Get platform-wide metrics
  static async getPlatformMetrics(): Promise<PlatformMetrics> {
    try {
      const companies = await this.getAllCompaniesAnalytics();
      
      const activeCompanies = companies.filter(c => c.subscriptionStatus === 'active');
      const trialCompanies = companies.filter(c => c.subscriptionStatus === 'trial');
      const expiredCompanies = companies.filter(c => c.subscriptionStatus === 'expired' || c.subscriptionStatus === 'cancelled');
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newSignupsThisMonth = companies.filter(c => c.createdAt >= thisMonth).length;
      
      const monthlyRecurringRevenue = activeCompanies.reduce((sum, c) => sum + c.monthlyRevenue, 0);
      const totalRevenue = companies.reduce((sum, c) => sum + c.totalRevenueGenerated, 0);
      
      const scaleDistribution = {
        small: companies.filter(c => c.businessScale === 'small').length,
        medium: companies.filter(c => c.businessScale === 'medium').length,
        large: companies.filter(c => c.businessScale === 'large').length,
        enterprise: companies.filter(c => c.businessScale === 'enterprise').length,
      };

      return {
        totalCompanies: companies.length,
        activeCompanies: activeCompanies.length,
        trialCompanies: trialCompanies.length,
        paidCompanies: activeCompanies.length,
        expiredCompanies: expiredCompanies.length,
        
        monthlyRecurringRevenue,
        annualRecurringRevenue: monthlyRecurringRevenue * 12,
        totalRevenue,
        averageRevenuePerUser: companies.length > 0 ? totalRevenue / companies.length : 0,
        
        newSignupsThisMonth,
        churnRateThisMonth: 0, // Calculate based on your needs
        conversionRate: trialCompanies.length > 0 ? (activeCompanies.length / (activeCompanies.length + trialCompanies.length)) * 100 : 0,
        
        totalUsers: companies.reduce((sum, c) => sum + c.totalUsers, 0),
        totalInvoicesCreated: companies.reduce((sum, c) => sum + c.totalInvoices, 0),
        totalRevenueProcessed: totalRevenue,
        averageInvoicesPerCompany: companies.length > 0 ? companies.reduce((sum, c) => sum + c.totalInvoices, 0) / companies.length : 0,
        
        scaleDistribution,
        
        topCompaniesByRevenue: companies.slice(0, 10),
        topCompaniesByInvoices: [...companies].sort((a, b) => b.totalInvoices - a.totalInvoices).slice(0, 10),
        topCompaniesByUsers: [...companies].sort((a, b) => b.totalUsers - a.totalUsers).slice(0, 10),
      };
    } catch (error) {
      console.error('Error getting platform metrics:', error);
      throw error;
    }
  }

  // 🔍 Search companies by various criteria
  static async searchCompanies(query: string, filter?: {
    subscriptionStatus?: string;
    businessScale?: string;
    riskLevel?: string;
  }): Promise<CompanyAnalytics[]> {
    try {
      let companies = await this.getAllCompaniesAnalytics();
      
      // Apply text search
      if (query.trim()) {
        companies = companies.filter(company => 
          company.companyName.toLowerCase().includes(query.toLowerCase()) ||
          company.ownerEmail.toLowerCase().includes(query.toLowerCase()) ||
          company.ownerName.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      // Apply filters
      if (filter?.subscriptionStatus) {
        companies = companies.filter(c => c.subscriptionStatus === filter.subscriptionStatus);
      }
      
      if (filter?.businessScale) {
        companies = companies.filter(c => c.businessScale === filter.businessScale);
      }
      
      if (filter?.riskLevel) {
        companies = companies.filter(c => c.riskLevel === filter.riskLevel);
      }
      
      return companies;
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  }
}
