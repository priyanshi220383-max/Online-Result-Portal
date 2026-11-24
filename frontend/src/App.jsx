import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { useAuth, homePathFor } from './services/auth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Subjects from './pages/Subjects.jsx';
import Classes from './pages/Classes.jsx';
import Teachers from './pages/Teachers.jsx';
import Exams from './pages/Exams.jsx';
import Marks from './pages/Marks.jsx';
import Results from './pages/Results.jsx';
import ReportCard from './pages/ReportCard.jsx';
import MyResults from './pages/MyResults.jsx';
import Settings from './pages/Settings.jsx';

function Home() {
  const { user } = useAuth();
  return user ? <Navigate to={homePathFor(user.role)} replace /> : <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Layout roles={['admin', 'teacher']} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/marks" element={<Marks />} />
        <Route path="/results" element={<Results />} />
      </Route>
      <Route element={<Layout roles={['admin']} />}>
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route element={<Layout roles={['student']} />}>
        <Route path="/my-results" element={<MyResults />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="/report-card/:examId/:studentId" element={<ReportCard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
