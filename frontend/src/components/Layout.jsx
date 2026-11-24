import { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardList, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, School, Settings, Trophy, Users, UserSquare, KeyRound, CalendarCheck } from 'lucide-react';
import { useAuth } from '../services/auth.jsx';
import { api } from '../services/api';
import { Field, Loading, Modal, useToast } from './ui.jsx';

const NAV = {
  admin: [
    ['/dashboard', 'Dashboard', LayoutDashboard], ['/students', 'Students', GraduationCap], ['/subjects', 'Subjects', BookOpen],
    ['/classes', 'Classes', School], ['/teachers', 'Teachers', UserSquare], ['/exams', 'Examinations', CalendarCheck],
    ['/marks', 'Marks Entry', ClipboardList], ['/results', 'Results', Trophy], ['/settings', 'Settings', Settings],
  ],
  teacher: [
    ['/dashboard', 'Dashboard', LayoutDashboard], ['/students', 'Students', Users], ['/marks', 'Marks Entry', ClipboardList], ['/results', 'Results', Trophy],
  ],
  student: [['/my-results', 'My Results', FileText]],
};

function PasswordModal({ onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [err, setErr] = useState('');
  const save = async () => {
    try { await api.post('/auth/change-password', f); toast('Password updated.'); onClose(); } catch (e) { setErr(e.message); }
  };
  return (
    <Modal title="Change password" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" onClick={save}>Update</button></>}>
      {err && <div className="alert error">{err}</div>}
      <Field label="Current password"><input className="input" type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
      <Field label="New password" hint="At least 8 characters with a letter and a digit."><input className="input" type="password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
    </Modal>
  );
}

export default function Layout({ roles }) {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(false);
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="shell">
      <div className="mobile-bar"><button className="btn ghost sm" onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button>EduResult</div>
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="brand"><span className="logo"><GraduationCap size={20} /></span>EduResult</div>
        <nav className="nav">
          {NAV[user.role].map(([to, label, Icon]) => <NavLink key={to} to={to}><Icon size={18} />{label}</NavLink>)}
        </nav>
        <div className="userbox">
          <div className="name">{user.displayName}</div>
          <div className="role">{user.role}</div>
          <div className="row">
            <button className="btn secondary sm" onClick={(e) => { e.stopPropagation(); setPw(true); }}><KeyRound size={14} />Password</button>
            <button className="btn ghost sm" onClick={() => { logout(); nav('/'); }}><LogOut size={14} />Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      {pw && <PasswordModal onClose={() => setPw(false)} />}
    </div>
  );
}
