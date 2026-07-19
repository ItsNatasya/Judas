// src/app/lib/api.ts
//
// Klien API terpusat untuk menyambungkan frontend ke JUDAS Backend (Flask).
// Semua file di store/*.ts memakai modul ini -- jangan panggil fetch()
// langsung dari komponen halaman.

const API_BASE: string = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const ACCESS_TOKEN_KEY = "judas_access_token";
const REFRESH_TOKEN_KEY = "judas_refresh_token";

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

function setTokens(accessToken: string, refreshToken?: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Amplop response baku sesuai API Contract v3.6 (Bab 2)
interface ApiEnvelope<T> {
  responseCode: string;
  responseMessage: string;
  data?: T;
  errorDetail?: string;
  apiVersion: string;
  traceId: string;
  [key: string]: unknown; // summary / pagination tambahan di beberapa endpoint
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    const body: ApiEnvelope<{ accessToken: string }> = await res.json();
    if (body.responseCode === "00" && body.data?.accessToken) {
      setTokens(body.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;      // true = sertakan Bearer token (default: true)
  retried?: boolean;   // internal, hindari infinite loop refresh
}

/** Panggilan inti ke backend. Membuka amplop response dan melempar ApiError jika gagal. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retried = false } = opts;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204/empty body guard
  const text = await res.text();
  const envelope: ApiEnvelope<T> = text ? JSON.parse(text) : { responseCode: "00", responseMessage: "", apiVersion: "1.0", traceId: "" };

  // Token expired (responseCode 16) -> coba refresh sekali, lalu ulangi request
  if (envelope.responseCode === "16" && auth && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...opts, retried: true });
    }
    clearTokens();
    window.location.href = "/admin";
    throw new ApiError("Sesi berakhir, silakan login kembali.", "16", res.status);
  }

  if (envelope.responseCode !== "00") {
    throw new ApiError(envelope.responseMessage || "Terjadi kesalahan.", envelope.responseCode, res.status);
  }

  // Beberapa endpoint (reviews, wordlist) menaruh summary/pagination di level atas envelope,
  // bukan di dalam `data`. Sertakan sebagai bagian dari hasil jika komponen membutuhkannya.
  return envelope.data as T;
}

/** Dipakai khusus reviews & wordlist yang punya field tambahan (summary/pagination) di luar `data`. */
export async function apiFetchFull<T>(path: string, opts: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const envelope: ApiEnvelope<T> = text ? JSON.parse(text) : { responseCode: "00", responseMessage: "", apiVersion: "1.0", traceId: "" };
  if (envelope.responseCode !== "00") {
    throw new ApiError(envelope.responseMessage || "Terjadi kesalahan.", envelope.responseCode, res.status);
  }
  return envelope;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<void> {
  const data = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  setTokens(data.accessToken, data.refreshToken);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}
