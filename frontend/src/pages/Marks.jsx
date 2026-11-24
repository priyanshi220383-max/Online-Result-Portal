import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { api, qs } from '../services/api';
import { useApi } from '../services/hooks';
import { Badge, Empty, ErrorBox, Loading, PageHead, useToast } from '../components/ui.jsx';

export default function Marks() {
  const toast = useToast();
  const { data: options, loading, error } = useApi('/marks/options');
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [values, setValues] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [auditKey, setAuditKey] = useState(0);
  const { data: audit } = useApi(`/marks/audit${qs({ exam_id: examId })}&k=${auditKey}`);

  const exams = useMemo(() => {
    const m = new Map();
    (options || []).forEach((o) => m.set(o.exam_id, o));
    return [...m.values()];
  }, [options]);
  const subjects = (options || []).filter((o) => String(o.exam_id) === String(examId));

  const loadSheet = async () => {
    if (!examId || !subjectId) { setSheet(null); return; }
    setErr('');
    try {
      const s = await api.get(`/marks/sheet${qs({ exam_id: examId, subject_id: subjectId })}`);
      setSheet(s);
      setValues(Object.fromEntries(s.students.map((st) => [st.student_id, st.marks_obtained ?? ''])));
    } catch (e) { setErr(e.message); setSheet(null); }
  };
  useEffect(() => { loadSheet(); }, [examId, subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = sheet?.subject.max_marks;
  const invalid = (v) => v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0 || Number(v) > max);
  const anyInvalid = sheet && Object.values(values).some(invalid);
  const locked = sheet?.exam.is_published;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const entries = Object.entries(values).map(([student_id, marks_obtained]) => ({ student_id: Number(student_id), marks_obtained }));
      const r = await api.put('/marks/sheet', { exam_id: Number(examId), subject_id: Number(subjectId), entries });
      toast(r.message); loadSheet(); setAuditKey((k) => k + 1);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  return (
    <>
      <PageHead title="Marks Entry" subtitle="Choose an examination and subject, then enter marks. Values above the maximum are rejected by the database." />
      <ErrorBox message={error} />
      {options?.length === 0 && <div className="alert info">No examination/subject is available for you yet.</div>}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="toolbar">
          <select className="select" value={examId} onChange={(e) => { setExamId(e.target.value); setSubjectId(''); }}>
            <option value="">Select examination...</option>
            {exams.map((e) => <option key={e.exam_id} value={e.exam_id}>{e.exam_name} - {e.class_label}</option>)}
          </select>
          <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!examId}>
            <option value="">Select subject...</option>
            {subjects.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.subject_name} (max {s.max_marks})</option>)}
          </select>
        </div>
      </div>
      {err && <div className="alert error">{err}</div>}
      {locked && <div className="alert warning">This examination is published, so marks are locked. An administrator can unpublish it to allow corrections.</div>}
      {sheet && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head"><h3>{sheet.subject.subject_name} - {sheet.exam.exam_name} ({sheet.exam.class_label})</h3><Badge tone="primary">Maximum {max} - Pass {sheet.subject.pass_marks}</Badge></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Roll</th><th>Admission no.</th><th>Student</th><th className="num">Marks (out of {max})</th></tr></thead>
            <tbody>{sheet.students.map((s) => (
              <tr key={s.student_id}><td>{s.roll_no}</td><td>{s.admission_no}</td><td>{s.full_name}</td>
                <td className="num"><input className={`input marks-input ${invalid(values[s.student_id]) ? 'invalid' : ''}`} type="number" step="0.5" min="0" max={max} disabled={locked}
                  value={values[s.student_id] ?? ''} onChange={(e) => setValues({ ...values, [s.student_id]: e.target.value })} /></td></tr>))}</tbody>
          </table></div>
          <div className="card-head" style={{ borderTop: '1px solid var(--border)', borderBottom: 0 }}>
            <span className="small muted">Leave a box empty to skip that student. The whole sheet is saved in one transaction.</span>
            <button className="btn" onClick={save} disabled={busy || locked || anyInvalid}><Save size={16} />{busy ? 'Saving...' : 'Save marks'}</button>
          </div>
        </div>)}

      <div className="card">
        <div className="card-head"><h3>Recent changes (audit trail)</h3><span className="small muted">Recorded automatically by database triggers</span></div>
        {!audit ? <Loading /> : audit.length === 0 ? <Empty>No changes recorded.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>When</th><th>Exam</th><th>Student</th><th>Subject</th><th>Action</th><th className="num">Old</th><th className="num">New</th><th>By</th></tr></thead>
            <tbody>{audit.slice(0, 12).map((a) => (
              <tr key={a.audit_id}><td className="nowrap">{a.changed_at}</td><td>{a.exam_name}</td><td>{a.student_name || '-'}</td><td>{a.subject_code || '-'}</td>
                <td><Badge tone={a.action === 'INSERT' ? 'success' : a.action === 'UPDATE' ? 'warning' : 'danger'}>{a.action}</Badge></td>
                <td className="num">{a.old_marks ?? '-'}</td><td className="num">{a.new_marks ?? '-'}</td><td>{a.changed_by || '-'}</td></tr>))}</tbody>
          </table></div>)}
      </div>
    </>
  );
}
