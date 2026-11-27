import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  ChartPie,
  Repeat,
  Target,
  CalendarClock,
  FileChartColumn,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Brand } from "../pages/Auth";
import { useAuth, useData, useToast } from "../lib/context";
import { Button, ErrorState, Loading } from "./ui";
import { TransactionForm } from "./TransactionForm";
const nav = [
  ["/", "Ringkasan", LayoutDashboard],
  ["/transactions", "Transaksi", ArrowLeftRight],
  ["/accounts", "Rekening", Wallet],
  ["/budgets", "Anggaran", ChartPie],
  ["/goals", "Target tabungan", Target],
  ["/bills", "Tagihan", CalendarClock],
  ["/recurring", "Transaksi berulang", Repeat],
  ["/reports", "Laporan", FileChartColumn],
];
export default function Layout() {
  const { user, logout } = useAuth(),
    data = useData(),
    toast = useToast(),
    navigate = useNavigate(),
    location = useLocation();
  const [mobile, setMobile] = useState(false),
    [add, setAdd] = useState(false),
    [loggingOut, setLoggingOut] = useState(false);
  const [small, setSmall] = useState(
    () => matchMedia("(max-width:760px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width:760px)"),
      change = () => {
        setSmall(media.matches);
        if (!media.matches) setMobile(false);
      };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const title =
    [
      ...nav,
      ["/categories", "Kategori"],
      ["/notifications", "Notifikasi"],
      ["/settings", "Pengaturan"],
    ].find((n) => n[0] === location.pathname)?.[1] || "FinanceTrack";
  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Tutup menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        inert={small && !mobile}
        className={"sidebar " + (mobile ? "open" : "")}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-close"
            aria-label="Tutup menu"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="nav-label">WORKSPACE PRIBADI</span>
        <nav aria-label="Navigasi utama">
          {nav.map(([path, label, Icon]) => (
            <NavLink
              to={path}
              end={path === "/"}
              key={path}
              onClick={() => setMobile(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {path === "/" && <span className="nav-active-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>Selangkah lebih dekat</span>
            <strong>Ke tujuan yang berarti.</strong>
            <Target size={39} />
            <NavLink to="/goals" onClick={() => setMobile(false)}>
              Lihat target Anda <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <nav aria-label="Navigasi pengaturan">
            <NavLink to="/categories" onClick={() => setMobile(false)}>
              <Tags size={18} />
              Kategori
            </NavLink>
            <NavLink to="/settings" onClick={() => setMobile(false)}>
              <Settings size={18} />
              Pengaturan
            </NavLink>
          </nav>
          <div className="sidebar-user">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Akun personal · {user.currency}</small>
            </div>
            <button
              className="icon-button"
              disabled={loggingOut}
              onClick={signOut}
              aria-label="Keluar akun"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={small && mobile}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Buka menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="private-pill">
              <span /> Personal workspace
            </span>
            <NavLink
              className="notification-button icon-button"
              to="/notifications"
              aria-label="Buka notifikasi"
            >
              <Bell size={19} />
              {data.notifications?.some((n) => !n.isRead) && <i />}
            </NavLink>
            <span className="topbar-divider" />
            <span className="avatar small">{user.name[0].toUpperCase()}</span>
          </div>
        </header>
        <main className="main-content">
          {!data.ready ? (
            data.error ? (
              <ErrorState message={data.error} retry={data.reload} />
            ) : (
              <Loading />
            )
          ) : (
            <>
              <Outlet context={{ openTransaction: () => setAdd(true) }} />
              {data.error && (
                <ErrorState message={data.error} retry={data.reload} />
              )}
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>
            FinanceTrack <span className="footer-dot">·</span> Keuangan yang
            lebih terarah.
          </span>
          <span>Ruang aman untuk rencana Anda</span>
        </footer>
      </div>
      {add && <TransactionForm onClose={() => setAdd(false)} />}
    </div>
  );
}
