"use client";

import { useState } from "react";

/**
 * Fatura kayıt akışı state container'ı: sisteme kaydet/fatura kes toggle'ları,
 * ödeme bilgileri (IBAN/hesap/banka/not), PDF'te gösterme tercihi ve son
 * oluşturulan invoice meta'sı.
 *
 * SRP: yalnızca state. Submit yan etkisi (createOutboundInvoice vb.) orchestrator'da.
 */
export function useOasInvoicing() {
  const [saveToSystem, setSaveToSystem] = useState(true);
  const [saveAsInvoice, setSaveAsInvoice] = useState(false);
  const [invoiceAutoPost, setInvoiceAutoPost] = useState(true);
  const [invoicePaymentDetailsOpen, setInvoicePaymentDetailsOpen] = useState(false);

  const [customerAccountIdText, setCustomerAccountIdText] = useState("");
  const [paymentIban, setPaymentIban] = useState("");
  const [paymentAccountHolder, setPaymentAccountHolder] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [showPaymentOnPdf, setShowPaymentOnPdf] = useState(true);

  const [lastCreatedInvoiceNo, setLastCreatedInvoiceNo] = useState("");
  const [lastCreatedInvoiceId, setLastCreatedInvoiceId] = useState<number | null>(null);
  const [lastSavedDocumentId, setLastSavedDocumentId] = useState<number | null>(null);

  return {
    saveToSystem,
    setSaveToSystem,
    saveAsInvoice,
    setSaveAsInvoice,
    invoiceAutoPost,
    setInvoiceAutoPost,
    invoicePaymentDetailsOpen,
    setInvoicePaymentDetailsOpen,

    customerAccountIdText,
    setCustomerAccountIdText,
    paymentIban,
    setPaymentIban,
    paymentAccountHolder,
    setPaymentAccountHolder,
    paymentBankName,
    setPaymentBankName,
    paymentNote,
    setPaymentNote,
    showPaymentOnPdf,
    setShowPaymentOnPdf,

    lastCreatedInvoiceNo,
    setLastCreatedInvoiceNo,
    lastCreatedInvoiceId,
    setLastCreatedInvoiceId,
    lastSavedDocumentId,
    setLastSavedDocumentId,
  };
}
