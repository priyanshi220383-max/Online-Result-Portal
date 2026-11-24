import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useApi } from '../services/hooks';
import { useAuth } from '../services/auth.jsx';
import { Empty, ErrorBox, Grade, Loading, PageHead, StatusBadge, fmtDate, fmtNum } from '../components/ui.jsx';

export default function MyResults() {
  const { user } = useAuth();
  const { data, loading, error } = useApi('/results/mine');
  if (loading) return <Loading />;
  return (
    <>
      <PageHead title="My Results" subtitle={`Published results for ${user.displayName}.`} />
      <ErrorBox message={error} />
      {data?.length === 0 && <div className="card"><Empty>No results have been published for you yet.</Empty></div>}
      <div className="grid cols-2">
        {data?.map((r) => (
          <div className="card card-pad" key={r.exam_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div><h3>{r.exam_name}</h3><div className="muted small">Class {r.class_label} - {fmtDate(r.exam_date)}</div></div>
              <Grade value={r.grade} />
            </div>
            <div className="grid cols-3" style={{ margin: '18px 0', gap: 10 }}>
              <div><div className="muted small">Total</div><strong>{fmtNum(r.total_marks)} / {fmtNum(r.max_total)}</strong></div>
              <div><div className="muted small">Percentage</div><strong>{r.percentage}%</strong></div>
              <div><div className="muted small">Class rank</div><strong>#{r.class_rank}</strong></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusBadge status={r.status} />
              <Link className="btn sm" to={`/report-card/${r.exam_id}/${user.studentId}`}><FileText size={14} />View report card</Link>
            </div>
          </div>))}
      </div>
    </>
  );
}
