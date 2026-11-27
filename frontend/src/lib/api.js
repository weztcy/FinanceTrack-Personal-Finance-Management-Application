let csrfToken = "";
const pendingKeys = new Map();
export function setCsrf(value) {
  csrfToken = value || "";
}
export async function api(path, { method = "GET", body, ...options } = {}) {
  const fingerprint = method + path + JSON.stringify(body);
  const mutating = method !== "GET";
  if (mutating && !pendingKeys.has(fingerprint))
    pendingKeys.set(fingerprint, crypto.randomUUID());
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    ...options,
    headers: {
      ...(mutating
        ? {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
            "Idempotency-Key": pendingKeys.get(fingerprint),
          }
        : {}),
      ...options.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Respons server tidak valid." }));
  if (!response.ok) {
    const error = new Error(data.message || "Permintaan gagal.");
    error.fields = data.errors;
    error.status = response.status;
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("auth-expired"));
    if (response.status < 500) pendingKeys.delete(fingerprint);
    throw error;
  }
  if (mutating) pendingKeys.delete(fingerprint);
  if (data.csrfToken) setCsrf(data.csrfToken);
  return data;
}
export function query(values) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== "" && v != null) p.set(k, v);
  return p.toString();
}
export function localDate(timezone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  return {
    startDate: month + "-01",
    endDate: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  };
}
