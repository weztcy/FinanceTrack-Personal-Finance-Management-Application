import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Plus,
  CalendarDays,
  TrendingUp,
  ArrowLeftRight,
  Target,
  Leaf,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { api, query, localDate, monthRange } from "../lib/api";
import { useAuth, useData, useMoney } from "../lib/context";
import {
  Button,
  Empty,
  Loading,
  ErrorState,
  Progress,
  Badge,
  SectionTitle,
} from "../components/ui";
import {
  TransactionDetail,
  TransactionForm,
  typeLabels,
} from "../components/TransactionForm";
export default function Dashboard() {
  const { user } = useAuth(),
    data = useData(),
    money = useMoney(),
    { openTransaction } = useOutletContext();
  const [month, setMonth] = useState(localDate(user.timezone).slice(0, 7)),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [selected, setSelected] = useState(null),
    [edit, setEdit] = useState(null);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    api("/dashboard/summary?" + query(monthRange(month)))
      .then((r) => active && setResult(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [month, data.version]);
  if (error)
    return (
      <ErrorState
        message={error}
        retry={() => setMonth(localDate(user.timezone).slice(0, 7))}
      />
    );
  if (!result) return <Loading />;
  const cats = result.categories.map((c) => ({
      ...c,
      ...data.categories.find((x) => x.id === c.categoryId),
    })),
    expenseTotal = result.expense;
  const savingsRate = result.income
    ? Math.round((result.net / result.income) * 100)
    : 0;
  const monthName = new Date(month + "-02").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const dateFormat = (d) =>
    new Date(d + "T12:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  return (
    <div className="page dashboard" aria-busy={busy}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE CLARITY, EVERY DAY</span>
          <h1>
            Keuangan Anda, dalam satu pandangan
            <span className="heading-dot">.</span>
          </h1>
          <p>
            Halo, {user.name.split(" ")[0]}. Mari beri arah untuk setiap rupiah
            Anda.
          </p>
        </div>
        <div className="page-heading-actions">
          <label className="month-picker">
            <CalendarDays size={16} />
            <input
              aria-label="Periode dashboard"
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </label>
          <Button onClick={openTransaction}>
            <Plus size={17} />
            Catat transaksi
          </Button>
        </div>
      </div>
      {!data.accounts.length && (
        <div className="onboarding-banner">
          <Wallet size={30} />
          <div>
            <h3>Mulai dari rekening pertama Anda</h3>
            <p>
              Mata uang {user.currency} · {user.timezone}. Tambahkan rekening
              dan saldo awal untuk mulai mencatat.
            </p>
          </div>
          <Link to="/accounts" className="button">
            Tambah rekening <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="stat-grid">
        <article className="stat-card balance">
          <div className="stat-top">
            <span>Total saldo aktif</span>
            <Wallet size={19} />
          </div>
          <strong>{money(result.totalBalance)}</strong>
          <div className="stat-bottom">
            <span className="live-dot" />
            {result.accounts.filter((a) => !a.isArchived).length} rekening
            terhubung<span className="stat-caption">Saldo saat ini</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Pemasukan</span>
            <span className="stat-icon income">
              <ArrowDownRight size={19} />
            </span>
          </div>
          <strong>{money(result.income)}</strong>
          <div className="stat-bottom">
            <span className="mini-line green" />
            Total masuk<span className="stat-caption">{monthName}</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Pengeluaran</span>
            <span className="stat-icon expense">
              <ArrowUpRight size={19} />
            </span>
          </div>
          <strong>{money(result.expense)}</strong>
          <div className="stat-bottom">
            <span className="mini-line coral" />
            Total keluar<span className="stat-caption">{monthName}</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Arus kas bersih</span>
            <span className="stat-icon net">
              <TrendingUp size={19} />
            </span>
          </div>
          <strong>{money(result.net)}</strong>
          <div className="stat-bottom">
            <Badge type={savingsRate >= 0 ? "safe" : "warning"}>
              {savingsRate}% tersisa
            </Badge>
            <span className="stat-caption">dari pemasukan</span>
          </div>
        </article>
      </div>
      <div className="dashboard-main-grid">
        <section className="panel cashflow">
          <SectionTitle
            title="Ke mana uang Anda mengalir?"
            description={"Arus pemasukan dan pengeluaran · " + monthName}
            action={
              <div className="chart-legend">
                <span>
                  <i className="green" />
                  Pemasukan
                </span>
                <span>
                  <i className="coral" />
                  Pengeluaran
                </span>
              </div>
            }
          />
          {result.daily.length ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={245}>
                <AreaChart
                  data={result.daily}
                  margin={{ top: 20, right: 10, left: 2, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="income-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4d937c"
                        stopOpacity={0.22}
                      />
                      <stop offset="100%" stopColor="#4d937c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="expense-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#dba28f"
                        stopOpacity={0.17}
                      />
                      <stop offset="100%" stopColor="#dba28f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={dateFormat}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    tick={{ fontSize: 11, fill: "#84908a" }}
                  />
                  <YAxis
                    tickFormatter={(v) => money(v, true)}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tick={{ fontSize: 11, fill: "#84908a" }}
                  />
                  <Tooltip
                    formatter={(v, n) => [
                      money(v),
                      n === "income" ? "Pemasukan" : "Pengeluaran",
                    ]}
                    labelFormatter={dateFormat}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e3e8e1",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#4d937c"
                    strokeWidth={2.5}
                    fill="url(#income-fill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#ce8c74"
                    strokeWidth={2.5}
                    fill="url(#expense-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty
              title="Grafik Anda dimulai di sini"
              description="Catat pemasukan atau pengeluaran untuk melihat arus kas."
            />
          )}
          <div className="chart-footnote">
            <Leaf size={14} />
            {result.net >= 0
              ? "Arus kas positif memberi ruang untuk rencana berikutnya."
              : "Tinjau pengeluaran Anda untuk menjaga rencana tetap terarah."}
            <Link to="/reports">
              Lihat laporan <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="panel spending">
          <SectionTitle
            title="Komposisi pengeluaran"
            description="Rincian berdasarkan kategori"
          />
          {cats.length ? (
            <>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={185}>
                  <PieChart>
                    <Pie
                      data={cats}
                      dataKey="amount"
                      innerRadius={61}
                      outerRadius={81}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {cats.map((c, i) => (
                        <Cell key={i} fill={c.color || "#4d937c"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-label">
                  <small>Total pengeluaran</small>
                  <strong>{money(expenseTotal, true)}</strong>
                </div>
              </div>
              <div className="category-legend">
                {cats.slice(0, 4).map((c) => (
                  <div key={c.categoryId}>
                    <span>
                      <i style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <strong>
                      {((c.amount / expenseTotal) * 100).toFixed(0)}%
                      <small>{money(c.amount)}</small>
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="Belum ada pengeluaran"
              description="Distribusi kategori akan muncul setelah Anda mulai mencatat."
            />
          )}
        </section>
      </div>
      <div className="dashboard-secondary-grid">
        <section className="panel recent">
          <SectionTitle
            title="Aktivitas terbaru"
            description="Catatan kecil, gambaran yang lebih utuh."
            action={
              <Link className="text-link" to="/transactions">
                Semua transaksi <ArrowRight size={15} />
              </Link>
            }
          />
          {result.recent.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Transaksi</th>
                    <th>Rekening</th>
                    <th>Tanggal</th>
                    <th className="align-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recent.map((t) => {
                    const cat = data.categories.find(
                      (c) => c.id === t.categoryId,
                    );
                    return (
                      <tr key={t.id}>
                        <td>
                          <button
                            className="transaction-title"
                            onClick={() => setSelected(t)}
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
                              <small>{cat?.name || "Transfer internal"}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          {
                            data.accounts.find(
                              (a) => a.id === (t.accountId || t.fromAccountId),
                            )?.name
                          }
                        </td>
                        <td>{dateFormat(t.date)}</td>
                        <td className={"align-right amount " + t.type}>
                          {t.type === "income"
                            ? "+"
                            : t.type === "expense"
                              ? "−"
                              : ""}
                          {money(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Belum ada aktivitas"
              action={
                <Button variant="secondary" onClick={openTransaction}>
                  Catat transaksi pertama
                </Button>
              }
            />
          )}
        </section>
        <section className="panel">
          <SectionTitle
            title="Anggaran bulan ini"
            description="Tetap dekat dengan rencana Anda."
            action={
              <Link
                to="/budgets"
                className="icon-button"
                aria-label="Lihat anggaran"
              >
                <ArrowUpRight size={19} />
              </Link>
            }
          />
          {result.budgets.length ? (
            <div className="budget-list">
              {result.budgets.slice(0, 3).map((b) => (
                <div className="budget-item" key={b.id}>
                  <div>
                    <strong>
                      {data.categories.find((c) => c.id === b.categoryId)?.name}
                    </strong>
                    <span>{b.percentage.toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={b.percentage}
                    color={
                      b.status === "exceeded"
                        ? "#cf7c62"
                        : b.status === "warning"
                          ? "#cca05c"
                          : "#4e8e79"
                    }
                  />
                  <small>
                    {money(b.spent)} <span>dari {money(b.limitAmount)}</span>
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Beri batas, beri ruang"
              description="Buat anggaran agar pengeluaran lebih terencana."
              action={
                <Link to="/budgets" className="text-link">
                  Buat anggaran <ArrowRight size={14} />
                </Link>
              }
            />
          )}
        </section>
      </div>
      <div className="dashboard-bottom-grid">
        <section className="panel">
          <SectionTitle
            title="Tujuan yang sedang Anda bangun"
            action={
              <Link className="text-link" to="/goals">
                Lihat semua <ArrowRight size={15} />
              </Link>
            }
          />
          {result.goals.filter((g) => g.status === "active").length ? (
            <div className="goals-mini">
              {result.goals
                .filter((g) => g.status === "active")
                .slice(0, 2)
                .map((g) => (
                  <div key={g.id}>
                    <span className="goal-mini-icon">
                      <Target size={20} />
                    </span>
                    <div>
                      <strong>{g.name}</strong>
                      <Progress value={g.percentage} />
                      <small>
                        {money(g.currentAmount)}{" "}
                        <span>/ {money(g.targetAmount)}</span>
                      </small>
                    </div>
                    <b>{Math.min(100, g.percentage).toFixed(0)}%</b>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              title="Apa tujuan berikutnya?"
              description="Mulai menyisihkan untuk sesuatu yang berarti."
            />
          )}
        </section>
        <section className="panel">
          <SectionTitle
            title="Tagihan mendatang"
            action={
              <Link to="/bills" className="text-link">
                Kelola <ArrowRight size={15} />
              </Link>
            }
          />
          {result.bills.length ? (
            <div className="bill-mini-list">
              {result.bills.map((b) => (
                <div key={b.id}>
                  <span className="bill-day">
                    {b.dueDate.slice(8)}
                    <small>
                      {new Date(b.dueDate + "T12:00").toLocaleDateString(
                        "id-ID",
                        { month: "short" },
                      )}
                    </small>
                  </span>
                  <div>
                    <strong>{b.name}</strong>
                    <small>
                      {b.dueDate < localDate(user.timezone)
                        ? "Terlambat"
                        : "Jatuh tempo"}
                    </small>
                  </div>
                  <b>{money(b.amount)}</b>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Tidak ada tagihan mendatang"
              description="Tambahkan tagihan dan biarkan pengingat membantu Anda."
            />
          )}
        </section>
      </div>
      {result.comparison.length > 1 && (
        <section className="panel comparison">
          <SectionTitle
            title="Gambaran antarbulan"
            description="Perbandingan enam bulan hingga periode yang dipilih."
          />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={result.comparison}>
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => money(v, true)}
                width={70}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v, n) => [
                  money(v),
                  n === "income" ? "Pemasukan" : "Pengeluaran",
                ]}
              />
              <Bar dataKey="income" fill="#4d937c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#dba28f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
      {selected && (
        <TransactionDetail
          transaction={selected}
          onClose={() => setSelected(null)}
          onEdit={(t) => {
            setSelected(null);
            setEdit(t);
          }}
        />
      )}
      {edit && <TransactionForm initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
