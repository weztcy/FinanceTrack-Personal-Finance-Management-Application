import React, { useEffect, useState } from "react";
import {
  Plus,
  Target,
  Pencil,
  Pause,
  Play,
  Archive,
  History,
  Check,
  Trash2,
} from "lucide-react";
import { useAuth, useData, useMoney } from "../lib/context";
import { localDate, api } from "../lib/api";
import {
  Button,
  Empty,
  EntityForm,
  Confirm,
  Badge,
  Actions,
  Progress,
  Modal,
  Loading,
  ErrorState,
} from "../components/ui";
export default function Goals() {
  const data = useData(),
    { user } = useAuth(),
    money = useMoney();
  const [edit, setEdit] = useState(null),
    [contribute, setContribute] = useState(null),
    [history, setHistory] = useState(null),
    [action, setAction] = useState(null),
    [archived, setArchived] = useState(false);
  const shown = data.goals.filter((g) => archived || g.status !== "archived");
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEDIKIT DEMI SEDIKIT</span>
          <h1>
            Bangun masa depan versi Anda<span className="heading-dot">.</span>
          </h1>
          <p>Setiap kontribusi adalah langkah lebih dekat ke tujuan.</p>
        </div>
        <Button onClick={() => setEdit({})}>
          <Plus size={17} />
          Buat target
        </Button>
      </div>
      <div className="goal-explanation">
        <Target size={22} />
        <p>
          Kontribusi adalah <strong>catatan progres tabungan</strong>.
          Kontribusi tidak mengurangi saldo rekening dan tidak dihitung sebagai
          pengeluaran. Gunakan menu Transaksi untuk memindahkan dana.
        </p>
      </div>
      <label className="check-label list-toolbar">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Tampilkan target arsip
      </label>
      {shown.length ? (
        <div className="entity-grid">
          {shown.map((g) => (
            <article className="panel goal-card" key={g.id}>
              <div className="card-top">
                <span className="entity-icon">
                  <Target size={23} />
                </span>
                <Actions>
                  <button onClick={() => setEdit(g)}>
                    <Pencil size={14} />
                    Ubah target
                  </button>
                  <button onClick={() => setHistory(g)}>
                    <History size={14} />
                    Riwayat kontribusi
                  </button>
                  {g.status !== "archived" && (
                    <>
                      <button
                        onClick={() =>
                          setAction({
                            g,
                            status: g.status === "paused" ? "active" : "paused",
                            title:
                              g.status === "paused"
                                ? "Lanjutkan target?"
                                : "Jeda target?",
                          })
                        }
                      >
                        {g.status === "paused" ? (
                          <Play size={14} />
                        ) : (
                          <Pause size={14} />
                        )}{" "}
                        {g.status === "paused" ? "Lanjutkan" : "Jeda"}
                      </button>
                      <button
                        onClick={() =>
                          setAction({
                            g,
                            status: "completed",
                            title: "Selesaikan target?",
                          })
                        }
                      >
                        <Check size={14} />
                        Selesaikan
                      </button>
                      <button
                        onClick={() =>
                          setAction({
                            g,
                            status: "archived",
                            title: "Arsipkan target?",
                          })
                        }
                      >
                        <Archive size={14} />
                        Arsipkan
                      </button>
                    </>
                  )}
                </Actions>
              </div>
              <h2>{g.name}</h2>
              <Badge
                type={
                  g.isAchieved ? "safe" : g.status === "paused" ? "warning" : ""
                }
              >
                {g.isAchieved
                  ? "Target tercapai"
                  : {
                      active: "Sedang berjalan",
                      paused: "Dijeda",
                      completed: "Selesai",
                      archived: "Arsip",
                    }[g.status]}
              </Badge>
              <div className="goal-amount">
                <strong>{money(g.currentAmount)}</strong>
                <span>dari {money(g.targetAmount)}</span>
              </div>
              <Progress value={g.percentage} />
              <div className="budget-card-footer">
                <span>{Math.min(100, g.percentage).toFixed(1)}% tercapai</span>
                <span>{g.targetDate || "Tanpa tenggat"}</span>
              </div>
              {g.accountId && (
                <p className="muted">
                  Rekening terkait:{" "}
                  {data.accounts.find((a) => a.id === g.accountId)?.name}
                </p>
              )}
              <Button
                variant="secondary full-width"
                disabled={g.status !== "active"}
                onClick={() => setContribute(g)}
              >
                <Plus size={15} />
                Tambah kontribusi
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Mulai dari satu tujuan"
            description="Dana darurat, pendidikan, atau perjalanan impian — apa pun yang berarti untuk Anda."
            action={
              <Button onClick={() => setEdit({})}>Buat target tabungan</Button>
            }
          />
        </section>
      )}
      {edit && (
        <EntityForm
          title={edit.id ? "Ubah target" : "Buat target tabungan"}
          initial={edit}
          path={"/goals" + (edit.id ? "/" + edit.id : "")}
          method={edit.id ? "PATCH" : "POST"}
          onClose={() => setEdit(null)}
          fields={[
            { name: "name", label: "Nama target", full: true },
            {
              name: "targetAmount",
              label: "Nominal target",
              type: "number",
              min: 0.01,
            },
            {
              name: "targetDate",
              label: "Tanggal target",
              type: "date",
              optional: true,
              nullable: true,
            },
            {
              name: "accountId",
              label: "Rekening terkait",
              type: "select",
              optional: true,
              nullable: true,
              full: true,
              options: data.accounts
                .filter((a) => !a.isArchived)
                .map((a) => ({ value: a.id, label: a.name })),
            },
          ]}
        />
      )}{" "}
      {contribute && (
        <EntityForm
          title={"Kontribusi · " + contribute.name}
          description="Pencatatan progres saja. Saldo rekening tidak berubah."
          path={"/goals/" + contribute.id + "/contributions"}
          onClose={() => setContribute(null)}
          fields={[
            {
              name: "amount",
              label: "Nominal kontribusi",
              type: "number",
              min: 0.01,
            },
            {
              name: "date",
              label: "Tanggal",
              type: "date",
              default: localDate(user.timezone),
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
      {history && (
        <ContributionHistory goal={history} onClose={() => setHistory(null)} />
      )}{" "}
      {action && (
        <Confirm
          title={action.title}
          description="Riwayat kontribusi dan progres tetap disimpan."
          path={"/goals/" + action.g.id}
          method="PATCH"
          body={{ status: action.status }}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}
function ContributionHistory({ goal, onClose }) {
  const data = useData(),
    money = useMoney();
  const [rows, setRows] = useState(null),
    [error, setError] = useState(""),
    [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null);
  useEffect(() => {
    api("/goals/" + goal.id + "/contributions")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [goal.id, data.version]);
  if (edit)
    return (
      <EntityForm
        title="Ubah kontribusi"
        initial={edit}
        path={"/goals/" + goal.id + "/contributions/" + edit.id}
        method="PATCH"
        onClose={() => setEdit(null)}
        fields={[
          {
            name: "amount",
            label: "Nominal kontribusi",
            type: "number",
            min: 0.01,
          },
          { name: "date", label: "Tanggal", type: "date" },
          {
            name: "note",
            label: "Catatan",
            type: "textarea",
            optional: true,
            full: true,
          },
        ]}
      />
    );
  if (remove)
    return (
      <Confirm
        title="Batalkan kontribusi?"
        description="Progres target akan dihitung ulang. Saldo rekening tidak berubah."
        path={"/goals/" + goal.id + "/contributions/" + remove.id + "/void"}
        onClose={() => setRemove(null)}
        danger
      />
    );
  return (
    <Modal title={"Riwayat · " + goal.name} onClose={onClose} wide>
      {error ? (
        <ErrorState message={error} />
      ) : !rows ? (
        <Loading />
      ) : rows.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Catatan</th>
                <th>Nominal</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.date}</td>
                  <td>{c.note || "—"}</td>
                  <td>{money(c.amount)}</td>
                  <td>
                    <Badge type={c.status === "active" ? "safe" : ""}>
                      {c.status === "active" ? "Aktif" : "Dibatalkan"}
                    </Badge>
                  </td>
                  <td>
                    {c.status === "active" && (
                      <div className="inline-actions">
                        <button
                          className="icon-button"
                          aria-label="Ubah kontribusi"
                          onClick={() => setEdit(c)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Batalkan kontribusi"
                          onClick={() => setRemove(c)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Belum ada kontribusi" />
      )}
      <div className="dialog-bottom">
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </Modal>
  );
}
