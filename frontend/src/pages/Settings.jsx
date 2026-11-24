import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../services/hooks';
import { ErrorBox, Field, Loading, PageHead, useToast } from '../components/ui.jsx';

export default function Settings() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/settings');
  const [f, setF] = useState(null);
  const [grades, setGrades] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => { if (data) { setF({ ...data }); setGrades(data.grades.map((g) => ({ ...g }))); } }, [data]);
  if (loading || !f) return <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const saveRules = async () => {
    setErr('');
    try { const r = await api.put('/settings', { ...f, pass_percentage: Number(f.pass_percentage) }); toast(r.message); reload(); } catch (e) { setErr(e.message); }
  };
  const saveGrades = async () => {
    setErr('');
    try { const r = await api.put('/settings/grades', { grades: grades.map((g) => ({ grade: g.grade, min_percentage: Number(g.min_percentage) })) }); toast(r.message); reload(); } catch (e) { setErr(e.message); }
  };
  const setGrade = (i, k, v) => setGrades(grades.map((g, j) => (j === i ? { ...g, [k]: v } : g)));

  return (
    <>
      <PageHead title="Settings" subtitle="School details, pass/fail rules and the grading scale. Regenerate results after changing rules." />
      <ErrorBox message={error || err} />
      <div className="grid cols-2">
        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>School &amp; pass rules</h3>
          <Field label="School name"><input className="input" value={f.school_name} onChange={set('school_name')} /></Field>
          <Field label="Address"><input className="input" value={f.school_address || ''} onChange={set('school_address')} /></Field>
          <Field label="Principal"><input className="input" value={f.principal_name || ''} onChange={set('principal_name')} /></Field>
          <Field label="Overall pass percentage" hint="A student must reach at least this percentage to pass."><input className="input" type="number" min="0" max="100" value={f.pass_percentage} onChange={set('pass_percentage')} /></Field>
          <label className="checkbox"><input type="checkbox" checked={!!f.require_subject_pass} onChange={(e) => setF({ ...f, require_subject_pass: e.target.checked })} />Student must also reach the passing marks in every subject</label>
          <button className="btn" onClick={saveRules}>Save settings</button>
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>Grading scale</h3>
          <p className="muted small" style={{ marginTop: 0 }}>A percentage gets the grade with the highest minimum that it reaches. One band must start at 0.</p>
          {grades.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <input className="input" style={{ width: 90 }} value={g.grade} onChange={(e) => setGrade(i, 'grade', e.target.value)} aria-label="Grade" />
              <input className="input" type="number" min="0" max="100" value={g.min_percentage} onChange={(e) => setGrade(i, 'min_percentage', e.target.value)} aria-label="Minimum percentage" />
              <button className="btn ghost sm" onClick={() => setGrades(grades.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={15} /></button>
            </div>))}
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button className="btn secondary" onClick={() => setGrades([...grades, { grade: '', min_percentage: '' }])}><Plus size={15} />Add band</button>
            <button className="btn" onClick={saveGrades}>Save grading scale</button>
          </div>
        </div>
      </div>
    </>
  );
}
