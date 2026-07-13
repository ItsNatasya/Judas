import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield, Search, AlertTriangle, CheckCircle, Star,
  Mail, Phone, MapPin, ExternalLink, Menu, X,
  Zap, Eye, Lock, Globe, ChevronUp, Send, MessageSquarePlus,
} from "lucide-react";
import { reviewsDb, type Review } from "../store/reviews";
import { activeUsers } from "../store/stats";
import { scanUrl } from "../lib/scan";

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [scanTick, setScanTick] = useState(0);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  if (typeof window !== "undefined") {
    window.onscroll = () => setShowBackTop(window.scrollY > 300);
  }

  const navLinks = [
    { label: "Beranda", id: "hero" },
    { label: "About Us", id: "about" },
    { label: "Ulasan", id: "ulasan" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <div className="min-h-screen bg-[#080c18] text-white" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080c18]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <Shield size={16} className="text-white" />
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "0.12em", color: "#ff4d4d" }}>JUDAS</span>
          </button>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="text-sm text-gray-400 hover:text-white transition-colors" style={{ fontWeight: 500 }}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
              onClick={() => scrollTo("hero")}
              className="px-4 py-2 rounded-xl text-sm text-white"
              style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700, boxShadow: "0 4px 14px rgba(229,62,62,0.35)" }}
            >
              Cek Sekarang
            </motion.button>
          </div>

          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-300" style={{ background: "rgba(255,255,255,0.06)" }} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="md:hidden border-t border-white/5 overflow-hidden" style={{ background: "#0d1225" }}>
              <div className="px-4 py-4 flex flex-col gap-1">
                {navLinks.map((item) => (
                  <button key={item.id} onClick={() => scrollTo(item.id)} className="text-left px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors" style={{ fontWeight: 500 }}>
                    {item.label}
                  </button>
                ))}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => scrollTo("hero")} className="mt-2 w-full py-3 rounded-xl text-sm text-white" style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700 }}>
                  Cek Sekarang
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-12">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(229,62,62,0.13) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,77,77,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,77,77,0.2) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

        <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs"
            style={{ background: "rgba(229,62,62,0.14)", border: "1px solid rgba(229,62,62,0.28)", color: "#fc8181", fontWeight: 700, letterSpacing: "0.07em" }}>
            <Zap size={11} /> DETEKSI LINK JUDI ONLINE REAL-TIME
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-4"
            style={{ fontWeight: 900, lineHeight: 1.1, fontSize: "clamp(2rem,6vw,3.5rem)" }}>
            Lindungi Dirimu dari{" "}
            <span style={{ background: "linear-gradient(90deg,#ff4d4d,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Link Judol
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.22 }}
            className="text-gray-400 mb-8 max-w-md mx-auto" style={{ fontSize: "clamp(0.85rem,2.2vw,1rem)", lineHeight: 1.65 }}>
            Masukkan URL yang mencurigakan. JUDAS akan memverifikasi apakah tautan tersebut terindikasi judi online secara instan.
          </motion.p>

          <ScanCard onScan={() => setScanTick((t) => t + 1)} />

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-10 grid grid-cols-3 gap-3 max-w-xs sm:max-w-sm mx-auto">
            {[{ v: "30K+", l: "Link Terdeteksi" }, { v: "77,7%", l: "Akurasi" }, { v: "< 1s", l: "Waktu Scan" }].map((s) => (
              <div key={s.l} className="text-center">
                <div style={{ fontWeight: 900, fontSize: "clamp(1.2rem,3.5vw,1.6rem)", color: "#ff4d4d" }}>{s.v}</div>
                <div className="text-gray-500" style={{ fontSize: "0.68rem", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)" }} className="mb-2">
              Kenapa Pakai <span style={{ color: "#ff4d4d" }}>JUDAS?</span>
            </h2>
            <p className="text-gray-400 max-w-md mx-auto" style={{ fontSize: "clamp(0.82rem,2vw,0.95rem)" }}>
              Sistem deteksi canggih kami menganalisis ratusan parameter untuk memastikan keamananmu.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: <Eye size={22} />, title: "Deteksi Otomatis", desc: "AI kami memindai dan mengenali pola link judol secara otomatis tanpa input manual.", color: "#e53e3e" },
              { icon: <Lock size={22} />, title: "Database Real-time", desc: "Database diperbarui setiap saat mengikuti domain judol terbaru yang beredar.", color: "#dd6b20" },
              { icon: <Globe size={22} />, title: "Laporan Lengkap", desc: "Dapatkan laporan detail: skor risiko, kategori, dan rekomendasi tindakan.", color: "#d69e2e" },
            ].map((f) => (
              <motion.div key={f.title} whileHover={{ y: -5 }} transition={{ duration: 0.2 }} className="rounded-2xl p-5 sm:p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${f.color}22`, color: f.color }}>{f.icon}</div>
                <h3 className="mb-2" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f7fafc" }}>{f.title}</h3>
                <p className="text-gray-400" style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#0d1225]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
              <span className="text-xs tracking-widest mb-2 block" style={{ color: "#f97316", fontWeight: 700 }}>TENTANG KAMI</span>
              <h2 style={{ fontWeight: 800, fontSize: "clamp(1.5rem,3.5vw,2.2rem)", lineHeight: 1.2 }} className="mb-4">
                Kami Hadir untuk <span style={{ color: "#ff4d4d" }}>Melindungi</span> Masyarakat Digital
              </h2>
              <p className="text-gray-400 mb-3 leading-relaxed" style={{ fontSize: "clamp(0.82rem,2vw,0.92rem)" }}>
                JUDAS (Judi URL Detection & Analysis System) adalah platform deteksi link judi online yang dikembangkan oleh tim ahli keamanan siber berpengalaman.
              </p>
              <p className="text-gray-400 mb-5 leading-relaxed" style={{ fontSize: "clamp(0.82rem,2vw,0.92rem)" }}>
                Dengan teknologi machine learning terkini, kami mampu mendeteksi domain judol baru dalam hitungan detik, bahkan sebelum dilaporkan secara resmi.
              </p>
              <div className="flex flex-wrap gap-2">
                {["AI-Powered", "Open Source", "Free to Use", "Real-time"].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full" style={{ background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.25)", color: "#fc8181", fontWeight: 600, fontSize: "0.72rem" }}>{tag}</span>
                ))}
              </div>
            </motion.div>
            <AboutStats scanTick={scanTick} />
          </div>
        </div>
      </section>

      {/* ULASAN */}
      <UlasanSection />

      {/* CONTACT */}
      <section id="contact" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#0d1225]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs tracking-widest mb-2 block" style={{ color: "#f97316", fontWeight: 700 }}>HUBUNGI KAMI</span>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)" }}>Ada Pertanyaan?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: <Mail size={20} />, label: "Email", val: "judas@judol.id" },
              { icon: <Phone size={20} />, label: "Telepon", val: "+62 812-3456-7890" },
              { icon: <MapPin size={20} />, label: "Lokasi", val: "Jakarta, Indonesia" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(229,62,62,0.14)", color: "#fc8181" }}>{c.icon}</div>
                <div className="text-gray-500 mb-1" style={{ fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.09em" }}>{c.label}</div>
                <div className="text-gray-200" style={{ fontWeight: 500, fontSize: "0.82rem" }}>{c.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center"><Shield size={13} className="text-white" /></div>
            <span style={{ fontWeight: 900, letterSpacing: "0.12em", color: "#ff4d4d", fontSize: "0.95rem" }}>JUDAS</span>
          </div>
          <p className="text-gray-600 text-center" style={{ fontSize: "0.72rem" }}>© 2024 JUDAS — Judi URL Detection & Analysis System. Semua hak dilindungi.</p>
          <div className="flex gap-4">
            {["Privasi", "Syarat", "API"].map((l) => (
              <button key={l} className="text-gray-500 hover:text-gray-300 transition-colors" style={{ fontSize: "0.72rem" }}>{l}</button>
            ))}
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showBackTop && (
          <motion.button initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-5 right-5 w-10 h-10 rounded-full flex items-center justify-center z-50"
            style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", boxShadow: "0 4px 16px rgba(229,62,62,0.45)" }}>
            <ChevronUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScanCard({ onScan }: { onScan?: () => void }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "scanning" | "judol" | "aman" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleScan = async () => {
    if (!url.trim()) return;
    setStatus("scanning");
    activeUsers.increment();
    onScan?.();
    try {
      const result = await scanUrl(url);
      setStatus(result.label === "Judol" ? "judol" : "aman");
    } catch (err: any) {
      setErrorMsg(
        err?.code === "19"
          ? "Terlalu banyak permintaan, coba lagi sesaat lagi."
          : "Gagal menghubungi server pemindai. Periksa koneksi Anda."
      );
      setStatus("error");
    }
  };

  const handleReset = () => { setUrl(""); setStatus("idle"); };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.38 }}
      className="w-full rounded-2xl p-4 sm:p-6"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(229,62,62,0.18)", color: "#fc8181" }}><Search size={16} /></div>
        <div className="text-left">
          <div className="text-white" style={{ fontWeight: 700, fontSize: "0.9rem" }}>Periksa URL / Domain</div>
          <div className="text-gray-500" style={{ fontSize: "0.73rem" }}>Masukkan tautan untuk diverifikasi</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input type="url" inputMode="url" value={url}
          onChange={(e) => { setUrl(e.target.value); if (status !== "idle" && status !== "scanning") setStatus("idle"); }}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="https://contoh-situs.com"
          disabled={status === "scanning"}
          className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.85rem" }} />
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleScan}
          disabled={!url.trim() || status === "scanning"}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm text-white"
          style={{ background: !url.trim() || status === "scanning" ? "rgba(229,62,62,0.28)" : "linear-gradient(135deg,#e53e3e,#dd6b20)", cursor: !url.trim() || status === "scanning" ? "not-allowed" : "pointer", fontWeight: 700, minWidth: 88, fontSize: "0.85rem" }}>
          {status === "scanning"
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}><Search size={15} /></motion.div>
            : <><Search size={14} /> Scan</>}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {status === "scanning" && (
          <motion.div key="scanning" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }} className="w-2 h-2 rounded-full" style={{ background: "#f6ad55" }} />
            <span className="text-yellow-400" style={{ fontWeight: 600, fontSize: "0.83rem" }}>Memindai tautan...</span>
          </motion.div>
        )}
        {status === "judol" && (
          <motion.div key="judol" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-xl px-4 py-4" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.32)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-red-400 mb-1" style={{ fontWeight: 800, fontSize: "0.88rem" }}>⚠ TERINDIKASI JUDOL</div>
                <div className="text-red-300 leading-relaxed break-all" style={{ fontSize: "0.78rem" }}>Tautan <span className="font-mono text-red-200">{url}</span> terdeteksi mengandung konten judi online. <strong>Hindari mengakses tautan ini!</strong></div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 rounded" style={{ fontSize: "0.72rem", background: "rgba(127,29,29,0.5)", color: "#fca5a5" }}>Risiko: TINGGI</span>
                  <span className="px-2 py-1 rounded" style={{ fontSize: "0.72rem", background: "rgba(127,29,29,0.5)", color: "#fca5a5" }}>Kategori: Judol</span>
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="mt-3 text-gray-500 hover:text-gray-300 underline" style={{ fontSize: "0.73rem" }}>Cek URL lain</button>
          </motion.div>
        )}
        {status === "aman" && (
          <motion.div key="aman" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-xl px-4 py-4" style={{ background: "rgba(56,161,105,0.1)", border: "1px solid rgba(56,161,105,0.32)" }}>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-green-400 mb-1" style={{ fontWeight: 800, fontSize: "0.88rem" }}>✓ AMAN</div>
                <div className="text-green-300 leading-relaxed break-all" style={{ fontSize: "0.78rem" }}>Tautan <span className="font-mono text-green-200">{url}</span> tidak terdeteksi sebagai situs judi online. Tetap waspada ya!</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 rounded" style={{ fontSize: "0.72rem", background: "rgba(20,83,45,0.5)", color: "#86efac" }}>Risiko: RENDAH</span>
                  <span className="px-2 py-1 rounded" style={{ fontSize: "0.72rem", background: "rgba(20,83,45,0.5)", color: "#86efac" }}>Status: Aman</span>
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="mt-3 text-gray-500 hover:text-gray-300 underline" style={{ fontSize: "0.73rem" }}>Cek URL lain</button>
          </motion.div>
        )}
        {status === "error" && (
          <motion.div key="error" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-xl px-4 py-4" style={{ background: "rgba(107,114,128,0.12)", border: "1px solid rgba(107,114,128,0.32)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-gray-300 mb-1" style={{ fontWeight: 800, fontSize: "0.88rem" }}>Gagal memindai</div>
                <div className="text-gray-400 leading-relaxed" style={{ fontSize: "0.78rem" }}>{errorMsg}</div>
              </div>
            </div>
            <button onClick={handleReset} className="mt-3 text-gray-500 hover:text-gray-300 underline" style={{ fontSize: "0.73rem" }}>Coba lagi</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-1 mt-3">
        <ExternalLink size={11} className="text-gray-600 shrink-0" />
        <span className="text-gray-600" style={{ fontSize: "0.72rem" }}>Coba:</span>
        {[{ label: "slot-gacor.com", url: "slot-gacor-maxwin.com" }, { label: "google.com", url: "google.com" }].map((ex) => (
          <button key={ex.label} onClick={() => { setUrl(ex.url); setStatus("idle"); }} className="text-gray-500 hover:text-gray-300 underline transition-colors" style={{ fontSize: "0.72rem" }}>{ex.label}</button>
        ))}
      </div>
    </motion.div>
  );
}

// ── About Stats ─────────────────────────────────────────────────────────────

function AboutStats({ scanTick }: { scanTick: number }) {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    setUserCount(activeUsers.get());
  }, [scanTick]);

  const items = [
    { num: "2026", label: "Tahun Berdiri" },
    { num: "3", label: "Tim Developer" },
    { num: userCount.toLocaleString("id-ID"), label: "Pengguna Aktif" },
    { num: "24/7", label: "Layanan Aktif" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className="grid grid-cols-2 gap-3 sm:gap-4"
    >
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 900, fontSize: "clamp(1.4rem,3vw,1.9rem)", background: "linear-gradient(90deg,#ff4d4d,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {item.num}
          </div>
          <div className="text-gray-400" style={{ fontSize: "0.72rem", marginTop: 4 }}>{item.label}</div>
        </div>
      ))}
    </motion.div>
  );
}

// ── Ulasan Section ──────────────────────────────────────────────────────────

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={22}
            className="transition-colors"
            style={{ color: s <= (hovered || value) ? "#f6ad55" : "#374151" }}
            fill={s <= (hovered || value) ? "#f6ad55" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

function UlasanSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", message: "", rating: 5 });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    reviewsDb.getApproved().then(setReviews).catch(() => setReviews([]));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.message.trim()) e.message = "Ulasan wajib diisi";
    if (form.message.trim().length < 10) e.message = "Ulasan minimal 10 karakter";
    if (form.rating === 0) e.rating = "Pilih rating bintang";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await reviewsDb.add({ name: form.name.trim(), role: form.role.trim() || "Pengguna", message: form.message.trim(), rating: form.rating });
      // Catatan: ulasan baru berstatus "Menunggu" -- BELUM langsung tampil di
      // daftar publik sampai admin menyetujuinya lewat Admin Dashboard.
      setSubmitted(true);
      setShowForm(false);
      setForm({ name: "", role: "", message: "", rating: 5 });
      setErrors({});
    } catch {
      setSubmitError("Gagal mengirim ulasan. Periksa koneksi Anda dan coba lagi.");
    }
  };

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";

  return (
    <section id="ulasan" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs tracking-widest mb-2 block" style={{ color: "#f97316", fontWeight: 700 }}>ULASAN PENGGUNA</span>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)" }}>
              Apa Kata <span style={{ color: "#ff4d4d" }}>Mereka?</span>
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={13} fill={s <= Math.round(Number(avgRating)) ? "#f6ad55" : "none"} style={{ color: "#f6ad55" }} />
                  ))}
                </div>
                <span className="text-gray-400" style={{ fontSize: "0.78rem" }}>{avgRating} dari {reviews.length} ulasan</span>
              </div>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setShowForm(!showForm); setSubmitted(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white shrink-0 self-start sm:self-auto"
            style={{ background: showForm ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700, border: showForm ? "1px solid rgba(255,255,255,0.12)" : "none" }}
          >
            <MessageSquarePlus size={15} />
            {showForm ? "Tutup" : "Tulis Ulasan"}
          </motion.button>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 rounded-2xl px-5 py-4 mb-6"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-green-400" style={{ fontWeight: 700, fontSize: "0.88rem" }}>Ulasan terkirim!</div>
                <div className="text-green-300" style={{ fontSize: "0.78rem" }}>Terima kasih! Ulasan kamu akan tampil setelah ditinjau oleh admin.</div>
              </div>
              <button onClick={() => setSubmitted(false)} className="ml-auto text-green-700 hover:text-green-400 transition-colors shrink-0"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-8"
            >
              <form onSubmit={handleSubmit} className="rounded-2xl p-5 sm:p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <h3 className="text-white mb-5 flex items-center gap-2" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  <MessageSquarePlus size={16} className="text-red-400" /> Tulis Ulasanmu
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Nama *</label>
                    <input
                      type="text" value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }}
                      placeholder="Nama kamu"
                      className="w-full rounded-xl px-4 py-2.5 text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: errors.name ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem" }}
                    />
                    {errors.name && <p className="text-red-400 mt-1" style={{ fontSize: "0.72rem" }}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Profesi / Peran <span className="text-gray-600">(opsional)</span></label>
                    <input
                      type="text" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      placeholder="Mahasiswa, Orang Tua, dll."
                      className="w-full rounded-xl px-4 py-2.5 text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Rating *</label>
                  <StarInput value={form.rating} onChange={(v) => { setForm((f) => ({ ...f, rating: v })); setErrors((er) => ({ ...er, rating: "" })); }} />
                  {errors.rating && <p className="text-red-400 mt-1" style={{ fontSize: "0.72rem" }}>{errors.rating}</p>}
                </div>

                <div className="mb-5">
                  <label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Ulasan *</label>
                  <textarea
                    value={form.message} onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((er) => ({ ...er, message: "" })); }}
                    placeholder="Ceritakan pengalamanmu menggunakan JUDAS..."
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: errors.message ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem", resize: "vertical" }}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.message ? <p className="text-red-400" style={{ fontSize: "0.72rem" }}>{errors.message}</p> : <span />}
                    <span className="text-gray-600" style={{ fontSize: "0.7rem" }}>{form.message.length}/500</span>
                  </div>
                </div>

                {submitError && (
                  <p className="text-red-400 mb-2" style={{ fontSize: "0.78rem" }}>{submitError}</p>
                )}

                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 700, boxShadow: "0 4px 14px rgba(229,62,62,0.25)" }}>
                    <Send size={14} /> Kirim Ulasan
                  </motion.button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 600 }}>
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews grid */}
        {reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-600" style={{ fontSize: "0.88rem" }}>
            Belum ada ulasan. Jadilah yang pertama!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-5 flex flex-col"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={13} fill={s < r.rating ? "#f6ad55" : "none"} style={{ color: "#f6ad55" }} />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 leading-relaxed flex-1" style={{ fontSize: "0.83rem" }}>"{r.message}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: "linear-gradient(135deg,#e53e3e,#dd6b20)", fontWeight: 800 }}>
                      {r.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#f7fafc" }}>{r.name}</div>
                      <div className="text-gray-500" style={{ fontSize: "0.72rem" }}>{r.role}</div>
                    </div>
                  </div>
                  <span className="text-gray-600" style={{ fontSize: "0.68rem" }}>{r.createdAt}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
