import { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useApi } from '../services/hooks';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHead, Progress, fmtDate, useToast } from '../components/ui.jsx';

export default function Exams() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/exams');
  const { data: classes } = useApi('/classes');
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState({ exam_name: '', class_id: '', exam_date: '' });
  const [err, setErr] = useState('');
  const open = (e) => { setEdit(e || 'new'); setF(e ? { exam_name: e.exam_name, class_id: e.class_id, exam_date: e.exam_date?.slice(0, 10) || '' } : { exam_name: '', class_id: '', exam_date: '' }); setErr(''); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try { if (edit === 'new') await api.post('/exams', f); else await api.put(`/exams/${edit.exam_id}`, f); toast('Examination saved.'); setEdit(null); reload(); } catch (e) { setErr(e.message); }
  };
  const togglePublish = async (e) => {
    try { await api.patch(`/exams/${e.exam_id}/publish`, { publish: !e.is_published }); toast(e.is_published ? 'Unpublished.' : 'Published. Students can now see their report cards.'); reload(); } catch (x) { toast(x.message, 'error'); }
  };
  const remove = async (e) => {
    if (!window.confirm(`Delete "${e.exam_name}" for ${e.class_label}? All its marks and results are deleted too.`)) return;
    try { await api.del(`/exams/${e.exam_id}`); toast('Examination deleted.'); reload(); } catch (x) { toast(x.message, 'error'); }
  };
  return (
    <>
      <PageHead title="Examinations" subtitle="Create exams per class, then enter marks, generate results and publish."><button className="btn" onClick={() => open()}><Plus size={16} />Create exam</button></PageHead>
      <ErrorBox message={error} />
      <div className="card">{loading ? <Loading /> : data.length === 0 ? <Empty>No examinations yet.</Empty> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Examination</th><th>Class</th><th>Date</th><th>Marks entered</th><th className="num">Results</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((e) => (
            <tr key={e.exam_id}>
              <td><strong>{e.exam_name}</strong></td><td>{e.class_label}</td><td className="nowrap">{fmtDate(e.exam_date)}</td>
              <td><Progress value={e.marks_entered} max={e.total_students * e.total_subjects} /></td>
              <td className="num">{e.results_generated}/{e.total_students}{e.results_stale > 0 && <> <Badge tone="warning">stale</Badge></>}</td>
              <td>{e.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}</td>
              <td><div className="actions">
                <Link className="btn secondary sm" to={`/results?exam=${e.exam_id}`}>Results</Link>
                <button className="btn secondary sm" onClick={() => togglePublish(e)}>{e.is_published ? <><EyeOff size={14} />Unpublish</> : <><Eye size={14} />Publish</>}</button>
                <button className="btn secondary sm" onClick={() => open(e)}><Pencil size={14} /></button>
                <button className="btn ghost sm" onClick={() => remove(e)} aria-label="Delete"><Trash2 size={15} /></button>
              </div></td>
            </tr>))}</tbody>
        </table></div>)}</div>
      {edit && (
        <Modal title={edit === 'new' ? 'Create examination' : 'Edit examination'} onClose={() => setEdit(null)} footer={<><button className="btn secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn" onClick={save}>Save</button></>}>
          {err && <div className="alert error">{err}</div>}
          <Field label="Examination name"><input className="input" value={f.exam_name} onChange={set('exam_name')} placeholder="e.g. Half-Yearly Examination" /></Field>
          <Field label="Class"><select className="select" value={f.class_id} onChange={set('class_id')}><option value="">Select...</option>{(classes || []).map((c) => <option key={c.class_id} value={c.class_id}>{c.class_label} ({c.academic_year})</option>)}</select></Field>
          <Field label="Exam date"><input className="input" type="date" value={f.exam_date} onChange={set('exam_date')} /></Field>
        </Modal>)}
    </>
  );
}
