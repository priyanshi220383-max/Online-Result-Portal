import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../services/hooks';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHead, useToast } from '../components/ui.jsx';

const BLANK = { employee_code: '', full_name: '', email: '', department: '', username: '', password: '' };

export default function Teachers() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/teachers');
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState('');
  const open = (t) => { setEdit(t || 'new'); setF(t ? { ...BLANK, ...t } : BLANK); setErr(''); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try {
      if (edit === 'new') await api.post('/teachers', f); else await api.put(`/teachers/${edit.teacher_id}`, { ...f, is_active: !!f.is_active });
      toast('Teacher saved.'); setEdit(null); reload();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete ${t.full_name} and their login account?`)) return;
    try { await api.del(`/teachers/${t.teacher_id}`); toast('Teacher deleted.'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <PageHead title="Teachers" subtitle="Teacher accounts. Assign subjects to classes on the Classes page."><button className="btn" onClick={() => open()}><Plus size={16} />Add teacher</button></PageHead>
      <ErrorBox message={error} />
      <div className="card">{loading ? <Loading /> : data.length === 0 ? <Empty>No teachers yet.</Empty> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Code</th><th>Name</th><th>Username</th><th>Department</th><th className="num">Assignments</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((t) => (
            <tr key={t.teacher_id}><td>{t.employee_code}</td><td><strong>{t.full_name}</strong><div className="small muted">{t.email}</div></td><td>{t.username}</td><td>{t.department || '-'}</td><td className="num">{t.assignments}</td>
              <td>{t.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}</td>
              <td><div className="actions"><button className="btn secondary sm" onClick={() => open(t)}><Pencil size={14} />Edit</button><button className="btn ghost sm" onClick={() => remove(t)} aria-label="Delete"><Trash2 size={15} /></button></div></td></tr>))}</tbody>
        </table></div>)}</div>
      {edit && (
        <Modal title={edit === 'new' ? 'Add teacher' : 'Edit teacher'} onClose={() => setEdit(null)} footer={<><button className="btn secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn" onClick={save}>Save</button></>}>
          {err && <div className="alert error">{err}</div>}
          <div className="form-grid">
            <Field label="Employee code"><input className="input" value={f.employee_code} onChange={set('employee_code')} /></Field>
            <Field label="Full name"><input className="input" value={f.full_name} onChange={set('full_name')} /></Field>
            <Field label="Email"><input className="input" type="email" value={f.email || ''} onChange={set('email')} /></Field>
            <Field label="Department"><input className="input" value={f.department || ''} onChange={set('department')} /></Field>
            {edit === 'new' && <>
              <Field label="Username"><input className="input" value={f.username} onChange={set('username')} autoComplete="off" /></Field>
              <Field label="Password" hint="8+ characters, letter and digit."><input className="input" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
            </>}
          </div>
          {edit !== 'new' && <label className="checkbox"><input type="checkbox" checked={!!f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />Account is active (can sign in)</label>}
        </Modal>)}
    </>
  );
}
