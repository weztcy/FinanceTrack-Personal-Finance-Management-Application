import React, { useState } from "react";
import {
  Wallet,
  Landmark,
  Smartphone,
  Plus,
  Archive,
  Pencil,
  ArrowUpRight,
} from "lucide-react";
import { useAuth, useData, useMoney } from "../lib/context";
import { localDate } from "../lib/api";
import {
  Button,
  Empty,
  EntityForm,
  Confirm,
  Actions,
  Badge,
} from "../components/ui";
const labels = {
  cash: "Tunai",
  bank: "Rekening bank",
  ewallet: "E-wallet",
  other: "Lainnya",
};
export default function Accounts() {
  const { accounts } = useData(),
    { user } = useAuth(),
    money = useMoney();
  const [edit, setEdit] = useState(null),
    [archive, setArchive] = useState(null),
    [showArchived, setShowArchived] = useState(false);
  const active = accounts.filter((a) => !a.isArchived),
    shown = accounts.filter((a) => showArchived || !a.isArchived);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RUANG UNTUK UANG ANDA</span>
          <h1>
            Semua rekening, satu tempat<span className="heading-dot">.</span>
          </h1>
          <p>Saldo yang dihitung otomatis dari setiap transaksi Anda.</p>
        </div>
        <Button onClick={() => setEdit({})}>
          <Plus size={17} />
          Tambah rekening
        </Button>
      </div>
      <div className="account-summary">
        <div>
          <span>Total saldo rekening aktif</span>
          <strong>{money(active.reduce((s, a) => s + a.balance, 0))}</strong>
        </div>
        <div>
          <span>{active.length} rekening aktif</span>
          <Badge>{user.currency}</Badge>
        </div>
      </div>
      <div className="list-toolbar">
        <h2>Rekening Anda</h2>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Tampilkan arsip
        </label>
      </div>
      {shown.length ? (
        <div className="entity-grid">
          {shown.map((a, i) => {
            const Icon =
              a.type === "bank"
                ? Landmark
                : a.type === "ewallet"
                  ? Smartphone
                  : Wallet;
            return (
              <article
                className={"panel account-card tone-" + (i % 3)}
                key={a.id}
              >
                <div className="card-top">
                  <span className="entity-icon">
                    <Icon size={23} />
                  </span>
                  <Actions>
                    <button onClick={() => setEdit(a)}>
                      <Pencil size={14} />
                      Ubah rekening
                    </button>
                    {!a.isArchived && (
                      <button onClick={() => setArchive(a)}>
                        <Archive size={14} />
                        Arsipkan
                      </button>
                    )}
                  </Actions>
                </div>
                <h2>{a.name}</h2>
                <p>
                  {labels[a.type]} {a.isArchived && <Badge>Arsip</Badge>}
                </p>
                <strong className="account-balance">{money(a.balance)}</strong>
                <div className="account-card-footer">
                  <span>
                    {a.currency} · Saldo awal {a.openingBalanceDate}
                  </span>
                  <ArrowUpRight size={18} />
                </div>
                {a.description && (
                  <p className="account-description">{a.description}</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Tambahkan rekening pertama"
            description="Mulai dari dompet tunai, bank, atau e-wallet Anda."
            action={
              <Button onClick={() => setEdit({})}>Tambah rekening</Button>
            }
          />
        </section>
      )}
      <p className="info-note">
        Saldo awal dan tanggalnya dikunci setelah pembuatan agar riwayat tetap
        konsisten. Gunakan transaksi pemasukan atau pengeluaran untuk koreksi.
        Saldo negatif diperbolehkan untuk mencatat kondisi aktual.
      </p>
      {edit && (
        <EntityForm
          title={edit.id ? "Ubah rekening" : "Tambah rekening"}
          description={
            "Semua rekening menggunakan mata uang " + user.currency + "."
          }
          initial={edit}
          path={"/accounts" + (edit.id ? "/" + edit.id : "")}
          method={edit.id ? "PATCH" : "POST"}
          onClose={() => setEdit(null)}
          fields={[
            { name: "name", label: "Nama rekening", full: true },
            {
              name: "type",
              label: "Jenis rekening",
              type: "select",
              default: "bank",
              options: Object.entries(labels).map(([value, label]) => ({
                value,
                label,
              })),
            },
            ...(!edit.id
              ? [
                  {
                    name: "openingBalance",
                    label: "Saldo awal",
                    type: "number",
                    default: 0,
                  },
                  {
                    name: "openingBalanceDate",
                    label: "Tanggal saldo awal",
                    type: "date",
                    default: localDate(user.timezone),
                  },
                ]
              : []),
            {
              name: "description",
              label: "Keterangan",
              type: "textarea",
              optional: true,
              full: true,
            },
          ]}
        />
      )}{" "}
      {archive && (
        <Confirm
          title={"Arsipkan " + archive.name + "?"}
          description="Rekening akan dikeluarkan dari total saldo aktif dan pilihan transaksi baru. Seluruh riwayat tetap tersimpan."
          path={"/accounts/" + archive.id + "/archive"}
          onClose={() => setArchive(null)}
        />
      )}
    </div>
  );
}
