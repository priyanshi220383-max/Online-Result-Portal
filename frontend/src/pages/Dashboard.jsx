import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, GraduationCap, Percent } from 'lucide-react';
import { useApi } from '../services/hooks';
import { useAuth } from '../services/auth.jsx';
import { Badge, Empty, ErrorBox, Grade, Loading, PageHead, Progress, Stat, fmtDate } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: d, loading, error } = useApi('/dashboard');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  const maxGrade = Math.max(1, ...d.gradeDistribution.map((g) => g.count));

  return (
    <>
      <PageHead title="Dashboard" subtitle={`Welcome, ${user.displayName}. Live figures from the database.`} />
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat icon={GraduationCap} label="Students" value={d.counts.students} />
        <Stat icon={BookOpen} label={`Subjects (${d.counts.classes} classes)`} value={d.counts.subjects} tone="blue" />
        <Stat icon={CalendarCheck} label={`Examinations (${d.counts.published_exams} published)`} value={d.counts.exams} tone="amber" />
        <Stat icon={Percent} label={`Pass rate (${d.results.passed}/${d.results.total} results)`} value={`${d.results.pass_rate}%`} tone="green" />
      </div>

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>Grade distribution</h3>
          {d.gradeDistribution.map((g) => (
            <div className="bar-row" key={g.grade}><Grade value={g.grade} /><div className="progress"><span style={{ width: `${(g.count / maxGrade) * 100}%` }} /></div><span className="right">{g.count}</span></div>
          ))}
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>Average score by subject</h3>
          {d.subjectPerformance.length === 0 && <Empty>No marks yet.</Empty>}
          {d.subjectPerformance.map((s) => (
            <div className="bar-row" key={s.subject_code}><span title={s.subject_name}>{s.subject_code}</span><div className="progress"><span style={{ width: `${s.average_percentage}%` }} /></div><span className="right">{s.average_percentage}%</span></div>
          ))}
        </div>
      </div>

      <div className="grid cols-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <div className="card-head"><h3>Examinations</h3>{user.role === 'admin' && <Link to="/exams" className="small">Manage</Link>}</div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Exam</th><th>Class</th><th>Date</th><th>Marks entered</th><th>Status</th></tr></thead>
            <tbody>{d.exams.map((e) => (
              <tr key={e.exam_id}>
                <td>{e.exam_name}</td><td>{e.class_label}</td><td className="nowrap">{fmtDate(e.exam_date)}</td>
                <td><Progress value={e.marks_entered} max={e.total_students * e.total_subjects} /></td>
                <td>{e.is_published ? <Badge tone="success">Published</Badge> : e.results_generated ? <Badge tone="warning">Results ready</Badge> : <Badge>In progress</Badge>}</td>
              </tr>))}</tbody>
          </table></div>
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 12 }}>Toppers</h3>
          {d.toppers.length === 0 && <Empty>No results yet.</Empty>}
          {d.toppers.map((t, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{t.student_name}</strong> <Grade value={t.grade} />
              <div className="small muted">{t.exam_name} - {t.class_label} - {t.percentage}%</div>
            </div>))}
        </div>
      </div>
    </>
  );
}
