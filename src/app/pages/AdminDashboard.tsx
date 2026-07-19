import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield, LayoutDashboard, Database, Plus, LogOut,
  Search, Pencil, Trash2, X, Check, AlertTriangle,
  TrendingUp, Globe, ChevronLeft, ChevronRight,
  ArrowUpDown, Save, Star, MessageSquare, ThumbsUp, Menu,
  BookOpen, Tag, Filter,
} from "lucide-react";
import { db, type UrlEntry, type Category, type RiskLevel, type Status } from "../store/db";
import { reviewsDb, type Review } from "../store/reviews";
import { wordlistDb, type WordEntry, type WordCategory } from "../store/wordlist";
import { isLoggedIn, logout, ApiError } from "../lib/api";

const CATEGORIES: Category[] = ["Slot", "Togel", "Casino", "Poker", "Sbobet", "Sportbook", "Lainnya"];
const RISKS: RiskLevel[] = ["Tinggi", "Sedang", "Rendah"];
const STATUSES: Status[] = ["Aktif", "Nonaktif"];
const PAGE_SIZE = 8;

type View = "dashboard" | "database" | "add" | "ulasan" | "wordlist";

const WORD_CATEGORIES: WordCategory[] = ["Slot", "Togel", "Casino", "Poker", "Sbobet", "Sportbook", "Umum"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [entries, setEntries] = useState<UrlEntry[]>([]);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState<"semua" | "pending" | "approved">("semua");
  const [wordlist, setWordlist] = useState<WordEntry[]>([]);
  const [wordSearch, setWordSearch] = useState("");
  const [wordCatFilter, setWordCatFilter] = useState<WordCategory | "">("");
  const [editWord, setEditWord] = useState<WordEntry | null>(null);
  const [wordFormOpen, setWordFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "">("");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "">("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof UrlEntry>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editEntry, setEditEntry] = useState<UrlEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) navigate("/admin");
  }, [navigate]);

  const reload = useCallback(() => {
    (async () => {
      try {
        const [urls, reviews, words] = await Promise.all([
          db.getAll(), reviewsDb.getAll(), wordlistDb.getAll(),
        ]);
        setEntries(urls);
        setAllReviews(reviews);
        setWordlist(words);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Gagal memuat data dari server.", "error");
      }
    })();
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => { reload(); }, [activeView, reload]);

  const filtered = useMemo(() => {
    let data = [...entries];
    if (search) data = data.filter((e) =>
      e.url.toLowerCase().includes(search.toLowerCase()) ||
      e.notes.toLowerCase().includes(search.toLowerCase()) ||
      e.reportedBy.toLowerCase().includes(search.toLowerCase())
    );
    if (filterCat) data = data.filter((e) => e.category === filterCat);
    if (filterRisk) data = data.filter((e) => e.risk === filterRisk);
    if (filterStatus) data = data.filter((e) => e.status === filterStatus);
    data.sort((a, b) => {
      const va = String(a[sortField]), vb = String(b[sortField]);
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [entries, search, filterCat, filterRisk, filterStatus, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => { await logout(); navigate("/admin"); };
  const handleDelete = async (id: string) => {
    try {
      await db.delete(id); reload(); setDeleteId(null); showToast("URL berhasil dihapus.");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal menghapus URL.", "error"); }
  };
  const handleSaveEdit = async (patch: Partial<UrlEntry>) => {
    if (!editEntry) return;
    try {
      await db.update(editEntry.id, patch); reload(); setEditEntry(null); showToast("URL berhasil diperbarui.");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal memperbarui URL.", "error"); }
  };
  const handleAdd = async (data: Omit<UrlEntry, "id" | "createdAt" | "scanCount">) => {
    try {
      await db.add(data); reload(); changeView("database"); showToast("URL baru berhasil ditambahkan.");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal menambahkan URL.", "error"); }
  };
  const toggleSort = (field: keyof UrlEntry) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };
  const handleApproveReview = async (id: string) => {
    try { await reviewsDb.approve(id); reload(); showToast("Ulasan disetujui."); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal menyetujui ulasan.", "error"); }
  };
  const handleDeleteReview = async (id: string) => {
    try { await reviewsDb.delete(id); reload(); showToast("Ulasan dihapus."); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal menghapus ulasan.", "error"); }
  };

  const handleAddWord = async (data: Omit<WordEntry, "id" | "addedAt">) => {
    try { await wordlistDb.add(data); reload(); setWordFormOpen(false); showToast("Kata kunci ditambahkan."); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal menambah kata kunci.", "error"); }
  };
  const handleEditWord = async (data: Omit<WordEntry, "id" | "addedAt">) => {
    if (!editWord) return;
    try { await wordlistDb.update(editWord.id, data); reload(); setEditWord(null); showToast("Kata kunci diperbarui."); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal memperbarui kata kunci.", "error"); }
  };
  const handleDeleteWord = async (id: string) => {
    try { await wordlistDb.delete(id); reload(); showToast("Kata kunci dihapus."); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Gagal menghapus kata kunci.", "error"); }
  };

  const filteredWords = useMemo(() => {
    let w = [...wordlist];
    if (wordSearch) w = w.filter((e) => e.keyword.toLowerCase().includes(wordSearch.toLowerCase()) || e.description.toLowerCase().includes(wordSearch.toLowerCase()));
    if (wordCatFilter) w = w.filter((e) => e.category === wordCatFilter);
    return w;
  }, [wordlist, wordSearch, wordCatFilter]);

  const stats = useMemo(() => ({
    total: entries.length,
    aktif: entries.filter((e) => e.status === "Aktif").length,
    tinggi: entries.filter((e) => e.risk === "Tinggi").length,
    userScan: entries.filter((e) => e.reportedBy === "User Scan").length,
  }), [entries]);

  const pendingCount = allReviews.filter((r) => !r.approved).length;

  const changeView = (v: View) => { setActiveView(v); setDrawerOpen(false); };

  const viewTitle: Record<View, string> = {
    dashboard: "Dashboard",
    database: "Database URL",
    add: "Tambah URL Baru",
    ulasan: "Manajemen Ulasan",
    wordlist: "Kelola Wordlist",
  };

  const navItems = [
    { id: "dashboard" as View, icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { id: "database" as View, icon: <Database size={18} />, label: "Database URL" },
    { id: "add" as View, icon: <Plus size={18} />, label: "Tambah URL" },
    { id: "ulasan" as View, icon: <MessageSquare size={18} />, label: "Ulasan", badge: pendingCount },
    { id: "wordlist" as View, icon: <BookOpen size={18} />, label: "Wordlist" },
  ];

  const sideW = sidebarExpanded ? 220 : 64;

  return (
    <div className="min-h-screen bg-[#080c18] text-white" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* ── DESKTOP SIDEBAR (fixed, md+) ──────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-white/5 overflow-hidden transition-all duration-300"
        style={{ width: sideW, background: "#0a0f1e" }}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
            <Shield size={15} className="text-white" />
          </div>
          {sidebarExpanded && <span style={{ fontWeight: 900, fontSize: "0.95rem", letterSpacing: "0.12em", color: "#ff4d4d", whiteSpace: "nowrap" }}>JUDAS</span>}
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-2 pt-3 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => changeView(item.id)}
              title={!sidebarExpanded ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left w-full"
              style={{ background: activeView === item.id ? "rgba(229,62,62,0.15)" : "transparent", color: activeView === item.id ? "#fc8181" : "#9ca3af", fontWeight: activeView === item.id ? 700 : 500, fontSize: "0.83rem", border: activeView === item.id ? "1px solid rgba(229,62,62,0.2)" : "1px solid transparent", minWidth: 0 }}>
              <span className="shrink-0">{item.icon}</span>
              {sidebarExpanded && (
                <span className="flex-1 flex items-center justify-between gap-1 overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {"badge" in item && item.badge > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full text-white" style={{ background: "#e53e3e", fontSize: "0.62rem", fontWeight: 800 }}>{item.badge}</span>
                  )}
                </span>
              )}
              {!sidebarExpanded && "badge" in item && item.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center" style={{ background: "#e53e3e", fontSize: "0.58rem", fontWeight: 800 }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-white/5 flex flex-col gap-1">
          <button onClick={() => setSidebarExpanded(!sidebarExpanded)}
            title={sidebarExpanded ? "Perkecil" : "Perbesar"}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all">
            <ChevronLeft size={15} className="shrink-0 transition-transform duration-300" style={{ transform: sidebarExpanded ? "rotate(0deg)" : "rotate(180deg)" }} />
            {sidebarExpanded && <span style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>Perkecil</span>}
          </button>
          <button onClick={handleLogout} title="Keluar"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={15} className="shrink-0" />
            {sidebarExpanded && <span style={{ whiteSpace: "nowrap", fontSize: "0.83rem" }}>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* ── MOBILE DRAWER ─────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: -272 }} animate={{ x: 0 }} exit={{ x: -272 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col md:hidden border-r border-white/5"
              style={{ background: "#0a0f1e" }}>
              <div className="flex items-center justify-between px-4 h-14 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Shield size={15} className="text-white" />
                  </div>
                  <span style={{ fontWeight: 900, fontSize: "0.95rem", letterSpacing: "0.1em", color: "#ff4d4d" }}>JUDAS</span>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5">
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 flex flex-col gap-1 p-3">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => changeView(item.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                    style={{ background: activeView === item.id ? "rgba(229,62,62,0.15)" : "transparent", color: activeView === item.id ? "#fc8181" : "#9ca3af", fontWeight: activeView === item.id ? 700 : 500, fontSize: "0.9rem", border: activeView === item.id ? "1px solid rgba(229,62,62,0.2)" : "1px solid transparent" }}>
                    {item.icon}
                    <span className="flex-1 flex items-center justify-between">
                      {item.label}
                      {"badge" in item && item.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-white" style={{ background: "#e53e3e", fontSize: "0.62rem", fontWeight: 800 }}>{item.badge}</span>
                      )}
                    </span>
                  </button>
                ))}
              </nav>
              <div className="p-3 border-t border-white/5">
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" style={{ fontSize: "0.9rem" }}>
                  <LogOut size={18} /> Keluar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── CONTENT AREA (offset by sidebar on desktop) ───── */}
      <div className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: 0 }}>

        {/* Invisible spacer on desktop to push content right of fixed sidebar */}
        <div className="hidden md:block shrink-0 transition-all duration-300" style={{ marginLeft: sideW }} />

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-white/5"
          style={{ background: "rgba(8,12,24,0.96)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Shield size={13} className="text-white" />
              </div>
              <span style={{ fontWeight: 900, fontSize: "0.9rem", letterSpacing: "0.1em", color: "#ff4d4d" }}>JUDAS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white truncate max-w-[120px]" style={{ fontWeight: 700, fontSize: "0.83rem" }}>{viewTitle[activeView]}</span>
            <span className="px-2 py-1 rounded-full text-xs shrink-0" style={{ background: "rgba(229,62,62,0.12)", color: "#fc8181", fontWeight: 700, border: "1px solid rgba(229,62,62,0.2)" }}>Admin</span>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex sticky top-0 z-30 items-center justify-between px-6 h-14 border-b border-white/5 transition-all duration-300"
          style={{ background: "rgba(8,12,24,0.96)", backdropFilter: "blur(12px)", marginLeft: sideW }}>
          <h1 className="text-white" style={{ fontWeight: 800, fontSize: "1rem" }}>{viewTitle[activeView]}</h1>
          <span className="px-3 py-1 rounded-full text-xs" style={{ background: "rgba(229,62,62,0.12)", color: "#fc8181", fontWeight: 700, border: "1px solid rgba(229,62,62,0.2)" }}>Admin</span>
        </header>

        {/* Main content */}
        <main className="flex-1 pb-20 md:pb-6">
          {/*
            On desktop (md+) we push content right of the fixed sidebar.
            Tailwind can't do dynamic values so we use a CSS custom property
            set on a wrapper, then pick it up with a utility class override.
          */}
          <div className="p-4 sm:p-5"
            style={{ "--sw": `${sideW}px` } as React.CSSProperties}>
            {/* Desktop spacer — invisible, just shifts content past the sidebar */}
            <style>{`@media(min-width:768px){.admin-content{margin-left:var(--sw,64px)}}`}</style>
            <div className="admin-content">

            <AnimatePresence mode="wait">

              {/* ── DASHBOARD ── */}
              {activeView === "dashboard" && (
                <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "Total URL", value: stats.total, icon: <Globe size={18} />, color: "#6366f1" },
                      { label: "URL Aktif", value: stats.aktif, icon: <TrendingUp size={18} />, color: "#10b981" },
                      { label: "Risiko Tinggi", value: stats.tinggi, icon: <AlertTriangle size={18} />, color: "#ef4444" },
                      { label: "User Scan", value: stats.userScan, icon: <Search size={18} />, color: "#f59e0b" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400" style={{ fontSize: "0.72rem", fontWeight: 600 }}>{s.label}</span>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}22`, color: s.color }}>{s.icon}</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: "clamp(1.3rem,4vw,1.8rem)", color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl p-4 sm:p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <h3 className="text-white mb-4" style={{ fontWeight: 700, fontSize: "0.88rem" }}>Distribusi Kategori</h3>
                      <div className="flex flex-col gap-3">
                        {CATEGORIES.map((cat) => {
                          const count = entries.filter((e) => e.category === cat).length;
                          const pct = entries.length ? Math.round((count / entries.length) * 100) : 0;
                          return (
                            <div key={cat}>
                              <div className="flex justify-between mb-1">
                                <span className="text-gray-400" style={{ fontSize: "0.75rem" }}>{cat}</span>
                                <span className="text-gray-300" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} style={{ background: "linear-gradient(90deg,#e53e3e,#dd6b20)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl p-4 sm:p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <h3 className="text-white mb-4" style={{ fontWeight: 700, fontSize: "0.88rem" }}>Entry Terbaru</h3>
                      <div className="flex flex-col gap-1">
                        {entries.slice(0, 6).map((e) => (
                          <div key={e.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-200 truncate" style={{ fontSize: "0.78rem", fontWeight: 600 }}>{e.url}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-gray-500" style={{ fontSize: "0.68rem" }}>{e.createdAt}</span>
                                {e.reportedBy === "User Scan" && (
                                  <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "0.6rem", fontWeight: 700, background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>User Scan</span>
                                )}
                              </div>
                            </div>
                            <RiskBadge risk={e.risk} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => changeView("database")} className="px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700 }}>Lihat Database</button>
                    <button onClick={() => changeView("add")} className="px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600 }}>+ Tambah URL</button>
                    <button onClick={reload} className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 600 }}>
                      <TrendingUp size={13} /> Refresh
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── DATABASE ── */}
              {activeView === "database" && (
                <motion.div key="db" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {/* Search + Add */}
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Cari URL, catatan, pelapor..."
                        className="w-full rounded-xl pl-9 pr-4 py-2.5 text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", fontSize: "0.83rem" }} />
                    </div>
                    <button onClick={() => changeView("add")} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-white shrink-0" style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700 }}>
                      <Plus size={15} /><span className="hidden sm:inline">Tambah</span>
                    </button>
                  </div>

                  {/* Filters — horizontal scroll on mobile */}
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    <FilterSelect value={filterCat} onChange={(v) => { setFilterCat(v as Category | ""); setPage(1); }} options={CATEGORIES} placeholder="Kategori" />
                    <FilterSelect value={filterRisk} onChange={(v) => { setFilterRisk(v as RiskLevel | ""); setPage(1); }} options={RISKS} placeholder="Risiko" />
                    <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v as Status | ""); setPage(1); }} options={STATUSES} placeholder="Status" />
                    {(search || filterCat || filterRisk || filterStatus) && (
                      <button onClick={() => { setSearch(""); setFilterCat(""); setFilterRisk(""); setFilterStatus(""); setPage(1); }}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl shrink-0" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.2)", color: "#fc8181", fontSize: "0.78rem", fontWeight: 600 }}>
                        <X size={12} /> Reset
                      </button>
                    )}
                  </div>

                  <div className="text-gray-500 mb-3" style={{ fontSize: "0.75rem" }}>
                    {paginated.length} dari {filtered.length} entri{entries.length !== filtered.length && ` (total ${entries.length})`}
                  </div>

                  {/* Mobile: card list */}
                  <div className="flex flex-col gap-3 sm:hidden">
                    {paginated.length === 0 && (
                      <div className="text-center py-10 text-gray-600 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.85rem" }}>Tidak ada data</div>
                    )}
                    {paginated.map((entry) => (
                      <div key={entry.id} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-mono text-gray-100 break-all" style={{ fontSize: "0.82rem", fontWeight: 700 }}>{entry.url}</span>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setEditEntry({ ...entry })} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteId(entry.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <CatBadge cat={entry.category} />
                          <RiskBadge risk={entry.risk} />
                          <StatusBadge status={entry.status} />
                          {entry.reportedBy === "User Scan" && (
                            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.62rem", fontWeight: 700, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>User Scan</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-gray-500" style={{ fontSize: "0.7rem" }}>
                          <span>{entry.reportedBy}</span>
                          <span>{entry.createdAt} · {entry.scanCount} scan</span>
                        </div>
                        {entry.notes && <p className="text-gray-500 mt-1 line-clamp-1" style={{ fontSize: "0.7rem" }}>{entry.notes}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 620 }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {([
                              { label: "URL / Domain", field: "url" },
                              { label: "Kategori", field: "category" },
                              { label: "Risiko", field: "risk" },
                              { label: "Status", field: "status" },
                              { label: "Sumber", field: "reportedBy" },
                              { label: "Tanggal", field: "createdAt" },
                              { label: "Scan", field: "scanCount" },
                            ] as { label: string; field: keyof UrlEntry }[]).map((col) => (
                              <th key={col.field} className="text-left px-4 py-3 cursor-pointer select-none" style={{ fontWeight: 700, fontSize: "0.72rem", color: "#9ca3af", letterSpacing: "0.05em", whiteSpace: "nowrap" }} onClick={() => toggleSort(col.field)}>
                                <span className="flex items-center gap-1">{col.label}<ArrowUpDown size={10} className={sortField === col.field ? "text-red-400" : "text-gray-600"} /></span>
                              </th>
                            ))}
                            <th className="px-4 py-3 text-right" style={{ fontWeight: 700, fontSize: "0.72rem", color: "#9ca3af" }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-10 text-gray-600" style={{ fontSize: "0.83rem" }}>Tidak ada data</td></tr>
                          )}
                          {paginated.map((entry, i) => (
                            <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-mono text-gray-200 truncate" style={{ fontSize: "0.78rem", fontWeight: 600, maxWidth: 170 }}>{entry.url}</div>
                                {entry.notes && <div className="text-gray-500 truncate mt-0.5" style={{ fontSize: "0.68rem", maxWidth: 170 }}>{entry.notes}</div>}
                              </td>
                              <td className="px-4 py-3"><CatBadge cat={entry.category} /></td>
                              <td className="px-4 py-3"><RiskBadge risk={entry.risk} /></td>
                              <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                              <td className="px-4 py-3">
                                <span className="text-gray-400" style={{ fontSize: "0.75rem" }}>{entry.reportedBy}</span>
                                {entry.reportedBy === "User Scan" && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded" style={{ fontSize: "0.6rem", fontWeight: 700, background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>●</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-400 whitespace-nowrap" style={{ fontSize: "0.75rem" }}>{entry.createdAt}</td>
                              <td className="px-4 py-3 text-gray-300" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{entry.scanCount.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => setEditEntry({ ...entry })} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"><Pencil size={13} /></button>
                                  <button onClick={() => setDeleteId(entry.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={13} /></button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Hal. {page}/{totalPages}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <ChevronLeft size={14} />
                        </button>
                        {(() => {
                          let start = Math.max(1, page - 2);
                          const end = Math.min(totalPages, start + 4);
                          start = Math.max(1, end - 4);
                          return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
                            <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg transition-all" style={{ background: p === page ? "linear-gradient(135deg,#e53e3e,#dd6b20)" : "rgba(255,255,255,0.06)", color: p === page ? "white" : "#9ca3af", fontWeight: p === page ? 700 : 400, fontSize: "0.8rem" }}>{p}</button>
                          ));
                        })()}
                        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── ADD ── */}
              {activeView === "add" && (
                <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-w-lg">
                  <UrlForm onSubmit={handleAdd} onCancel={() => changeView("database")} />
                </motion.div>
              )}

              {/* ── ULASAN ── */}
              {activeView === "ulasan" && (
                <motion.div key="ulasan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Total", value: allReviews.length, color: "#6366f1" },
                      { label: "Pending", value: allReviews.filter(r => !r.approved).length, color: "#f59e0b" },
                      { label: "Disetujui", value: allReviews.filter(r => r.approved).length, color: "#10b981" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl p-3 sm:p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontWeight: 900, fontSize: "clamp(1.3rem,4vw,1.6rem)", color: s.color }}>{s.value}</div>
                        <div className="text-gray-500" style={{ fontSize: "0.72rem", marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {(["semua", "pending", "approved"] as const).map((f) => (
                      <button key={f} onClick={() => setReviewFilter(f)}
                        className="px-3 py-2 rounded-xl shrink-0 transition-all"
                        style={{ background: reviewFilter === f ? "rgba(229,62,62,0.15)" : "rgba(255,255,255,0.04)", color: reviewFilter === f ? "#fc8181" : "#9ca3af", border: reviewFilter === f ? "1px solid rgba(229,62,62,0.25)" : "1px solid rgba(255,255,255,0.07)", fontWeight: reviewFilter === f ? 700 : 500, fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {f === "semua" ? "Semua" : f === "pending" ? "Menunggu" : "Disetujui"}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    {allReviews.filter(r => reviewFilter === "semua" ? true : reviewFilter === "pending" ? !r.approved : r.approved).length === 0 && (
                      <div className="text-center py-10 text-gray-600 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.85rem" }}>Tidak ada ulasan.</div>
                    )}
                    {allReviews
                      .filter(r => reviewFilter === "semua" ? true : reviewFilter === "pending" ? !r.approved : r.approved)
                      .map((review, i) => (
                        <motion.div key={review.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${review.approved ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.2)"}` }}>
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 800 }}>
                              {review.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <span className="text-white" style={{ fontWeight: 700, fontSize: "0.85rem" }}>{review.name}</span>
                                <span className="text-gray-500" style={{ fontSize: "0.7rem" }}>{review.role}</span>
                                <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: "0.62rem", fontWeight: 700, background: review.approved ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", color: review.approved ? "#34d399" : "#fbbf24", border: `1px solid ${review.approved ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}` }}>
                                  {review.approved ? "Disetujui" : "Menunggu"}
                                </span>
                              </div>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= review.rating ? "#f6ad55" : "none"} style={{ color: "#f6ad55" }} />)}
                              </div>
                            </div>
                            <span className="text-gray-600 shrink-0" style={{ fontSize: "0.68rem" }}>{review.createdAt}</span>
                          </div>
                          <p className="text-gray-300 leading-relaxed mb-3" style={{ fontSize: "0.82rem" }}>"{review.message}"</p>
                          <div className="flex gap-2">
                            {!review.approved && (
                              <button onClick={() => handleApproveReview(review.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", fontSize: "0.78rem", fontWeight: 700 }}>
                                <ThumbsUp size={13} /> Setujui
                              </button>
                            )}
                            <button onClick={() => handleDeleteReview(review.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.2)", color: "#fc8181", fontSize: "0.78rem", fontWeight: 700 }}>
                              <Trash2 size={13} /> Hapus
                            </button>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              )}
              {/* ── WORDLIST ── */}
              {activeView === "wordlist" && (
                <motion.div key="wordlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {WORD_CATEGORIES.slice(0, 4).map((cat) => {
                      const count = wordlist.filter((w) => w.category === cat).length;
                      return (
                        <div key={cat} className="rounded-2xl p-3 sm:p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-gray-500 mb-1" style={{ fontSize: "0.7rem", fontWeight: 600 }}>{cat}</div>
                          <div style={{ fontWeight: 900, fontSize: "1.4rem", color: "#a5b4fc" }}>{count}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" value={wordSearch} onChange={(e) => setWordSearch(e.target.value)}
                        placeholder="Cari kata kunci atau deskripsi..."
                        className="w-full rounded-xl pl-9 pr-4 py-2.5 text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", fontSize: "0.83rem" }} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        <Filter size={13} className="text-gray-500 shrink-0" />
                        <select value={wordCatFilter} onChange={(e) => setWordCatFilter(e.target.value as WordCategory | "")}
                          className="rounded-xl px-3 py-2.5 outline-none shrink-0"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: wordCatFilter ? "#e2e8f0" : "#6b7280", fontSize: "0.78rem", cursor: "pointer" }}>
                          <option value="">Semua Kategori</option>
                          {WORD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setWordFormOpen(true); setEditWord(null); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white shrink-0"
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontWeight: 700, fontSize: "0.83rem", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                        <Plus size={15} /><span className="hidden sm:inline">Tambah Kata</span><span className="sm:hidden">+</span>
                      </motion.button>
                    </div>
                  </div>

                  <div className="text-gray-500 mb-3" style={{ fontSize: "0.75rem" }}>
                    {filteredWords.length} kata kunci{wordlist.length !== filteredWords.length && ` dari ${wordlist.length}`}
                  </div>

                  {/* Mobile: cards */}
                  <div className="flex flex-col gap-2 sm:hidden">
                    {filteredWords.length === 0 && (
                      <div className="text-center py-10 text-gray-600 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)", fontSize: "0.85rem" }}>Tidak ada kata kunci</div>
                    )}
                    {filteredWords.map((w) => (
                      <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <code className="text-indigo-300" style={{ fontWeight: 700, fontSize: "0.9rem" }}>{w.keyword}</code>
                              <WordCatBadge cat={w.category} />
                            </div>
                            {w.description && <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{w.description}</p>}
                            <p className="text-gray-600 mt-1" style={{ fontSize: "0.68rem" }}>Ditambahkan: {w.addedAt}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditWord(w); setWordFormOpen(false); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteWord(w.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 520 }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {["Kata Kunci", "Kategori", "Deskripsi", "Ditambahkan"].map((col) => (
                              <th key={col} className="text-left px-4 py-3" style={{ fontWeight: 700, fontSize: "0.72rem", color: "#9ca3af", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{col}</th>
                            ))}
                            <th className="px-4 py-3 text-right" style={{ fontWeight: 700, fontSize: "0.72rem", color: "#9ca3af" }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWords.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-600" style={{ fontSize: "0.83rem" }}>Tidak ada kata kunci</td></tr>
                          )}
                          {filteredWords.map((w, i) => (
                            <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                              className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <code className="text-indigo-300" style={{ fontWeight: 700, fontSize: "0.88rem" }}>{w.keyword}</code>
                              </td>
                              <td className="px-4 py-3"><WordCatBadge cat={w.category} /></td>
                              <td className="px-4 py-3 text-gray-400" style={{ fontSize: "0.78rem", maxWidth: 260 }}>
                                <span className="line-clamp-1">{w.description || "—"}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap" style={{ fontSize: "0.75rem" }}>{w.addedAt}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setEditWord(w); setWordFormOpen(false); }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"><Pencil size={13} /></button>
                                  <button onClick={() => handleDeleteWord(w.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={13} /></button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
                    <Tag size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-indigo-300" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                      Wordlist ini digunakan oleh modul <strong>Lexical Analysis</strong> untuk mendeteksi link judol secara real-time.
                      Setiap perubahan langsung berpengaruh pada hasil scan pengguna.
                      Total <strong>{wordlist.length} kata kunci</strong> aktif.
                    </p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
            </div>{/* end admin-content */}
          </div>{/* end p-4 */}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-white/10"
        style={{ background: "rgba(8,12,24,0.97)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center h-16 px-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => changeView(item.id)}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all"
              style={{ color: activeView === item.id ? "#fc8181" : "#6b7280" }}>
              {activeView === item.id && (
                <motion.div layoutId="mobileTab" className="absolute inset-1 rounded-xl" style={{ background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.2)" }} />
              )}
              <span className="relative z-10">{item.icon}</span>
              <span className="relative z-10" style={{ fontSize: "0.6rem", fontWeight: activeView === item.id ? 700 : 500 }}>{item.label}</span>
              {"badge" in item && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white z-10" style={{ background: "#e53e3e", fontSize: "0.58rem", fontWeight: 800 }}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MODALS ────────────────────────────────────────── */}
      <AnimatePresence>
        {editEntry && (
          <Modal onClose={() => setEditEntry(null)} title="Edit URL">
            <UrlForm initial={editEntry} onSubmit={(d) => handleSaveEdit(d)} onCancel={() => setEditEntry(null)} submitLabel="Simpan Perubahan" />
          </Modal>
        )}
      </AnimatePresence>

      {/* Word Add Modal */}
      <AnimatePresence>
        {wordFormOpen && (
          <Modal onClose={() => setWordFormOpen(false)} title="Tambah Kata Kunci">
            <WordForm onSubmit={handleAddWord} onCancel={() => setWordFormOpen(false)} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Word Edit Modal */}
      <AnimatePresence>
        {editWord && (
          <Modal onClose={() => setEditWord(null)} title="Edit Kata Kunci">
            <WordForm initial={editWord} onSubmit={handleEditWord} onCancel={() => setEditWord(null)} submitLabel="Simpan Perubahan" />
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <Modal onClose={() => setDeleteId(null)} title="Hapus URL">
            <p className="text-gray-300 mb-6" style={{ fontSize: "0.88rem" }}>Yakin ingin menghapus entri ini? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg,#e53e3e,#b91c1c)", fontWeight: 700, fontSize: "0.88rem" }}>Ya, Hapus</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-gray-300 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600, fontSize: "0.88rem" }}>Batal</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── TOAST ─────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-20 md:bottom-5 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl max-w-xs"
            style={{ background: toast.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(229,62,62,0.15)", border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.4)" : "rgba(229,62,62,0.4)"}`, backdropFilter: "blur(12px)" }}>
            {toast.type === "success" ? <Check size={15} className="text-green-400 shrink-0" /> : <AlertTriangle size={15} className="text-red-400 shrink-0" />}
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: toast.type === "success" ? "#34d399" : "#f87171" }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const m = { Tinggi: ["rgba(239,68,68,0.15)", "#f87171", "rgba(239,68,68,0.3)"], Sedang: ["rgba(245,158,11,0.15)", "#fbbf24", "rgba(245,158,11,0.3)"], Rendah: ["rgba(16,185,129,0.15)", "#34d399", "rgba(16,185,129,0.3)"] }[risk];
  return <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: m[0], color: m[1], border: `1px solid ${m[2]}`, fontSize: "0.68rem", fontWeight: 700 }}>{risk}</span>;
}
function StatusBadge({ status }: { status: Status }) {
  const on = status === "Aktif";
  return <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: on ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.15)", color: on ? "#34d399" : "#9ca3af", border: `1px solid ${on ? "rgba(16,185,129,0.25)" : "rgba(107,114,128,0.25)"}`, fontSize: "0.68rem", fontWeight: 700 }}>{status}</span>;
}
function CatBadge({ cat }: { cat: Category }) {
  return <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", fontSize: "0.68rem", fontWeight: 700 }}>{cat}</span>;
}
function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl px-3 py-2 outline-none shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: value ? "#e2e8f0" : "#6b7280", fontSize: "0.78rem", cursor: "pointer" }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6"
        style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white" style={{ fontWeight: 800, fontSize: "1rem" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5"><X size={16} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

type FormData = Omit<UrlEntry, "id" | "createdAt" | "scanCount">;
function UrlForm({ initial, onSubmit, onCancel, submitLabel = "Tambah URL" }: { initial?: Partial<UrlEntry>; onSubmit: (d: FormData) => void; onCancel: () => void; submitLabel?: string }) {
  const [form, setForm] = useState<FormData>({ url: initial?.url ?? "", category: initial?.category ?? "Slot", risk: initial?.risk ?? "Tinggi", status: initial?.status ?? "Aktif", reportedBy: initial?.reportedBy ?? "", notes: initial?.notes ?? "" });
  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const cls = "rounded-xl px-4 py-2.5 outline-none w-full";
  const sty = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.85rem" };
  const lbl = (t: string, node: React.ReactNode) => <div><label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.75rem", fontWeight: 600 }}>{t}</label>{node}</div>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (form.url.trim()) onSubmit(form); }} className="flex flex-col gap-4">
      {lbl("URL / Domain *", <input type="text" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="contoh: slot-gacor.com" className={cls} style={sty} required />)}
      <div className="grid grid-cols-2 gap-3">
        {lbl("Kategori", <select value={form.category} onChange={(e) => set("category", e.target.value)} className={cls} style={{ ...sty, cursor: "pointer" }}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>)}
        {lbl("Risiko", <select value={form.risk} onChange={(e) => set("risk", e.target.value)} className={cls} style={{ ...sty, cursor: "pointer" }}>{RISKS.map((r) => <option key={r} value={r}>{r}</option>)}</select>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {lbl("Status", <select value={form.status} onChange={(e) => set("status", e.target.value)} className={cls} style={{ ...sty, cursor: "pointer" }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>)}
        {lbl("Dilaporkan Oleh", <input type="text" value={form.reportedBy} onChange={(e) => set("reportedBy", e.target.value)} placeholder="System / User" className={cls} style={sty} />)}
      </div>
      {lbl("Catatan", <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Catatan tambahan (opsional)" rows={3} className={cls} style={{ ...sty, resize: "vertical" }} />)}
      <div className="flex gap-3 mt-1">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white" style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700, fontSize: "0.88rem" }}>
          <Save size={14} /> {submitLabel}
        </motion.button>
        <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl text-gray-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600, fontSize: "0.88rem" }}>Batal</button>
      </div>
    </form>
  );
}

// ── Word form & badge ────────────────────────────────────────────────────────

const WORD_CAT_COLORS: Record<WordCategory, [string, string, string]> = {
  Slot:      ["rgba(239,68,68,0.15)",   "#f87171", "rgba(239,68,68,0.3)"],
  Togel:     ["rgba(245,158,11,0.15)",  "#fbbf24", "rgba(245,158,11,0.3)"],
  Casino:    ["rgba(168,85,247,0.15)",  "#d8b4fe", "rgba(168,85,247,0.3)"],
  Poker:     ["rgba(59,130,246,0.15)",  "#93c5fd", "rgba(59,130,246,0.3)"],
  Sbobet:    ["rgba(20,184,166,0.15)",  "#5eead4", "rgba(20,184,166,0.3)"],
  Sportbook: ["rgba(34,197,94,0.15)",   "#86efac", "rgba(34,197,94,0.3)"],
  Umum:      ["rgba(107,114,128,0.15)", "#d1d5db", "rgba(107,114,128,0.3)"],
};

function WordCatBadge({ cat }: { cat: WordCategory }) {
  const [bg, color, border] = WORD_CAT_COLORS[cat] ?? WORD_CAT_COLORS["Umum"];
  return (
    <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: bg, color, border: `1px solid ${border}`, fontSize: "0.68rem", fontWeight: 700 }}>
      {cat}
    </span>
  );
}

type WordFormData = Omit<WordEntry, "id" | "addedAt">;
function WordForm({ initial, onSubmit, onCancel, submitLabel = "Tambah Kata Kunci" }: {
  initial?: Partial<WordEntry>;
  onSubmit: (d: WordFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<WordFormData>({
    keyword: initial?.keyword ?? "",
    category: initial?.category ?? "Umum",
    description: initial?.description ?? "",
  });
  const [err, setErr] = useState("");
  const set = (k: keyof WordFormData, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErr(""); };

  const cls = "rounded-xl px-4 py-2.5 outline-none w-full";
  const sty = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.85rem" };
  const lbl = (t: string, node: React.ReactNode) => (
    <div><label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.75rem", fontWeight: 600 }}>{t}</label>{node}</div>
  );

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const kw = form.keyword.trim().toLowerCase();
      if (!kw) { setErr("Kata kunci tidak boleh kosong."); return; }
      if (/\s/.test(kw)) { setErr("Gunakan satu kata atau gunakan tanda hubung (misal: new-member)."); return; }
      onSubmit({ ...form, keyword: kw });
    }} className="flex flex-col gap-4">

      {lbl("Kata Kunci *", (
        <div>
          <input type="text" value={form.keyword}
            onChange={(e) => set("keyword", e.target.value)}
            placeholder="contoh: gacor, maxwin, jackpot"
            className={cls}
            style={{ ...sty, border: err ? "1px solid rgba(229,62,62,0.5)" : sty.border, fontFamily: "monospace" }}
            required />
          {err && <p className="text-red-400 mt-1" style={{ fontSize: "0.72rem" }}>{err}</p>}
          <p className="text-gray-600 mt-1" style={{ fontSize: "0.7rem" }}>Lowercase, tanpa spasi. Spasi otomatis dikonversi.</p>
        </div>
      ))}

      {lbl("Kategori", (
        <select value={form.category} onChange={(e) => set("category", e.target.value)} className={cls} style={{ ...sty, cursor: "pointer" }}>
          {WORD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ))}

      {lbl("Deskripsi (opsional)", (
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="Jelaskan konteks penggunaan kata kunci ini..."
          rows={3} className={cls} style={{ ...sty, resize: "vertical" }} />
      ))}

      {/* Preview */}
      {form.keyword.trim() && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <Tag size={13} className="text-indigo-400 shrink-0" />
          <div>
            <p className="text-indigo-300" style={{ fontSize: "0.73rem", fontWeight: 600 }}>Preview regex match:</p>
            <code className="text-indigo-200" style={{ fontSize: "0.8rem" }}>/{form.keyword.trim().toLowerCase()}/i</code>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-1">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontWeight: 700, fontSize: "0.88rem", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
          <Save size={14} /> {submitLabel}
        </motion.button>
        <button type="button" onClick={onCancel}
          className="px-4 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600, fontSize: "0.88rem" }}>
          Batal
        </button>
      </div>
    </form>
  );
}
