import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, qs } from '../services/api';
import { useApi } from '../services/hooks';
import { useAuth } from '../services/auth.jsx';
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHead, fmtDate, useToast } from '../components/ui.jsx';

const BLANK = { admission_no: '', full_name: '', date_of_birth: '', gender: 'Male', class_id: '', roll_no: '', guardian_name: '', guardian_phone: '', email: '', password: '' };

function StudentForm({ student, classes, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(student ? { ...BLANK, ...student, date_of_birth: student.date_of_birth?.slice(0, 10) || '', password: '' } : BLANK);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setErr('');
    try {
      if (student) await api.put(`/students/${student.student_id}`, f); else await api.post('/students', f);
      toast(student ? 'Student updated.' : 'Student added.'); onSaved();
    } catch (e) { setErr(e.message); }
  };
  return (
    <Modal wide title={student ? 'Edit student' : 'Add student'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn" onClick={save}>Save</button></>}>
      {err && <div className="alert error">{err}</div>}
      <div className="form-grid">
        <Field label="Admission number"><input className="input" value={f.admission_no} onChange={set('admission_no')} /></Field>
        <Field label="Full name"><input className="input" value={f.full_name} onChange={set('full_name')} /></Field>
        <Field label="Class"><select className="select" value={f.class_id} onChange={set('class_id')}><option value="">Select...</option>{classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_label} ({c.academic_year})</option>)}</select></Field>
        <Field label="Roll number"><input className="input" type="number" min="1" value={f.roll_no} onChange={set('roll_no')} /></Field>
        <Field label="Gender"><select className="select" value={f.gender} onChange={set('gender')}><option>Male</option><option>Female</option><option>Other</option></select></Field>
        <Field label="Date of birth"><input className="input" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} /></Field>
        <Field label="Guardian name"><input className="input" value={f.guardian_name || ''} onChange={set('guardian_name')} /></Field>
        <Field label="Guardian phone"><input className="input" value={f.guardian_phone || ''} onChange={set('guardian_phone')} /></Field>
        <Field label="Email"><input className="input" type="email" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label={student ? 'Reset login password' : 'Login password'} hint={`Username will be the admission number. ${student ? 'Leave blank to keep the current password.' : 'Leave blank to create no login.'}`}><input className="input" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
      </div>
    </Modal>
  );
}

export default function Students() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | student
  const { data: classes } = useApi('/classes');
  const { data: students, loading, error, reload } = useApi(`/students${qs({ search, class_id: classId })}`);

  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.full_name}? Their marks and results will also be deleted.`)) return;
    try { await api.del(`/students/${s.student_id}`); toast('Student deleted.'); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHead title="Students" subtitle={isAdmin ? 'Add, edit and manage student records.' : 'Students of your classes.'}>
        <input className="input" placeholder="Search name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">All classes</option>{classes?.map((c) => <option key={c.class_id} value={c.class_id}>{c.class_label}</option>)}</select>
        {isAdmin && <button className="btn" onClick={() => setEditing('new')}><Plus size={16} />Add student</button>}
      </PageHead>
      <ErrorBox message={error} />
      <div className="card">
        {loading ? <Loading /> : students.length === 0 ? <Empty>No students found.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Adm. no.</th><th>Name</th><th>Class</th><th>Roll</th><th>Gender</th><th>Date of birth</th><th>Guardian</th><th>Login</th>{isAdmin && <th />}</tr></thead>
            <tbody>{students.map((s) => (
              <tr key={s.student_id}>
                <td>{s.admission_no}</td><td><strong>{s.full_name}</strong></td><td>{s.class_label}</td><td>{s.roll_no}</td><td>{s.gender}</td>
                <td className="nowrap">{fmtDate(s.date_of_birth)}</td><td>{s.guardian_name || '-'}</td><td>{s.has_login ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>}</td>
                {isAdmin && <td><div className="actions"><button className="btn secondary sm" onClick={() => setEditing(s)}><Pencil size={14} />Edit</button><button className="btn ghost sm" onClick={() => remove(s)} aria-label="Delete"><Trash2 size={15} /></button></div></td>}
              </tr>))}</tbody>
          </table></div>)}
      </div>
      {editing && <StudentForm student={editing === 'new' ? null : editing} classes={classes || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}
