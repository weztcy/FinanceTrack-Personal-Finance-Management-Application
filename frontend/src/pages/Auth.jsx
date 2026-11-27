import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ChartNoAxesCombined,
  ShieldCheck,
  Wallet,
  Check,
} from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../lib/context";
import { api } from "../lib/api";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <ChartNoAxesCombined size={22} />
      </span>
      FinanceTrack<span className="brand-dot">.</span>
    </span>
  );
}
export default function AuthPage({ mode = "login" }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const { login } = useAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const titles = {
    login: [
      "Selamat datang kembali.",
      "Masuk untuk melanjutkan perjalanan finansial Anda.",
    ],
    register: [
      "Mulai langkah yang lebih baik.",
      "Buat ruang pribadi untuk mengelola keuangan Anda.",
    ],
    forgot: [
      "Lupa kata sandi?",
      "Masukkan email untuk menerima tautan pemulihan.",
    ],
    reset: [
      "Buat kata sandi baru.",
      "Gunakan minimal 10 karakter, dengan huruf dan angka.",
    ],
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "login" || mode === "register") {
        await login(
          "/auth/" + (mode === "login" ? "login" : "register"),
          values,
        );
        navigate("/", { replace: true });
      } else {
        const r = await api(
          mode === "forgot" ? "/auth/forgot-password" : "/auth/reset-password",
          {
            method: "POST",
            body:
              mode === "forgot"
                ? { email: values.email }
                : {
                    password: values.password,
                    token: params.get("token") || "",
                  },
          },
        );
        setMessage(r.message);
      }
    } catch (e) {
      setError(e.fields?.map((x) => x.message).join(" · ") || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">YOUR MONEY, WITH CLARITY</span>
          <h1>
            Rencana kecil.
            <br />
            Masa depan
            <br />
            <em>lebih tenang.</em>
          </h1>
          <p>
            Kenali kebiasaan Anda, atur pengeluaran,
            <br />
            dan beri ruang untuk hal yang berarti.
          </p>
          <div className="story-card">
            <span className="story-icon">
              <Wallet size={23} />
            </span>
            <div>
              <small>Satu tempat, lebih terarah</small>
              <strong>Keuangan dalam kendali Anda</strong>
            </div>
            <ArrowUpRight size={22} />
          </div>
          <div className="story-checks">
            <span>
              <Check size={14} /> Rekening & transaksi
            </span>
            <span>
              <Check size={14} /> Anggaran & tujuan
            </span>
            <span>
              <Check size={14} /> Laporan keuangan
            </span>
          </div>
        </div>
        <p className="privacy-note">
          <ShieldCheck size={17} /> Data pribadi. Ruang pribadi. Langkah Anda
          sendiri.
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">FINANCETRACK / PERSONAL FINANCE</span>
          <h2>{titles[mode][0]}</h2>
          <p className="muted">{titles[mode][1]}</p>
          {message ? (
            <div className="success-panel" role="status">
              <ShieldCheck size={30} />
              <p>{message}</p>
              <Link to="/login" className="text-link">
                Kembali masuk <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="auth-form">
              {mode === "register" && (
                <label>
                  Nama lengkap
                  <input
                    name="name"
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Nama Anda"
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Alamat email
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="nama@email.com"
                  />
                </label>
              )}
              {mode !== "forgot" && (
                <label>
                  Kata sandi
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={mode === "login" ? 1 : 10}
                    maxLength={72}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder={
                      mode === "login"
                        ? "Masukkan kata sandi"
                        : "Minimal 10 karakter, huruf & angka"
                    }
                  />
                </label>
              )}
              {mode === "register" && (
                <div className="form-grid">
                  <label>
                    Mata uang
                    <select name="currency" defaultValue="IDR">
                      {["IDR", "USD", "EUR", "SGD", "MYR"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Zona waktu
                    <select name="timezone" defaultValue="Asia/Jakarta">
                      {[
                        "Asia/Jakarta",
                        "Asia/Makassar",
                        "Asia/Jayapura",
                        "Asia/Bangkok",
                        "Asia/Singapore",
                        "UTC",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {mode === "login" && (
                <Link to="/forgot-password" className="forgot-link">
                  Lupa kata sandi?
                </Link>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy}>
                {
                  {
                    login: "Masuk ke akun",
                    register: "Buat akun",
                    forgot: "Kirim tautan pemulihan",
                    reset: "Simpan kata sandi",
                  }[mode]
                }
                <ArrowRight size={17} />
              </Button>
            </form>
          )}
          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Belum punya akun? <Link to="/register">Daftar sekarang</Link>
              </>
            ) : mode === "register" ? (
              <>
                Sudah punya akun? <Link to="/login">Masuk</Link>
              </>
            ) : (
              <Link to="/login">Kembali ke halaman masuk</Link>
            )}
          </div>
          <div className="auth-footer">
            <ShieldCheck size={15} /> Kata sandi terenkripsi. Data terisolasi
            per pengguna.
          </div>
        </div>
        <small className="auth-copyright">
          © {new Date().getFullYear()} FinanceTrack. A little clarity goes a
          long way.
        </small>
      </main>
    </div>
  );
}
