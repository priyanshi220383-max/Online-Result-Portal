import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth, homePathFor } from '../services/auth.jsx';
import { Field } from '../components/ui.jsx';

const DEMO = [['Administrator', 'admin'], ['Teacher (Maths & CS)', 't.sharma'], ['Student (Class 10-A)', 'ADM2025001']];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { const u = await login(username.trim(), password); nav(homePathFor(u.role)); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-art">
        <div className="brand" style={{ color: '#fff', padding: 0 }}><span className="logo" style={{ background: 'rgba(255,255,255,.18)' }}><GraduationCap size={20} /></span>EduResult</div>
        <h2>Results you can trust.</h2>
        <p>Sign in to enter marks, publish results and view report cards.</p>
      </div>
      <div className="login-form">
        <form className="login-box" onSubmit={submit}>
          <h1>Welcome back</h1>
          <p className="muted" style={{ marginTop: 0 }}>Sign in with the account given by your school.</p>
          {error && <div className="alert error">{error}</div>}
          <Field label="Username / admission number"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" required /></Field>
          <Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
          <button className="btn lg" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <div className="demo-box">
            <strong>Demo accounts</strong> <span className="muted">(password: Password@123)</span>
            {DEMO.map(([label, u]) => <button type="button" key={u} onClick={() => { setUsername(u); setPassword('Password@123'); }}>{label} - {u}</button>)}
          </div>
          <p className="small" style={{ marginTop: 18 }}><Link to="/">Back to home</Link></p>
        </form>
      </div>
    </div>
  );
}
