import React, { useState } from "react";
import { Plus, ChartPie, Pencil, Trash2 } from "lucide-react";
import { useAuth, useData, useMoney } from "../lib/context";
import { localDate } from "../lib/api";
import {
  Button,
  Empty,
  Progress,
  EntityForm,
  Confirm,
  Actions,
  Badge,
} from "../components/ui";
export default function Budgets() {
  const data = useData(),
    { user } = useAuth(),
    money = useMoney();
  const [month, setMonth] = useState(localDate(user.timezone).slice(0, 7)),
    [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null);
  const shown = data.budgets.filter((b) => b.period === month),
    spent = shown.reduce((s, b) => s + b.spent, 0),
    limit = shown.reduce((s, b) => s + b.limitAmount, 0);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BERI RUANG UNTUK PRIORITAS</span>
          <h1>
            Pengeluaran yang terencana<span className="heading-dot">.</span>
          </h1>
          <p>Bangun batas yang sehat untuk setiap kategori keuangan.</p>
        </div>
        <div className="page-heading-actions">
          <input
            aria-label="Bulan anggaran"
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
          <Button onClick={() => setEdit({ period: month })}>
            <Plus size={17} />
            Buat anggaran
          </Button>
        </div>
      </div>
      <div className="budget-summary panel">
        <div>
          <span>Total anggaran</span>
          <strong>{money(limit)}</strong>
        </div>
        <div>
          <span>Sudah terpakai</span>
          <strong>{money(spent)}</strong>
        </div>
        <div>
          <span>Sisa anggaran</span>
          <strong>{money(limit - spent)}</strong>
        </div>
        <Progress value={limit ? (spent / limit) * 100 : 0} />
      </div>
      {shown.length ? (
        <div className="entity-grid">
          {shown.map((b) => {
            const c = data.categories.find((c) => c.id === b.categoryId);
            return (
              <article className="panel budget-card" key={b.id}>
                <div className="card-top">
                  <span
                    className="entity-icon"
                    style={{ color: c?.color, background: c?.color + "1a" }}
                  >
                    <ChartPie size={22} />
                  </span>
                  <Actions>
                    <button onClick={() => setEdit(b)}>
                      <Pencil size={14} />
                      Ubah anggaran
                    </button>
                    <button onClick={() => setRemove(b)}>
                      <Trash2 size={14} />
                      Hapus anggaran
                    </button>
                  </Actions>
                </div>
                <h2>{c?.name}</h2>
                <Badge type={b.status}>
                  {
                    {
                      safe: "Masih aman",
                      warning: "Mendekati batas",
                      exceeded: "Melewati batas",
                    }[b.status]
                  }
                </Badge>
                <div className="budget-numbers">
                  <strong>{money(b.spent)}</strong>
                  <span>dari {money(b.limitAmount)}</span>
                </div>
                <Progress
                  value={b.percentage}
                  color={
                    b.status === "exceeded"
                      ? "#cf7c62"
                      : b.status === "warning"
                        ? "#cca05c"
                        : c?.color
                  }
                />
                <div className="budget-card-footer">
                  <span>{b.percentage.toFixed(1)}% terpakai</span>
                  <span>Sisa {money(b.remaining)}</span>
                </div>
                <small className="muted">
                  Peringatan saat mencapai {b.warningThreshold}%
                </small>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Mulai rencana bulan ini"
            description="Pilih kategori dan tentukan batas pengeluaran Anda."
            action={
              <Button onClick={() => setEdit({ period: month })}>
                Buat anggaran
              </Button>
            }
          />
        </section>
      )}
      {edit && (
        <EntityForm
          title={edit.id ? "Ubah anggaran" : "Buat anggaran"}
          initial={edit}
          path={"/budgets" + (edit.id ? "/" + edit.id : "")}
          method={edit.id ? "PATCH" : "POST"}
          onClose={() => setEdit(null)}
          fields={[
            {
              name: "categoryId",
              label: "Kategori pengeluaran",
              type: "select",
              full: true,
              options: data.categories
                .filter((c) => c.type === "expense" && !c.isArchived)
                .map((c) => ({ value: c.id, label: c.name })),
            },
            { name: "period", label: "Periode", type: "month", default: month },
            {
              name: "limitAmount",
              label: "Batas anggaran",
              type: "number",
              min: 0.01,
            },
            {
              name: "warningThreshold",
              label: "Ambang peringatan (%)",
              type: "number",
              min: 1,
              max: 99,
              default: 80,
              help: "Peringatan kedua otomatis muncul saat mencapai 100%.",
              full: true,
            },
          ]}
        />
      )}{" "}
      {remove && (
        <Confirm
          title="Hapus anggaran?"
          description="Transaksi kategori ini tetap tersimpan. Hanya batas anggaran yang dihapus."
          path={"/budgets/" + remove.id}
          method="DELETE"
          danger
          onClose={() => setRemove(null)}
        />
      )}
    </div>
  );
}
