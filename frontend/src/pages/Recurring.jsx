import React, { useState } from "react";
import {
  Plus,
  Repeat,
  Pause,
  Play,
  Pencil,
  Square,
  RefreshCw,
} from "lucide-react";
import { useAuth, useData, useMoney, useToast } from "../lib/context";
import { localDate, api } from "../lib/api";
import {
  Button,
  Empty,
  EntityForm,
  Confirm,
  Badge,
  Actions,
} from "../components/ui";
const freq = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};
export default function Recurring() {
  const data = useData(),
    { user } = useAuth(),
    money = useMoney(),
    toast = useToast();
  const [edit, setEdit] = useState(null),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false);
  async function process() {
    setBusy(true);
    try {
      const r = await api("/recurring/process", { method: "POST", body: {} });
      await data.reload();
      toast(r.processed + " transaksi jatuh tempo diproses.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">KEBIASAAN BAIK, OTOMATIS</span>
          <h1>
            Catatan rutin yang berjalan sendiri
            <span className="heading-dot">.</span>
          </h1>
          <p>Jadwal diproses backend setiap menit, sesuai zona waktu Anda.</p>
        </div>
        <div className="page-heading-actions">
          <Button variant="secondary" loading={busy} onClick={process}>
            <RefreshCw size={16} />
            Proses jatuh tempo
          </Button>
          <Button onClick={() => setEdit({})}>
            <Plus size={17} />
            Buat jadwal
          </Button>
        </div>
      </div>
      {data.recurring.length ? (
        <div className="entity-grid">
          {data.recurring.map((r) => (
            <article className="panel" key={r.id}>
              <div className="card-top">
                <span className="entity-icon">
                  <Repeat size={22} />
                </span>
                <Actions>
                  <button onClick={() => setEdit(r)}>
                    <Pencil size={14} />
                    Ubah jadwal
                  </button>
                  {!r.isEnded && (
                    <>
                      <button
                        onClick={() =>
                          setAction({
                            r,
                            body: { isPaused: !r.isPaused },
                            title: r.isPaused
                              ? "Lanjutkan jadwal?"
                              : "Jeda jadwal?",
                          })
                        }
                      >
                        {r.isPaused ? <Play size={14} /> : <Pause size={14} />}{" "}
                        {r.isPaused ? "Lanjutkan" : "Jeda"}
                      </button>
                      <button
                        onClick={() =>
                          setAction({
                            r,
                            body: { isEnded: true },
                            title: "Akhiri jadwal?",
                          })
                        }
                      >
                        <Square size={14} />
                        Akhiri
                      </button>
                    </>
                  )}
                </Actions>
              </div>
              <h2>
                {r.description ||
                  data.categories.find((c) => c.id === r.categoryId)?.name}
              </h2>
              <p className="muted">
                {freq[r.frequency]} ·{" "}
                {data.accounts.find((a) => a.id === r.accountId)?.name}
              </p>
              <strong className={"large-amount " + r.type}>
                {money(r.amount)}
              </strong>
              <Badge type={r.isEnded ? "" : r.isPaused ? "warning" : "safe"}>
                {r.isEnded ? "Diakhiri" : r.isPaused ? "Dijeda" : "Aktif"}
              </Badge>
              <dl className="compact-details">
                <div>
                  <dt>Eksekusi berikutnya</dt>
                  <dd>{r.isEnded ? "—" : r.nextRunAt}</dd>
                </div>
                <div>
                  <dt>Eksekusi terakhir</dt>
                  <dd>{r.lastRunAt || "Belum pernah"}</dd>
                </div>
                <div>
                  <dt>Sampai</dt>
                  <dd>{r.endDate || "Tanpa batas"}</dd>
                </div>
              </dl>
              {r.lastError && <p className="form-error">{r.lastError}</p>}
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Rutinitas, tanpa catatan berulang"
            description="Jadwalkan gaji, sewa, atau pengeluaran rutin lainnya."
            action={<Button onClick={() => setEdit({})}>Buat jadwal</Button>}
          />
        </section>
      )}
      <p className="info-note">
        Saat dilanjutkan, jadwal yang tertunda akan diproses dari tanggal
        eksekusi berikutnya. Perubahan tidak mengubah transaksi historis.
        Tanggal bulanan mengikuti hari awal dan menyesuaikan akhir bulan.
      </p>
      {edit && (
        <EntityForm
          title={edit.id ? "Ubah jadwal" : "Buat jadwal berulang"}
          initial={edit}
          path={"/recurring" + (edit.id ? "/" + edit.id : "")}
          method={edit.id ? "PATCH" : "POST"}
          onClose={() => setEdit(null)}
          fields={[
            {
              name: "type",
              label: "Jenis transaksi",
              type: "select",
              default: "expense",
              options: [
                { value: "expense", label: "Pengeluaran" },
                { value: "income", label: "Pemasukan" },
              ],
            },
            { name: "amount", label: "Nominal", type: "number", min: 0.01 },
            {
              name: "accountId",
              label: "Rekening",
              type: "select",
              options: data.accounts
                .filter((a) => !a.isArchived)
                .map((a) => ({ value: a.id, label: a.name })),
            },
            {
              name: "categoryId",
              label: "Kategori",
              type: "select",
              options: (v) =>
                data.categories
                  .filter((c) => !c.isArchived && c.type === v.type)
                  .map((c) => ({ value: c.id, label: c.name })),
            },
            {
              name: "frequency",
              label: "Frekuensi",
              type: "select",
              default: "monthly",
              options: Object.entries(freq).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              name: "startDate",
              label: "Tanggal mulai",
              type: "date",
              default: localDate(user.timezone),
            },
            {
              name: "endDate",
              label: "Tanggal akhir",
              type: "date",
              optional: true,
              nullable: true,
            },
            {
              name: "description",
              label: "Deskripsi",
              type: "textarea",
              optional: true,
              full: true,
            },
          ]}
        />
      )}{" "}
      {action && (
        <Confirm
          title={action.title}
          description="Transaksi yang sudah dibuat tetap tersimpan. Tindakan ini berlaku untuk eksekusi berikutnya."
          path={"/recurring/" + action.r.id}
          method="PATCH"
          body={action.body}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}
