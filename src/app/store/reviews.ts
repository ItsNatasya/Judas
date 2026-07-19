// src/app/store/reviews.ts
//
// SEBELUM: localStorage, `add()` langsung approved:true.
// SESUDAH: memanggil backend. PERUBAHAN PERILAKU PENTING:
// ulasan yang baru dikirim berstatus "Menunggu" dan BARU tampil di daftar
// publik setelah admin menyetujuinya lewat tab "Ulasan" di Admin Dashboard
// (endpoint PUT /admin/reviews/{id}/approve) -- ini levih sesuai API
// Contract v3.6 dan sudah didukung oleh AdminDashboard.tsx yang sudah ada
// (tab Ulasan sudah punya tombol setujui/hapus, sebelumnya tidak pernah
// terpakai karena versi localStorage selalu auto-approve).

import { apiFetch, apiFetchFull } from "../lib/api";

export interface Review {
  id: string;
  name: string;
  role: string;
  message: string;
  rating: number;
  createdAt: string;
  approved: boolean;
}

// Bentuk baris dari backend (models/review.py -> to_dict())
interface BackendReviewRow {
  id: number;
  name: string;
  role: string | null;
  rating: number;
  review: string;
  status?: string;
  submittedAt?: string | null;
  approvedAt: string | null;
}

function fromBackend(row: BackendReviewRow): Review {
  return {
    id: String(row.id),
    name: row.name,
    role: row.role ?? "Pengguna",
    message: row.review,
    rating: row.rating,
    createdAt: (row.approvedAt ?? row.submittedAt ?? "").slice(0, 10),
    approved: row.status ? row.status === "Disetujui" : true,
  };
}

export const reviewsDb = {
  /** Admin: SEMUA ulasan (Menunggu + Disetujui) -- dipakai tab "Semua" di dashboard. */
  async getAll(): Promise<Review[]> {
    try {
      const rows = await apiFetch<BackendReviewRow[]>("/admin/reviews?status=all");
      return rows.map(fromBackend);
    } catch (err: any) {
      if (err?.code === "11") return [];
      throw err;
    }
  },

  /** Publik: hanya ulasan yang sudah disetujui (ditampilkan di halaman utama). */
  async getApproved(): Promise<Review[]> {
    try {
      const envelope = await apiFetchFull<BackendReviewRow[]>("/reviews?limit=50", { auth: false });
      return (envelope.data ?? []).map(fromBackend);
    } catch (err: any) {
      if (err?.code === "11") return [];
      throw err;
    }
  },

  /** Publik: submit ulasan baru. Status awal "Menunggu" -- BUKAN langsung tampil. */
  async add(data: Omit<Review, "id" | "createdAt" | "approved">): Promise<Review> {
    const result = await apiFetch<{ reviewId: number; status: string }>("/reviews", {
      method: "POST",
      auth: false,
      body: { name: data.name, role: data.role, rating: data.rating, review: data.message },
    });
    return {
      id: String(result.reviewId),
      name: data.name,
      role: data.role,
      message: data.message,
      rating: data.rating,
      createdAt: new Date().toISOString().slice(0, 10),
      approved: false, // sesuai backend: status awal selalu "Menunggu"
    };
  },

  async approve(id: string): Promise<void> {
    await apiFetch(`/admin/reviews/${id}/approve`, { method: "PUT" });
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/admin/reviews/${id}`, { method: "DELETE" });
  },
};
