// src/app/lib/scan.ts
//
// Dipakai oleh ScanCard di HomePage.tsx. Menggantikan deteksi lokal
// berbasis regex wordlist dengan panggilan nyata ke backend
// (Random Forest + crawling + WHOIS, lihat services/ml_service.py di
// backend). Endpoint publik, tidak butuh token.

import { apiFetch } from "./api";

export interface ScanResult {
  label: "Judol" | "Aman";
  confidence: number;
  riskScore?: number;
}

interface BackendScanResponse {
  url: string;
  label: "Judol" | "Aman";
  confidence: number;
  rfScore: number;
  whoisAge: number | null;
  crawlStatus: string;
  scannedAt: string;
  fromCache: boolean;
}

/** Normalisasi input pengguna (boleh tanpa skema) sebelum dikirim ke backend. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function scanUrl(rawUrl: string): Promise<ScanResult> {
  const url = normalizeUrl(rawUrl);
  const result = await apiFetch<BackendScanResponse>("/scan/url", {
    method: "POST",
    auth: false,
    body: { url },
  });
  return { label: result.label, confidence: result.confidence };
}
