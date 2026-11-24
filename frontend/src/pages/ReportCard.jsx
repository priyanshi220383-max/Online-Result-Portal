import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, History, Printer, Save } from 'lucide-react';
import { api, qs } from '../services/api';
import { useApi } from '../services/hooks';
import { useAuth } from '../services/auth.jsx';
import { Badge, ErrorBox, Grade, Loading, fmtDate, fmtNum, useToast } from '../components/ui.jsx';

export default function ReportCard() {
  const { examId, studentId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const staff = user.role !== 'student';
  const { data: live, loading, error } = useApi(`/report-cards/${examId}/${studentId}`);
  const [snapshots, setSnapshots] = useState(null);
  const [snapMsg, setSnapMsg] = useState('');
  const [viewing, setViewing] = useState(null); // snapshot doc being displayed

  const loadSnapshots = async () => {
    try { setSnapshots(await api.get(`/snapshots${qs({ student_id: studentId, exam_id: examId })}`)); setSnapMsg(''); }
    catch (e) { setSnapshots(null); setSnapMsg(e.message); }
  };
  useEffect(() => { if (staff && live?.snapshots_enabled) loadSnapshots(); }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSnapshot = async () => {
    try { const r = await api.post(`/report-cards/${examId}/${studentId}/snapshot`); toast(`Snapshot v${r.version} saved to MongoDB.`); loadSnapshots(); } catch (e) { toast(e.message, 'error'); }
  };
  const openSnapshot = async (id) => { try { setViewing(await api.get(`/snapshots/${id}`)); } catch (e) { toast(e.message, 'error'); } };

  if (loading) return <Loading />;
  if (error) return <><Link className="btn secondary sm" to={-1}><ArrowLeft size={14} />Back</Link><div style={{ height: 14 }} /><ErrorBox message={error} /></>;
  const c = viewing ? viewing.snapshot : live;
  const r = c.result;

  return (
    <>
      <div className="rc-actions">
        <Link className="btn secondary" to={user.role === 'student' ? '/my-results' : `/results?exam=${examId}`}><ArrowLeft size={16} />Back</Link>
        <button className="btn" onClick={() => window.print()}><Printer size={16} />Print / Save as PDF</button>
        {staff && live.snapshots_enabled && <button className="btn secondary" onClick={saveSnapshot}><Save size={16} />Save snapshot</button>}
        {viewing && <button className="btn secondary" onClick={() => setViewing(null)}>Back to live report card</button>}
      </div>
      {viewing && <div className="alert info no-print">Showing saved snapshot <strong>v{viewing.version}</strong> from {new Date(viewing.saved_at).toLocaleString()} (stored in MongoDB).</div>}
      {!viewing && r.is_stale && <div className="alert warning no-print">Marks changed after results were generated. Regenerate results to refresh this report card.</div>}
      {!viewing && !c.exam.is_published && staff && <div className="alert warning no-print">Draft: this examination is not published yet, so the student cannot see this report card.</div>}

      <div className="rc">
        <div className="rc-head"><h2>{c.school.name}</h2>{c.school.address && <p>{c.school.address}</p>}</div>
        <div className="rc-title">Report Card - {c.exam.exam_name}</div>
        <div className="rc-body">
          <div className="rc-info">
            <div><div className="k">Student name</div><div className="v">{c.student.full_name}</div></div>
            <div><div className="k">Admission no.</div><div className="v">{c.student.admission_no}</div></div>
            <div><div className="k">Class / Roll no.</div><div className="v">{c.student.class_label} / {c.student.roll_no}</div></div>
            <div><div className="k">Date of birth</div><div className="v">{fmtDate(c.student.date_of_birth)}</div></div>
            <div><div className="k">Guardian</div><div className="v">{c.student.guardian_name || '-'}</div></div>
            <div><div className="k">Academic year / Exam date</div><div className="v">{c.student.academic_year} / {fmtDate(c.exam.exam_date)}</div></div>
          </div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Code</th><th>Subject</th><th className="num">Max</th><th className="num">Pass</th><th className="num">Obtained</th><th className="num">%</th><th>Grade</th><th>Status</th></tr></thead>
            <tbody>{c.subjects.map((s) => (
              <tr key={s.subject_code}><td>{s.subject_code}</td><td>{s.subject_name}</td><td className="num">{s.max_marks}</td><td className="num">{s.pass_marks}</td>
                <td className="num"><strong>{fmtNum(s.marks_obtained)}</strong></td><td className="num">{s.percentage}</td><td><Grade value={s.grade} /></td>
                <td><Badge tone={s.status === 'PASS' ? 'success' : 'danger'}>{s.status}</Badge></td></tr>))}</tbody>
          </table></div>
          <div className="rc-summary">
            <div><div className="v">{fmtNum(r.total_marks)}/{fmtNum(r.max_total)}</div><div className="k">Total marks</div></div>
            <div><div className="v">{r.percentage}%</div><div className="k">Percentage</div></div>
            <div><div className="v">{r.grade}</div><div className="k">Overall grade</div></div>
            <div><div className="v">{r.class_rank}/{r.class_size}</div><div className="k">Class rank</div></div>
          </div>
          <div className={`rc-result ${r.status === 'PASS' ? 'pass' : 'fail'}`}>RESULT: {r.status === 'PASS' ? 'PASSED' : 'FAILED'}</div>
          <div className="rc-scale"><strong>Grading scale: </strong>{[...c.grade_scale].map((g, i, a) => `${g.grade} ${g.min_percentage}%${i < a.length - 1 ? ' | ' : ''}`).join('')}
            <br />Pass rule: at least {c.rules.pass_percentage}% overall{c.rules.require_subject_pass ? ' and passing marks in every subject' : ''}.</div>
          <div className="rc-sign"><div>Class teacher</div><div>Parent / Guardian</div><div>Principal{c.school.principal ? ` (${c.school.principal})` : ''}</div></div>
        </div>
      </div>

      {staff && (
        <div className="card no-print" style={{ maxWidth: 860, margin: '22px auto 0' }}>
          <div className="card-head"><h3><History size={16} style={{ verticalAlign: -2 }} /> Saved snapshots (MongoDB)</h3></div>
          <div className="card-pad">
            {!live.snapshots_enabled && <p className="muted small" style={{ margin: 0 }}>MongoDB is not configured (MONGODB_URI is empty), so snapshots are disabled. See the README to enable them.</p>}
            {live.snapshots_enabled && snapMsg && <p className="muted small" style={{ margin: 0 }}>{snapMsg}</p>}
            {snapshots?.length === 0 && <p className="muted small" style={{ margin: 0 }}>No snapshots saved yet. "Save snapshot" stores an exact copy of this report card as a MongoDB document.</p>}
            {snapshots?.map((s) => (
              <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>v{s.version} - {new Date(s.saved_at).toLocaleString()} - {s.snapshot.result.percentage}% ({s.snapshot.result.grade}) by {s.saved_by.username}</span>
                <button className="btn secondary sm" onClick={() => openSnapshot(s._id)}>View</button>
              </div>))}
          </div>
        </div>)}
    </>
  );
}
