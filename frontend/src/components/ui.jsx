import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  ArrowRight,
  LoaderCircle,
  Inbox,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { api } from "../lib/api";
import { useData, useToast } from "../lib/context";
export function Button({ children, variant = "", loading = false, ...props }) {
  return (
    <button
      {...props}
      className={"button " + variant + " " + (props.className || "")}
      disabled={loading || props.disabled}
    >
      {loading ? <LoaderCircle size={16} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Empty({
  title = "Belum ada data",
  description = "Mulai dengan menambahkan catatan pertama Anda.",
  action,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={25} />
      Memuat keuangan Anda…
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
export function Badge({ children, type = "" }) {
  return <span className={"badge " + type}>{children}</span>;
}
export function Progress({ value, color }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(100, value || 0))}
    >
      <div
        style={{
          width: Math.max(0, Math.min(100, value || 0)) + "%",
          background: color,
        }}
      />
    </div>
  );
}
export function SectionTitle({ title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Modal({ title, description, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EntityForm({
  title,
  description,
  fields,
  initial = {},
  path,
  method = "POST",
  onClose,
  onSaved,
  transform,
  submitLabel = "Simpan",
  children,
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, initial[f.name] ?? f.default ?? ""]),
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState([]);
  const { reload } = useData(),
    toast = useToast();
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFieldErrors([]);
    try {
      let body = { ...values };
      for (const f of fields) {
        if (f.optional && body[f.name] === "") {
          if (
            method === "PATCH" &&
            initial[f.name] != null &&
            initial[f.name] !== ""
          )
            body[f.name] = f.nullable ? null : "";
          else delete body[f.name];
        }
        if (f.type === "checkbox") body[f.name] = !!body[f.name];
      }
      if (method === "PATCH")
        body = Object.fromEntries(
          Object.entries(body).filter(
            ([k, v]) => String(v) !== String(initial[k] ?? ""),
          ),
        );
      if (transform) body = transform(body, values);
      const result = await api(path, { method, body });
      await reload();
      toast("Perubahan berhasil disimpan.");
      onSaved?.(result);
      onClose();
    } catch (e) {
      setError(e.message);
      setFieldErrors(e.fields || []);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      description={description}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={submit} className="entity-form">
        {fields.map((f) => {
          const options =
            typeof f.options === "function" ? f.options(values) : f.options;
          const err = fieldErrors.find((e) => e.field === f.name);
          if (f.show && !f.show(values)) return null;
          return (
            <div key={f.name} className={"field " + (f.full ? "full" : "")}>
              <label htmlFor={"field-" + f.name}>
                {f.label}
                {f.optional ? <span> opsional</span> : null}
              </label>
              {f.type === "select" ? (
                <select
                  id={"field-" + f.name}
                  value={values[f.name]}
                  required={!f.optional}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                >
                  <option value="">Pilih {f.label.toLowerCase()}</option>
                  {options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  id={"field-" + f.name}
                  maxLength={1000}
                  rows={3}
                  value={values[f.name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                />
              ) : (
                <input
                  id={"field-" + f.name}
                  type={f.type || "text"}
                  value={f.type === "checkbox" ? undefined : values[f.name]}
                  checked={f.type === "checkbox" ? !!values[f.name] : undefined}
                  required={!f.optional}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "0.01" : undefined}
                  maxLength={f.type === "text" || !f.type ? 120 : undefined}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [f.name]:
                        f.type === "checkbox"
                          ? e.target.checked
                          : e.target.value,
                    }))
                  }
                />
              )}{" "}
              {f.help && <small>{f.help}</small>}
              {err && <small className="field-error">{err.message}</small>}
            </div>
          );
        })}
        {children}
        {error && (
          <div className="form-error" role="alert">
            {error}
            {fieldErrors.length > 0 && (
              <ul>
                {fieldErrors.map((e, i) => (
                  <li key={i}>
                    {fields.find((f) => f.name === e.field)?.label || e.field}:{" "}
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button loading={busy} type="submit">
            {submitLabel}
            <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Confirm({
  title,
  description,
  path,
  method = "POST",
  body = {},
  onClose,
  onSaved,
  danger = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { reload } = useData(),
    toast = useToast();
  async function act() {
    setBusy(true);
    try {
      const value = await api(path, { method, body });
      await reload();
      toast("Perubahan berhasil disimpan.");
      onSaved?.(value);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      description={description}
      onClose={() => !busy && onClose()}
    >
      <div className="confirm-body">
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Batal
          </Button>
          <Button variant={danger ? "danger" : ""} loading={busy} onClick={act}>
            Konfirmasi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export function Actions({ children }) {
  return (
    <details className="actions">
      <summary className="icon-button" aria-label="Tindakan lainnya">
        <MoreHorizontal size={19} />
      </summary>
      <div className="action-menu">{children}</div>
    </details>
  );
}
export const AddButton = ({ children = "Tambah", ...props }) => (
  <Button {...props}>
    <Plus size={16} />
    {children}
  </Button>
);
