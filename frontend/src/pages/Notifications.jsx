import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ChartPie,
  CalendarClock,
  Repeat,
  Check,
  CheckCheck,
} from "lucide-react";
import { useData, useToast } from "../lib/context";
import { api } from "../lib/api";
import { Button, Empty, Badge } from "../components/ui";
export default function Notifications() {
  const data = useData(),
    toast = useToast();
  const [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(false);
  async function mark(path) {
    setBusy(true);
    try {
      await api(path, {
        method: path.endsWith("read-all") ? "POST" : "PATCH",
        body: {},
      });
      await data.reload();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  const rows = data.notifications.filter((n) => filter === "all" || !n.isRead);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TETAP TERHUBUNG DENGAN RENCANA</span>
          <h1>
            Yang perlu Anda ketahui<span className="heading-dot">.</span>
          </h1>
          <p>Pengingat tagihan, kabar anggaran, dan aktivitas otomatis.</p>
        </div>
        <Button
          variant="secondary"
          loading={busy}
          onClick={() => mark("/notifications/read-all")}
        >
          <CheckCheck size={16} />
          Tandai semua dibaca
        </Button>
      </div>
      <div className="tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Semua
        </button>
        <button
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          Belum dibaca{" "}
          <Badge>{data.notifications.filter((n) => !n.isRead).length}</Badge>
        </button>
      </div>
      <section className="panel notification-list">
        {rows.length ? (
          rows.map((n) => {
            const Icon =
              n.type === "budget"
                ? ChartPie
                : n.type === "bill"
                  ? CalendarClock
                  : Repeat;
            return (
              <article key={n.id} className={n.isRead ? "" : "unread"}>
                <span className="entity-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>
                    {n.title}
                    {!n.isRead && <i />}
                  </h3>
                  <p>{n.message}</p>
                  <small>{new Date(n.createdAt).toLocaleString("id-ID")}</small>
                  <Link
                    to={
                      n.type === "budget"
                        ? "/budgets"
                        : n.type === "bill"
                          ? "/bills"
                          : "/recurring"
                    }
                    className="text-link"
                  >
                    Lihat detail
                  </Link>
                </div>
                {!n.isRead && (
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label="Tandai dibaca"
                    onClick={() => mark("/notifications/" + n.id + "/read")}
                  >
                    <Check size={18} />
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <Empty
            title="Semuanya sudah terpantau"
            description="Notifikasi baru akan muncul di sini. Preferensi dapat diubah dalam pengaturan."
          />
        )}
      </section>
    </div>
  );
}
