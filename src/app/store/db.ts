// src/app/store/db.ts
//
// SEBELUM: menyimpan data URL di localStorage (fungsi sinkron).
// SESUDAH: mengambil/menyimpan data dari tabel `judol_dataset` di PostgreSQL
// lewat endpoint admin JUDAS Backend (/admin/dataset). Semua fungsi sekarang
// ASYNC -- pemanggil harus pakai await (lihat AdminDashboard.tsx).

import { apiFetch } from "../lib/api";

export type RiskLevel = "Tinggi" | "Sedang" | "Rendah";
export type Category = "Slot" | "Togel" | "Casino" | "Poker" | "Sbobet" | "Sportbook" | "Lainnya";
export type Status = "Aktif" | "Nonaktif";

export interface UrlEntry {
  id: string;
  url: string;
  category: Category;
  risk: RiskLevel;
  status: Status;
  reportedBy: string;
  notes: string;
  createdAt: string;
  scanCount: number;
}

// Bentuk baris dari backend (models/judol_dataset.py -> to_dict())
interface BackendDatasetRow {
  id: number;
  url: string;
  category: string;
  risk: string;
  status: string;
  scanCount: number;
  addedAt: string;
}

function fromBackend(row: BackendDatasetRow): UrlEntry {
  return {
    id: String(row.id),
    url: row.url,
    category: (row.category as Category) ?? "Lainnya",
    risk: (row.risk as RiskLevel) ?? "Sedang",
    status: (row.status as Status) ?? "Aktif",
    reportedBy: "",
    notes: "",
    createdAt: row.addedAt ?? "",
    scanCount: row.scanCount ?? 0,
  };
}

export const db = {
  /** Ambil seluruh entri (limit besar supaya cocok dengan tabel admin yang paginasi client-side). */
  async getAll(): Promise<UrlEntry[]> {
    try {
      const rows = await apiFetch<BackendDatasetRow[]>("/admin/dataset?limit=200&page=1");
      return rows.map(fromBackend);
    } catch (err: any) {
      // responseCode 11 (not_found) berarti dataset kosong sesuai filter -- bukan error fatal
      if (err?.code === "11") return [];
      throw err;
    }
  },

  async add(entry: Omit<UrlEntry, "id" | "createdAt" | "scanCount">): Promise<UrlEntry> {
    const row = await apiFetch<{ id: number; url: string; addedAt: string }>("/admin/dataset", {
      method: "POST",
      body: {
        url: entry.url,
        category: entry.category,
        risk: entry.risk,
        status: entry.status,
        reportedBy: entry.reportedBy,
        notes: entry.notes,
      },
    });
    return {
      ...entry,
      id: String(row.id),
      createdAt: row.addedAt,
      scanCount: 0,
    };
  },

  async update(id: string, patch: Partial<UrlEntry>): Promise<UrlEntry | null> {
    const row = await apiFetch<BackendDatasetRow>(`/admin/dataset/${id}`, {
      method: "PATCH",
      body: {
        category: patch.category,
        risk: patch.risk,
        status: patch.status,
        notes: patch.notes,
      },
    });
    return fromBackend(row);
  },

  async delete(id: string): Promise<boolean> {
    await apiFetch(`/admin/dataset/${id}`, { method: "DELETE" });
    return true;
  },
};
