import React, { useEffect, useState } from "react";
import {
  Plus,
  CalendarClock,
  Pencil,
  Archive,
  Check,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { useAuth, useData, useMoney, useToast } from "../lib/context";
import { localDate, api, query } from "../lib/api";
import {
  Button,
  Empty,
  EntityForm,
  Confirm,
  Badge,
  Actions,
  Modal,
  Loading,
  ErrorState,
} from "../components/ui";
const statuses = {
  paid: "Dibayar",
  overdue: "Terlambat",
  due: "Jatuh tempo hari ini",
  upcoming: "Akan jatuh tempo",
};
export default function Bills() {
  const data = useData(),
    money = useMoney();
  const [edit, setEdit] = useState(null),
    [pay, setPay] = useState(null),
    [archive, setArchive] = useState(null),
    [filter, setFilter] = useState("unpaid");
  const shown = data.bills
    .filter(
      (b) =>
        !b.isArchived &&
        (filter === "all" || filter === "paid"
          ? filter === "all" || b.status === "paid"
          : b.status !== "paid"),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INGAT YANG PERLU, TENANG SETELAHNYA</span>
          <h1>
            Tagihan dalam rencana<span className="heading-dot">.</span>
          </h1>
          <p>Atur pengingat dan tandai pembayaran tanpa pencatatan ganda.</p>
        </div>
        <Button onClick={() => setEdit({})}>
          <Plus size={17} />
          Tambah tagihan
        </Button>
      </div>
      <div className="tabs">
        {[
          ["unpaid", "Belum dibayar"],
          ["paid", "Sudah dibayar"],
          ["all", "Semua tagihan"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="entity-grid">
          {shown.map((b) => (
            <article className="panel" key={b.id}>
              <div className="card-top">
                <span
                  className={
                    "entity-icon " + (b.status === "overdue" ? "warning" : "")
                  }
                >
                  <CalendarClock size={22} />
                </span>
                {b.status !== "paid" && (
                  <Actions>
                    <button onClick={() => setEdit(b)}>
                      <Pencil size={14} />
                      Ubah tagihan
                    </button>
                    <button onClick={() => setArchive(b)}>
                      <Archive size={14} />
                      Arsipkan
                    </button>
                  </Actions>
                )}
              </div>
              <h2>{b.name}</h2>
              <Badge
                type={
                  b.status === "paid"
                    ? "safe"
                    : b.status === "overdue"
                      ? "exceeded"
                      : b.status === "due"
                        ? "warning"
                        : ""
                }
              >
                {statuses[b.status]}
              </Badge>
              <strong className="large-amount">{money(b.amount)}</strong>
              <dl className="compact-details">
                <div>
                  <dt>Jatuh tempo</dt>
                  <dd>{b.dueDate}</dd>
                </div>
                <div>
                  <dt>Pengingat</dt>
                  <dd>{b.reminderDays} hari sebelumnya</dd>
                </div>
                <div>
                  <dt>Frekuensi</dt>
                  <dd>
                    {
                      {
                        once: "Sekali",
                        daily: "Harian",
                        weekly: "Mingguan",
                        monthly: "Bulanan",
                        yearly: "Tahunan",
                      }[b.frequency]
                    }
                  </dd>
                </div>
              </dl>
              {b.note && <p className="muted">{b.note}</p>}
              <Button
                variant="secondary full-width"
                disabled={b.status === "paid"}
                onClick={() => setPay(b)}
              >
                <Check size={16} />
                {b.status === "paid" ? "Sudah dibayar" : "Tandai dibayar"}
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title={
              filter === "paid"
                ? "Belum ada tagihan dibayar"
                : "Tidak ada tagihan di sini"
            }
            description="Tambahkan tagihan rutin Anda dan dapatkan pengingat dalam aplikasi."
            action={<Button onClick={() => setEdit({})}>Tambah tagihan</Button>}
          />
        </section>
      )}
      {edit && (
        <EntityForm
          title={edit.id ? "Ubah tagihan" : "Tambah tagihan"}
          initial={edit}
          path={"/bills" + (edit.id ? "/" + edit.id : "")}
          method={edit.id ? "PATCH" : "POST"}
          onClose={() => setEdit(null)}
          fields={[
            { name: "name", label: "Nama tagihan", full: true },
            { name: "amount", label: "Nominal", type: "number", min: 0.01 },
            { name: "dueDate", label: "Jatuh tempo", type: "date" },
            {
              name: "categoryId",
              label: "Kategori pengeluaran",
              type: "select",
              options: data.categories
                .filter((c) => c.type === "expense" && !c.isArchived)
                .map((c) => ({ value: c.id, label: c.name })),
            },
            {
              name: "frequency",
              label: "Frekuensi",
              type: "select",
              default: "once",
              options: [
                ["once", "Sekali"],
                ["daily", "Harian"],
                ["weekly", "Mingguan"],
                ["monthly", "Bulanan"],
                ["yearly", "Tahunan"],
              ].map(([value, label]) => ({ value, label })),
            },
            {
              name: "reminderDays",
              label: "Ingatkan berapa hari sebelumnya?",
              type: "number",
              min: 0,
              max: 30,
              default: 3,
              full: true,
            },
            {
              name: "note",
              label: "Catatan",
              type: "textarea",
              optional: true,
              full: true,
            },
          ]}
        />
      )}{" "}
      {pay && <PayBill bill={pay} onClose={() => setPay(null)} />}{" "}
      {archive && (
        <Confirm
          title="Arsipkan tagihan?"
          description="Tagihan ini tidak akan muncul pada daftar aktif dan pengingat."
          path={"/bills/" + archive.id}
          method="PATCH"
          body={{ isArchived: true }}
          onClose={() => setArchive(null)}
        />
      )}
    </div>
  );
}
function PayBill({ bill, onClose }) {
  const data = useData(),
    { user } = useAuth(),
    money = useMoney(),
    toast = useToast();
  const [mode, setMode] = useState("new"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [rows, setRows] = useState(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (mode !== "existing") return;
    let active = true;
    setRows(null);
    api(
      "/transactions?" +
        query({
          type: "expense",
          categoryId: bill.categoryId,
          page,
          pageSize: 20,
          search,
        }),
    )
      .then((r) => active && setRows(r))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [mode, page, search, bill.id]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      await api("/bills/" + bill.id + "/pay", { method: "POST", body: values });
      await data.reload();
      toast("Tagihan ditandai dibayar.");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={"Bayar · " + bill.name}
      description={money(bill.amount) + " · " + bill.dueDate}
      onClose={() => !busy && onClose()}
    >
      <div className="pay-body">
        <div className="tabs">
          <button
            className={mode === "new" ? "active" : ""}
            onClick={() => setMode("new")}
          >
            Buat pengeluaran
          </button>
          <button
            className={mode === "existing" ? "active" : ""}
            onClick={() => setMode("existing")}
          >
            Hubungkan transaksi
          </button>
        </div>
        <form onSubmit={submit} className="auth-form">
          {mode === "new" ? (
            <>
              <p className="muted">
                Satu transaksi pengeluaran akan dibuat dan dihubungkan dengan
                tagihan.
              </p>
              <label>
                Rekening pembayaran
                <select name="accountId" required>
                  <option value="">Pilih rekening</option>
                  {data.accounts
                    .filter((a) => !a.isArchived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Tanggal pembayaran
                <input
                  type="date"
                  name="date"
                  defaultValue={localDate(user.timezone)}
                  required
                />
              </label>
            </>
          ) : (
            <>
              <p className="muted">
                Pilih pengeluaran dengan kategori dan nominal yang sesuai. Tidak
                ada transaksi baru yang dibuat.
              </p>
              <label>
                Cari deskripsi
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari transaksi pembayaran"
                />
              </label>
              {!rows ? (
                <Loading />
              ) : (
                <>
                  <label>
                    Transaksi pengeluaran
                    <select name="transactionId" required defaultValue="">
                      <option value="">Pilih transaksi yang sesuai</option>
                      {rows.items
                        .filter((t) => t.amount === bill.amount)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.date} · {t.description || "Pengeluaran"} ·{" "}
                            {money(t.amount)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="pagination">
                    <span>
                      Halaman {page}/{Math.max(1, rows.pages)}
                    </span>
                    <div>
                      <Button
                        type="button"
                        variant="secondary small-button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        type="button"
                        variant="secondary small-button"
                        disabled={page >= rows.pages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Batal
            </Button>
            <Button type="submit" loading={busy}>
              Tandai dibayar <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
