import { createContext, useCallback, useContext, useState } from 'react';
import { X } from 'lucide-react';

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random();
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">{items.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}</div>
    </ToastCtx.Provider>
  );
}

/* ---------- small building blocks ---------- */
export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head"><h3>{title}</h3><button className="btn ghost sm" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return <div className="field"><label>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>;
}

export const Loading = ({ text = 'Loading...' }) => <div className="state"><div className="spinner" />{text}</div>;
export const Empty = ({ children }) => <div className="state">{children}</div>;
export const ErrorBox = ({ message }) => (message ? <div className="alert error">{message}</div> : null);

export const Badge = ({ tone = '', children }) => <span className={`badge ${tone}`}>{children}</span>;
export const StatusBadge = ({ status }) => <Badge tone={status === 'PASS' ? 'success' : 'danger'}>{status}</Badge>;

export function Grade({ value }) {
  const tone = value?.startsWith('A') ? 'g-success' : value?.startsWith('B') ? 'g-accent' : value === 'C' || value === 'D' ? 'g-warning' : 'g-danger';
  return <span className={`grade ${tone}`}>{value}</span>;
}

export function Progress({ value, max }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className={`progress ${pct === 100 ? 'done' : ''}`} title={`${value}/${max}`}><span style={{ width: `${pct}%` }} /></div>;
}

export function Stat({ icon: Icon, label, value, tone = '' }) {
  return (
    <div className="card stat">
      <div className={`icon ${tone}`}><Icon size={22} /></div>
      <div><div className="num">{value}</div><div className="lbl">{label}</div></div>
    </div>
  );
}

export const PageHead = ({ title, subtitle, children }) => (
  <div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="toolbar">{children}</div></div>
);

export const fmtDate = (d) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const fmtNum = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
