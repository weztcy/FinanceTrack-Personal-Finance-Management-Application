import React, { useState } from "react";
import { Plus, Pencil, Archive, Tags } from "lucide-react";
import { useData } from "../lib/context";
import { Button, EntityForm, Confirm, Badge, Empty } from "../components/ui";
export default function Categories() {
  const { categories } = useData();
  const [edit, setEdit] = useState(null),
    [archive, setArchive] = useState(null),
    [archived, setArchived] = useState(false);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LEBIH RAPI, LEBIH BERARTI</span>
          <h1>
            Kategori sesuai keseharian Anda
            <span className="heading-dot">.</span>
          </h1>
          <p>Kelompokkan pemasukan dan pengeluaran dengan cara Anda.</p>
        </div>
        <Button onClick={() => setEdit({})}>
          <Plus size={17} />
          Tambah kategori
        </Button>
      </div>
      <label className="check-label list-toolbar">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Tampilkan kategori arsip
      </label>
      <div className="two-column">
        {["expense", "income"].map((type) => (
          <section className="panel" key={type}>
            <div className="section-heading">
              <h2>{type === "expense" ? "Pengeluaran" : "Pemasukan"}</h2>
              <Badge type={type}>
                {
                  categories.filter((c) => c.type === type && !c.isArchived)
                    .length
                }{" "}
                kategori aktif
              </Badge>
            </div>
            <div className="category-list">
              {categories
                .filter((c) => c.type === type && (archived || !c.isArchived))
                .map((c) => (
                  <div key={c.id}>
                    <span
                      className="category-color"
                      style={{ background: c.color + "22", color: c.color }}
                    >
                      <Tags size={17} />
                    </span>
                    <strong>
                      {c.name}
                      {c.isArchived && <Badge>Arsip</Badge>}
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={"Ubah " + c.name}
                      onClick={() => setEdit(c)}
                    >
                      <Pencil size={15} />
                    </button>
                    {!c.isArchived && (
                      <button
                        className="icon-button"
                        aria-label={"Arsipkan " + c.name}
                        onClick={() => setArchive(c)}
                      >
                        <Archive size={15} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
            {!categories.some(
              (c) => c.type === type && (archived || !c.isArchived),
            ) && <Empty title="Belum ada kategori" />}
          </section>
        ))}
      </div>
      {edit && (
        <EntityForm
          title={edit.id ? "Ubah kategori" : "Tambah kategori"}
          path={"/categories" + (edit.id ? "/" + edit.id : "")}
          method={edit.id ? "PATCH" : "POST"}
          initial={edit}
          onClose={() => setEdit(null)}
          fields={[
            { name: "name", label: "Nama kategori", full: true },
            {
              name: "type",
              label: "Jenis kategori",
              type: "select",
              default: "expense",
              options: [
                { value: "expense", label: "Pengeluaran" },
                { value: "income", label: "Pemasukan" },
              ],
            },
            {
              name: "color",
              label: "Warna",
              type: "color",
              default: "#478673",
            },
          ]}
        />
      )}{" "}
      {archive && (
        <Confirm
          title={"Arsipkan " + archive.name + "?"}
          description="Kategori tidak tersedia untuk transaksi baru. Transaksi lama tetap memakai kategori ini."
          path={"/categories/" + archive.id}
          method="DELETE"
          onClose={() => setArchive(null)}
        />
      )}
    </div>
  );
}
