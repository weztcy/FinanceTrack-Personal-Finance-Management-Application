import React, { useEffect, useState } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useData, useMoney } from "../lib/context";
import { api, query } from "../lib/api";
import {
  Button,
  Empty,
  Loading,
  ErrorState,
  Badge,
  Confirm,
} from "../components/ui";
import {
  TransactionForm,
  TransactionDetail,
  typeLabels,
} from "../components/TransactionForm";
import Filters from "../components/Filters";
export default function Transactions() {
  const data = useData(),
    money = useMoney();
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 }),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [edit, setEdit] = useState(null),
    [detail, setDetail] = useState(null),
    [voidTx, setVoid] = useState(null),
    [tick, setTick] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api("/transactions?" + query(filters), { signal: controller.signal })
        .then((r) => {
          setResult(r);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [JSON.stringify(filters), data.version, tick]);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CATATAN KEUANGAN</span>
          <h1>
            Setiap transaksi punya cerita<span className="heading-dot">.</span>
          </h1>
          <p>Catat, telusuri, dan pahami kebiasaan keuangan Anda.</p>
        </div>
        <Button onClick={() => setEdit({})}>
          <Plus size={17} />
          Catat transaksi
        </Button>
      </div>
      <section className="panel transaction-panel">
        <Filters value={filters} onChange={setFilters} search />
        {error ? (
          <ErrorState message={error} retry={() => setTick((t) => t + 1)} />
        ) : loading ? (
          <Loading />
        ) : result?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Transaksi</th>
                    <th>Jenis</th>
                    <th>Rekening</th>
                    <th>Tanggal</th>
                    <th className="align-right">Nominal</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <button
                          className="transaction-title"
                          onClick={() => setDetail(t)}
                        >
                          <span className={"transaction-icon " + t.type}>
                            {t.type === "transfer" ? (
                              <ArrowLeftRight size={17} />
                            ) : t.type === "income" ? (
                              <ArrowDownRight size={17} />
                            ) : (
                              <ArrowUpRight size={17} />
                            )}
                          </span>
                          <span>
                            <strong>
                              {t.description || typeLabels[t.type]}
                            </strong>
                            <small>
                              {data.categories.find(
                                (c) => c.id === t.categoryId,
                              )?.name || "Transfer internal"}
                              {t.source !== "manual" ? " · " + t.source : ""}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <Badge type={t.type}>{typeLabels[t.type]}</Badge>
                      </td>
                      <td>
                        {
                          data.accounts.find(
                            (a) => a.id === (t.accountId || t.fromAccountId),
                          )?.name
                        }
                        {t.toAccountId && (
                          <small className="block">
                            →{" "}
                            {
                              data.accounts.find((a) => a.id === t.toAccountId)
                                ?.name
                            }
                          </small>
                        )}
                      </td>
                      <td className="nowrap">
                        {new Date(t.date + "T12:00").toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </td>
                      <td className={"align-right amount " + t.type}>
                        {t.type === "income"
                          ? "+"
                          : t.type === "expense"
                            ? "−"
                            : ""}
                        {money(t.amount)}
                      </td>
                      <td>
                        <div className="inline-actions">
                          <button
                            className="icon-button"
                            aria-label="Detail transaksi"
                            onClick={() => setDetail(t)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Ubah transaksi"
                            onClick={() => setEdit(t)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            aria-label="Batalkan transaksi"
                            onClick={() => setVoid(t)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {result.total} transaksi · Halaman {result.page} dari{" "}
                {Math.max(1, result.pages)}
              </span>
              <div>
                <Button
                  variant="secondary small-button"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page - 1 }))
                  }
                >
                  <ChevronLeft size={15} />
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary small-button"
                  disabled={filters.page >= result.pages}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page + 1 }))
                  }
                >
                  Berikutnya
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title="Tidak ada transaksi ditemukan"
            description="Tambahkan transaksi atau sesuaikan filter pencarian Anda."
            action={
              <Button variant="secondary" onClick={() => setEdit({})}>
                Catat transaksi
              </Button>
            }
          />
        )}
      </section>
      {edit && <TransactionForm initial={edit} onClose={() => setEdit(null)} />}{" "}
      {detail && (
        <TransactionDetail
          transaction={detail}
          onClose={() => setDetail(null)}
          onEdit={(t) => {
            setDetail(null);
            setEdit(t);
          }}
        />
      )}
      {voidTx && (
        <Confirm
          title="Batalkan transaksi?"
          description="Dampak transaksi pada saldo, anggaran, dan laporan akan dibalik. Riwayat pembatalan tetap disimpan."
          path={"/transactions/" + voidTx.id + "/void"}
          onClose={() => setVoid(null)}
          danger
        />
      )}
    </div>
  );
}
