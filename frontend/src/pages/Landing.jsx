import { Link } from 'react-router-dom';
import { BarChart3, Calculator, ClipboardList, Database, FileText, GraduationCap, ShieldCheck } from 'lucide-react';
import hero from '../assets/hero-dashboard.jpg';

const FEATURES = [
  [ClipboardList, 'Structured marks entry', 'Teachers enter marks only for the classes and subjects assigned to them, validated against each subject\'s maximum.'],
  [Calculator, 'Automatic calculation', 'Totals, percentages, grades and pass/fail are produced by a database stored procedure using configurable rules.'],
  [FileText, 'Printable report cards', 'A clean A4 report card is generated from live academic records, ready to print or save as PDF.'],
  [BarChart3, 'Performance overview', 'Dashboards show pass rates, grade distribution, subject averages and class toppers.'],
  [Database, 'One reliable database', 'Students, subjects, exams and marks live in a normalised MySQL schema with constraints and triggers.'],
  [ShieldCheck, 'Role-based access', 'Administrators, teachers and students each see only what their role allows.'],
];

export default function Landing() {
  return (
    <>
      <header className="site-nav">
        <div className="brand" style={{ padding: 0 }}><span className="logo"><GraduationCap size={20} /></span>EduResult</div>
        <Link className="btn" to="/login">Sign in</Link>
      </header>
      <section className="hero">
        <div>
          <h1>Simplifying results. Empowering schools.</h1>
          <p>An online portal to manage student records, examinations and marks, and to generate accurate report cards in seconds.</p>
          <Link className="btn lg" to="/login">Sign in to the portal</Link>
        </div>
        <img src={hero} alt="EduResult dashboard preview" />
      </section>
      <section className="section">
        <h2>Everything a school needs for results</h2>
        <p className="lead">From marks entry to the final report card, in one place.</p>
        <div className="grid cols-3">
          {FEATURES.map(([Icon, title, body]) => (
            <div key={title} className="card feature"><div className="icon"><Icon size={22} /></div><h3>{title}</h3><p>{body}</p></div>
          ))}
        </div>
      </section>
      <footer className="site-foot">EduResult - Online Result &amp; Report-Card Generation Portal</footer>
    </>
  );
}
