// src/app/store/stats.ts
//
// CATATAN: statistik ini TETAP di localStorage (tidak disambungkan ke
// backend) karena JUDAS API Contract v3.6 tidak punya endpoint publik untuk
// "jumlah pengguna aktif" -- ini murni angka kosmetik sisi client untuk
// menghiasi bagian "About" di HomePage. Endpoint /admin/dashboard yang
// menyimpan statistik asli (totalUrl, scan count, dst.) hanya bisa diakses
// admin, bukan untuk ditampilkan ke publik. Kalau nanti ingin statistik ini
// asli, tambahkan endpoint publik baru di backend, misalnya GET
// /stats/public yang menghitung COUNT(*) dari tabel scan_log.

const KEY = "judas_active_users";

export const activeUsers = {
  get(): number {
    return parseInt(localStorage.getItem(KEY) ?? "0", 10);
  },
  increment(): number {
    const next = activeUsers.get() + 1;
    localStorage.setItem(KEY, String(next));
    return next;
  },
};
