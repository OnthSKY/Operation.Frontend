"use client";

import { useState } from "react";

/**
 * Belge "kimlik" alanlarının (firma adı, şube adı, başlık, amblem, varsayılan
 * branding kaynakları) state container'ı. Yan etki yok — branding fetch ve
 * varsayılan uygulama orchestrator'da kalır (effect olarak).
 *
 * SRP: state + setter'lar. İlerideki refactor'da branding loader effect'i de
 * buraya alınabilir; şimdilik tek doğru sıralamayı korumak için orchestrator
 * sürüyor.
 */
export function useOasIdentity() {
  const [companyName, setCompanyName] = useState("");
  const [defaultCompanyName, setDefaultCompanyName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [linkedBranchId, setLinkedBranchId] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [showDocumentTagline, setShowDocumentTagline] = useState(true);
  const [emblemDataUrl, setEmblemDataUrl] = useState("");
  const [defaultEmblemDataUrl, setDefaultEmblemDataUrl] = useState("");
  const [brandingLogoBusy, setBrandingLogoBusy] = useState(false);

  return {
    companyName,
    setCompanyName,
    defaultCompanyName,
    setDefaultCompanyName,
    branchName,
    setBranchName,
    linkedBranchId,
    setLinkedBranchId,
    documentTitle,
    setDocumentTitle,
    showDocumentTagline,
    setShowDocumentTagline,
    emblemDataUrl,
    setEmblemDataUrl,
    defaultEmblemDataUrl,
    setDefaultEmblemDataUrl,
    brandingLogoBusy,
    setBrandingLogoBusy,
  };
}
