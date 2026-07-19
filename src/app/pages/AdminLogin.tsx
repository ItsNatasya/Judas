import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { login, ApiError } from "../lib/api";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/dashboard");
    } catch (err) {
      if (err instanceof ApiError && (err.code === "15" || err.code === "12")) {
        setError("Username atau password salah.");
      } else {
        setError("Tidak dapat terhubung ke server. Periksa koneksi backend.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c18] flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* BG */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(229,62,62,0.10) 0%, transparent 70%)" }} />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "linear-gradient(rgba(255,77,77,0.2) 1px, transparent 1px),linear-gradient(90deg,rgba(255,77,77,0.2) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-sm">

        {/* Back to site */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-8" style={{ fontSize: "0.8rem" }}>
          <ArrowLeft size={14} /> Kembali ke situs
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "0.12em", color: "#ff4d4d" }}>JUDAS</div>
            <div className="text-gray-500" style={{ fontSize: "0.7rem", letterSpacing: "0.06em" }}>ADMIN PANEL</div>
          </div>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <h1 className="text-white mb-1" style={{ fontWeight: 800, fontSize: "1.25rem" }}>Masuk Admin</h1>
          <p className="text-gray-500 mb-6" style={{ fontSize: "0.8rem" }}>Akses panel manajemen database JUDAS</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.78rem", fontWeight: 600 }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-white outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: error ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)", fontSize: "0.875rem" }}
              />
            </div>

            <div>
              <label className="text-gray-400 mb-1.5 block" style={{ fontSize: "0.78rem", fontWeight: 600 }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-white outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: error ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)", fontSize: "0.875rem" }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.25)" }}>
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-red-400" style={{ fontSize: "0.78rem" }}>{error}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 rounded-xl text-white mt-1"
              style={{
                background: loading || !username || !password ? "rgba(229,62,62,0.3)" : "linear-gradient(135deg,#e53e3e,#dd6b20)",
                fontWeight: 700, fontSize: "0.9rem",
                cursor: loading || !username || !password ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(229,62,62,0.25)",
              }}
            >
              {loading ? "Memverifikasi..." : "Masuk"}
            </motion.button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/5">
            <p className="text-gray-600 text-center" style={{ fontSize: "0.72rem" }}>
              Gunakan akun admin yang dibuat lewat <span className="text-gray-400 font-mono">scripts/seed_admin.py</span> di backend.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
