import React, { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { db } from "../services/firebase";
import InvoicePDF from "./InvoicePDF";
import type { Invoice, UserProfile } from "../types";

interface PDFDownloadWrapperProps {
  invoiceId: string;
  invoiceNumber: string;
  userProfile: UserProfile;
  className?: string;
  title?: string;
}

const PDFDownloadWrapper: React.FC<PDFDownloadWrapperProps> = ({
  invoiceId,
  invoiceNumber,
  userProfile,
  className,
  title
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      console.log("Fetching fresh invoice data for PDF...");

      // Fetch fresh invoice data directly from Firestore
      const doc = await db.collection("invoices").doc(invoiceId).get();
      if (!doc.exists) {
        throw new Error("Invoice not found");
      }

      const fresh = { id: doc.id, ...doc.data() } as Invoice;
      console.log("Fresh invoice data:", fresh);

      // Create PDF blob
      console.log("Generating PDF...");
      const blob = await pdf(<InvoicePDF invoice={fresh} userProfile={userProfile} />).toBlob();

      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("PDF download triggered successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={className}
      title={title}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

export default PDFDownloadWrapper;
