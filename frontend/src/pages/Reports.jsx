import React, { useEffect, useState } from "react";
import {
  Download,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth, useData, useMoney } from "../lib/context";
import { api, query, monthRange, localDate } from "../lib/api";
import {
  Button,
  Loading,
  ErrorState,
  Empty,
  Progress,
  Badge,
  SectionTitle,
} from "../components/ui";
import Filters from "../components/Filters";
import { typeLabels } from "../components/TransactionForm";
export default function Reports() {
  const { user } = useAuth(),
    data = useData(),
    money = useMoney();
  const [filters, setFilters] = useState({
      ...monthRange(localDate(user.timezone).slice(0, 7)),
      page: 1,
      pageSize: 20,
    }),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api("/reports/summary?" + query(filters))
      .then((r) => {
        if (active) {
          setResult(r);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [JSON.stringify(filters), data.version, tick]);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">KENALI POLANYA</span>
          <h1>
            Gambaran yang lebih jelas<span className="heading-dot">.</span>
          </h1>
          <p>
            Laporan sesuai periode Anda. Evaluasi hari ini, rencanakan esok.
          </p>
        </div>
        <div className="page-heading-actions">
          {!loading && !error && result && (
            <>
              <a
                className="button secondary"
                href={"/api/reports/export.csv?" + query(filters)}
                download
              >
                <Download size={16} />
                CSV
              </a>
              <a
                className="button"
                href={"/api/reports/export.pdf?" + query(filters)}
                download
              >
                <Download size={16} />
                Unduh PDF
              </a>
            </>
          )}
        </div>
      </div>
      <section className="panel">
        <Filters value={filters} onChange={setFilters} />
      </section>
      {error ? (
        <ErrorState message={error} retry={() => setTick((t) => t + 1)} />
      ) : loading ? (
        <Loading />
      ) : (
        result && (
          <>
            <div className="stat-grid report-stats">
              {[
                ["Pemasukan", result.income, ArrowDownRight, "income"],
                ["Pengeluaran", result.expense, ArrowUpRight, "expense"],
                ["Arus kas bersih", result.net, TrendingUp, "income"],
                [
                  "Transfer internal",
                  result.transfer,
                  ArrowLeftRight,
                  "transfer",
                ],
              ].map(([label, value, Icon, type]) => (
                <article className="stat-card" key={label}>
                  <div className="stat-top">
                    {label}
                    <span className={"stat-icon " + type}>
                      <Icon size={18} />
                    </span>
                  </div>
                  <strong>{money(value)}</strong>
                  <small className="muted">
                    {type === "transfer"
                      ? "Tidak memengaruhi arus kas"
                      : "Sesuai filter yang dipilih"}
                  </small>
                </article>
              ))}
            </div>
            <section className="panel">
              <SectionTitle
                title="Pengeluaran per kategori"
                description="Proporsi terhadap total pengeluaran pada periode ini."
              />
              {result.categories.length ? (
                <div className="report-categories">
                  {result.categories.map((c) => {
                    const cat = data.categories.find(
                      (x) => x.id === c.categoryId,
                    );
                    return (
                      <div key={c.categoryId}>
                        <div>
                          <span>
                            <i style={{ background: cat?.color }} />
                            {cat?.name}
                          </span>
                          <strong>{money(c.amount)}</strong>
                        </div>
                        <Progress
                          value={(c.amount / result.expense) * 100}
                          color={cat?.color}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty title="Belum ada pengeluaran pada filter ini" />
              )}
            </section>
            <section className="panel">
              <SectionTitle
                title="Rincian transaksi"
                description={
                  result.transactionCount + " transaksi sesuai filter"
                }
              />
              {result.transactions.items.length ? (
                <>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Deskripsi</th>
                          <th>Jenis</th>
                          <th>Rekening / kategori</th>
                          <th className="align-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.transactions.items.map((t) => (
                          <tr key={t.id}>
                            <td>{t.date}</td>
                            <td>{t.description || "—"}</td>
                            <td>
                              <Badge type={t.type}>{typeLabels[t.type]}</Badge>
                            </td>
                            <td>
                              {
                                data.accounts.find(
                                  (a) =>
                                    a.id === (t.accountId || t.fromAccountId),
                                )?.name
                              }
                              <small className="block">
                                {data.categories.find(
                                  (c) => c.id === t.categoryId,
                                )?.name || "Transfer internal"}
                              </small>
                            </td>
                            <td className="align-right amount">
                              {money(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <span>
                      Halaman {result.transactions.page} /{" "}
                      {Math.max(1, result.transactions.pages)}
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
                        disabled={filters.page >= result.transactions.pages}
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
                <Empty title="Tidak ada transaksi pada periode ini" />
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
