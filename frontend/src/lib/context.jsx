import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { api, setCsrf } from "./api";
const Auth = createContext(null),
  Data = createContext(null),
  Toast = createContext(null);
export function Providers({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [authError, setAuthError] = useState("");
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const loadUser = useCallback(async () => {
    setLoading(true);
    setAuthError("");
    try {
      const r = await api("/profile");
      setUser(r.user);
    } catch (e) {
      if (e.status !== 401) setAuthError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadUser();
  }, [loadUser]);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setCsrf("");
    };
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);
  useEffect(() => {
    const dark =
      user?.theme === "dark" ||
      (user?.theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [user?.theme]);
  const login = async (path, body) => {
    const r = await api(path, { method: "POST", body });
    setUser(r.user);
  };
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
    } catch (e) {
      if (e.status !== 401) throw e;
    }
    setUser(null);
    setCsrf("");
  };
  return (
    <Auth.Provider
      value={{ user, setUser, loading, authError, loadUser, login, logout }}
    >
      <Toast.Provider value={toast}>
        <DataProvider user={user}>{children}</DataProvider>
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={"toast " + t.type}>
              {t.message}
              <button
                aria-label="Tutup pesan"
                onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Toast.Provider>
    </Auth.Provider>
  );
}
function DataProvider({ user, children }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [version, setVersion] = useState(0);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const owner = user.id;
    try {
      const keys = [
        "accounts",
        "categories",
        "budgets",
        "recurring",
        "goals",
        "bills",
        "notifications",
      ];
      const responses = await Promise.all(keys.map((k) => api("/" + k)));
      if (currentUser.current === owner) {
        setData(Object.fromEntries(keys.map((k, i) => [k, responses[i]])));
        setVersion((v) => v + 1);
      }
    } catch (e) {
      if (currentUser.current === owner) setError(e.message);
    } finally {
      if (currentUser.current === owner) setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    setData(null);
    if (user) reload();
  }, [user?.id, reload]);
  return (
    <Data.Provider
      value={{ ...data, ready: !!data, error, loading, reload, version }}
    >
      {children}
    </Data.Provider>
  );
}
export const useAuth = () => useContext(Auth);
export const useData = () => useContext(Data);
export const useToast = () => useContext(Toast);
export function useMoney() {
  const { user } = useAuth();
  return (value, compact = false) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: user?.currency || "IDR",
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: 0,
      notation: compact ? "compact" : "standard",
    }).format(value || 0);
}
