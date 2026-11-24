import { useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../services/hooks';
import { Empty, ErrorBox, Field, Loading, Modal, PageHead, useToast } from '../components/ui.jsx';

function Assignments({ cls, onClose }) {
  const toast = useToast();
  const { data: rows, reload } = useApi(`/classes/${cls.class_id}/subjects`);
  const { data: subjects } = useApi('/subjects');
  const { data: teachers } = useApi('/teachers');
  const [add, setAdd] = useState({ subject_id: '', teacher_id: '' });
  const run = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(e.message, 'error'); } };
  const assign = (subjectId, teacherId) => api.put(`/classes/${cls.class_id}/subjects/${subjectId}`, { teacher_id: teacherId || null });
  const free = (subjects || []).filter((s) => !(rows || []).some((r) => r.subject_id === s.subject_id));
  return (
    <Modal wide title={`Subjects & teachers - Class ${cls.class_label}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Done</button>}>
      <ul className="sub-list">
        {(rows || []).map((r) => (
          <li key={r.subject_id}>
            <span style={{ flex: 1 }}><strong>{r.subject_name}</strong> <span className="muted small">({r.subject_code}, max {r.max_marks})</span></span>
            <select className="select" style={{ width: 200 }} value={r.teacher_id || ''} onChange={(e) => run(() => assign(r.subject_id, e.target.value), 'Teacher updated.')}>
              <option value="">- no teacher -</option>{(teachers || []).map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}
            </select>
            <button className="btn ghost sm" onClick={() => run(() => api.del(`/classes/${cls.class_id}/subjects/${r.subject_id}`), 'Subject removed.')}><Trash2 size={15} /></button>
          </li>))}
        {rows?.length === 0 && <Empty>No subjects assigned yet.</Empty>}
      </ul>
      <h4 style={{ margin: '20px 0 10px' }}>Add a subject to this class</h4>
      <div className="toolbar">
        <select className="select" value={add.subject_id} onChange={(e) => setAdd({ ...add, subject_id: e.target.value })}><option value="">Subject...</option>{free.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}</select>
        <select className="select" value={add.teacher_id} onChange={(e) => setAdd({ ...add, teacher_id: e.target.value })}><option value="">Teacher (optional)</option>{(teachers || []).map((t) => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}</select>
        <button className="btn" disabled={!add.subject_id} onClick={() => run(async () => { await assign(add.subject_id, add.teacher_id); setAdd({ subject_id: '', teacher_id: '' }); }, 'Subject added.')}>Add</button>
      </div>
    </Modal>
  );
}

export default function Classes() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/classes');
  const [edit, setEdit] = useState(null);
  const [manage, setManage] = useState(null);
  const [f, setF] = useState({ class_name: '', section: 'A', academic_year: '' });
  const [err, setErr] = useState('');
  const open = (c) => { setEdit(c || 'new'); setF(c ? { ...c } : { class_name: '', section: 'A', academic_year: '2025-26' }); setErr(''); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try { if (edit === 'new') await api.post('/classes', f); else await api.put(`/classes/${edit.class_id}`, f); toast('Class saved.'); setEdit(null); reload(); } catch (e) { setErr(e.message); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete class ${c.class_label}?`)) return;
    try { await api.del(`/classes/${c.class_id}`); toast('Class deleted.'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <PageHead title="Classes" subtitle="Classes, their subjects and subject teachers."><button className="btn" onClick={() => open()}><Plus size={16} />Add class</button></PageHead>
      <ErrorBox message={error} />
      <div className="card">{loading ? <Loading /> : data.length === 0 ? <Empty>No classes yet.</Empty> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Class</th><th>Academic year</th><th className="num">Students</th><th className="num">Subjects</th><th /></tr></thead>
          <tbody>{data.map((c) => (
            <tr key={c.class_id}><td><strong>{c.class_label}</strong></td><td>{c.academic_year}</td><td className="num">{c.student_count}</td><td className="num">{c.subject_count}</td>
              <td><div className="actions"><button className="btn secondary sm" onClick={() => setManage(c)}><BookOpen size={14} />Subjects</button><button className="btn secondary sm" onClick={() => open(c)}><Pencil size={14} />Edit</button><button className="btn ghost sm" onClick={() => remove(c)} aria-label="Delete"><Trash2 size={15} /></button></div></td></tr>))}</tbody>
        </table></div>)}</div>
      {edit && (
        <Modal title={edit === 'new' ? 'Add class' : 'Edit class'} onClose={() => setEdit(null)} footer={<><button className="btn secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn" onClick={save}>Save</button></>}>
          {err && <div className="alert error">{err}</div>}
          <div className="form-grid">
            <Field label="Class"><input className="input" value={f.class_name} onChange={set('class_name')} placeholder="e.g. 10" /></Field>
            <Field label="Section"><input className="input" value={f.section} onChange={set('section')} /></Field>
            <Field label="Academic year"><input className="input" value={f.academic_year} onChange={set('academic_year')} placeholder="2025-26" /></Field>
          </div>
        </Modal>)}
      {manage && <Assignments cls={manage} onClose={() => { setManage(null); reload(); }} />}
    </>
  );
}
