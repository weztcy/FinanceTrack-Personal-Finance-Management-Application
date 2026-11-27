import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useData } from "../lib/context";
export default function Filters({ value, onChange, search = false }) {
  const { accounts, categories } = useData();
  const change = (k, v) => onChange({ ...value, [k]: v, page: 1 });
  return (
    <div className="filter-bar">
      {search && (
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Cari deskripsi transaksi"
            placeholder="Cari transaksi…"
            value={value.search || ""}
            onChange={(e) => change("search", e.target.value)}
          />
        </label>
      )}
      <label>
        <span>Dari</span>
        <input
          aria-label="Tanggal mulai"
          type="date"
          value={value.startDate || ""}
          onChange={(e) => change("startDate", e.target.value)}
        />
      </label>
      <label>
        <span>Sampai</span>
        <input
          aria-label="Tanggal akhir"
          type="date"
          value={value.endDate || ""}
          onChange={(e) => change("endDate", e.target.value)}
        />
      </label>
      <select
        aria-label="Filter rekening"
        value={value.accountId || ""}
        onChange={(e) => change("accountId", e.target.value)}
      >
        <option value="">Semua rekening</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.isArchived ? " (arsip)" : ""}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter jenis transaksi"
        value={value.type || ""}
        onChange={(e) => change("type", e.target.value)}
      >
        <option value="">Semua jenis</option>
        <option value="income">Pemasukan</option>
        <option value="expense">Pengeluaran</option>
        <option value="transfer">Transfer</option>
      </select>
      <select
        aria-label="Filter kategori"
        value={value.categoryId || ""}
        onChange={(e) => change("categoryId", e.target.value)}
      >
        <option value="">Semua kategori</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {search && (
        <select
          aria-label="Urutkan transaksi"
          value={value.sort || "date_desc"}
          onChange={(e) => change("sort", e.target.value)}
        >
          <option value="date_desc">Tanggal terbaru</option>
          <option value="date_asc">Tanggal terlama</option>
          <option value="amount_desc">Nominal terbesar</option>
          <option value="amount_asc">Nominal terkecil</option>
        </select>
      )}
      <button
        className="filter-reset"
        onClick={() => onChange({ page: 1, pageSize: 20 })}
      >
        Reset filter
      </button>
    </div>
  );
}
