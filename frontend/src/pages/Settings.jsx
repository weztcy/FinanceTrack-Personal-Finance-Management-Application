import React, { useState } from "react";
import { User, ShieldCheck, Bell, Trash2, Save, Lock } from "lucide-react";
import { useAuth, useData, useToast } from "../lib/context";
import { api } from "../lib/api";
import { Button, Modal } from "../components/ui";
export default function Settings() {
  const { user, setUser } = useAuth(),
    data = useData(),
    toast = useToast();
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false);
  async function save(e, type) {
    e.preventDefault();
    setBusy(type);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const form = e.currentTarget;
    try {
      if (type === "profile") {
        const r = await api("/profile", { method: "PATCH", body: values });
        setUser(r.user);
      }
      if (type === "notifications") {
        const r = await api("/profile", {
          method: "PATCH",
          body: {
            notificationPreferences: {
              budget: values.budget === "on",
              bill: values.bill === "on",
              recurring: values.recurring === "on",
            },
          },
        });
        setUser(r.user);
        await data.reload();
      }
      if (type === "password") {
        await api("/auth/change-password", { method: "POST", body: values });
        form.reset();
      }
      toast("Pengaturan berhasil diperbarui.");
    } catch (e) {
      setError(e.fields?.map((f) => f.message).join(" · ") || e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RUANG PRIBADI ANDA</span>
          <h1>
            Atur sesuai kebutuhan<span className="heading-dot">.</span>
          </h1>
          <p>Profil, preferensi, dan keamanan akun Anda.</p>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-grid">
        <section className="panel">
          <div className="settings-title">
            <User size={21} />
            <h2>Profil & tampilan</h2>
          </div>
          <form className="auth-form" onSubmit={(e) => save(e, "profile")}>
            <label>
              Nama lengkap
              <input
                name="name"
                defaultValue={user.name}
                required
                maxLength={120}
              />
            </label>
            <label>
              Alamat email
              <input value={user.email} readOnly />
              <small>Email terdaftar untuk masuk dan pemulihan.</small>
            </label>
            <div className="form-grid">
              <label>
                Mata uang
                <select name="currency" defaultValue={user.currency}>
                  {["IDR", "USD", "EUR", "SGD", "MYR"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Zona waktu
                <input
                  name="timezone"
                  defaultValue={user.timezone}
                  required
                  list="timezones"
                />
                <datalist id="timezones">
                  {[
                    "Asia/Jakarta",
                    "Asia/Makassar",
                    "Asia/Jayapura",
                    "Asia/Bangkok",
                    "Asia/Singapore",
                    "UTC",
                    "Europe/London",
                    "America/New_York",
                  ].map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </label>
            </div>
            <p className="info-note">
              Mata uang dikunci setelah data keuangan dibuat. Perubahan tidak
              mengonversi nominal lama.
            </p>
            <label>
              Preferensi tampilan
              <select name="theme" defaultValue={user.theme}>
                <option value="light">Terang</option>
                <option value="dark">Gelap</option>
                <option value="system">Ikuti perangkat</option>
              </select>
            </label>
            <Button type="submit" loading={busy === "profile"}>
              <Save size={16} />
              Simpan profil
            </Button>
          </form>
        </section>
        <div className="settings-right">
          <section className="panel">
            <div className="settings-title">
              <Bell size={21} />
              <h2>Notifikasi dalam aplikasi</h2>
            </div>
            <form
              className="preferences-form"
              onSubmit={(e) => save(e, "notifications")}
            >
              {[
                [
                  "budget",
                  "Peringatan anggaran",
                  "Saat mendekati atau melewati batas.",
                ],
                [
                  "bill",
                  "Pengingat tagihan",
                  "Menjelang tenggat, hari jatuh tempo, dan keterlambatan.",
                ],
                [
                  "recurring",
                  "Kegagalan jadwal berulang",
                  "Jika transaksi otomatis tidak dapat diproses.",
                ],
              ].map(([name, title, description]) => (
                <label key={name}>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <input
                    name={name}
                    type="checkbox"
                    defaultChecked={user.notificationPreferences[name]}
                  />
                </label>
              ))}
              <Button
                type="submit"
                variant="secondary"
                loading={busy === "notifications"}
              >
                Simpan preferensi
              </Button>
            </form>
          </section>
          <section className="panel">
            <div className="settings-title">
              <Lock size={21} />
              <h2>Keamanan akun</h2>
            </div>
            <form className="auth-form" onSubmit={(e) => save(e, "password")}>
              <label>
                Kata sandi saat ini
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={72}
                />
              </label>
              <label>
                Kata sandi baru
                <input
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="Minimal 10 karakter, huruf & angka"
                />
              </label>
              <Button
                type="submit"
                variant="secondary"
                loading={busy === "password"}
              >
                <ShieldCheck size={16} />
                Perbarui kata sandi
              </Button>
            </form>
          </section>
        </div>
        <section className="panel danger-zone">
          <div>
            <h2>Hapus akun</h2>
            <p>
              Akun, sesi, dan seluruh data keuangan akan dihapus permanen. Unduh
              laporan sebelum melanjutkan.
            </p>
          </div>
          <Button variant="danger secondary" onClick={() => setDeleting(true)}>
            <Trash2 size={16} />
            Hapus akun saya
          </Button>
        </section>
      </div>
      {deleting && <DeleteAccount onClose={() => setDeleting(false)} />}
    </div>
  );
}
function DeleteAccount({ onClose }) {
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/profile", {
        method: "DELETE",
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      setUser(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Hapus akun secara permanen?"
      description="Semua rekening, transaksi, anggaran, target, tagihan, serta notifikasi akan dihapus. Tindakan ini tidak dapat dibatalkan."
      onClose={() => !busy && onClose()}
    >
      <form className="auth-form delete-account-form" onSubmit={submit}>
        <label>
          Kata sandi
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          Ketik HAPUS AKUN
          <input
            name="confirmation"
            required
            pattern="HAPUS AKUN"
            autoComplete="off"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </Button>
          <Button type="submit" variant="danger" loading={busy}>
            Hapus permanen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
