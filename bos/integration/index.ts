import type { ErpExpenseReadPort } from "./ports/ErpExpenseReadPort";
import type { ErpLeadReadPort } from "./ports/ErpLeadReadPort";
import type { ErpInvoiceReadPort } from "./ports/ErpInvoiceReadPort";
import type { ErpReportReadPort } from "./ports/ErpReportReadPort";
import { firestoreErpExpenseReadAdapter } from "./adapters/FirestoreErpExpenseReadAdapter";
import { firestoreErpLeadReadAdapter } from "./adapters/FirestoreErpLeadReadAdapter";
import { firestoreErpInvoiceReadAdapter } from "./adapters/FirestoreErpInvoiceReadAdapter";
import { firestoreErpReportReadAdapter } from "./adapters/FirestoreErpReportReadAdapter";

export interface BosErpReadPorts {
  expenses: ErpExpenseReadPort;
  leads: ErpLeadReadPort;
  invoices: ErpInvoiceReadPort;
  reports: ErpReportReadPort;
}

/** Default read-only ERP adapters — injectable for tests. */
export const defaultBosErpReadPorts: BosErpReadPorts = {
  expenses: firestoreErpExpenseReadAdapter,
  leads: firestoreErpLeadReadAdapter,
  invoices: firestoreErpInvoiceReadAdapter,
  reports: firestoreErpReportReadAdapter,
};

export { BOS_ERP_BRIDGE_LAW, assertBridgeWriteTarget } from "./erpBridge";
export type { BosErpObservationEnvelope, BosErpSourceModule } from "./erpBridge";
export * from "./ports/ErpExpenseReadPort";
export * from "./ports/ErpLeadReadPort";
export * from "./ports/ErpInvoiceReadPort";
export * from "./ports/ErpReportReadPort";
