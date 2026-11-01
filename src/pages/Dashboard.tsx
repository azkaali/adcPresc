import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, FilePlus2, FileText, Pencil, Plus, Star, Stethoscope } from 'lucide-react';
import type { DashboardData } from '../../shared/types.ts';
import { api } from '../api';
import { ageGender, formatDate, todayISO } from '../lib/format';
import { ErrorState, Loading } from './states';

const formatCount = (n: number) =>
  n >= 10_000 ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : n.toLocaleString('en');

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard(), api.settings.get()])
      .then(([dashboard, settings]) => {
        setData(dashboard);
        setDoctorName(settings.doctor_name);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;

  const { counts, frequent_diagnoses: frequent, recent_prescriptions: recent } = data;
  const tiles = [
    { label: 'Prescriptions today', value: counts.prescriptions_today },
    { label: 'Prescriptions this month', value: counts.prescriptions_month },
    { label: 'All prescriptions', value: counts.prescriptions_total },
    { label: 'Saved diagnoses', value: counts.diagnoses },
    { label: 'Medicines in list', value: counts.medicines },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            {greeting()}
            {doctorName && `, ${doctorName}`}
          </h1>
          <p className="muted">{formatDate(todayISO())}</p>
        </div>
        <div className="page-actions">
          <Link className="btn" to="/diagnoses/new">
            <Plus size={16} /> New diagnosis
          </Link>
          <Link className="btn btn-primary" to="/prescriptions/new">
            <FilePlus2 size={16} /> New prescription
          </Link>
        </div>
      </header>

      <section className="kpi-row" aria-label="Summary">
        {tiles.map((t) => (
          <div key={t.label} className="stat-tile">
            <div className="stat-label">{t.label}</div>
            <div className="stat-value">{formatCount(t.value)}</div>
          </div>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Star size={18} /> Frequently used diagnoses
            </h2>
            <Link to="/diagnoses" className="link-btn">
              All diagnoses <ChevronRight size={14} />
            </Link>
          </div>
          {frequent.length === 0 ? (
            <p className="muted">
              No diagnoses yet. <Link to="/diagnoses/new">Add your first one</Link>.
            </p>
          ) : (
            <ul className="list">
              {frequent.map((d) => (
                <li key={d.id} className="list-row">
                  <div className="list-main">
                    <strong>{d.disease_name}</strong>
                    <span className="muted small">
                      {d.medication_count} medicine{d.medication_count === 1 ? '' : 's'}
                      {d.usage_count > 0 ? ` · used ${d.usage_count}×` : ' · not used yet'}
                    </span>
                  </div>
                  <Link className="icon-btn" to={`/diagnoses/${d.id}`} aria-label={`Edit ${d.disease_name}`} title="Edit diagnosis">
                    <Pencil size={16} />
                  </Link>
                  <Link className="btn btn-primary btn-sm" to={`/prescriptions/new?diagnosis=${d.id}`}>
                    <FilePlus2 size={14} /> Prescribe
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <FileText size={18} /> Recent prescriptions
            </h2>
            <Link to="/prescriptions" className="link-btn">
              All prescriptions <ChevronRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty-inline">
              <Stethoscope size={22} />
              <p className="muted">Saved prescriptions will appear here.</p>
            </div>
          ) : (
            <ul className="list">
              {recent.map((r) => (
                <li key={r.id} className="list-row list-row-link" onClick={() => navigate(`/prescriptions/${r.id}`)}>
                  <div className="list-main">
                    <Link to={`/prescriptions/${r.id}`} onClick={(e) => e.stopPropagation()}>
                      <strong>{r.patient_name}</strong>
                    </Link>
                    <span className="muted small">
                      {[ageGender(r.patient_age, r.patient_gender), r.disease_name].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </div>
                  <span className="muted small nowrap">{formatDate(r.visit_date)}</span>
                  <ChevronRight size={16} className="muted" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
