import React, { useState } from "react";
import {
  EntityForm,
  Modal,
  Button,
  Badge,
  Confirm,
  Loading,
  ErrorState,
} from "./ui";
import { useAuth, useData, useMoney } from "../lib/context";
import { api, localDate } from "../lib/api";
export function TransactionForm({ initial = {}, onClose }) {
  const { accounts, categories } = useData(),
    { user } = useAuth();
  const opts = accounts
    .filter((a) => !a.isArchived)
    .map((a) => ({ value: a.id, label: a.name }));
  return (
    <EntityForm
      title={initial.id ? "Ubah transaksi" : "Catat transaksi"}
      description="Setiap catatan membantu Anda melihat arah keuangan."
      path={"/transactions" + (initial.id ? "/" + initial.id : "")}
      method={initial.id ? "PATCH" : "POST"}
      initial={initial}
      onClose={onClose}
      fields={[
        {
          name: "type",
          label: "Jenis transaksi",
          type: "select",
          default: "expense",
          options: [
            { value: "expense", label: "Pengeluaran" },
            { value: "income", label: "Pemasukan" },
            { value: "transfer", label: "Transfer" },
          ],
          full: true,
        },
        {
          name: "amount",
          label: `Nominal (${user.currency})`,
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
          name: "accountId",
          label: "Rekening",
          type: "select",
          options: opts,
          show: (v) => v.type !== "transfer",
        },
        {
          name: "categoryId",
          label: "Kategori",
          type: "select",
          options: (v) =>
            categories
              .filter((c) => c.type === v.type && !c.isArchived)
              .map((c) => ({ value: c.id, label: c.name })),
          show: (v) => v.type !== "transfer",
        },
        {
          name: "fromAccountId",
          label: "Dari rekening",
          type: "select",
          options: opts,
          show: (v) => v.type === "transfer",
        },
        {
          name: "toAccountId",
          label: "Ke rekening",
          type: "select",
          options: opts,
          show: (v) => v.type === "transfer",
        },
        {
          name: "description",
          label: "Deskripsi",
          type: "textarea",
          optional: true,
          full: true,
        },
      ]}
      transform={(body, values) => {
        // Full replacement of editable fields keeps type changes internally consistent.
        const result = {
          type: values.type,
          amount: values.amount,
          date: values.date,
          description: values.description || "",
        };
        if (values.type === "transfer") {
          result.fromAccountId = values.fromAccountId;
          result.toAccountId = values.toAccountId;
        } else {
          result.accountId = values.accountId;
          result.categoryId = values.categoryId;
        }
        return result;
      }}
    />
  );
}
export function TransactionDetail({ transaction, onClose, onEdit }) {
  const [detail, setDetail] = useState(null),
    [error, setError] = useState("");
  const { accounts, categories } = useData(),
    money = useMoney();
  React.useEffect(() => {
    let active = true;
    api("/transactions/" + transaction.id)
      .then((v) => active && setDetail(v))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [transaction.id]);
  const tx = detail || transaction;
  const name = (arr, id) => arr.find((a) => a.id === id)?.name || "—";
  return (
    <Modal title="Detail transaksi" onClose={onClose}>
      {error ? (
        <ErrorState message={error} />
      ) : (
        <div className="detail-content">
          <div className="detail-amount">{money(tx.amount)}</div>
          <Badge type={tx.type}>{typeLabels[tx.type]}</Badge>
          <dl>
            {[
              ["Tanggal", tx.date],
              ["Deskripsi", tx.description || "Tanpa deskripsi"],
              ["Kategori", name(categories, tx.categoryId)],
              ["Rekening", name(accounts, tx.accountId || tx.fromAccountId)],
              ...(tx.toAccountId
                ? [["Tujuan", name(accounts, tx.toAccountId)]]
                : []),
              ["Sumber", tx.source],
              ["Status", tx.status],
              ["Dibuat", new Date(tx.createdAt).toLocaleString("id-ID")],
              ["Diperbarui", new Date(tx.updatedAt).toLocaleString("id-ID")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h4>Riwayat perubahan</h4>
          {!detail ? (
            <Loading />
          ) : (
            <ul className="audit-list">
              {detail.history.map((h) => (
                <li key={h.id}>
                  {{ create: "Dicatat", update: "Diubah", void: "Dibatalkan" }[
                    h.action
                  ] || h.action}
                  <span>{new Date(h.createdAt).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="form-actions">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
            {tx.status === "active" && (
              <Button onClick={() => onEdit(tx)}>Ubah transaksi</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
export const typeLabels = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  transfer: "Transfer",
};
