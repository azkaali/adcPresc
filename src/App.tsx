import { Fragment, type ReactNode } from 'react';
import { createBrowserRouter, Link, NavLink, Outlet, RouterProvider, ScrollRestoration, useLocation } from 'react-router';
import { FilePlus2, FileText, LayoutDashboard, Pill, Settings as SettingsIcon, Stethoscope } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import { MedicinesProvider } from './lib/medicines';
import Dashboard from './pages/Dashboard';
import Diagnoses from './pages/Diagnoses';
import DiagnosisEdit from './pages/DiagnosisEdit';
import Medicines from './pages/Medicines';
import PrescriptionEdit from './pages/PrescriptionEdit';
import Prescriptions from './pages/Prescriptions';
import PrescriptionView from './pages/PrescriptionView';
import Settings from './pages/Settings';
import { EmptyState } from './pages/states';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/prescriptions', label: 'Prescriptions', icon: FileText, end: false },
  { to: '/diagnoses', label: 'Diagnoses', icon: Stethoscope, end: false },
  { to: '/medicines', label: 'Medicines', icon: Pill, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
];

function Layout() {
  return (
    <div className="app">
      <aside className="sidebar no-print">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>
            ℞
          </span>
          <span>
            <span className="brand-name">ADC Prescription System</span>
            <span className="brand-sub">Diagnosis & Prescription</span>
          </span>
        </Link>
        <Link to="/prescriptions/new" className="btn btn-primary btn-block">
          <FilePlus2 size={16} /> New prescription
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

/** Gives editor pages a fresh state on every navigation (e.g. "New prescription" while already on it). */
function Fresh({ children }: { children: ReactNode }) {
  return <Fragment key={useLocation().key}>{children}</Fragment>;
}

function NotFound() {
  return (
    <EmptyState icon={<FileText size={28} />} title="Page not found">
      <Link className="btn" to="/">
        Back to dashboard
      </Link>
    </EmptyState>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'prescriptions', element: <Prescriptions /> },
      { path: 'prescriptions/new', element: <Fresh><PrescriptionEdit /></Fresh> },
      { path: 'prescriptions/:id', element: <PrescriptionView /> },
      { path: 'prescriptions/:id/edit', element: <Fresh><PrescriptionEdit /></Fresh> },
      { path: 'diagnoses', element: <Diagnoses /> },
      { path: 'diagnoses/new', element: <Fresh><DiagnosisEdit /></Fresh> },
      { path: 'diagnoses/:id', element: <Fresh><DiagnosisEdit /></Fresh> },
      { path: 'medicines', element: <Medicines /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <ToastProvider>
      <MedicinesProvider>
        <RouterProvider router={router} />
      </MedicinesProvider>
    </ToastProvider>
  );
}
