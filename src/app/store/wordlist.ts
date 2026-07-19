// src/app/store/wordlist.ts
//
// SEBELUM: localStorage.
// SESUDAH: memanggil backend /admin/wordlist (tabel `wordlist`, TERPISAH
// dari judol_dataset/safe_dataset -- lihat buku panduan backend Bab 5.3).
// buildPattern() masih tersedia untuk pratinjau di sisi client (mis. search
// box admin), tapi TIDAK lagi dipakai untuk memutuskan hasil scan publik --
// keputusan scan sekarang murni dari backend (POST /scan/url), lihat
// perubahan di HomePage.tsx.

import { apiFetch } from "../lib/api";

export type WordCategory =
  | "Slot"
  | "Togel"
  | "Casino"
  | "Poker"
  | "Sbobet"
  | "Sportbook"
  | "Umum";

export interface WordEntry {
  id: string;
  keyword: string;
  category: WordCategory;
  description: string;
  addedAt: string;
}

interface BackendWordRow {
  id: number;
  keyword: string;
  category: string;
  description: string;
  isActive: boolean;
  addedAt: string;
  addedBy: string;
}

function fromBackend(row: BackendWordRow): WordEntry {
  return {
    id: String(row.id),
    keyword: row.keyword,
    category: (row.category as WordCategory) ?? "Umum",
    description: row.description ?? "",
    addedAt: row.addedAt ?? "",
  };
}

export const wordlistDb = {
  async getAll(): Promise<WordEntry[]> {
    try {
      const rows = await apiFetch<BackendWordRow[]>("/admin/wordlist?limit=200");
      return rows.map(fromBackend);
    } catch (err: any) {
      if (err?.code === "11") return [];
      throw err;
    }
  },

  async add(data: Omit<WordEntry, "id" | "addedAt">): Promise<WordEntry> {
    const row = await apiFetch<BackendWordRow>("/admin/wordlist", {
      method: "POST",
      body: { keyword: data.keyword, category: data.category, description: data.description },
    });
    return fromBackend(row);
  },

  async update(id: string, patch: Partial<WordEntry>): Promise<void> {
    await apiFetch(`/admin/wordlist/${id}`, {
      method: "PATCH",
      body: { keyword: patch.keyword, category: patch.category, description: patch.description },
    });
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/admin/wordlist/${id}`, { method: "DELETE" });
  },

  /** Pratinjau lokal saja (mis. highlight di UI admin). Keputusan scan asli ada di backend. */
  buildPattern(words: WordEntry[]): RegExp {
    const keywords = words.map((w) => w.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(keywords.join("|") || "(?!)", "i");
  },
};
