import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../services/hooks';
import { Empty, ErrorBox, Field, Loading, Modal, PageHead, useToast } from '../components/ui.jsx';

const BLANK = { subject_code: '', subject_name: '', max_marks: 100, pass_marks: 33 };

export default function Subjects() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/subjects');
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState('');
  const open = (s) => { setEdit(s || 'new'); setF(s ? { ...s } : BLANK); setErr(''); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try {
      if (edit === 'new') await api.post('/subjects', f); else await api.put(`/subjects/${edit.subject_id}`, f);
      toast('Subject saved.'); setEdit(null); reload();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Delete subject ${s.subject_name}?`)) return;
    try { await api.del(`/subjects/${s.subject_id}`); toast('Subject deleted.'); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <PageHead title="Subjects" subtitle="Subject codes, maximum marks and passing marks."><button className="btn" onClick={() => open()}><Plus size={16} />Add subject</button></PageHead>
      <ErrorBox message={error} />
      <div className="card">{loading ? <Loading /> : data.length === 0 ? <Empty>No subjects yet.</Empty> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Code</th><th>Subject</th><th className="num">Maximum marks</th><th className="num">Passing marks</th><th /></tr></thead>
          <tbody>{data.map((s) => (
            <tr key={s.subject_id}><td><strong>{s.subject_code}</strong></td><td>{s.subject_name}</td><td className="num">{s.max_marks}</td><td className="num">{s.pass_marks}</td>
              <td><div className="actions"><button className="btn secondary sm" onClick={() => open(s)}><Pencil size={14} />Edit</button><button className="btn ghost sm" onClick={() => remove(s)} aria-label="Delete"><Trash2 size={15} /></button></div></td></tr>))}</tbody>
        </table></div>)}</div>
      {edit && (
        <Modal title={edit === 'new' ? 'Add subject' : 'Edit subject'} onClose={() => setEdit(null)} footer={<><button className="btn secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn" onClick={save}>Save</button></>}>
          {err && <div className="alert error">{err}</div>}
          <div className="form-grid">
            <Field label="Subject code"><input className="input" value={f.subject_code} onChange={set('subject_code')} /></Field>
            <Field label="Subject name"><input className="input" value={f.subject_name} onChange={set('subject_name')} /></Field>
            <Field label="Maximum marks"><input className="input" type="number" min="1" value={f.max_marks} onChange={set('max_marks')} /></Field>
            <Field label="Passing marks"><input className="input" type="number" min="0" value={f.pass_marks} onChange={set('pass_marks')} /></Field>
          </div>
        </Modal>)}
    </>
  );
}
