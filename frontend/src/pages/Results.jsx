import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calculator, FileText } from 'lucide-react';
import { api, qs } from '../services/api';
import { useApi } from '../services/hooks';
import { Badge, Empty, ErrorBox, Grade, Loading, PageHead, StatusBadge, fmtNum, useToast } from '../components/ui.jsx';

export default function Results() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const examId = params.get('exam') || '';
  const { data: exams } = useApi('/exams');
  const { data: results, loading, error, reload } = useApi(examId ? `/results${qs({ exam_id: examId })}` : null);
  const [busy, setBusy] = useState(false);
  const current = exams?.find((e) => String(e.exam_id) === examId);

  const generate = async () => {
    setBusy(true);
    try { const r = await api.post('/results/generate', { exam_id: Number(examId) }); toast(r.message); reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const stale = results?.some((r) => r.is_stale);
  const passed = results?.filter((r) => r.status === 'PASS').length || 0;

  return (
    <>
      <PageHead title="Results" subtitle="Generate and review student-wise results (total, percentage, grade, pass/fail, rank).">
        <select className="select" value={examId} onChange={(e) => setParams(e.target.value ? { exam: e.target.value } : {})}>
          <option value="">Select examination...</option>{(exams || []).map((e) => <option key={e.exam_id} value={e.exam_id}>{e.exam_name} - {e.class_label}</option>)}
        </select>
        <button className="btn" disabled={!examId || busy} onClick={generate}><Calculator size={16} />{busy ? 'Generating...' : 'Generate results'}</button>
      </PageHead>
      <ErrorBox message={error} />
      {!examId && <Empty>Select an examination to view its results.</Empty>}
      {stale && <div className="alert warning">Marks changed after these results were generated. Click "Generate results" to refresh them.</div>}
      {current && !current.is_published && results?.length > 0 && !stale && <div className="alert info">Results are ready. An administrator can publish the examination from the Examinations page.</div>}
      {examId && (loading ? <Loading /> : (
        <div className="card">
          <div className="card-head"><h3>{current ? `${current.exam_name} - ${current.class_label}` : 'Results'}</h3>{results?.length > 0 && <span className="muted small">{passed} passed, {results.length - passed} failed</span>}</div>
          {results.length === 0 ? <Empty>No results yet. Enter marks for every subject, then generate results.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Rank</th><th>Roll</th><th>Student</th><th className="num">Total</th><th className="num">Percentage</th><th>Grade</th><th>Result</th><th /></tr></thead>
              <tbody>{results.map((r) => (
                <tr key={r.result_id}><td><strong>{r.class_rank}</strong></td><td>{r.roll_no}</td><td>{r.student_name}{r.is_stale ? <> <Badge tone="warning">stale</Badge></> : null}</td>
                  <td className="num">{fmtNum(r.total_marks)} / {fmtNum(r.max_total)}</td><td className="num">{r.percentage}%</td><td><Grade value={r.grade} /></td><td><StatusBadge status={r.status} /></td>
                  <td><div className="actions"><Link className="btn secondary sm" to={`/report-card/${examId}/${r.student_id}`}><FileText size={14} />Report card</Link></div></td></tr>))}</tbody>
            </table></div>)}
        </div>))}
    </>
  );
}
